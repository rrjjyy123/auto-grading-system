import { useState, useCallback, useRef, useEffect } from 'react'
import { useToast } from './Toast'

/**
 * 시험 생성/수정 모달 - 간소화 버전
 * - 표: No, 유형, 정답만
 * - 고급 설정 토글 패널: 배점, 영역, 해설, 소문항, 복수정답
 * - Tab/화살표로 다음 문항 이동
 * - editData prop이 있으면 수정 모드
 */
function ExamCreateModal({ classData, onClose, onSubmit, editData = null }) {
    const { error: toastError } = useToast()
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
    const [showAddCategory, setShowAddCategory] = useState(false)

    // 정답 입력 ref 배열
    const answerRefs = useRef([])

    // 원문자 ↔ 숫자 변환
    const circleToNumber = { '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5, '❶': 1, '❷': 2, '❸': 3, '❹': 4, '❺': 5 }
    const numberToCircle = ['', '①', '②', '③', '④', '⑤']

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
        if (!examSubject.trim()) return toastError('과목을 입력하세요')
        if (!examTitle.trim()) return toastError('시험 이름을 입력하세요')
        if (questionCount < 1 || questionCount > 100) return toastError('문항 수는 1~100 사이로 입력하세요')

        // 기존 문항이 있고 문항 수가 같다면 초기화하지 않고 이동 (이름/과목만 수정 시 데이터 보존)
        if (questions.length === questionCount) {
            setStep(2)
            return
        }

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
        if (questions.length <= 1) return toastError('최소 1개 문항이 필요합니다')
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
        if (!validation.valid) return toastError(validation.message)

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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-100">
                {/* 헤더 */}
                <div className="p-5 border-b border-gray-100 bg-white shadow-sm flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                                {step === 1 ? (
                                    <>
                                        <span className="bg-primary/10 text-primary p-2 rounded-xl">📝</span>
                                        새 시험 만들기
                                    </>
                                ) : (
                                    <>
                                        <span className="bg-primary/10 text-primary p-2 rounded-xl">✏️</span>
                                        {isEditMode ? `${examSubject} | ${examTitle} 수정` : `${examSubject} • ${examTitle}`}
                                    </>
                                )}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* 단계 표시기 */}
                            <div className="flex p-1 bg-gray-100 rounded-xl mr-4">
                                <span className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${step === 1 ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}>
                                    1. 기본 설정
                                </span>
                                <span className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${step === 2 ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}>
                                    2. 문항 입력
                                </span>
                            </div>

                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-xl transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 컨텐츠 영역 */}
                <div className="flex-1 overflow-hidden flex bg-gray-50/50">
                    {step === 1 ? (
                        /* Step 1: 기본 설정 */
                        <div className="flex-1 overflow-auto p-8">
                            <div className="max-w-2xl mx-auto space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700 ml-1">과목</label>
                                        <input
                                            type="text"
                                            value={examSubject}
                                            onChange={(e) => setExamSubject(e.target.value)}
                                            placeholder="예: 수학, 영어"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700 ml-1">시험명</label>
                                        <input
                                            type="text"
                                            value={examTitle}
                                            onChange={(e) => setExamTitle(e.target.value)}
                                            placeholder="예: 1학기 중간고사"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                {/* 기본 문제 유형 */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-gray-700 ml-1">기본 문제 유형</label>
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { value: 'choice5', label: '5지선다', icon: '⑤' },
                                            { value: 'choice4', label: '4지선다', icon: '④' },
                                            { value: 'ox', label: 'O/X', icon: 'OX' },
                                            { value: 'short', label: '단답형', icon: '✎' }
                                        ].map(type => (
                                            <button
                                                key={type.value}
                                                onClick={() => setDefaultType(type.value)}
                                                className={`p-4 border-2 rounded-2xl text-center transition-all duration-200 flex flex-col items-center gap-2 ${defaultType === type.value
                                                    ? 'border-primary bg-primary/5 text-primary shadow-sm ring-2 ring-primary/20'
                                                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-white hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="text-2xl font-bold">{type.icon}</div>
                                                <div className="text-sm font-semibold">{type.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 ml-1 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        숫자 정답(1~5)을 입력하면 자동으로 인식됩니다.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700 ml-1">문항 수</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={questionCount}
                                                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 1)}
                                                min="1"
                                                max="100"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all font-medium font-mono"
                                            />
                                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400 text-sm font-bold">문항</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700 ml-1">제한시간</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={timeLimit}
                                                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                                                min="0"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all font-medium font-mono"
                                            />
                                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400 text-sm font-bold">분 (0=무제한)</div>
                                        </div>
                                    </div>
                                </div>

                                <label className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={allowRetake}
                                        onChange={(e) => setAllowRetake(e.target.checked)}
                                        className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
                                    />
                                    <span className="font-bold text-gray-700">제출 후 바로 재응시 허용</span>
                                </label>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        onClick={handleGenerateQuestions}
                                        className="px-8 py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                    >
                                        다음 단계로 ➔
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Step 2: 표 + 고급 설정 패널 */
                        <>
                            {/* 좌측: 문항 목록 */}
                            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                                {/* 요약 바 */}
                                <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm z-10">
                                    <div className="flex items-center gap-6">
                                        <span className="font-bold text-gray-700 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                            총 {questions.length}문항
                                        </span>
                                        {getUnansweredCount() > 0 && (
                                            <span className="px-3 py-1 bg-rose-50 text-rose-600 text-sm font-bold rounded-lg border border-rose-100 flex items-center gap-2 animate-pulse">
                                                ⚠️ 미입력 {getUnansweredCount()}개
                                            </span>
                                        )}
                                        <div className="h-4 w-px bg-gray-200"></div>
                                        <span className="text-sm font-medium text-gray-500">
                                            자동 <span className="text-gray-900 font-bold">{getAutoGradablePoints()}점</span>
                                            {getEssayPoints() > 0 && <span className="ml-2">서술 <span className="text-gray-900 font-bold">{getEssayPoints()}점</span></span>}
                                            <span className="mx-2">/</span>
                                            총 <span className="text-primary font-extrabold text-base">{getTotalPoints()}점</span>
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${showAdvanced
                                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span>⚙️ 고급 설정</span>
                                        <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>

                                {/* 문항 리스트 테이블 */}
                                <div
                                    className="flex-1 overflow-y-auto min-h-0 p-6"
                                    onPaste={handleTablePaste}
                                >
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
                                                <tr>
                                                    <th className="px-4 py-3 text-center w-16 font-bold text-gray-500 border-b">No</th>
                                                    <th className="px-4 py-3 text-center w-32 font-bold text-gray-500 border-b">유형</th>
                                                    <th className="px-4 py-3 text-center font-bold text-gray-500 border-b">정답</th>
                                                    <th className="px-4 py-3 text-center w-16 border-b"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {questions.map((q, idx) => (
                                                    <tr
                                                        key={q.num}
                                                        className={`
                                                            group transition-colors cursor-pointer
                                                            ${selectedRow === idx ? 'bg-indigo-50/60' : 'hover:bg-gray-50'}
                                                            ${q.type !== 'essay' && !q.hasSubQuestions && (!q.correctAnswers || q.correctAnswers.length === 0) ? 'bg-rose-50/30' : ''}
                                                        `}
                                                        onClick={() => setSelectedRow(idx)}
                                                    >
                                                        <td className="px-4 py-3 text-center">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm mx-auto ${selectedRow === idx ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}>
                                                                {q.num}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="relative">
                                                                <select
                                                                    value={q.type}
                                                                    onChange={(e) => { e.stopPropagation(); handleTypeChange(idx, e.target.value) }}
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedRow(idx) }}
                                                                    onFocus={() => setSelectedRow(idx)}
                                                                    className={`w-full appearance-none pl-3 pr-8 py-2 border rounded-xl focus:ring-2 focus:ring-primary/20 focus:outline-none text-xs font-bold transition-shadow cursor-pointer ${selectedRow === idx ? 'border-primary/30 bg-white shadow-sm' : 'border-gray-200 bg-gray-50'
                                                                        }`}
                                                                >
                                                                    <option value="choice5">5지선다</option>
                                                                    <option value="choice4">4지선다</option>
                                                                    <option value="ox">O/X</option>
                                                                    <option value="short">단답형</option>
                                                                    <option value="essay">서술형</option>
                                                                </select>
                                                                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-gray-400">
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {q.hasSubQuestions ? (
                                                                <div className="flex items-center justify-center gap-2 py-1 px-3 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-100">
                                                                    <span>📋</span>
                                                                    소문항 {q.subQuestions.length}개 설정됨
                                                                </div>
                                                            ) : q.type === 'essay' ? (
                                                                <div className="text-center text-gray-400 text-xs font-medium py-1">(채점 기준 등 입력 시 고급설정 이용)</div>
                                                            ) : (
                                                                <input
                                                                    ref={(el) => answerRefs.current[idx] = el}
                                                                    type="text"
                                                                    value={q.displayAnswer || formatAnswer(q)}
                                                                    onChange={(e) => { e.stopPropagation(); handleAnswerChange(idx, e.target.value) }}
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedRow(idx) }}
                                                                    onFocus={() => setSelectedRow(idx)}
                                                                    onKeyDown={(e) => handleKeyDown(e, idx)}
                                                                    placeholder="정답 입력 (예: 3, O, 단어)..."
                                                                    className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary/20 focus:outline-none text-center font-bold tracking-wide transition-shadow ${selectedRow === idx ? 'border-primary/50 shadow-sm' : 'border-gray-200'
                                                                        }`}
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); removeQuestion(idx) }}
                                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                                title="문항 삭제"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mt-4 flex justify-center">
                                        <button
                                            onClick={addQuestion}
                                            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                            문항 추가하기
                                        </button>
                                    </div>
                                    <div className="h-20"></div> {/* 하단 여백 */}
                                </div>

                                {/* 하단 액션 바 */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        ← 이전 단계
                                    </button>
                                    <button
                                        onClick={handleCreateExam}
                                        disabled={creating}
                                        className="px-8 py-3 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {creating ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                저장 중...
                                            </>
                                        ) : (
                                            <>
                                                {isEditMode ? '수정 완료' : '시험 생성하기'}
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* 우측: 고급 설정 패널 */}
                            {showAdvanced && (
                                <div className="w-80 bg-white border-l border-gray-100 flex flex-col shadow-xl z-20">
                                    <div className="p-4 border-b bg-gray-50/50">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                            <span>⚙️</span> 고급 설정
                                        </h3>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                                        {selectedQuestion ? (
                                            <>
                                                {/* 선택된 문항 헤더 */}
                                                <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-2xl font-black text-primary">Q{selectedQuestion.num}</span>
                                                        <span className="px-2 py-1 bg-white rounded-lg text-xs font-bold text-gray-500 border border-gray-100 shadow-sm">{typeLabels[selectedQuestion.type]}</span>
                                                    </div>
                                                    <p className="text-xs text-indigo-400 font-medium">현재 선택된 문항입니다</p>
                                                </div>

                                                {/* 정답 선택 (객관식/OX) */}
                                                {!selectedQuestion.hasSubQuestions && (
                                                    <div className="mb-6">
                                                        <label className="block text-xs font-bold text-gray-500 mb-2">정답 선택 (복수 선택 가능)</label>
                                                        {(selectedQuestion.type === 'choice5' || selectedQuestion.type === 'choice4') && (
                                                            <div className="flex gap-2">
                                                                {[1, 2, 3, 4, 5].slice(0, selectedQuestion.type === 'choice4' ? 4 : 5).map(num => (
                                                                    <button
                                                                        key={num}
                                                                        onClick={() => toggleChoiceAnswer(selectedRow, num)}
                                                                        className={`w-10 h-10 rounded-full font-bold text-lg transition-all ${(selectedQuestion.correctAnswers || []).includes(num)
                                                                            ? 'bg-primary text-white shadow-md transform scale-105'
                                                                            : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                                                                            }`}
                                                                    >
                                                                        {num}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {selectedQuestion.type === 'ox' && (
                                                            <div className="flex gap-2">
                                                                {['O', 'X'].map(val => (
                                                                    <button
                                                                        key={val}
                                                                        onClick={() => toggleChoiceAnswer(selectedRow, val)}
                                                                        className={`flex-1 py-2 rounded-xl font-bold text-lg transition-all ${(selectedQuestion.correctAnswers || []).includes(val)
                                                                            ? 'bg-primary text-white shadow-md'
                                                                            : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                                                                            }`}
                                                                    >
                                                                        {val}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {(selectedQuestion.type === 'short') && (
                                                            <input
                                                                type="text"
                                                                value={selectedQuestion.displayAnswer || ''}
                                                                onChange={(e) => handleAnswerChange(selectedRow, e.target.value)}
                                                                placeholder="정답 입력 (콤마로 구분)"
                                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                                            />
                                                        )}
                                                        {(selectedQuestion.type === 'essay') && (
                                                            <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded-lg">
                                                                서술형은 정답을 입력하지 않습니다. 아래 채점 기준에 작성해주세요.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* 소문항 설정 */}
                                                <div>
                                                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors border border-gray-100">
                                                        <span className="font-bold text-sm text-gray-700">📋 소문항 사용</span>
                                                        <div className={`relative w-11 h-6 transition-colors rounded-full ${selectedQuestion.hasSubQuestions ? 'bg-primary' : 'bg-gray-300'}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedQuestion.hasSubQuestions}
                                                                onChange={() => handleSubQuestionToggle(selectedRow)}
                                                                className="sr-only"
                                                            />
                                                            <div className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform ${selectedQuestion.hasSubQuestions ? 'translate-x-5' : ''}`} />
                                                        </div>
                                                    </label>

                                                    {selectedQuestion.hasSubQuestions && (
                                                        <div className="mt-3 space-y-3 pl-2 border-l-2 border-primary/20">
                                                            {selectedQuestion.subQuestions.map((sub, sIdx) => (
                                                                <div key={sIdx} className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-xs font-bold text-gray-500">({sub.subNum})번 정답 & 배점</span>
                                                                        <button onClick={() => handleRemoveSubQuestion(selectedRow, sIdx)} className="text-rose-400 hover:text-rose-600">×</button>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <input
                                                                            type="text"
                                                                            value={sub.displayAnswer || formatAnswer(sub)} // 임시
                                                                            onChange={(e) => handleSubAnswerChange(selectedRow, sIdx, e.target.value)}
                                                                            placeholder="정답"
                                                                            className="w-full px-2 py-1.5 bg-white border rounded-lg text-xs focus:ring-1 focus:ring-primary"
                                                                        />
                                                                        <div className="relative">
                                                                            <input
                                                                                type="number"
                                                                                value={sub.subPoints}
                                                                                onChange={(e) => handleSubPointsChange(selectedRow, sIdx, e.target.value)}
                                                                                className="w-full pl-2 pr-6 py-1.5 bg-white border rounded-lg text-xs focus:ring-1 focus:ring-primary"
                                                                            />
                                                                            <span className="absolute right-2 top-1.5 text-xs text-gray-400">점</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <button
                                                                onClick={() => handleAddSubQuestion(selectedRow)}
                                                                className="w-full py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100"
                                                            >
                                                                + 소문항 추가
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <hr className="border-gray-100" />

                                                {/* 기본 속성 */}
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-500 mb-1">배점</label>
                                                            <input
                                                                type="number"
                                                                value={selectedQuestion.points}
                                                                onChange={(e) => handlePointsChange(selectedRow, e.target.value)}
                                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-500 mb-1">영역/단원</label>
                                                            {!showAddCategory ? (
                                                                <div className="flex gap-2">
                                                                    <select
                                                                        value={selectedQuestion.category || ''}
                                                                        onChange={(e) => {
                                                                            if (e.target.value === '__NEW__') {
                                                                                setShowAddCategory(true)
                                                                            } else {
                                                                                handleCategoryChange(selectedRow, e.target.value)
                                                                            }
                                                                        }}
                                                                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none appearance-none"
                                                                    >
                                                                        <option value="">선택 안 함</option>
                                                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                                                        <option value="__NEW__" className="font-bold text-primary">+ 직접 입력 (새 항목 추가)</option>
                                                                    </select>
                                                                </div>
                                                            ) : (
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        type="text"
                                                                        autoFocus
                                                                        placeholder="새 영역 이름"
                                                                        onBlur={(e) => {
                                                                            if (e.target.value.trim()) {
                                                                                const newVal = e.target.value.trim()
                                                                                setCategories(prev => [...new Set([...prev, newVal])])
                                                                                handleCategoryChange(selectedRow, newVal)
                                                                            }
                                                                            setShowAddCategory(false)
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                e.preventDefault()
                                                                                e.currentTarget.blur()
                                                                            }
                                                                        }}
                                                                        className="flex-1 px-3 py-2 bg-white border border-primary rounded-xl text-sm focus:outline-none"
                                                                    />
                                                                    <button
                                                                        onClick={() => setShowAddCategory(false)}
                                                                        className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200"
                                                                    >
                                                                        취소
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1">해설 / 채점 기준</label>
                                                        <textarea
                                                            value={selectedQuestion.explanation || ''}
                                                            onChange={(e) => handleExplanationChange(selectedRow, e.target.value)}
                                                            placeholder="학생들에게 보여줄 해설이나 서술형 채점 기준을 입력하세요."
                                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                {/* 문항 특수 옵션 */}
                                                {!selectedQuestion.hasSubQuestions && selectedQuestion.type !== 'essay' && (
                                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                                        <label className="flex items-center justify-between cursor-pointer">
                                                            <span className="text-xs font-bold text-gray-600">띄어쓰기 무시 (단답형)</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedQuestion.ignoreSpace}
                                                                onChange={() => handleIgnoreSpaceChange(selectedRow)}
                                                                className="rounded text-primary focus:ring-primary"
                                                            />
                                                        </label>

                                                        {selectedQuestion.type !== 'short' && (
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-500 mb-2">복수 정답 처리</label>
                                                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                                                    <button
                                                                        onClick={() => handleLogicChange(selectedRow, 'and')}
                                                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${selectedQuestion.answerLogic === 'and' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                                                                    >
                                                                        모두 일치 (AND)
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleLogicChange(selectedRow, 'or')}
                                                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${selectedQuestion.answerLogic === 'or' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                                                                    >
                                                                        하나라도 (OR)
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-center py-20 text-gray-400">
                                                <div className="text-4xl mb-2">👆</div>
                                                <p className="text-sm font-medium">문항을 선택하여<br />상세 설정을 변경하세요</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ExamCreateModal
