import { useState } from 'react'

/**
 * 시험 생성 모달 - 2단계 방식
 * Step 1: 기본 설정 (과목, 시험명, 기본 문제 유형, 문항 수)
 * Step 2: 문항별 설정 (타입 변경, 정답 입력, 배점 조정)
 */
function ExamCreateModal({ classData, onClose, onSubmit }) {
    const [step, setStep] = useState(1)
    const [creating, setCreating] = useState(false)

    // Step 1: 기본 설정
    const [examSubject, setExamSubject] = useState('')
    const [examTitle, setExamTitle] = useState('')
    const [questionCount, setQuestionCount] = useState(25)
    const [timeLimit, setTimeLimit] = useState(0)
    const [allowRetake, setAllowRetake] = useState(false)

    // Step 2: 문항별 설정
    const [questions, setQuestions] = useState([])

    // 문제 유형 옵션
    const questionTypes = [
        { value: 'choice4', label: '4지선다', icon: '④' },
        { value: 'choice5', label: '5지선다', icon: '⑤' },
        { value: 'ox', label: 'O/X', icon: 'OX' },
        { value: 'short', label: '단답형', icon: '✎' },
        { value: 'essay', label: '서술형', icon: '📝' }
    ]

    // Step 1 → Step 2: 문항 생성
    const handleGenerateQuestions = () => {
        if (!examSubject.trim()) {
            alert('과목을 입력하세요')
            return
        }
        if (!examTitle.trim()) {
            alert('시험 이름을 입력하세요')
            return
        }
        if (questionCount < 1 || questionCount > 100) {
            alert('문항 수는 1~100 사이로 입력하세요')
            return
        }

        // 기본 배점 계산 (100점 기준)
        const basePoints = Math.floor(100 / questionCount)
        const remainder = 100 - (basePoints * questionCount)

        // 문항 배열 생성
        const generatedQuestions = Array(questionCount).fill(null).map((_, idx) => ({
            num: idx + 1,
            type: defaultType,
            correctAnswers: defaultType === 'essay' ? null : [],
            answerLogic: 'and',
            points: basePoints + (idx < remainder ? 1 : 0),  // 나머지 점수 앞 문항에 분배
            shortAnswerInput: '',  // 단답형 입력 임시 저장
            isMultipleAnswer: false,  // 복수정답 여부
            category: '', // 영역 (선택)
            explanation: '' // 해설 (선택)
        }))

        setQuestions(generatedQuestions)
        setStep(2)
    }

    // 문항 수 변경 핸들러
    const handleQuestionCountChange = (count) => {
        const newCount = Math.max(1, Math.min(100, count))
        setQuestionCount(newCount)
    }

    // 문항 타입 변경
    const handleTypeChange = (index, newType) => {
        setQuestions(prev => {
            const updated = [...prev]
            updated[index] = {
                ...updated[index],
                type: newType,
                correctAnswers: newType === 'essay' ? null : [],
                isMultipleAnswer: false,
                shortAnswerInput: ''
            }
            return updated
        })
    }

    // 배점 변경
    const handlePointsChange = (index, points) => {
        setQuestions(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], points: Math.max(0, points) }
            return updated
        })
    }

    // 객관식 정답 토글
    const handleChoiceToggle = (qIndex, choice) => {
        setQuestions(prev => {
            const updated = [...prev]
            const q = updated[qIndex]

            if (q.isMultipleAnswer) {
                // 복수 정답 모드
                if (q.correctAnswers.includes(choice)) {
                    updated[qIndex] = {
                        ...q,
                        correctAnswers: q.correctAnswers.filter(c => c !== choice)
                    }
                } else {
                    updated[qIndex] = {
                        ...q,
                        correctAnswers: [...q.correctAnswers, choice].sort((a, b) => a - b)
                    }
                }
            } else {
                // 단일 정답 모드
                updated[qIndex] = {
                    ...q,
                    correctAnswers: [choice]
                }
            }
            return updated
        })
    }

    // O/X 정답 선택
    const handleOXSelect = (qIndex, value) => {
        setQuestions(prev => {
            const updated = [...prev]
            updated[qIndex] = { ...updated[qIndex], correctAnswers: [value] }
            return updated
        })
    }

    // 복수정답 모드 토글
    const handleMultipleAnswerToggle = (index) => {
        setQuestions(prev => {
            const updated = [...prev]
            updated[index] = {
                ...updated[index],
                isMultipleAnswer: !updated[index].isMultipleAnswer,
                correctAnswers: []  // 모드 변경 시 초기화
            }
            return updated
        })
    }

    // 정답 로직 변경 (AND/OR)
    const handleLogicChange = (index, logic) => {
        setQuestions(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], answerLogic: logic }
            return updated
        })
    }

    // 단답형 정답 추가
    const handleAddShortAnswer = (index) => {
        setQuestions(prev => {
            const updated = [...prev]
            const q = updated[index]
            const input = q.shortAnswerInput.trim()
            if (input && !q.correctAnswers.includes(input)) {
                updated[index] = {
                    ...q,
                    correctAnswers: [...q.correctAnswers, input],
                    shortAnswerInput: ''
                }
            }
            return updated
        })
    }

    // 단답형 정답 삭제
    const handleRemoveShortAnswer = (qIndex, answerIndex) => {
        setQuestions(prev => {
            const updated = [...prev]
            updated[qIndex] = {
                ...updated[qIndex],
                correctAnswers: updated[qIndex].correctAnswers.filter((_, i) => i !== answerIndex)
            }
            return updated
        })
    }

    // 단답형 입력 변경
    const handleShortAnswerInputChange = (index, value) => {
        setQuestions(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], shortAnswerInput: value }
            return updated
        })
    }

    // 영역 변경
    const handleCategoryChange = (index, value) => {
        setQuestions(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], category: value }
            return updated
        })
    }

    // 해설 변경
    const handleExplanationChange = (index, value) => {
        setQuestions(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], explanation: value }
            return updated
        })
    }

    // 총점 계산
    const getTotalPoints = () => {
        return questions.reduce((sum, q) => sum + q.points, 0)
    }

    // 자동채점 가능 점수
    const getAutoGradablePoints = () => {
        return questions.filter(q => q.type !== 'essay').reduce((sum, q) => sum + q.points, 0)
    }

    // 서술형 점수
    const getEssayPoints = () => {
        return questions.filter(q => q.type === 'essay').reduce((sum, q) => sum + q.points, 0)
    }

    // 유효성 검사
    const validateQuestions = () => {
        for (const q of questions) {
            if (q.type !== 'essay') {
                if (!q.correctAnswers || q.correctAnswers.length === 0) {
                    return { valid: false, message: `${q.num}번 문항의 정답을 입력하세요` }
                }
            }
        }
        return { valid: true }
    }

    // 시험 생성
    const handleCreateExam = async () => {
        const validation = validateQuestions()
        if (!validation.valid) {
            alert(validation.message)
            return
        }

        setCreating(true)

        // 제출용 데이터 정리
        const examData = {
            subject: examSubject.trim(),
            title: examTitle.trim(),
            defaultType,
            questionCount: questions.length,
            questions: questions.map(q => ({
                num: q.num,
                type: q.type,
                correctAnswers: q.correctAnswers,
                answerLogic: q.answerLogic,
                points: q.points,
                category: q.category || '',
                explanation: q.explanation || ''
            })),
            totalPoints: getTotalPoints(),
            autoGradablePoints: getAutoGradablePoints(),
            manualGradablePoints: getEssayPoints(),
            timeLimit,
            allowRetake
        }

        await onSubmit(examData)
        setCreating(false)
    }

    // 선택지 숫자 표시
    const choiceLabels = ['①', '②', '③', '④', '⑤']

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-800">
                            {step === 1 ? '새 시험 만들기' : `${examSubject} | ${examTitle}`}
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className={`px-3 py-1 rounded-full ${step === 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                                1. 기본 설정
                            </span>
                            <span className={`px-3 py-1 rounded-full ${step === 2 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                                2. 문항 설정
                            </span>
                        </div>
                    </div>
                </div>

                {/* 컨텐츠 */}
                <div className="flex-1 overflow-auto p-6">
                    {step === 1 ? (
                        /* Step 1: 기본 설정 */
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">과목 *</label>
                                    <input
                                        type="text"
                                        value={examSubject}
                                        onChange={(e) => setExamSubject(e.target.value)}
                                        placeholder="예: 수학"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">시험명 *</label>
                                    <input
                                        type="text"
                                        value={examTitle}
                                        onChange={(e) => setExamTitle(e.target.value)}
                                        placeholder="예: 1학기 중간고사"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">기본 문제 유형</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {questionTypes.filter(t => t.value !== 'essay').map((type) => (
                                        <button
                                            key={type.value}
                                            onClick={() => setDefaultType(type.value)}
                                            className={`p-4 border-2 rounded-xl text-center transition-all ${defaultType === type.value
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="text-2xl mb-1">{type.icon}</div>
                                            <div className="font-medium">{type.label}</div>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-sm text-gray-500 mt-2">
                                    💡 모든 문항이 이 유형으로 생성됩니다. 개별 문항은 다음 단계에서 변경할 수 있습니다.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">문항 수</label>
                                    <input
                                        type="number"
                                        value={questionCount}
                                        onChange={(e) => handleQuestionCountChange(parseInt(e.target.value) || 1)}
                                        min="1"
                                        max="100"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">제한시간 (분, 0=무제한)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={timeLimit}
                                            onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                                            min="0"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer text-sm text-gray-600">
                                        <input
                                            type="checkbox"
                                            checked={allowRetake}
                                            onChange={(e) => setAllowRetake(e.target.checked)}
                                            className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                                        />
                                        제출 후 재응시 허용
                                    </label>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl">
                                <p className="text-blue-800">
                                    📊 기본 배점: 각 문항 약 <strong>{Math.round(100 / questionCount * 10) / 10}점</strong> × {questionCount}문항 = <strong>100점</strong> 만점
                                </p>
                                <p className="text-sm text-blue-600 mt-1">
                                    문항별 배점은 다음 단계에서 조정할 수 있습니다.
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* Step 2: 문항별 설정 */
                        <div className="space-y-4">
                            {/* 요약 */}
                            <div className="bg-gray-100 p-3 rounded-xl flex items-center justify-between sticky top-0 z-10">
                                <span className="font-medium">총 {questions.length}문항</span>
                                <span>
                                    자동채점: <strong>{getAutoGradablePoints()}점</strong>
                                    {getEssayPoints() > 0 && (
                                        <> | 서술형: <strong>{getEssayPoints()}점</strong></>
                                    )}
                                    | 총 만점: <strong className="text-blue-600">{getTotalPoints()}점</strong>
                                </span>
                            </div>

                            {/* 문항 리스트 */}
                            {questions.map((q, idx) => (
                                <div key={q.num} className="border-2 border-gray-200 rounded-xl p-4">
                                    <div className="flex items-center gap-4 mb-3">
                                        <span className="font-bold text-lg text-gray-700 w-12">{q.num}번</span>

                                        {/* 타입 선택 */}
                                        <select
                                            value={q.type}
                                            onChange={(e) => handleTypeChange(idx, e.target.value)}
                                            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                                        >
                                            {questionTypes.map((type) => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>

                                        {/* 배점 */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={q.points}
                                                onChange={(e) => handlePointsChange(idx, parseInt(e.target.value) || 0)}
                                                min="0"
                                                className="w-16 px-2 py-2 border-2 border-gray-200 rounded-lg text-center focus:border-blue-500 focus:outline-none"
                                            />
                                            <span className="text-gray-500">점</span>
                                        </div>

                                        {/* 복수정답 토글 (객관식만) */}
                                        {(q.type === 'choice4' || q.type === 'choice5') && (
                                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={q.isMultipleAnswer}
                                                    onChange={() => handleMultipleAnswerToggle(idx)}
                                                    className="w-4 h-4"
                                                />
                                                복수정답
                                            </label>
                                        )}
                                    </div>

                                    {/* 정답 입력 영역 */}
                                    {q.type === 'choice4' || q.type === 'choice5' ? (
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            <span className="text-sm text-gray-500 mr-2">정답:</span>
                                            {Array(q.type === 'choice4' ? 4 : 5).fill(null).map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleChoiceToggle(idx, i + 1)}
                                                    className={`w-10 h-10 rounded-full font-bold transition-all ${q.correctAnswers.includes(i + 1)
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {choiceLabels[i]}
                                                </button>
                                            ))}

                                            {/* AND/OR 선택 (복수정답일 때만) */}
                                            {q.isMultipleAnswer && q.correctAnswers.length > 1 && (
                                                <div className="flex items-center gap-2 ml-4 text-sm">
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`logic-${idx}`}
                                                            checked={q.answerLogic === 'and'}
                                                            onChange={() => handleLogicChange(idx, 'and')}
                                                        />
                                                        AND (모두 선택)
                                                    </label>
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`logic-${idx}`}
                                                            checked={q.answerLogic === 'or'}
                                                            onChange={() => handleLogicChange(idx, 'or')}
                                                        />
                                                        OR (하나만)
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ) : q.type === 'ox' ? (
                                        <div className="flex items-center gap-4 mt-2">
                                            <span className="text-sm text-gray-500 mr-2">정답:</span>
                                            <button
                                                onClick={() => handleOXSelect(idx, 'O')}
                                                className={`px-6 py-2 rounded-lg font-bold transition-all ${q.correctAnswers.includes('O')
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                O
                                            </button>
                                            <button
                                                onClick={() => handleOXSelect(idx, 'X')}
                                                className={`px-6 py-2 rounded-lg font-bold transition-all ${q.correctAnswers.includes('X')
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                X
                                            </button>
                                        </div>
                                    ) : q.type === 'short' ? (
                                        <div className="mt-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm text-gray-500">정답:</span>
                                                <input
                                                    type="text"
                                                    value={q.shortAnswerInput}
                                                    onChange={(e) => handleShortAnswerInputChange(idx, e.target.value)}
                                                    placeholder="정답 입력 후 추가"
                                                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault()
                                                            handleAddShortAnswer(idx)
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleAddShortAnswer(idx)}
                                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                                >
                                                    + 추가
                                                </button>
                                            </div>

                                            {q.correctAnswers.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {q.correctAnswers.map((ans, aIdx) => (
                                                        <span
                                                            key={aIdx}
                                                            className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                                                        >
                                                            {ans}
                                                            <button
                                                                onClick={() => handleRemoveShortAnswer(idx, aIdx)}
                                                                className="ml-1 text-green-600 hover:text-red-600"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* OR 로직 설명 */}
                                            {q.correctAnswers.length > 1 && (
                                                <div className="flex items-center gap-2 mt-2 text-sm">
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`short-logic-${idx}`}
                                                            checked={q.answerLogic === 'or'}
                                                            onChange={() => handleLogicChange(idx, 'or')}
                                                        />
                                                        OR (하나만 맞으면 정답)
                                                    </label>
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`short-logic-${idx}`}
                                                            checked={q.answerLogic === 'and'}
                                                            onChange={() => handleLogicChange(idx, 'and')}
                                                        />
                                                        AND (모두 포함해야 정답)
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ) : q.type === 'essay' ? (
                                        <div className="mt-2 p-3 bg-yellow-50 rounded-lg">
                                            <p className="text-yellow-800 text-sm">
                                                ⚠️ 서술형 문항은 자동 채점되지 않습니다. 선생님이 직접 채점합니다.
                                            </p>
                                        </div>
                                    ) : null}

                                    {/* 영역 및 해설 입력 */}
                                    <div className="mt-4 pt-4 border-t border-gray-100 w-full">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">영역 (선택)</label>
                                                <input
                                                    type="text"
                                                    value={q.category || ''}
                                                    onChange={(e) => handleCategoryChange(idx, e.target.value)}
                                                    placeholder="예: 수와 연산"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-blue-500 transition-colors focus:outline-none"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">해설 (선택)</label>
                                                <input
                                                    type="text"
                                                    value={q.explanation || ''}
                                                    onChange={(e) => handleExplanationChange(idx, e.target.value)}
                                                    placeholder="학생에게 보여줄 해설을 간단히 입력하세요"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-blue-500 transition-colors focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 푸터 버튼 */}
                <div className="p-6 border-t bg-gray-50 flex gap-3">
                    {step === 1 ? (
                        <>
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleGenerateQuestions}
                                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                            >
                                문항 생성 →
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                            >
                                ← 이전
                            </button>
                            <button
                                onClick={onClose}
                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreateExam}
                                disabled={creating}
                                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                            >
                                {creating ? '생성중...' : '시험 생성'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ExamCreateModal
