import { useState, useCallback, useMemo, useRef, useEffect } from 'react'

/**
 * 시험 생성/수정 모달 - 간소화 버전
 * - 표: No, 유형, 정답만
 * - 고급 설정 토글 패널: 배점, 영역, 해설, 소문항, 복수정답
 * - Tab/화살표로 다음 문항 이동
 * - editData prop이 있으면 수정 모드
 */
function ExamCreateModal({ classData, onClose, onSubmit, editData = null }) {
    const isEditMode = !!editData
    const [step, setStep] = useState(isEditMode ? 2 : 1)
    const [creating, setCreating] = useState(false)

    // Step 1: 기본 설정
    const [examSubject, setExamSubject] = useState(editData?.exam?.subject || '')
    const [examTitle, setExamTitle] = useState(editData?.exam?.title || '')
    const [defaultType, setDefaultType] = useState('choice5')
    const [questionCount, setQuestionCount] = useState(editData?.exam?.questionCount || 25)
    const [timeLimit, setTimeLimit] = useState(editData?.exam?.timeLimit || 0)
    const [allowRetake, setAllowRetake] = useState(editData?.exam?.allowRetake || false)

    // Step 2: 문항 배열
    const [questions, setQuestions] = useState([])
    const [selectedRow, setSelectedRow] = useState(null)
    const [showAdvanced, setShowAdvanced] = useState(true)

    // 영역/단원 목록 (Step 2에서 정의)
    const [categories, setCategories] = useState(['1단원', '2단원', '3단원'])
    const [newCategory, setNewCategory] = useState('')

    // 정답 입력 ref 배열
    const answerRefs = useRef([])

    // 원문자 ↔ 숫자 변환
    const circleToNumber = { '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5, '❶': 1, '❷': 2, '❸': 3, '❹': 4, '❺': 5 }
    const numberToCircle = ['', '①', '②', '③', '④', '⑤']

    // 한글 원문자 → 자모 매핑 (㉠㉡㉢... → ㄱㄴㄷ...)
    const circleJamoMap = {
        '㉠': 'ㄱ', '㉡': 'ㄴ', '㉢': 'ㄷ', '㉣': 'ㄹ', '㉤': 'ㅁ',
        '㉥': 'ㅂ', '㉦': 'ㅅ', '㉧': 'ㅇ', '㉨': 'ㅈ', '㉩': 'ㅊ',
        '㉪': 'ㅋ', '㉫': 'ㅌ', '㉬': 'ㅍ', '㉭': 'ㅎ'
    }

    // 정답 문자열 → {type, answers} 파싱 (단순화 버전)
    // 규칙: 순수 숫자(1-5) / 원문자(①-⑤) / O,X만 해당 유형, 그 외는 모두 단답형
    const parseAnswer = useCallback((str, baseType = 'choice5') => {
        if (!str || str.trim() === '') return { type: baseType, answers: [] }
        const trimmed = str.trim()

        // 서술형 키워드 (풀이, 참고, 서술, 논술, 아래 참조, 채점 기준 등)
        if (/풀이|참고|참조|서술|논술|채점|기준|약술|설명/.test(trimmed)) {
            return { type: 'essay', answers: null }
        }

        // 원문자 (①②③ 등 - 쉼표/공백 포함 허용)
        const circleChars = trimmed.replace(/[,\s]+/g, '')
        const circleOnly = /^[①②③④⑤❶❷❸❹❺]+$/.test(circleChars)
        if (circleOnly && circleChars.length > 0) {
            const circles = [...circleChars].map(c => circleToNumber[c]).filter(Boolean)
            return { type: 'choice5', answers: circles }
        }


        // 순수 O/X만
        if (/^[OoXx○×]$/.test(trimmed)) {
            const val = trimmed.toUpperCase().replace('○', 'O').replace('×', 'X')
            return { type: 'ox', answers: [val] }
        }

        // 순수 숫자만 (1-5, 쉼표/공백 구분 허용)
        const pureNumbers = /^[1-5]([,\s]+[1-5])*$/.test(trimmed)
        if (pureNumbers && (baseType === 'choice5' || baseType === 'choice4')) {
            const nums = trimmed.split(/[,\s]+/).map(s => parseInt(s)).filter(n => n >= 1 && n <= 5)
            if (nums.length > 0) {
                return { type: baseType, answers: nums }
            }
        }

        // 그 외 모든 것 → 단답형 (콤마로만 복수 정답 분리 - 띄어쓰기 포함 단어 지원)
        const parts = trimmed.split(/[,،]+/).map(s => s.trim()).filter(Boolean)

        return { type: 'short', answers: parts }
    }, [])


    // {type, answers} → 표시용 문자열
    const formatAnswer = (q) => {
        if (q.type === 'essay') return ''
        if (!q.correctAnswers || q.correctAnswers.length === 0) return ''

        if (q.type === 'choice5' || q.type === 'choice4') {
            return q.correctAnswers.map(n => numberToCircle[n] || n).join('')
        }
        return q.correctAnswers.join(', ')
    }

    // 수정 모드: 기존 문항 데이터 로드
    useEffect(() => {
        if (isEditMode && editData?.answerData?.questions) {
            const loadedQuestions = editData.answerData.questions.map((q, idx) => ({
                num: q.num || idx + 1,
                type: q.type || 'choice5',
                correctAnswers: q.correctAnswers || [],
                answerLogic: q.answerLogic || 'and',
                points: q.points || 5,
                category: q.category || '',
                explanation: q.explanation || '',
                hasSubQuestions: q.hasSubQuestions || false,
                subQuestions: q.subQuestions || [],
                category: q.category || '',
                explanation: q.explanation || '',
                ignoreSpace: q.ignoreSpace !== false, // 기본값 true
                hasSubQuestions: q.hasSubQuestions || false,
                subQuestions: q.subQuestions || [],
                displayAnswer: formatAnswer(q)
            }))
            setQuestions(loadedQuestions)
            answerRefs.current = loadedQuestions.map(() => null)

            // 영역 목록 추출
            const cats = [...new Set(loadedQuestions.map(q => q.category).filter(Boolean))]
            if (cats.length > 0) {
                setCategories(prev => [...new Set([...prev, ...cats])])
            }
        }
    }, [isEditMode])

    const handleGenerateQuestions = () => {
        if (!examSubject.trim()) return alert('과목을 입력하세요')
        if (!examTitle.trim()) return alert('시험 이름을 입력하세요')
        if (questionCount < 1 || questionCount > 100) return alert('문항 수는 1~100 사이로 입력하세요')

        const basePoints = Math.floor(100 / questionCount)
        const remainder = 100 - (basePoints * questionCount)

        const generated = Array(questionCount).fill(null).map((_, idx) => ({
            num: idx + 1,
            type: defaultType,
            correctAnswers: defaultType === 'essay' ? null : [],
            answerLogic: 'and',
            points: basePoints + (idx < remainder ? 1 : 0),
            category: '',
            explanation: '',
            ignoreSpace: true, // 기본값 true
            hasSubQuestions: false,
            subQuestions: [],
            displayAnswer: ''
        }))

        setQuestions(generated)
        answerRefs.current = generated.map(() => null)
        setStep(2)
    }

    // 정답 셀 변경
    const handleAnswerChange = (idx, value) => {
        const parsed = parseAnswer(value, defaultType)
        setQuestions(prev => prev.map((q, i) => {
            if (i !== idx) return q
            return {
                ...q,
                type: parsed.type,
                correctAnswers: parsed.answers,
                displayAnswer: value
            }
        }))
    }

    // 유형 변경
    const handleTypeChange = (idx, value) => {
        setQuestions(prev => prev.map((q, i) =>
            i === idx ? {
                ...q,
                type: value,
                correctAnswers: value === 'essay' ? null : (q.correctAnswers || []),
                displayAnswer: value === 'essay' ? '' : q.displayAnswer
            } : q
        ))
    }

    // 배점 변경
    const handlePointsChange = (idx, value) => {
        setQuestions(prev => prev.map((q, i) =>
            i === idx ? { ...q, points: parseInt(value) || 0 } : q
        ))
    }

    // 영역 변경
    const handleCategoryChange = (idx, value) => {
        setQuestions(prev => prev.map((q, i) =>
            i === idx ? { ...q, category: value } : q
        ))
    }

    // 해설 변경
    const handleExplanationChange = (idx, value) => {
        setQuestions(prev => prev.map((q, i) =>
            i === idx ? { ...q, explanation: value } : q
        ))
    }

    // 복수정답 로직 변경
    const handleLogicChange = (idx, value) => {
        setQuestions(prev => prev.map((q, i) =>
            i === idx ? { ...q, answerLogic: value } : q
        ))
    }

    // 소문항 토글
    const handleSubQuestionToggle = (idx) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== idx) return q
            const newHasSub = !q.hasSubQuestions
            // 소문항 활성화 시 기본 배점은 문항 배점의 절반
            const defaultSubPoints = Math.round(q.points / 2)
            return {
                ...q,
                hasSubQuestions: newHasSub,
                subQuestions: newHasSub ? [{ subNum: 1, correctAnswers: [], subPoints: defaultSubPoints }] : [],
                type: newHasSub ? 'short' : q.type
            }
        }))
    }

    // 소문항 추가
    const handleAddSubQuestion = (idx) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== idx) return q
            // 새 소문항 기본 배점: 기존 소문항 평균 또는 문항 배점 / (소문항 수+1)
            const avgPoints = Math.round(q.points / (q.subQuestions.length + 1))
            return {
                ...q,
                subQuestions: [...q.subQuestions, { subNum: q.subQuestions.length + 1, correctAnswers: [], subPoints: avgPoints }]
            }
        }))
    }

    // 소문항 삭제
    const handleRemoveSubQuestion = (qIdx, subIdx) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q
            const newSubs = q.subQuestions.filter((_, si) => si !== subIdx)
                .map((s, ni) => ({ ...s, subNum: ni + 1 }))
            return { ...q, subQuestions: newSubs, hasSubQuestions: newSubs.length > 0 }
        }))
    }

    // 소문항 정답 변경 (콤마로 복수정답 지원)
    const handleSubAnswerChange = (qIdx, subIdx, value) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q
            const newSubs = q.subQuestions.map((s, si) => {
                if (si !== subIdx) return s
                // 콤마로 복수정답 파싱
                const answers = value.split(/[,،]+/).map(a => a.trim()).filter(Boolean)
                return { ...s, correctAnswers: answers.length > 0 ? answers : [], displayAnswer: value }
            })
            return { ...q, subQuestions: newSubs }
        }))
    }

    // 소문항 부분점수 변경
    const handleSubPointsChange = (qIdx, subIdx, value) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q
            const newSubs = q.subQuestions.map((s, si) =>
                si === subIdx ? { ...s, subPoints: parseInt(value) || 0 } : s
            )
            return { ...q, subQuestions: newSubs }
        }))
    }

    // 띄어쓰기 무시 토글
    const handleIgnoreSpaceChange = (idx) => {
        setQuestions(prev => prev.map((q, i) =>
            i === idx ? { ...q, ignoreSpace: !q.ignoreSpace } : q
        ))
    }

    // 정답 직접 추가 (복수 정답)
    const handleAddSingleAnswer = (idx, newAns) => {
        if (!newAns || !newAns.trim()) return
        const val = newAns.trim()

        setQuestions(prev => prev.map((q, i) => {
            if (i !== idx) return q
            const currentAnswers = q.correctAnswers || []
            if (currentAnswers.includes(val)) return q // 중복 방지

            const newAnswers = [...currentAnswers, val]
            // displayAnswer도 업데이트 (콤마로 연결)
            const newDisplay = newAnswers.join(', ')

            return {
                ...q,
                correctAnswers: newAnswers,
                displayAnswer: newDisplay
            }
        }))
    }

    // 정답 삭제
    const handleRemoveAnswer = (idx, ansIdx) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== idx) return q
            const newAnswers = q.correctAnswers.filter((_, ai) => ai !== ansIdx)
            // displayAnswer는 formatAnswer에 맡김 (비워둠)
            return {
                ...q,
                correctAnswers: newAnswers,
                displayAnswer: ''
            }
        }))
    }

    // 객관식/OX 정답 토글 (버튼 클릭용)
    const toggleChoiceAnswer = (idx, value) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== idx) return q
            const currentAnswers = q.correctAnswers || []
            let newAnswers
            if (currentAnswers.includes(value)) {
                newAnswers = currentAnswers.filter(v => v !== value)
            } else {
                newAnswers = [...currentAnswers, value].sort((a, b) => {
                    // 숫자는 오름차순
                    if (typeof a === 'number' && typeof b === 'number') return a - b
                    return 0
                })
            }
            return {
                ...q,
                correctAnswers: newAnswers,
                displayAnswer: '' // formatAnswer가 처리하도록 비움
            }
        }))
    }

    // 문항 추가
    const addQuestion = () => {
        setQuestions(prev => [...prev, {
            num: prev.length + 1,
            type: defaultType,
            correctAnswers: defaultType === 'essay' ? null : [],
            answerLogic: 'and',
            points: 4,
            category: '',
            explanation: '',
            ignoreSpace: true, // 기본값 true
            hasSubQuestions: false,
            subQuestions: [],
            displayAnswer: ''
        }])
    }

    // 문항 삭제
    const removeQuestion = (idx) => {
        if (questions.length <= 1) return alert('최소 1개 문항이 필요합니다')
        setQuestions(prev => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, num: i + 1 })))
        if (selectedRow === idx) setSelectedRow(null)
        else if (selectedRow > idx) setSelectedRow(selectedRow - 1)
    }

    // Tab/화살표 키 핸들러
    const handleKeyDown = (e, idx) => {
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault()
            if (idx < questions.length - 1) {
                answerRefs.current[idx + 1]?.focus()
                setSelectedRow(idx + 1)
            }
        } else if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault()
            if (idx > 0) {
                answerRefs.current[idx - 1]?.focus()
                setSelectedRow(idx - 1)
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (idx < questions.length - 1) {
                answerRefs.current[idx + 1]?.focus()
                setSelectedRow(idx + 1)
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (idx > 0) {
                answerRefs.current[idx - 1]?.focus()
                setSelectedRow(idx - 1)
            }
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (idx < questions.length - 1) {
                answerRefs.current[idx + 1]?.focus()
                setSelectedRow(idx + 1)
            }
        }
    }

    // 표에 붙여넣기 (간소화 버전)
    const handleTablePaste = useCallback((e) => {
        e.preventDefault()
        const text = e.clipboardData.getData('text')
        if (!text.trim()) return

        const lines = text.split('\n').filter(line => line.trim())

        setQuestions(prev => {
            const newQuestions = [...prev]

            lines.forEach((line, lineIdx) => {
                if (lineIdx >= newQuestions.length) return

                // 탭 또는 다중 공백으로 분리
                const cols = line.includes('\t')
                    ? line.split('\t').map(c => c.trim())
                    : line.split(/\s{2,}/).map(c => c.trim())

                // 첫 열이 숫자면 번호 (건너뜀)
                let colIdx = 0
                if (/^\d+$/.test(cols[0])) colIdx = 1

                // 정답 파싱
                if (cols[colIdx]) {
                    const parsed = parseAnswer(cols[colIdx], defaultType)
                    newQuestions[lineIdx] = {
                        ...newQuestions[lineIdx],
                        type: parsed.type,
                        correctAnswers: parsed.answers,
                        displayAnswer: cols[colIdx]
                    }
                    colIdx++
                }

                // 배점 (숫자)
                if (cols[colIdx] && /^\d+$/.test(cols[colIdx])) {
                    newQuestions[lineIdx].points = parseInt(cols[colIdx])
                    colIdx++
                }

                // 영역
                if (cols[colIdx]) {
                    newQuestions[lineIdx].category = cols[colIdx]
                }
            })

            return newQuestions
        })
    }, [defaultType, parseAnswer])

    // 총점 계산
    const getTotalPoints = () => questions.reduce((sum, q) => sum + q.points, 0)
    const getAutoGradablePoints = () => questions.filter(q => q.type !== 'essay').reduce((sum, q) => sum + q.points, 0)
    const getEssayPoints = () => questions.filter(q => q.type === 'essay').reduce((sum, q) => sum + q.points, 0)
    const getUnansweredCount = () => questions.filter(q =>
        q.type !== 'essay' &&
        !q.hasSubQuestions &&
        (!q.correctAnswers || q.correctAnswers.length === 0)
    ).length

    // 유효성 검사
    const validateQuestions = () => {
        for (const q of questions) {
            if (q.type !== 'essay' && !q.hasSubQuestions) {
                if (!q.correctAnswers || q.correctAnswers.length === 0) {
                    return { valid: false, message: `${q.num}번 문항의 정답을 입력하세요` }
                }
            }
            if (q.hasSubQuestions) {
                for (const sub of q.subQuestions) {
                    if (!sub.correctAnswers || sub.correctAnswers.length === 0 || !sub.correctAnswers[0]) {
                        return { valid: false, message: `${q.num}번 문항의 (${sub.subNum})번 소문항 정답을 입력하세요` }
                    }
                }
            }
        }
        return { valid: true }
    }

    // 시험 생성
    const handleCreateExam = async () => {
        const validation = validateQuestions()
        if (!validation.valid) return alert(validation.message)

        setCreating(true)

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
                explanation: q.explanation || '',
                ignoreSpace: q.ignoreSpace,
                hasSubQuestions: q.hasSubQuestions,
                subQuestions: q.subQuestions.map(s => ({
                    subNum: s.subNum,
                    correctAnswers: s.correctAnswers
                }))
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

    // 선택된 문항
    const selectedQuestion = selectedRow !== null ? questions[selectedRow] : null

    // 유형 레이블
    const typeLabels = {
        choice4: '4지선다',
        choice5: '5지선다',
        ox: 'O/X',
        short: '단답형',
        essay: '서술형'
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-blue-600">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white">
                            {step === 1 ? '📝 새 시험 만들기' : isEditMode ? `✏️ ${examSubject} | ${examTitle} 수정` : `${examSubject} | ${examTitle}`}
                        </h2>
                        <div className="flex items-center gap-2 text-sm">
                            <span className={`px-3 py-1 rounded-full ${step === 1 ? 'bg-white text-blue-600' : 'bg-blue-400 text-white'}`}>
                                1. 기본 설정
                            </span>
                            <span className={`px-3 py-1 rounded-full ${step === 2 ? 'bg-white text-blue-600' : 'bg-blue-400 text-white'}`}>
                                2. 정답 입력
                            </span>
                        </div>
                    </div>
                </div>

                {/* 컨텐츠 */}
                <div className="flex-1 overflow-hidden flex">
                    {step === 1 ? (
                        /* Step 1: 기본 설정 */
                        <div className="flex-1 overflow-auto p-6">
                            <div className="space-y-6 max-w-xl mx-auto">
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

                                {/* 기본 문제 유형 */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">기본 문제 유형</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { value: 'choice5', label: '5지선다', icon: '⑤' },
                                            { value: 'choice4', label: '4지선다', icon: '④' },
                                            { value: 'ox', label: 'O/X', icon: 'OX' },
                                            { value: 'short', label: '단답형', icon: '✎' }
                                        ].map(type => (
                                            <button
                                                key={type.value}
                                                onClick={() => setDefaultType(type.value)}
                                                className={`p-3 border-2 rounded-xl text-center transition-all ${defaultType === type.value
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="text-xl">{type.icon}</div>
                                                <div className="text-xs font-medium">{type.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        💡 숫자 정답 (1, 2, 3...)을 입력하면 이 유형으로 해석됩니다
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">문항 수</label>
                                        <input
                                            type="number"
                                            value={questionCount}
                                            onChange={(e) => setQuestionCount(parseInt(e.target.value) || 1)}
                                            min="1"
                                            max="100"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">제한시간 (분, 0=무제한)</label>
                                        <input
                                            type="number"
                                            value={timeLimit}
                                            onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                                            min="0"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={allowRetake}
                                        onChange={(e) => setAllowRetake(e.target.checked)}
                                        className="w-5 h-5 text-blue-500 rounded"
                                    />
                                    <span className="text-gray-700">제출 후 재응시 허용</span>
                                </label>

                                <div className="bg-purple-50 p-4 rounded-xl border-2 border-dashed border-purple-300">
                                    <p className="text-purple-800 font-medium">💡 이원분류표 붙여넣기 지원</p>
                                    <p className="text-sm text-purple-600 mt-1">
                                        다음 단계에서 정답 열에 <strong>Ctrl+V</strong>로 붙여넣으면 자동으로 채워집니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Step 2: 표 + 고급 설정 패널 */
                        <>
                            {/* 좌측: 간소화된 표 */}
                            <div className={`flex-1 overflow-auto p-4 ${showAdvanced ? 'border-r' : ''}`}>
                                {/* 요약 */}
                                <div className="bg-gray-100 p-3 rounded-xl flex items-center justify-between sticky top-0 z-10 mb-3">
                                    <div className="flex items-center gap-4">
                                        <span className="font-medium">총 {questions.length}문항</span>
                                        {getUnansweredCount() > 0 && (
                                            <span className="text-red-600 text-sm">⚠️ 미입력: {getUnansweredCount()}개</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm">
                                            자동: <strong>{getAutoGradablePoints()}점</strong>
                                            {getEssayPoints() > 0 && <> | 서술: <strong>{getEssayPoints()}점</strong></>}
                                            | 총 <strong className="text-blue-600">{getTotalPoints()}점</strong>
                                        </span>
                                        <button
                                            onClick={() => setShowAdvanced(!showAdvanced)}
                                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${showAdvanced
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-gray-200 text-gray-600'
                                                }`}
                                        >
                                            ⚙️ 고급 {showAdvanced ? '▶' : '◀'}
                                        </button>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-500 mb-2">
                                    💡 <strong>Ctrl+V</strong> 붙여넣기 | <strong>Tab/↓↑</strong>로 이동 | 행 클릭 → 고급 설정
                                </p>

                                {/* 간소화된 표 */}

                                <div
                                    className="overflow-auto border rounded-xl"
                                    onPaste={handleTablePaste}
                                >
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="border-b px-3 py-2 text-center w-12 font-semibold">No</th>
                                                <th className="border-b px-3 py-2 text-center w-24 font-semibold">유형</th>
                                                <th className="border-b px-3 py-2 text-center font-semibold">정답</th>
                                                <th className="border-b px-3 py-2 text-center w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {questions.map((q, idx) => (
                                                <tr
                                                    key={q.num}
                                                    className={`
                                                        hover:bg-blue-50 transition-colors cursor-pointer
                                                        ${selectedRow === idx ? 'bg-blue-100' : ''}
                                                        ${q.type !== 'essay' && !q.hasSubQuestions && (!q.correctAnswers || q.correctAnswers.length === 0) ? 'bg-red-50' : ''}
                                                    `}
                                                    onClick={() => setSelectedRow(idx)}
                                                >
                                                    <td className="border-b px-3 py-2 text-center font-medium text-gray-600">
                                                        {q.num}
                                                    </td>
                                                    <td className="border-b px-2 py-1">
                                                        <select
                                                            value={q.type}
                                                            onChange={(e) => { e.stopPropagation(); handleTypeChange(idx, e.target.value) }}
                                                            onClick={(e) => { e.stopPropagation(); setSelectedRow(idx) }}
                                                            onFocus={() => setSelectedRow(idx)}
                                                            className="w-full px-2 py-1 border border-gray-200 rounded focus:border-blue-500 focus:outline-none text-xs"
                                                        >
                                                            <option value="choice5">5지선다</option>
                                                            <option value="choice4">4지선다</option>
                                                            <option value="ox">O/X</option>
                                                            <option value="short">단답형</option>
                                                            <option value="essay">서술형</option>
                                                        </select>
                                                    </td>
                                                    <td className="border-b px-2 py-1">
                                                        {q.hasSubQuestions ? (
                                                            <span className="text-purple-600 text-xs font-medium">
                                                                📋 소문항 {q.subQuestions.length}개
                                                            </span>
                                                        ) : q.type === 'essay' ? (
                                                            <span className="text-gray-400 text-xs">(서술형)</span>
                                                        ) : (
                                                            <input
                                                                ref={(el) => answerRefs.current[idx] = el}
                                                                type="text"
                                                                value={q.displayAnswer || formatAnswer(q)}
                                                                onChange={(e) => { e.stopPropagation(); handleAnswerChange(idx, e.target.value) }}
                                                                onClick={(e) => { e.stopPropagation(); setSelectedRow(idx) }}
                                                                onFocus={() => setSelectedRow(idx)}
                                                                onKeyDown={(e) => handleKeyDown(e, idx)}
                                                                placeholder="③, 1, O, 서울..."
                                                                className="w-full px-2 py-1 border border-gray-200 rounded focus:border-blue-500 focus:outline-none"
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="border-b px-1 py-1 text-center">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeQuestion(idx) }}
                                                            className="text-red-400 hover:text-red-600 text-lg"
                                                            title="삭제"
                                                        >
                                                            ×
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* 문항 추가 */}
                                <div className="mt-3">
                                    <button
                                        onClick={addQuestion}
                                        className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 bg-blue-50 rounded-lg"
                                    >
                                        + 문항 추가
                                    </button>
                                </div>
                            </div>

                            {/* 우측: 고급 설정 패널 (토글) */}
                            {showAdvanced && (
                                <div className="w-72 bg-gray-50 p-4 overflow-auto">
                                    <h3 className="font-bold text-gray-700 mb-3">⚙️ 고급 설정</h3>

                                    {selectedQuestion ? (
                                        <div className="space-y-4">
                                            {/* 선택된 문항 정보 */}
                                            <div className="bg-white p-3 rounded-lg border">
                                                <div className="font-bold text-blue-600 mb-1">
                                                    {selectedQuestion.num}번 문항
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {typeLabels[selectedQuestion.type]}
                                                </div>
                                            </div>

                                            {/* 배점 */}
                                            <div className="bg-white p-3 rounded-lg border">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">💰 배점</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={selectedQuestion.points}
                                                        onChange={(e) => handlePointsChange(selectedRow, e.target.value)}
                                                        min="0"
                                                        max="100"
                                                        className="w-20 px-2 py-1 border rounded text-center"
                                                    />
                                                    <span className="text-gray-500">점</span>
                                                </div>
                                            </div>

                                            {/* 영역/단원 드롭다운 + 관리 */}
                                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                                                <label className="block text-sm font-medium text-amber-700 mb-1">📂 영역/단원</label>
                                                <select
                                                    value={selectedQuestion.category}
                                                    onChange={(e) => handleCategoryChange(selectedRow, e.target.value)}
                                                    className="w-full px-2 py-1 border border-amber-300 rounded text-sm mb-2"
                                                >
                                                    <option value="">선택 안함</option>
                                                    {categories.map((cat, idx) => (
                                                        <option key={idx} value={cat}>{cat}</option>
                                                    ))}
                                                </select>

                                                {/* 영역 목록 태그 */}
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {categories.map((cat, idx) => (
                                                        <span key={idx} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                                                            {cat}
                                                            <button
                                                                onClick={() => setCategories(prev => prev.filter((_, i) => i !== idx))}
                                                                className="text-amber-400 hover:text-amber-600 ml-0.5"
                                                            >×</button>
                                                        </span>
                                                    ))}
                                                </div>

                                                {/* 새 영역 추가 */}
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="text"
                                                        value={newCategory}
                                                        onChange={(e) => setNewCategory(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && newCategory.trim()) {
                                                                e.preventDefault()
                                                                if (!categories.includes(newCategory.trim())) {
                                                                    setCategories(prev => [...prev, newCategory.trim()])
                                                                }
                                                                setNewCategory('')
                                                            }
                                                        }}
                                                        placeholder="새 영역 추가..."
                                                        className="flex-1 px-2 py-1 border border-amber-300 rounded text-xs focus:outline-none focus:border-amber-500"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            if (newCategory.trim() && !categories.includes(newCategory.trim())) {
                                                                setCategories(prev => [...prev, newCategory.trim()])
                                                                setNewCategory('')
                                                            }
                                                        }}
                                                        className="px-2 py-1 bg-amber-200 text-amber-700 rounded text-xs hover:bg-amber-300"
                                                    >+</button>
                                                </div>
                                            </div>


                                            {/* 소문항 설정 */}
                                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                                <label className="flex items-center gap-2 cursor-pointer mb-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedQuestion.hasSubQuestions}
                                                        onChange={() => handleSubQuestionToggle(selectedRow)}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="font-medium text-purple-700 text-sm">📋 소문항 있음</span>
                                                </label>

                                                {selectedQuestion.hasSubQuestions && (
                                                    <div className="space-y-2 mt-2">
                                                        {selectedQuestion.subQuestions.map((sub, subIdx) => (
                                                            <div key={subIdx} className="bg-white p-2 rounded border border-purple-200">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-purple-600 font-bold text-sm">({sub.subNum})</span>
                                                                    <input
                                                                        type="text"
                                                                        value={sub.displayAnswer || sub.correctAnswers?.join(', ') || ''}
                                                                        onChange={(e) => handleSubAnswerChange(selectedRow, subIdx, e.target.value)}
                                                                        placeholder="정답 (콤마로 복수정답)"
                                                                        className="flex-1 px-2 py-1 border rounded text-sm min-w-0"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between pl-6">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-xs text-gray-500">배점:</span>
                                                                        <input
                                                                            type="number"
                                                                            value={sub.subPoints || 0}
                                                                            onChange={(e) => handleSubPointsChange(selectedRow, subIdx, e.target.value)}
                                                                            className="w-12 px-1 py-0.5 border rounded text-sm text-center"
                                                                            min="0"
                                                                        />
                                                                        <span className="text-xs text-gray-500">점</span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleRemoveSubQuestion(selectedRow, subIdx)}
                                                                        className="text-xs text-red-400 hover:text-red-600"
                                                                    >
                                                                        삭제
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div className="flex items-center justify-between">
                                                            <button
                                                                onClick={() => handleAddSubQuestion(selectedRow)}
                                                                className="text-xs text-purple-600 hover:text-purple-800"
                                                            >
                                                                + 소문항 추가
                                                            </button>
                                                            <span className="text-xs text-purple-500">
                                                                배점 합계: {selectedQuestion.subQuestions.reduce((sum, s) => sum + (s.subPoints || 0), 0)}점
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 단답형 띄어쓰기 옵션 */}
                                            {selectedQuestion.type === 'short' && (
                                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-3">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedQuestion.ignoreSpace !== false}
                                                            onChange={() => handleIgnoreSpaceChange(selectedRow)}
                                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm text-blue-800 font-medium">띄어쓰기 무시하고 채점 (권장)</span>
                                                    </label>
                                                    <p className="text-xs text-blue-600 mt-1 ml-6">
                                                        "대한 서울"과 "대한서울"을 같은 답으로 처리합니다.
                                                    </p>
                                                </div>
                                            )}

                                            {/* 정답 관리 (객관식/단답형) */}
                                            {selectedQuestion.type !== 'essay' && !selectedQuestion.hasSubQuestions && (
                                                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 space-y-3">
                                                    <div className="font-medium text-orange-700 text-sm">🎯 정답 관리</div>

                                                    {/* 객관식/OX 정답 선택 UI (토글 버튼) */}
                                                    {(selectedQuestion.type.startsWith('choice') || selectedQuestion.type === 'ox') && (
                                                        <div className="flex gap-2 mb-2">
                                                            {selectedQuestion.type === 'ox' ? (
                                                                ['O', 'X'].map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        onClick={() => toggleChoiceAnswer(selectedRow, opt)}
                                                                        className={`px-4 py-1.5 rounded text-sm font-bold border ${(selectedQuestion.correctAnswers || []).includes(opt)
                                                                            ? 'bg-orange-500 text-white border-orange-500'
                                                                            : 'bg-white text-gray-500 border-orange-200 hover:bg-orange-100'
                                                                            }`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                // 4지선다 or 5지선다
                                                                Array.from({ length: selectedQuestion.type === 'choice4' ? 4 : 5 }, (_, i) => i + 1).map(num => (
                                                                    <button
                                                                        key={num}
                                                                        onClick={() => toggleChoiceAnswer(selectedRow, num)}
                                                                        className={`w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center border ${(selectedQuestion.correctAnswers || []).includes(num)
                                                                            ? 'bg-orange-500 text-white border-orange-500' // 선택됨
                                                                            : 'bg-white text-gray-500 border-orange-200 hover:bg-orange-100' // 선택 안됨
                                                                            }`}
                                                                    >
                                                                        {num}
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* 단답형 정답 추가 입력 */}
                                                    {selectedQuestion.type === 'short' && (
                                                        <div className="flex gap-1">
                                                            <input
                                                                type="text"
                                                                placeholder="정답 입력 (엔터)"
                                                                className="flex-1 px-2 py-1 border border-orange-200 rounded text-sm focus:outline-none focus:border-orange-500"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault()
                                                                        handleAddSingleAnswer(selectedRow, e.target.value)
                                                                        e.target.value = ''
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                className="px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs hover:bg-orange-300"
                                                                onClick={(e) => {
                                                                    const input = e.currentTarget.previousElementSibling
                                                                    handleAddSingleAnswer(selectedRow, input.value)
                                                                    input.value = ''
                                                                }}
                                                            >
                                                                추가
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* 정답 목록 표시 (칩 형태) */}
                                                    <div className="flex flex-wrap gap-1">
                                                        {(selectedQuestion.correctAnswers || []).map((ans, idx) => (
                                                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-orange-200 text-orange-800 rounded text-sm shadow-sm">
                                                                {selectedQuestion.type === 'short' ? ans : `${ans}번`}
                                                                <button
                                                                    onClick={() => handleRemoveAnswer(selectedRow, idx)}
                                                                    className="text-orange-400 hover:text-red-500 w-4 h-4 flex items-center justify-center rounded-full hover:bg-orange-50"
                                                                    title="삭제"
                                                                >
                                                                    ×
                                                                </button>
                                                            </span>
                                                        ))}
                                                        {(!selectedQuestion.correctAnswers || selectedQuestion.correctAnswers.length === 0) && (
                                                            <span className="text-gray-400 text-xs italic">등록된 정답이 없습니다</span>
                                                        )}
                                                    </div>

                                                    {/* 복수정답 로직 */}
                                                    {selectedQuestion.correctAnswers?.length > 1 && (
                                                        <div className="pt-2 border-t border-orange-200">
                                                            <div className="text-xs text-orange-600 mb-1 font-medium">채점 기준:</div>
                                                            <div className="flex flex-col gap-1">
                                                                <label className="flex items-center gap-2 cursor-pointer text-sm">
                                                                    <input
                                                                        type="radio"
                                                                        checked={selectedQuestion.answerLogic === 'and'}
                                                                        onChange={() => handleLogicChange(selectedRow, 'and')}
                                                                        className="text-orange-600 focus:ring-orange-500"
                                                                    />
                                                                    <span className="text-gray-700">
                                                                        {selectedQuestion.type === 'short'
                                                                            ? '모두 정답 (AND, 모든 답 포함)'
                                                                            : '모두 정답 (AND, 모두 선택)'}
                                                                    </span>
                                                                </label>
                                                                <label className="flex items-center gap-2 cursor-pointer text-sm">
                                                                    <input
                                                                        type="radio"
                                                                        checked={selectedQuestion.answerLogic === 'or'}
                                                                        onChange={() => handleLogicChange(selectedRow, 'or')}
                                                                        className="text-orange-600 focus:ring-orange-500"
                                                                    />
                                                                    <span className="text-gray-700">하나만 맞아도 정답 (OR)</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 해설 */}
                                            <div className="bg-white p-3 rounded-lg border">
                                                <div className="font-medium text-gray-700 text-sm mb-1">📖 해설</div>
                                                <textarea
                                                    value={selectedQuestion.explanation || ''}
                                                    onChange={(e) => handleExplanationChange(selectedRow, e.target.value)}
                                                    placeholder="해설 입력 (선택)"
                                                    rows={3}
                                                    className="w-full px-2 py-1 border rounded text-sm resize-none"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-gray-400 text-sm text-center py-8">
                                            👈 행을 클릭하면<br />상세 설정이 표시됩니다
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* 푸터 */}
                <div className="p-4 border-t bg-gray-50 flex justify-between">
                    <button
                        onClick={step === 1 ? onClose : (isEditMode ? onClose : () => setStep(1))}
                        className="px-6 py-2 text-gray-600 hover:text-gray-800"
                    >
                        {step === 1 ? '취소' : (isEditMode ? '취소' : '← 이전')}
                    </button>

                    {step === 1 ? (
                        <button
                            onClick={handleGenerateQuestions}
                            className="px-6 py-2 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600"
                        >
                            다음 →
                        </button>
                    ) : (
                        <button
                            onClick={handleCreateExam}
                            disabled={creating || getUnansweredCount() > 0}
                            className="px-6 py-2 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 disabled:opacity-50"
                        >
                            {creating ? (isEditMode ? '저장 중...' : '생성 중...') : (isEditMode ? '시험 수정' : '시험 만들기')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ExamCreateModal
