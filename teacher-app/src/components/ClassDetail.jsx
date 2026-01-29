import { useState, useEffect } from 'react'
import {
    subscribeToExams,
    createExam,
    deleteExam,
    toggleExamActive,
    subscribeToClassSubmissions
} from '../lib/firebase'
import ResultsView from './ResultsView'

function ClassDetail({ classData, onBack }) {
    const [exams, setExams] = useState([])
    const [submissions, setSubmissions] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateExam, setShowCreateExam] = useState(false)
    const [selectedExam, setSelectedExam] = useState(null)

    // 시험 생성 폼
    const [examTitle, setExamTitle] = useState('')
    const [examSubject, setExamSubject] = useState('')
    const [questionCount, setQuestionCount] = useState(25)
    const [answers, setAnswers] = useState(Array(25).fill(0))
    const [pointsPerQuestion, setPointsPerQuestion] = useState(4)
    const [timeLimit, setTimeLimit] = useState(0)
    const [creating, setCreating] = useState(false)

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

    const handleQuestionCountChange = (count) => {
        const newCount = Math.max(1, Math.min(50, count))
        setQuestionCount(newCount)
        setAnswers(prev => {
            if (newCount > prev.length) {
                return [...prev, ...Array(newCount - prev.length).fill(0)]
            }
            return prev.slice(0, newCount)
        })
    }

    const handleAnswerChange = (index, value) => {
        setAnswers(prev => {
            const newAnswers = [...prev]
            newAnswers[index] = value
            return newAnswers
        })
    }

    const handleCreateExam = async () => {
        if (!examTitle.trim()) {
            alert('시험 이름을 입력하세요')
            return
        }
        if (!examSubject.trim()) {
            alert('과목을 입력하세요')
            return
        }
        if (answers.some(a => a === 0)) {
            alert('모든 문항의 정답을 입력하세요')
            return
        }

        setCreating(true)
        const { error } = await createExam(classData.id, {
            title: examTitle.trim(),
            subject: examSubject.trim(),
            answers,
            pointsPerQuestion,
            timeLimit
        })
        setCreating(false)

        if (error) {
            alert('시험 생성 실패: ' + error)
            return
        }

        setShowCreateExam(false)
        resetExamForm()
        alert('시험이 생성되었습니다!')
    }

    const resetExamForm = () => {
        setExamTitle('')
        setExamSubject('')
        setQuestionCount(25)
        setAnswers(Array(25).fill(0))
        setPointsPerQuestion(4)
        setTimeLimit(0)
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

    const getExamSubmissionCount = (examId) => {
        return submissions.filter(s => s.examId === examId).length
    }

    if (selectedExam) {
        return (
            <ResultsView
                classData={classData}
                examData={selectedExam}
                submissions={submissions.filter(s => s.examId === selectedExam.id)}
                onBack={() => setSelectedExam(null)}
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
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">{classData.name}</h1>
                            <p className="text-gray-500">시험 관리 • 학생 {classData.studentCount}명</p>
                        </div>
                    </div>
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
                                            <div className="flex items-center gap-2 mb-1">
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
                                                {exam.questionCount}문항 × {exam.pointsPerQuestion}점 = {exam.questionCount * exam.pointsPerQuestion}점 만점
                                                {exam.timeLimit > 0 && ` • 제한시간 ${exam.timeLimit}분`}
                                                {' • '}응시 {getExamSubmissionCount(exam.id)}/{classData.studentCount}명
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => setSelectedExam(exam)}
                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors text-sm"
                                            >
                                                결과 보기
                                            </button>
                                            <button
                                                onClick={() => toggleExamActive(exam.id, !exam.isActive)}
                                                className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${exam.isActive
                                                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    }`}
                                            >
                                                {exam.isActive ? '마감하기' : '재개하기'}
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
            </div>

            {/* 시험 생성 모달 */}
            {showCreateExam && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-auto">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">새 시험 만들기</h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">과목</label>
                                    <input
                                        type="text"
                                        value={examSubject}
                                        onChange={(e) => setExamSubject(e.target.value)}
                                        placeholder="예: 수학"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">시험명</label>
                                    <input
                                        type="text"
                                        value={examTitle}
                                        onChange={(e) => setExamTitle(e.target.value)}
                                        placeholder="예: 1학기 중간고사"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">문항 수</label>
                                    <input
                                        type="number"
                                        value={questionCount}
                                        onChange={(e) => handleQuestionCountChange(parseInt(e.target.value) || 1)}
                                        min="1"
                                        max="50"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">문항당 배점</label>
                                    <input
                                        type="number"
                                        value={pointsPerQuestion}
                                        onChange={(e) => setPointsPerQuestion(parseInt(e.target.value) || 1)}
                                        min="1"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">제한시간 (분, 0=무제한)</label>
                                    <input
                                        type="number"
                                        value={timeLimit}
                                        onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                                        min="0"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    정답 입력 (1~4)
                                </label>
                                <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                                    {answers.map((answer, index) => (
                                        <div key={index} className="text-center">
                                            <div className="text-xs text-gray-500 mb-1">{index + 1}번</div>
                                            <select
                                                value={answer}
                                                onChange={(e) => handleAnswerChange(index, parseInt(e.target.value))}
                                                className={`w-full px-2 py-2 border-2 rounded-lg text-center font-bold ${answer === 0
                                                        ? 'border-red-300 bg-red-50'
                                                        : 'border-green-300 bg-green-50'
                                                    }`}
                                            >
                                                <option value={0}>-</option>
                                                <option value={1}>①</option>
                                                <option value={2}>②</option>
                                                <option value={3}>③</option>
                                                <option value={4}>④</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-sm text-gray-500 mt-2">
                                    만점: {questionCount * pointsPerQuestion}점 •
                                    입력 완료: {answers.filter(a => a !== 0).length}/{questionCount}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setShowCreateExam(false); resetExamForm() }}
                                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreateExam}
                                disabled={creating}
                                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                                {creating ? '생성중...' : '시험 생성'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ClassDetail
