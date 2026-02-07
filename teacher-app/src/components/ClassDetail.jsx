import { useState, useEffect } from 'react'
import {
    subscribeToExams,
    createExam,
    updateExam,
    deleteExam,
    toggleExamActive,
    subscribeToClassSubmissions,
    getExamAnswers
} from '../lib/firebase'
import ResultsView from './ResultsView'
import ExamCreateModal from './ExamCreateModal'
import MonitorPanel from './MonitorPanel'
import StudentManagement from './StudentManagement'

function ClassDetail({ classData, onBack }) {
    const [exams, setExams] = useState([])
    const [submissions, setSubmissions] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateExam, setShowCreateExam] = useState(false)
    const [selectedExam, setSelectedExam] = useState(null)
    const [editingExam, setEditingExam] = useState(null)
    const [monitorExam, setMonitorExam] = useState(null)

    // 탭 상태: 'exams' | 'students'
    const [activeTab, setActiveTab] = useState('exams')

    useEffect(() => {
        const unsubExams = subscribeToExams(classData.id, (examList) => {
            setExams(examList)
            setLoading(false)
        })

        const unsubSubmissions = subscribeToClassSubmissions(classData.id, (subList) => {
            setSubmissions(subList)
        })

        return () => {
            unsubExams()
            unsubSubmissions()
        }
    }, [classData.id])

    const handleCreateExam = async (examData) => {
        const { error } = await createExam(classData.id, examData)
        if (error) {
            alert('시험 생성 실패: ' + error)
            return
        }
        setShowCreateExam(false)
        alert('시험이 생성되었습니다!')
    }

    const handleDeleteExam = async (examId, examTitle) => {
        if (!confirm(`"${examTitle}" 시험을 삭제하시겠습니까?\n모든 제출 기록이 삭제됩니다.`)) {
            return
        }
        const { error } = await deleteExam(examId)
        if (error) {
            alert('삭제 실패: ' + error)
        }
    }

    // 시험 수정 핸들러
    const handleEditExam = async (exam) => {
        const { data, error } = await getExamAnswers(exam.id)
        if (error && !exam.answers) {
            alert('정답 로딩 실패: ' + error)
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
            alert('시험 수정 실패: ' + error)
            return
        }
        setEditingExam(null)
        alert('시험이 수정되었습니다!')
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
            alert('정답 로딩 실패: ' + error)
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
                classData={classData}
                examData={selectedExam}
                answerData={answerData}
                submissions={submissions.filter(s => s.examId === selectedExam.id)}
                onBack={() => setSelectedExam(null)}
                onRefresh={handleRefreshSubmissions}
            />
        )
    }

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                {/* 헤더 */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-800">{classData.name}</h1>
                            <p className="text-gray-500">학생 {classData.studentCount}명</p>
                        </div>
                    </div>

                    {/* 탭 버튼 */}
                    <div className="flex gap-2 border-b border-gray-200 -mx-6 px-6">
                        <button
                            onClick={() => setActiveTab('exams')}
                            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${activeTab === 'exams'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            📝 시험 관리
                        </button>
                        <button
                            onClick={() => setActiveTab('students')}
                            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${activeTab === 'students'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            👥 학생 관리
                        </button>
                    </div>
                </div>

                {/* 탭 콘텐츠 */}
                {activeTab === 'exams' && (
                    <>
                        {/* 시험 생성 버튼 */}
                        <div className="mb-6">
                            <button
                                onClick={() => setShowCreateExam(true)}
                                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                            >
                                + 새 시험 만들기
                            </button>
                        </div>

                        {/* 시험 목록 */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">시험 목록</h2>

                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                                </div>
                            ) : exams.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-500">아직 생성된 시험이 없습니다</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {exams.map((exam) => (
                                        <div
                                            key={exam.id}
                                            className={`border-2 rounded-xl p-4 transition-all ${exam.isActive
                                                ? 'border-green-200 bg-green-50'
                                                : 'border-gray-200 bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-sm font-semibold">
                                                            {exam.subject}
                                                        </span>
                                                        <h3 className="text-lg font-bold text-gray-800">{exam.title}</h3>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${exam.isActive
                                                            ? 'bg-green-200 text-green-800'
                                                            : 'bg-gray-300 text-gray-600'
                                                            }`}>
                                                            {exam.isActive ? '진행중' : '마감'}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-500 text-sm">
                                                        {exam.questionCount}문항
                                                        {exam.totalPoints ? (
                                                            <> • {exam.totalPoints}점 만점</>
                                                        ) : (
                                                            <> × {exam.pointsPerQuestion}점 = {exam.questionCount * exam.pointsPerQuestion}점 만점</>
                                                        )}
                                                        {exam.manualGradablePoints > 0 && (
                                                            <span className="text-yellow-600"> (서술형 {exam.manualGradablePoints}점)</span>
                                                        )}
                                                        {exam.timeLimit > 0 && ` • 제한시간 ${exam.timeLimit}분`}
                                                        {' • '}응시 {getExamSubmissionCount(exam.id)}/{classData.studentCount}명
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => handleSelectExam(exam)}
                                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors text-sm"
                                                    >
                                                        결과 보기
                                                    </button>
                                                    <button
                                                        onClick={() => setMonitorExam(exam)}
                                                        className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-200 transition-colors text-sm flex items-center gap-1"
                                                    >
                                                        📡 접속 확인
                                                    </button>
                                                    <button
                                                        onClick={() => toggleExamActive(exam.id, !exam.isActive)}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-sm transition-all shadow-sm border ${exam.isActive
                                                            ? 'bg-green-500 border-green-600 text-white'
                                                            : 'bg-gray-200 border-gray-300 text-gray-500 hover:bg-gray-300'
                                                            }`}
                                                    >
                                                        {exam.isActive ? (
                                                            <>
                                                                배포중
                                                                <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                                                                배포마감
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditExam(exam)}
                                                        className="px-4 py-2 bg-purple-100 text-purple-600 rounded-lg font-semibold hover:bg-purple-200 transition-colors text-sm"
                                                    >
                                                        ✏️ 수정
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteExam(exam.id, exam.title)}
                                                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition-colors text-sm"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'students' && (
                    <StudentManagement classData={classData} />
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
