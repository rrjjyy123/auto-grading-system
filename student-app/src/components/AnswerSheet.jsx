import { useState, useEffect } from 'react'
import { submitAnswers } from '../lib/firebase'

function AnswerSheet({ studentData, examData, onSubmit, onBack }) {
    // 문항별 타입에 맞는 초기값 생성
    const initializeAnswers = () => {
        if (examData.questions) {
            // 새 형식
            return examData.questions.map(q => {
                if (q.type === 'choice4' || q.type === 'choice5') {
                    return [] // 복수선택 지원을 위해 배열
                } else if (q.type === 'ox') {
                    return null // O 또는 X
                } else if (q.type === 'short' || q.type === 'essay') {
                    return '' // 텍스트
                }
                return null
            })
        }
        // 기존 형식 (4지선다만)
        return Array(examData.questionCount).fill(0)
    }

    const [answers, setAnswers] = useState(initializeAnswers())
    const [submitting, setSubmitting] = useState(false)
    const [timeLeft, setTimeLeft] = useState(examData.timeLimit * 60)
    const [showConfirm, setShowConfirm] = useState(false)

    const { studentCode, classData } = studentData

    // 새 형식인지 확인
    const isNewFormat = !!examData.questions

    // 문항 정보 가져오기
    const getQuestion = (index) => {
        if (isNewFormat) {
            return examData.questions[index]
        }
        // 기존 형식 - 4지선다로 가정
        return {
            num: index + 1,
            type: 'choice4',
            points: examData.pointsPerQuestion || 4
        }
    }

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

    // 객관식 답 선택 (새 형식)
    const handleChoiceSelect = (qIndex, value) => {
        const question = getQuestion(qIndex)

        setAnswers(prev => {
            const newAnswers = [...prev]
            const currentAnswer = newAnswers[qIndex]

            // 모든 문항 복수 선택 허용 (OMR 방식)
            // 정답이 하나인 문항도 학생이 실수로 2개를 마킹할 수 있음 -> 그러면 오답 처리됨
            const isMultiple = true

            if (isMultiple) {
                // 복수선택 모드 (항상 적용)
                if (Array.isArray(currentAnswer)) {
                    if (currentAnswer.includes(value)) {
                        newAnswers[qIndex] = currentAnswer.filter(v => v !== value)
                    } else {
                        newAnswers[qIndex] = [...currentAnswer, value].sort((a, b) => a - b)
                    }
                } else {
                    newAnswers[qIndex] = [value]
                }
            }
            return newAnswers
        })
    }

    // 기존 형식 답 선택
    const handleLegacyAnswerSelect = (qIndex, value) => {
        setAnswers(prev => {
            const newAnswers = [...prev]
            newAnswers[qIndex] = newAnswers[qIndex] === value ? 0 : value
            return newAnswers
        })
    }

    // O/X 답 선택
    const handleOXSelect = (qIndex, value) => {
        setAnswers(prev => {
            const newAnswers = [...prev]
            newAnswers[qIndex] = newAnswers[qIndex] === value ? null : value
            return newAnswers
        })
    }

    // 텍스트 입력 (단답형/서술형)
    const handleTextChange = (qIndex, value) => {
        setAnswers(prev => {
            const newAnswers = [...prev]
            newAnswers[qIndex] = value
            return newAnswers
        })
    }

    // 미입력 문항 수 계산
    const getUnansweredCount = () => {
        return answers.filter((a, idx) => {
            const q = getQuestion(idx)
            if (q.type === 'essay') return false // 서술형은 빈칸 허용
            if (Array.isArray(a)) return a.length === 0
            if (a === null || a === 0 || a === '') return true
            return false
        }).length
    }

    const unansweredCount = getUnansweredCount()

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

        // 새 형식에 맞게 답안 구성
        const submissionAnswers = isNewFormat
            ? answers.map((a, idx) => ({
                num: idx + 1,
                type: getQuestion(idx).type,
                value: a
            }))
            : answers

        const result = await submitAnswers(
            examData.id,
            classData.id,
            studentCode.studentNumber,
            studentCode.code,
            submissionAnswers
        )

        setSubmitting(false)

        if (result.success) {
            onSubmit({
                submitted: true,
                totalQuestions: result.totalQuestions,
                examTitle: examData.title,
                subject: examData.subject,
                hasEssay: result.hasEssay,
                essayCount: result.essayCount
            })
        } else {
            alert('제출 실패: ' + result.error)
        }
    }

    // 문항 렌더링
    const renderQuestion = (qIndex) => {
        const question = getQuestion(qIndex)
        const answer = answers[qIndex]
        const isAnswered = Array.isArray(answer)
            ? answer.length > 0
            : (answer !== null && answer !== 0 && answer !== '')

        const choiceLabels = ['①', '②', '③', '④', '⑤']

        return (
            <div
                key={qIndex}
                className={`p-4 rounded-xl border-2 transition-all ${isAnswered
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                    }`}
            >
                <div className="flex items-start gap-4">
                    {/* 문항 번호 */}
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 flex items-center justify-center bg-blue-100 text-blue-700 font-bold rounded-xl text-lg">
                            {qIndex + 1}
                        </div>
                        {isNewFormat && (
                            <span className="text-xs text-gray-500 mt-1">
                                {question.points}점
                            </span>
                        )}
                        {/* 복수선택 표시 제거 (사용자 요청) */}
                    </div>

                    {/* 답안 입력 영역 */}
                    <div className="flex-1">
                        {/* 객관식 4지선다 */}
                        {question.type === 'choice4' && (
                            <div className="flex gap-2">
                                {[1, 2, 3, 4].map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => isNewFormat
                                            ? handleChoiceSelect(qIndex, num)
                                            : handleLegacyAnswerSelect(qIndex, num)
                                        }
                                        className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${(Array.isArray(answer) ? answer.includes(num) : answer === num)
                                            ? 'bg-blue-500 text-white scale-105'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {choiceLabels[num - 1]}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 객관식 5지선다 */}
                        {question.type === 'choice5' && (
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => handleChoiceSelect(qIndex, num)}
                                        className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${(Array.isArray(answer) && answer.includes(num))
                                            ? 'bg-blue-500 text-white scale-105'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {choiceLabels[num - 1]}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* O/X */}
                        {question.type === 'ox' && (
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleOXSelect(qIndex, 'O')}
                                    className={`flex-1 py-4 rounded-xl font-bold text-2xl transition-all ${answer === 'O'
                                        ? 'bg-blue-500 text-white scale-105'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    O
                                </button>
                                <button
                                    onClick={() => handleOXSelect(qIndex, 'X')}
                                    className={`flex-1 py-4 rounded-xl font-bold text-2xl transition-all ${answer === 'X'
                                        ? 'bg-red-500 text-white scale-105'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    X
                                </button>
                            </div>
                        )}

                        {/* 단답형 */}
                        {question.type === 'short' && (
                            <input
                                type="text"
                                value={answer || ''}
                                onChange={(e) => handleTextChange(qIndex, e.target.value)}
                                placeholder="정답을 입력하세요"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg"
                            />
                        )}

                        {/* 서술형 */}
                        {question.type === 'essay' && (
                            <div>
                                <textarea
                                    value={answer || ''}
                                    onChange={(e) => handleTextChange(qIndex, e.target.value)}
                                    placeholder="답안을 작성하세요"
                                    rows={4}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                                />
                                <p className="text-xs text-yellow-600 mt-1">
                                    ⚠️ 서술형은 선생님이 직접 채점합니다
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // 기존 형식 렌더링
    const renderLegacyQuestion = (qIndex, answer) => {
        return (
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
                                onClick={() => handleLegacyAnswerSelect(qIndex, num)}
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
        )
    }

    // 완료 수 계산
    const getCompletedCount = () => {
        return answers.filter((a, idx) => {
            const q = getQuestion(idx)
            if (q.type === 'essay') return a && a.length > 0
            if (Array.isArray(a)) return a.length > 0
            return a !== null && a !== 0 && a !== ''
        }).length
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
                                {getCompletedCount()}/{examData.questionCount} 완료
                            </div>
                        </div>
                    </div>
                </div>

                {/* 답안지 */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="grid gap-4">
                        {isNewFormat
                            ? answers.map((_, qIndex) => renderQuestion(qIndex))
                            : answers.map((answer, qIndex) => renderLegacyQuestion(qIndex, answer))
                        }
                    </div>
                </div>

                {/* 미입력 문항 알림 */}
                {unansweredCount > 0 && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
                        <p className="text-yellow-700 font-semibold">
                            ⚠️ {unansweredCount}개 문항이 미입력 상태입니다
                        </p>
                        <p className="text-sm text-yellow-600 mt-1">
                            미입력: {answers.map((a, i) => {
                                const q = getQuestion(i)
                                if (q.type === 'essay') return null
                                if (Array.isArray(a)) return a.length === 0 ? i + 1 : null
                                return (a === null || a === 0 || a === '') ? i + 1 : null
                            }).filter(Boolean).join(', ')}번
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
                                    {getCompletedCount()} / {examData.questionCount}
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
