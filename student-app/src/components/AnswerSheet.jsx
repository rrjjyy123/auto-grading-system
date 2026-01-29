import { useState, useEffect } from 'react'
import { submitAnswers } from '../lib/firebase'

function AnswerSheet({ studentData, examData, onSubmit, onBack }) {
    const [answers, setAnswers] = useState(Array(examData.questionCount).fill(0))
    const [submitting, setSubmitting] = useState(false)
    const [timeLeft, setTimeLeft] = useState(examData.timeLimit * 60) // 초 단위
    const [showConfirm, setShowConfirm] = useState(false)

    const { studentCode, classData } = studentData

    // 타이머
    useEffect(() => {
        if (examData.timeLimit <= 0) return

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    handleForceSubmit()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [examData.timeLimit])

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleAnswerSelect = (questionIndex, answerValue) => {
        setAnswers(prev => {
            const newAnswers = [...prev]
            // 같은 답 클릭시 해제
            newAnswers[questionIndex] = newAnswers[questionIndex] === answerValue ? 0 : answerValue
            return newAnswers
        })
    }

    const unansweredCount = answers.filter(a => a === 0).length

    const handleSubmitClick = () => {
        if (unansweredCount > 0) {
            if (!confirm(`${unansweredCount}개 문항이 미입력 상태입니다.\n그래도 제출하시겠습니까?`)) {
                return
            }
        }
        setShowConfirm(true)
    }

    const handleForceSubmit = async () => {
        await doSubmit()
    }

    const doSubmit = async () => {
        setSubmitting(true)

        const result = await submitAnswers(
            examData.id,
            classData.id,
            studentCode.studentNumber,
            studentCode.code,
            answers
        )

        setSubmitting(false)

        if (result.success) {
            onSubmit({
                score: result.score,
                correctCount: result.correctCount,
                totalQuestions: result.totalQuestions,
                examTitle: examData.title,
                subject: examData.subject
            })
        } else {
            alert('제출 실패: ' + result.error)
        }
    }

    return (
        <div className="min-h-screen p-4 pb-24">
            <div className="max-w-2xl mx-auto">
                {/* 헤더 */}
                <div className="bg-white rounded-2xl shadow-lg p-4 mb-4 sticky top-4 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-sm font-semibold">
                                        {examData.subject}
                                    </span>
                                    <span className="font-bold text-gray-800">{studentCode.studentNumber}번</span>
                                </div>
                                <p className="text-sm text-gray-500">{examData.title}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {examData.timeLimit > 0 && (
                                <div className={`text-xl font-mono font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-blue-600'
                                    }`}>
                                    {formatTime(timeLeft)}
                                </div>
                            )}
                            <div className="text-sm text-gray-500">
                                {examData.questionCount - unansweredCount}/{examData.questionCount} 완료
                            </div>
                        </div>
                    </div>
                </div>

                {/* 답안지 */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="grid gap-4">
                        {answers.map((answer, qIndex) => (
                            <div
                                key={qIndex}
                                className={`p-4 rounded-xl border-2 transition-all ${answer === 0
                                        ? 'border-gray-200 bg-gray-50'
                                        : 'border-green-300 bg-green-50'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 flex items-center justify-center bg-blue-100 text-blue-700 font-bold rounded-xl text-lg">
                                        {qIndex + 1}
                                    </div>
                                    <div className="flex gap-2 flex-1">
                                        {[1, 2, 3, 4].map((num) => (
                                            <button
                                                key={num}
                                                onClick={() => handleAnswerSelect(qIndex, num)}
                                                className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${answer === num
                                                        ? 'bg-blue-500 text-white scale-105'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {['①', '②', '③', '④'][num - 1]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 미입력 문항 알림 */}
                {unansweredCount > 0 && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
                        <p className="text-yellow-700 font-semibold">
                            ⚠️ {unansweredCount}개 문항이 미입력 상태입니다
                        </p>
                        <p className="text-sm text-yellow-600 mt-1">
                            미입력: {answers.map((a, i) => a === 0 ? i + 1 : null).filter(Boolean).join(', ')}번
                        </p>
                    </div>
                )}
            </div>

            {/* 제출 버튼 (고정) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#FFF8E7] to-transparent">
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={handleSubmitClick}
                        disabled={submitting}
                        className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-lg"
                    >
                        {submitting ? '제출 중...' : '답안 제출하기'}
                    </button>
                </div>
            </div>

            {/* 제출 확인 모달 */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">제출 확인</h2>

                        <div className="mb-6">
                            <div className="text-center mb-4">
                                <p className="text-gray-600">입력한 답안을 제출하시겠습니까?</p>
                                <p className="text-sm text-gray-500 mt-2">
                                    제출 후에는 수정할 수 없습니다
                                </p>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-xl text-center">
                                <p className="text-sm text-gray-500">입력 완료</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {examData.questionCount - unansweredCount} / {examData.questionCount}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={doSubmit}
                                disabled={submitting}
                                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                                {submitting ? '제출 중...' : '제출하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AnswerSheet
