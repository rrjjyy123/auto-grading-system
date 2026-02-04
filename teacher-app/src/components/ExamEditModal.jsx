import { useState, useEffect } from 'react'

const QUESTION_TYPES = [
    { value: 'choice4', label: '4지선다', icon: '④' },
    { value: 'choice5', label: '5지선다', icon: '⑤' },
    { value: 'ox', label: 'O/X', icon: '○' },
    { value: 'short', label: '단답형', icon: '✏️' },
    { value: 'essay', label: '서술형', icon: '📝' }
]

function ExamEditModal({ exam, answerData, onSave, onClose }) {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        subject: exam.subject || '',
        title: exam.title || '',
        defaultType: exam.defaultType || 'choice4',
        questionCount: exam.questionCount || 25,
        timeLimit: exam.timeLimit || 0
    })
    const [questions, setQuestions] = useState([])
    const [saving, setSaving] = useState(false)

    // 기존 문항 데이터 로드
    useEffect(() => {
        if (answerData?.questions) {
            setQuestions(answerData.questions)
        } else if (exam.answers) {
            // 기존 형식 → 새 형식 변환
            const converted = exam.answers.map((ans, idx) => ({
                num: idx + 1,
                type: 'choice4',
                points: exam.pointsPerQuestion || 4,
                correctAnswers: [ans],
                answerLogic: 'and',
                isMultipleAnswer: false
            }))
            setQuestions(converted)
        }
    }, [exam, answerData])

    // 총점 계산
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)

    // 문항 수 변경 핸들러
    const handleQuestionCountChange = (count) => {
        const newCount = Math.max(1, Math.min(100, count))
        setFormData(prev => ({ ...prev, questionCount: newCount }))

        // 문항 배열 조정
        const currentQuestions = [...questions]
        const defaultPoints = Math.round(100 / newCount)

        if (newCount > currentQuestions.length) {
            // 문항 추가
            for (let i = currentQuestions.length; i < newCount; i++) {
                currentQuestions.push({
                    num: i + 1,
                    type: formData.defaultType,
                    points: defaultPoints,
                    correctAnswers: formData.defaultType === 'ox' ? ['O'] : [1],
                    answerLogic: 'and',
                    isMultipleAnswer: false
                })
            }
        } else {
            // 문항 제거
            currentQuestions.length = newCount
        }

        setQuestions(currentQuestions)
    }

    // 문항 속성 변경
    const updateQuestion = (index, updates) => {
        setQuestions(prev => {
            const newQuestions = [...prev]
            newQuestions[index] = { ...newQuestions[index], ...updates }
            return newQuestions
        })
    }

    // 정답 변경 (객관식)
    const toggleAnswer = (qIndex, value) => {
        const q = questions[qIndex]
        let newAnswers = [...(q.correctAnswers || [])]

        if (q.isMultipleAnswer) {
            if (newAnswers.includes(value)) {
                newAnswers = newAnswers.filter(a => a !== value)
            } else {
                newAnswers.push(value)
                newAnswers.sort((a, b) => a - b)
            }
        } else {
            newAnswers = [value]
        }

        updateQuestion(qIndex, { correctAnswers: newAnswers })
    }

    // Step 2로 이동
    const goToStep2 = () => {
        // 문항 배열 초기화 (변경된 경우)
        if (questions.length !== formData.questionCount) {
            handleQuestionCountChange(formData.questionCount)
        }
        setStep(2)
    }

    // 저장
    const handleSave = async () => {
        setSaving(true)

        const examData = {
            ...formData,
            questions,
            totalPoints,
            autoGradablePoints: questions
                .filter(q => q.type !== 'essay')
                .reduce((sum, q) => sum + q.points, 0),
            manualGradablePoints: questions
                .filter(q => q.type === 'essay')
                .reduce((sum, q) => sum + q.points, 0)
        }

        await onSave(examData)
        setSaving(false)
    }

    const choiceLabels = ['①', '②', '③', '④', '⑤']

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-purple-500">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">
                            시험 수정 - Step {step}/2
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    {/* 진행 표시 */}
                    <div className="flex gap-2 mt-4">
                        <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-white' : 'bg-white/30'}`}></div>
                        <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-white' : 'bg-white/30'}`}></div>
                    </div>
                </div>

                {/* 본문 */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: 기본 설정 */}
                    {step === 1 && (
                        <div className="space-y-6">
                            {/* 과목 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">과목</label>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                    placeholder="예: 수학"
                                />
                            </div>

                            {/* 제목 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">시험 제목</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                    placeholder="예: 1단원 평가"
                                />
                            </div>

                            {/* 문항 수 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">문항 수</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={formData.questionCount}
                                    onChange={e => setFormData(prev => ({ ...prev, questionCount: parseInt(e.target.value) || 1 }))}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            {/* 제한시간 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    제한 시간 (분, 0 = 무제한)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.timeLimit}
                                    onChange={e => setFormData(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 0 }))}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: 문항별 설정 */}
                    {step === 2 && (
                        <div className="space-y-4">
                            {/* 총점 표시 */}
                            <div className="p-4 bg-blue-50 rounded-xl">
                                <span className="font-semibold">총점: </span>
                                <span className={`text-2xl font-bold ${totalPoints === 100 ? 'text-green-600' : 'text-orange-600'}`}>
                                    {totalPoints}점
                                </span>
                                {totalPoints !== 100 && (
                                    <span className="ml-2 text-sm text-orange-600">(100점 권장)</span>
                                )}
                            </div>

                            {/* 문항 목록 */}
                            {questions.map((q, idx) => (
                                <div key={idx} className="p-4 border-2 border-gray-200 rounded-xl">
                                    <div className="flex items-center gap-4 mb-3">
                                        <span className="w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-700 font-bold rounded-lg">
                                            {idx + 1}
                                        </span>

                                        {/* 문제 유형 */}
                                        <select
                                            value={q.type}
                                            onChange={e => {
                                                const newType = e.target.value
                                                let newAnswers = q.correctAnswers
                                                if (newType === 'ox') newAnswers = ['O']
                                                else if (newType === 'choice4' || newType === 'choice5') {
                                                    newAnswers = Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0
                                                        ? q.correctAnswers.filter(a => typeof a === 'number')
                                                        : [1]
                                                    if (newAnswers.length === 0) newAnswers = [1]
                                                }
                                                else if (newType === 'short') newAnswers = ['']
                                                else if (newType === 'essay') newAnswers = []
                                                updateQuestion(idx, { type: newType, correctAnswers: newAnswers })
                                            }}
                                            className="px-3 py-2 border rounded-lg"
                                        >
                                            {QUESTION_TYPES.map(t => (
                                                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                                            ))}
                                        </select>

                                        {/* 배점 */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={q.points}
                                                onChange={e => updateQuestion(idx, { points: parseInt(e.target.value) || 1 })}
                                                className="w-16 px-2 py-2 border rounded-lg text-center"
                                            />
                                            <span className="text-gray-500">점</span>
                                        </div>

                                        {/* 복수 정답 체크박스 (객관식만) */}
                                        {(q.type === 'choice4' || q.type === 'choice5') && (
                                            <label className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={q.isMultipleAnswer}
                                                    onChange={e => updateQuestion(idx, { isMultipleAnswer: e.target.checked })}
                                                    className="w-4 h-4"
                                                />
                                                복수정답
                                            </label>
                                        )}
                                    </div>

                                    {/* 정답 입력 */}
                                    <div className="ml-14">
                                        {/* 객관식 정답 */}
                                        {(q.type === 'choice4' || q.type === 'choice5') && (
                                            <div className="flex gap-2">
                                                {choiceLabels.slice(0, q.type === 'choice4' ? 4 : 5).map((label, i) => {
                                                    const value = i + 1
                                                    const isSelected = q.correctAnswers?.includes(value)
                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => toggleAnswer(idx, value)}
                                                            className={`w-10 h-10 rounded-lg font-bold transition-all ${isSelected
                                                                ? 'bg-green-500 text-white'
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                                }`}
                                                        >
                                                            {label}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        {/* O/X 정답 */}
                                        {q.type === 'ox' && (
                                            <div className="flex gap-2">
                                                {['O', 'X'].map(val => (
                                                    <button
                                                        key={val}
                                                        onClick={() => updateQuestion(idx, { correctAnswers: [val] })}
                                                        className={`w-12 h-12 rounded-lg font-bold text-xl transition-all ${q.correctAnswers?.[0] === val
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {val}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* 단답형 정답 */}
                                        {q.type === 'short' && (
                                            <input
                                                type="text"
                                                value={q.correctAnswers?.[0] || ''}
                                                onChange={e => updateQuestion(idx, { correctAnswers: [e.target.value] })}
                                                placeholder="정답 입력"
                                                className="px-3 py-2 border rounded-lg w-48"
                                            />
                                        )}

                                        {/* 서술형 안내 */}
                                        {q.type === 'essay' && (
                                            <span className="text-gray-500 text-sm">수동 채점 필요</span>
                                        )}
                                    </div>

                                    {/* 추가 설정: 영역 & 해설 */}
                                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">영역 (Category)</label>
                                            <input
                                                type="text"
                                                value={q.category || ''}
                                                onChange={(e) => updateQuestion(idx, { category: e.target.value })}
                                                placeholder="예: 집합, 방정식"
                                                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">해설 (Explanation)</label>
                                            <textarea
                                                value={q.explanation || ''}
                                                onChange={(e) => updateQuestion(idx, { explanation: e.target.value })}
                                                placeholder="문제 풀이 과정 설명"
                                                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white h-[42px] focus:h-24 resize-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="p-6 border-t bg-gray-50 flex justify-between">
                    {step === 1 ? (
                        <>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                            >
                                취소
                            </button>
                            <button
                                onClick={goToStep2}
                                disabled={!formData.subject || !formData.title}
                                className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50"
                            >
                                다음 →
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                            >
                                ← 이전
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
                            >
                                {saving ? '저장 중...' : '💾 저장'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ExamEditModal
