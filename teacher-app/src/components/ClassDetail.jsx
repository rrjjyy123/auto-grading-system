import { useState, useEffect } from 'react'
import {
    subscribeToExams,
    createExam,
    updateExam,
    deleteExam,
    toggleExamActive,
    subscribeToClassSubmissions,
    getExamAnswers,
    regradeAllSubmissions,
    copyExam,
    getStudentCodes,
    autoGradeSubmissions
} from '../lib/firebase'
import ResultsView from './ResultsView'
import ExamCreateModal from './ExamCreateModal'
import MonitorPanel from './MonitorPanel'
import StudentManagement from './StudentManagement'
import { useToast } from './Toast'

function ClassDetail({ classData, onBack, initialTab = 'exams', onTabChange }) {
    const { success, error: toastError, info } = useToast()
    const [exams, setExams] = useState([])
    const [students, setStudents] = useState([])
    const [submissions, setSubmissions] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateExam, setShowCreateExam] = useState(false)
    const [selectedExam, setSelectedExam] = useState(null)
    const [editingExam, setEditingExam] = useState(null)
    const [monitorExam, setMonitorExam] = useState(null)
    const [selectedExamIds, setSelectedExamIds] = useState(new Set()) // 다중 선택용

    // 탭 상태: 'exams' | 'students'
    const [activeTab, setActiveTab] = useState(initialTab)

    // 외부에서 탭 변경 시 동기화
    useEffect(() => {
        setActiveTab(initialTab)
        // 탭이 변경되면 상세 뷰(시험 결과)를 닫고 목록으로 돌아감
        setSelectedExam(null)
    }, [initialTab])

    // 탭 변경 핸들러
    const handleTabChange = (tab) => {
        setActiveTab(tab)
        onTabChange?.(tab)
    }

    useEffect(() => {
        const unsubExams = subscribeToExams(classData.id, (examList) => {
            setExams(examList)
            setLoading(false)
        })

        const unsubSubmissions = subscribeToClassSubmissions(classData.id, (subList) => {
            setSubmissions(subList)
        })

        // 학생 목록 가져오기
        getStudentCodes(classData.id).then(studentList => {
            setStudents(studentList)
        })

        return () => {
            unsubExams()
            unsubSubmissions()
        }
    }, [classData.id])

    // 자동 채점 트리거 (미채점 답안 발견 시)
    useEffect(() => {
        if (submissions.length > 0) {
            submissions.forEach(sub => {
                // 채점되지 않았고, 수동 채점 완료 표시도 없는 경우 자동 채점 시도
                if (!sub.graded && !sub.manualGradingComplete) {
                    // console.log('Auto grading submission:', sub.id)
                    autoGradeSubmissions(sub.id)
                }
            })
        }
    }, [submissions])

    const handleCreateExam = async (examData) => {
        const { error } = await createExam(classData.id, examData)
        if (error) {
            toastError('시험 생성 실패: ' + error)
            return
        }
        setShowCreateExam(false)
        success('시험이 생성되었습니다!')
    }

    const handleDeleteExam = async (examId, examTitle) => {
        if (!confirm(`"${examTitle}" 시험을 삭제하시겠습니까?\n모든 제출 기록이 삭제됩니다.`)) {
            return
        }
        const { error } = await deleteExam(examId)
        if (error) {
            toastError('삭제 실패: ' + error)
        } else {
            success('시험이 삭제되었습니다')
        }
    }

    // 시험 복제 핸들러
    const handleCopyExam = async (examId, examTitle) => {
        if (!confirm(`"${examTitle}" 시험을 복제하시겠습니까?`)) {
            return
        }
        const { error } = await copyExam(examId)
        if (error) {
            toastError('복제 실패: ' + error)
        } else {
            success('시험이 복제되었습니다')
        }
    }

    // 다중 선택 핸들러
    const toggleExamSelection = (examId) => {
        const newSelected = new Set(selectedExamIds)
        if (newSelected.has(examId)) {
            newSelected.delete(examId)
        } else {
            newSelected.add(examId)
        }
        setSelectedExamIds(newSelected)
    }

    // 전체 선택/해제 핸들러
    const toggleAllSelection = () => {
        if (selectedExamIds.size === exams.length) {
            setSelectedExamIds(new Set())
        } else {
            setSelectedExamIds(new Set(exams.map(e => e.id)))
        }
    }

    // 선택된 시험 일괄 삭제
    const handleDeleteSelected = async () => {
        if (selectedExamIds.size === 0) return
        if (!confirm(`선택한 ${selectedExamIds.size}개의 시험을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`)) {
            return
        }

        let successCount = 0
        let failCount = 0

        for (const examId of selectedExamIds) {
            const { error } = await deleteExam(examId)
            if (error) failCount++
            else successCount++
        }

        if (failCount > 0) {
            toastError(`${successCount}개 삭제 성공, ${failCount}개 삭제 실패`)
        } else {
            success(`${successCount}개의 시험이 삭제되었습니다`)
        }
        setSelectedExamIds(new Set())
    }

    // 시험 수정 핸들러
    const handleEditExam = async (exam) => {
        const { data, error } = await getExamAnswers(exam.id)
        if (error && !exam.answers) {
            toastError('정답 로딩 실패: ' + error)
            return
        }
        setEditingExam({
            exam,
            answerData: data || { answers: exam.answers }
        })
    }

    const handleUpdateExam = async (examData) => {
        const { error } = await updateExam(editingExam.exam.id, classData.id, examData)
        if (error) {
            toastError('시험 수정 실패: ' + error)
            return
        }
        // 자동 재채점 실행
        success('시험이 수정되었습니다. 재채점을 진행합니다...')
        const { success: regradeSuccess, count, error: regradeError } = await regradeAllSubmissions(editingExam.exam.id, examData)

        if (regradeError) {
            toastError('재채점 중 오류 발생: ' + regradeError)
        } else if (count > 0) {
            success(`${count}명의 학생 답안이 재채점되었습니다.`)
        } else {
            success('시험이 수정되었습니다.')
        }

        setEditingExam(null)
    }

    const getExamSubmissionCount = (examId) => {
        return submissions.filter(s => s.examId === examId).length
    }

    // 시험 선택 시 정답을 별도 컬렉션에서 가져옴
    const handleSelectExam = async (exam) => {
        const { data, error } = await getExamAnswers(exam.id)
        if (error) {
            // 기존 방식 (answers가 exam에 있는 경우) 호환
            if (exam.answers) {
                setSelectedExam(exam)
                return
            }
            toastError('정답 로딩 실패: ' + error)
            return
        }
        // examData에 answers 포함 (새 방식인 경우 questions에서 추출)
        if (data.questions) {
            setSelectedExam({ ...exam, questions: data.questions })
        } else {
            setSelectedExam({ ...exam, answers: data.answers })
        }
    }

    // 문제 유형 표시
    const getQuestionTypeLabel = (exam) => {
        if (exam.questions) {
            // 새 형식
            const types = [...new Set(exam.questions.map(q => q.type))]
            const typeLabels = {
                choice4: '4지선다',
                choice5: '5지선다',
                ox: 'O/X',
                short: '단답형',
                essay: '서술형'
            }
            if (types.length === 1) {
                return typeLabels[types[0]] || types[0]
            }
            return '혼합'
        }
        // 기존 형식
        return '4지선다'
    }

    // 제출물 새로고침 (채점 후 강제 리로드용)
    const handleRefreshSubmissions = () => {
        // subscriptions가 자동으로 업데이트하므로 별도 조치 불필요
        // 하지만 answerData를 다시 로드할 수 있음
        if (selectedExam) {
            handleSelectExam(selectedExam)
        }
    }

    if (selectedExam) {
        // answerData 구성: 새 형식이면 questions, 기존 형식이면 answers
        const answerData = selectedExam.questions
            ? { questions: selectedExam.questions }
            : { answers: selectedExam.answers, pointsPerQuestion: selectedExam.pointsPerQuestion }

        return (
            <ResultsView
                classId={classData.id}
                exam={selectedExam}
                students={students}
                submissions={submissions.filter(s => s.examId === selectedExam.id)}
                onBack={() => setSelectedExam(null)}
            // answerData is derived inside ResultsView or not used directly if exam has questions
            />
        )
    }

    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* 헤더 card */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={onBack}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="flex-1">
                            <h1 className="text-3xl font-extrabold text-gray-900 mb-1">{classData.name}</h1>
                            <p className="text-gray-500 font-medium">관리자 모드</p>
                        </div>
                    </div>

                    {/* 통계 위젯 Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-indigo-900/60 mb-1">총 학생 수</p>
                                <p className="text-3xl font-extrabold text-indigo-900">{classData.studentCount || 0}<span className="text-base font-medium ml-1 text-indigo-500">명</span></p>
                            </div>
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl text-indigo-500">
                                👥
                            </div>
                        </div>
                        <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-emerald-900/60 mb-1">생성된 시험</p>
                                <p className="text-3xl font-extrabold text-emerald-900">{exams.length}<span className="text-base font-medium ml-1 text-emerald-500">개</span></p>
                            </div>
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl text-emerald-500">
                                📝
                            </div>
                        </div>
                        {/* 응시율 - 계산 로직 */}
                        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-amber-900/60 mb-1">전체 응시율</p>
                                <p className="text-3xl font-extrabold text-amber-900">
                                    {exams.length > 0 && submissions.length > 0
                                        ? Math.round((submissions.length / (classData.studentCount * exams.length)) * 100) + '%'
                                        : '0%'
                                    }
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl text-amber-500">
                                📊
                            </div>
                        </div>
                    </div>

                    {/* 탭 네비게이션 */}
                    <div className="flex gap-8 border-b border-gray-100">
                        <button
                            onClick={() => handleTabChange('exams')}
                            className={`pb-4 px-2 font-bold text-lg transition-all relative ${activeTab === 'exams'
                                ? 'text-primary'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            시험 관리
                            {activeTab === 'exams' && (
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />
                            )}
                        </button>
                        <button
                            onClick={() => handleTabChange('students')}
                            className={`pb-4 px-2 font-bold text-lg transition-all relative ${activeTab === 'students'
                                ? 'text-primary'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            학생 관리
                            {activeTab === 'students' && (
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />
                            )}
                        </button>
                    </div>
                </div>

                {/* 탭 콘텐츠 */}
                {activeTab === 'exams' && (
                    <div className="fade-in">
                        {/* 액션 버튼 */}
                        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCreateExam(true)}
                                    className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                    새 시험 만들기
                                </button>
                                {selectedExamIds.size > 0 && (
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="px-5 py-3 bg-white text-rose-500 border border-rose-100 rounded-xl font-bold hover:bg-rose-50 transition-colors shadow-sm"
                                    >
                                        선택 삭제 ({selectedExamIds.size})
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                                {exams.length > 0 && (
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900 select-none">
                                        <input
                                            type="checkbox"
                                            checked={exams.length > 0 && selectedExamIds.size === exams.length}
                                            onChange={toggleAllSelection}
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        전체 선택
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* 시험 목록 */}
                        {loading ? (
                            <div className="text-center py-24">
                                <div className="animate-spin w-10 h-10 border-4 border-gray-200 border-t-primary rounded-full mx-auto mb-4"></div>
                                <p className="text-gray-500 font-medium">시험 정보를 불러오는 중입니다...</p>
                            </div>
                        ) : exams.length === 0 ? (
                            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
                                    📝
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">아직 생성된 시험이 없습니다</h3>
                                <p className="text-gray-500 mb-8 font-medium">"새 시험 만들기" 버튼을 눌러 첫 시험을 만들어보세요!</p>
                                <button
                                    onClick={() => setShowCreateExam(true)}
                                    className="px-8 py-4 bg-primary text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
                                >
                                    + 첫 시험 만들기
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-5">
                                {exams.map((exam) => (
                                    <div
                                        key={exam.id}
                                        className={`group bg-white rounded-2xl p-6 transition-all border ${exam.isActive
                                            ? 'border-indigo-100 shadow-sm hover:shadow-md hover:border-primary/30'
                                            : 'border-gray-100 bg-gray-50/50 opacity-90 hover:opacity-100 hover:bg-white'
                                            }`}
                                    >
                                        <div className="flex flex-col lg:flex-row gap-6">
                                            {/* 왼쪽: 체크박스 + 정보 */}
                                            <div className="flex items-start gap-5 flex-1">
                                                <div className="pt-1.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedExamIds.has(exam.id)}
                                                        onChange={() => toggleExamSelection(exam.id)}
                                                        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="px-2.5 py-1 bg-indigo-50 text-primary rounded-lg text-xs font-bold tracking-wide">
                                                            {exam.subject}
                                                        </span>
                                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors cursor-pointer" onClick={() => handleSelectExam(exam)}>
                                                            {exam.title}
                                                        </h3>
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${exam.isActive
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-gray-200 text-gray-500'
                                                            }`}>
                                                            {exam.isActive ? '진행중' : '마감됨'}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 font-medium">
                                                        <span className="flex items-center gap-1.5">
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                            {exam.questionCount}문항
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                                            {exam.totalPoints ? (
                                                                <>{exam.totalPoints}점 만점</>
                                                            ) : (
                                                                <> {exam.questionCount * exam.pointsPerQuestion}점 만점</>
                                                            )}
                                                        </span>
                                                        {exam.manualGradablePoints > 0 && (
                                                            <span className="text-amber-600 bg-amber-50 px-1.5 rounded flex items-center gap-1">
                                                                <span>✏️</span> 서술형 {exam.manualGradablePoints}점
                                                            </span>
                                                        )}
                                                        <span className="text-gray-300">|</span>
                                                        <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                                                            응시 {getExamSubmissionCount(exam.id)}명
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 오른쪽: 액션 버튼들 */}
                                            <div className="flex lg:flex-col xl:flex-row flex-wrap gap-2 items-center lg:items-end xl:items-center">
                                                <button
                                                    onClick={() => handleSelectExam(exam)}
                                                    className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors text-sm shadow-sm hover:shadow"
                                                >
                                                    결과 보기
                                                </button>
                                                <button
                                                    onClick={() => setMonitorExam(exam)}
                                                    className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg font-bold hover:bg-indigo-100 transition-colors text-sm flex items-center gap-1"
                                                >
                                                    📡 접속 확인
                                                </button>
                                                <div className="flex flex-col items-end gap-1">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={exam.isActive}
                                                            onChange={() => toggleExamActive(exam.id, !exam.isActive)}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                                    </label>
                                                    <span className={`text-xs font-bold ${exam.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                        {exam.isActive ? '배포 중' : '배포 중지됨'}
                                                    </span>
                                                </div>

                                                <div className="h-4 w-px bg-gray-200 mx-1 hidden lg:block xl:hidden"></div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEditExam(exam)}
                                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="수정"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleCopyExam(exam.id, exam.title)}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="복제"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 01-2-2V5" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteExam(exam.id, exam.title)}
                                                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="삭제"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="fade-in">
                        <StudentManagement classData={classData} exams={exams} />
                    </div>
                )}
            </div>

            {/* 시험 생성 모달 */}
            {showCreateExam && (
                <ExamCreateModal
                    classData={classData}
                    onClose={() => setShowCreateExam(false)}
                    onSubmit={handleCreateExam}
                />
            )}

            {/* 시험 수정 모달 */}
            {editingExam && (
                <ExamCreateModal
                    classData={classData}
                    editData={editingExam}
                    onClose={() => setEditingExam(null)}
                    onSubmit={handleUpdateExam}
                />
            )}

            {/* 접속 확인 패널 */}
            {monitorExam && (
                <MonitorPanel
                    exam={monitorExam}
                    classData={classData}
                    onClose={() => setMonitorExam(null)}
                />
            )}
        </div>
    )
}

export default ClassDetail
