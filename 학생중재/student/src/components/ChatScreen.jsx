import { useState, useEffect, useRef } from 'react'
import ParticipantSelector from './ParticipantSelector'
import ChatMessage from './ChatMessage'
import { startNewChat, sendMessage, getInitialMessage, generateSummary } from '../lib/gemini'
import { initializeSupabase, isSupabaseEnabled, createConversation, saveConversation } from '../lib/supabase'

// 참여자별 색상 팔레트
const PARTICIPANT_COLORS = [
    { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
    { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
]

/**
 * AI 응답에서 다음 화자를 감지
 */
const detectNextSpeaker = (aiResponse, participantList) => {
    // 1. 명시적 마커 확인 (최우선)
    const explicitMarkerMatch = aiResponse.match(/\[다음 화자:\s*([^\]]+)\]/)
    if (explicitMarkerMatch) {
        const markedName = explicitMarkerMatch[1].trim()
        const matchedParticipant = participantList.find(name =>
            markedName === name || markedName.includes(name) || name.includes(markedName)
        )
        if (matchedParticipant) {
            return matchedParticipant
        }
    }

    // 2. 패턴 기반 감지 (폴백)
    let lastMatchedName = null
    let lastMatchIndex = -1

    for (const name of participantList) {
        const patterns = [
            new RegExp(`${name}[야아][,.]?`, 'g'),
            new RegExp(`${name}(이)?는`, 'g'),
            new RegExp(`${name}(이)?에게`, 'g'),
            new RegExp(`${name}(이)?도`, 'g'),
            new RegExp(`${name}(이)?가`, 'g'),
            new RegExp(`${name}(이)?한테`, 'g'),
            new RegExp(`${name}(이)?의`, 'g'),
            new RegExp(`${name}(아|아)?\\s*어떻`, 'g'),
            new RegExp(`${name}(이)?부터`, 'g'),
            new RegExp(`${name}(이)?먼저`, 'g'),
        ]

        for (const pattern of patterns) {
            let match
            while ((match = pattern.exec(aiResponse)) !== null) {
                if (match.index > lastMatchIndex) {
                    lastMatchIndex = match.index
                    lastMatchedName = name
                }
            }
        }
    }

    return lastMatchedName
}

/**
 * AI 응답에서 [다음 화자: 이름] 마커와 코드블록을 제거
 */
const removeNextSpeakerMarker = (aiResponse) => {
    // 코드블록으로 감싸진 다음 화자 태그 제거
    let cleaned = aiResponse.replace(/\n?```\n?\[다음 화자:\s*[^\]]+\]\n?```/g, '')
    // 일반 다음 화자 태그도 제거 (혹시 코드블록 없이 나오는 경우)
    cleaned = cleaned.replace(/\n?\[다음 화자:\s*[^\]]+\]/g, '')
    return cleaned.trim()
}

function ChatScreen({ participants, sessionCode, onRestart }) {
    const [messages, setMessages] = useState([])
    const [inputValue, setInputValue] = useState('')
    const [selectedSpeaker, setSelectedSpeaker] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isInitialized, setIsInitialized] = useState(false)
    const [error, setError] = useState(null)
    const [conversationId, setConversationId] = useState(null)
    const [isSaving, setIsSaving] = useState(false)
    const [showEndModal, setShowEndModal] = useState(false)
    const [showResolutionModal, setShowResolutionModal] = useState(false)
    const [resolution, setResolution] = useState(null)
    const [savedSummary, setSavedSummary] = useState(null)
    const [isListening, setIsListening] = useState(false)
    const [speechSupported, setSpeechSupported] = useState(false)
    const [showOpeningModal, setShowOpeningModal] = useState(true)
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)
    const recognitionRef = useRef(null)

    // 오프닝 멘트
    const OPENING_SCRIPT = {
        intro: "저의 역할은 서로의 하고 싶은 말을 충분히 하고, 서로 그 말을 귀 기울여 듣도록 이끄는 것입니다. 그러기 위해서 저는 중립을 지킬 거예요. 무엇보다 중요한 것은 이 자리에 참여한 한 사람 한 사람의 의지입니다.",
        rules: [
            { title: "첫째, 적극적으로 경청하고 참여합니다.", desc: "상대가 말할 때는 끼어들지 않고 자신의 순서를 기다리거나 발언권을 얻고 말합니다." },
            { title: "둘째, 비방이나 욕설 등 거친 언어를 자제합니다.", desc: "서로의 진심을 듣는데 방해가 되는 심한 비방이나 욕설, 언성을 높이는 일을 자제하고 선생님의 안내를 따릅니다." },
            { title: "셋째, 비밀을 지킵니다.", desc: "이 자리에서 말한 내용, 말하고 들으면서 알게 된 것에 대해 다른 사람들과 이야기하지 않습니다." },
            { title: "넷째, 모임 중에 자리를 떠나지 않습니다.", desc: "개인의 특별한 상황이나 긴급한 용무가 있는 경우 선생님께 도움을 요청합니다." },
            { title: "다섯째, 본 사안에만 집중합니다.", desc: "본 사안과 관련이 없는 이야기를 하지 않습니다." }
        ]
    }

    // 참여자별 색상 매핑
    const participantColorMap = participants.reduce((acc, name, index) => {
        acc[name] = PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length]
        return acc
    }, {})

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    // Web Speech API 초기화
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (SpeechRecognition) {
            setSpeechSupported(true)
            const recognition = new SpeechRecognition()
            recognition.continuous = false
            recognition.interimResults = true
            recognition.lang = 'ko-KR'

            recognition.onresult = (event) => {
                let finalTranscript = ''

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript
                    }
                }

                if (finalTranscript) {
                    setInputValue(prev => prev + finalTranscript)
                }
            }

            recognition.onstart = () => setIsListening(true)
            recognition.onend = () => setIsListening(false)
            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error)
                setIsListening(false)
                if (event.error === 'not-allowed') {
                    alert('마이크 접근이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.')
                }
            }

            recognitionRef.current = recognition
        } else {
            setSpeechSupported(false)
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort()
            }
        }
    }, [])

    const toggleListening = () => {
        if (!recognitionRef.current) return
        if (isListening) {
            recognitionRef.current.stop()
        } else {
            try {
                recognitionRef.current.start()
            } catch (err) {
                console.error('Speech recognition start error:', err)
            }
        }
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // 채팅 초기화
    useEffect(() => {
        const initChat = async () => {
            try {
                setIsLoading(true)
                initializeSupabase()

                const session = startNewChat(participants)

                if (!session) {
                    setError('API 키가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY를 설정해주세요.')
                    setIsLoading(false)
                    return
                }

                const initialResponse = await getInitialMessage()
                const now = new Date()
                const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

                const initialMessage = {
                    type: 'ai',
                    content: removeNextSpeakerMarker(initialResponse),
                    timestamp
                }

                setMessages([initialMessage])
                setIsInitialized(true)

                // Supabase에 대화 생성 (session_code 포함)
                if (isSupabaseEnabled()) {
                    const conversation = await createConversation(participants, sessionCode)
                    if (conversation) {
                        setConversationId(conversation.id)
                        await saveConversation(conversation.id, [initialMessage])
                    }
                }

                // 다음 화자 자동 감지
                const nextSpeaker = detectNextSpeaker(initialResponse, participants)
                if (nextSpeaker) {
                    setSelectedSpeaker(nextSpeaker)
                }
            } catch (err) {
                console.error('Chat initialization error:', err)
                setError('채팅을 시작하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
            } finally {
                setIsLoading(false)
            }
        }

        initChat()
    }, [participants, sessionCode])

    const handleSendMessage = async () => {
        if (!selectedSpeaker || !inputValue.trim() || isLoading) return

        const now = new Date()
        const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

        const userMessage = {
            type: 'user',
            speaker: selectedSpeaker,
            content: inputValue.trim(),
            timestamp,
            color: participantColorMap[selectedSpeaker]
        }
        const newMessagesWithUser = [...messages, userMessage]
        setMessages(newMessagesWithUser)
        setInputValue('')
        setIsLoading(true)

        try {
            const response = await sendMessage(selectedSpeaker, inputValue.trim())
            const aiTimestamp = new Date()

            const aiMessage = {
                type: 'ai',
                content: removeNextSpeakerMarker(response),
                timestamp: `${aiTimestamp.getHours().toString().padStart(2, '0')}:${aiTimestamp.getMinutes().toString().padStart(2, '0')}`
            }

            const newMessagesWithAI = [...newMessagesWithUser, aiMessage]
            setMessages(newMessagesWithAI)

            if (isSupabaseEnabled() && conversationId) {
                await saveConversation(conversationId, newMessagesWithAI)
            }

            const nextSpeaker = detectNextSpeaker(response, participants)
            if (nextSpeaker) {
                setSelectedSpeaker(nextSpeaker)
            }
        } catch (err) {
            console.error('Send message error:', err)
            setMessages(prev => [...prev, {
                type: 'ai',
                content: '죄송해요, 잠시 문제가 생겼어요. 다시 한 번 말해줄 수 있을까요? 🌱',
                timestamp: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
            }])
        } finally {
            setIsLoading(false)
            inputRef.current?.focus()
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const handleEndConversation = () => {
        if (messages.length < 2) return
        setShowResolutionModal(true)
    }

    const handleResolutionSelect = async (selectedResolution) => {
        setResolution(selectedResolution)
        setShowResolutionModal(false)

        if (!isSupabaseEnabled() || !conversationId) {
            setShowEndModal(true)
            return
        }

        setIsSaving(true)
        try {
            const summary = await generateSummary(messages, participants)
            setSavedSummary(summary)
            await saveConversation(conversationId, messages, summary, 'completed', selectedResolution)
            setShowEndModal(true)
        } catch (err) {
            console.error('Error ending conversation:', err)
            setShowEndModal(true)
        } finally {
            setIsSaving(false)
        }
    }

    const isInputDisabled = !selectedSpeaker || isLoading || !isInitialized

    return (
        <div className="min-h-screen flex flex-col">
            {/* 오프닝 안내 팝업 모달 */}
            {showOpeningModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl">
                            <div className="text-center">
                                <span className="text-5xl">🌱</span>
                                <h2 className="text-2xl font-bold mt-2">관계 회복 대화 모임</h2>
                                <p className="text-green-100 mt-1">안녕하세요, 여러분! 😊</p>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                {OPENING_SCRIPT.intro}
                            </p>

                            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <span>📋</span> 대화 규칙
                            </h3>

                            <div className="space-y-3">
                                {OPENING_SCRIPT.rules.map((rule, index) => (
                                    <div key={index} className="bg-gray-50 rounded-xl p-4">
                                        <div className="font-medium text-gray-800 mb-1">
                                            ▪ {rule.title}
                                        </div>
                                        <div className="text-gray-500 text-sm pl-4">
                                            {rule.desc}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 text-center text-gray-500">
                                규칙을 잘 지킬 수 있겠죠? 😊
                            </div>
                        </div>

                        <div className="p-6 pt-0">
                            <button
                                onClick={() => setShowOpeningModal(false)}
                                className="w-full py-4 bg-green-500 text-white rounded-xl text-lg font-medium hover:bg-green-600 transition-colors shadow-md"
                            >
                                🚀 대화 시작하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 해결 상태 선택 모달 */}
            {showResolutionModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
                        <div className="text-center mb-6">
                            <span className="text-5xl">🤔</span>
                            <h2 className="text-2xl font-bold text-gray-700 mt-2">대화를 마무리할게요</h2>
                            <p className="text-gray-500 mt-2">오늘 대화의 결과를 알려주세요</p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleResolutionSelect('resolved')}
                                className="w-full px-6 py-4 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors font-medium text-lg flex items-center justify-center gap-3"
                            >
                                <span className="text-2xl">🌈</span>
                                <span>갈등이 해결되었어요!</span>
                            </button>
                            <button
                                onClick={() => handleResolutionSelect('unresolved')}
                                className="w-full px-6 py-4 bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 transition-colors font-medium text-lg flex items-center justify-center gap-3"
                            >
                                <span className="text-2xl">💭</span>
                                <span>아직 해결되지 않았어요</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowResolutionModal(false)}
                            className="w-full mt-4 py-3 text-gray-500 hover:text-gray-700 rounded-xl transition-colors text-sm"
                        >
                            취소하고 대화 계속하기
                        </button>
                    </div>
                </div>
            )}

            {/* 대화 종료 완료 모달 */}
            {showEndModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
                        <div className="text-center mb-4">
                            <span className="text-5xl">{resolution === 'resolved' ? '🌸' : '🌱'}</span>
                            <h2 className="text-2xl font-bold text-green-600 mt-2">대화가 종료되었어요!</h2>

                            <div className={`inline-block mt-3 px-4 py-2 rounded-full text-sm font-medium ${resolution === 'resolved'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                                }`}>
                                {resolution === 'resolved' ? '✅ 갈등 해결' : '💭 미해결'}
                            </div>
                        </div>

                        {resolution === 'unresolved' && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                                <p className="text-amber-800 text-center">
                                    🏫 <strong>선생님께 상담을 요청하세요.</strong>
                                    <br />
                                    <span className="text-sm text-amber-600">
                                        오늘 해결되지 않은 부분은 담임 선생님과 함께
                                        더 이야기해보면 좋겠어요.
                                    </span>
                                </p>
                            </div>
                        )}

                        {savedSummary && (
                            <div className="bg-green-50 rounded-xl p-4 mb-4 max-h-60 overflow-y-auto">
                                <h3 className="font-semibold text-green-700 mb-2">📝 대화 요약</h3>
                                <p className="text-gray-700 text-sm whitespace-pre-wrap">{savedSummary}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={onRestart}
                                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium"
                            >
                                처음 화면으로
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 저장 중 오버레이 */}
            {isSaving && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 shadow-xl text-center">
                        <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                        <p className="text-gray-600">대화를 종료하고 있어요...</p>
                    </div>
                </div>
            )}

            {/* 헤더 - 대화 기록 버튼 제거됨 */}
            <header className="bg-white shadow-sm py-4 px-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🌱</span>
                        <div>
                            <h1 className="text-2xl text-green-600">관계 회복 대화 모임</h1>
                            <p className="text-xs text-gray-400">학급: {sessionCode}</p>
                        </div>
                    </div>
                    <button
                        onClick={onRestart}
                        className="px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        새로운 대화
                    </button>
                </div>
            </header>

            {/* 메시지 영역 */}
            <main className="flex-1 overflow-y-auto p-4">
                <div className="max-w-4xl mx-auto space-y-4">
                    {error ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                            <p className="text-red-600">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                            >
                                다시 시도
                            </button>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, index) => (
                                <ChatMessage key={index} message={msg} />
                            ))}

                            {isLoading && (
                                <div className="flex justify-start animate-fade-in">
                                    <div className="flex items-end gap-2">
                                        <div className="w-10 h-10 bg-soft-green rounded-full flex items-center justify-center text-xl">
                                            🌱
                                        </div>
                                        <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                                            <div className="flex gap-1">
                                                <span className="typing-dot w-2 h-2 bg-green-400 rounded-full"></span>
                                                <span className="typing-dot w-2 h-2 bg-green-400 rounded-full"></span>
                                                <span className="typing-dot w-2 h-2 bg-green-400 rounded-full"></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>
            </main>

            {/* 입력 영역 */}
            <footer className="bg-white border-t border-gray-100 p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex gap-3 items-stretch">
                        <ParticipantSelector
                            participants={participants}
                            selectedSpeaker={selectedSpeaker}
                            onSelectSpeaker={setSelectedSpeaker}
                            colorMap={participantColorMap}
                            disabled={!isInitialized}
                        />

                        <div className="flex-1 relative">
                            {!selectedSpeaker && isInitialized && (
                                <div className="absolute -top-12 left-0 bg-orange-100 text-orange-600 px-4 py-2 rounded-lg text-sm whitespace-nowrap animate-bounce-soft z-10">
                                    👈 먼저 이름을 선택해주세요!
                                </div>
                            )}

                            <div className="flex gap-2 items-end">
                                <textarea
                                    ref={inputRef}
                                    value={inputValue}
                                    onChange={(e) => {
                                        setInputValue(e.target.value)
                                        e.target.style.height = 'auto'
                                        e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            handleSendMessage()
                                        }
                                    }}
                                    placeholder={
                                        isListening
                                            ? '🎤 듣고 있어요...'
                                            : !isInitialized
                                                ? '잠시만 기다려주세요...'
                                                : selectedSpeaker
                                                    ? `${selectedSpeaker}(이)가 할 말을 적어주세요...`
                                                    : '먼저 이름을 선택해주세요'
                                    }
                                    disabled={isInputDisabled}
                                    rows={1}
                                    className={`flex-1 px-5 py-3 border-2 rounded-xl text-lg transition-all resize-none overflow-hidden ${isInputDisabled
                                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                        : isListening
                                            ? 'border-red-300 bg-red-50 focus:border-red-400 focus:outline-none'
                                            : 'border-green-200 focus:border-green-400 focus:outline-none'
                                        }`}
                                    style={{ minHeight: '52px', maxHeight: '150px' }}
                                />

                                {speechSupported && (
                                    <button
                                        onClick={toggleListening}
                                        disabled={isInputDisabled}
                                        className={`px-4 py-4 rounded-xl text-xl transition-all ${isInputDisabled
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : isListening
                                                ? 'bg-red-500 text-white animate-pulse shadow-lg'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                                            }`}
                                        title={isListening ? '녹음 중지' : '음성으로 입력하기'}
                                    >
                                        {isListening ? '🔴' : '🎤'}
                                    </button>
                                )}

                                <button
                                    onClick={handleSendMessage}
                                    disabled={isInputDisabled || !inputValue.trim()}
                                    className={`px-6 py-4 rounded-xl text-lg font-medium transition-all whitespace-nowrap ${isInputDisabled || !inputValue.trim()
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg'
                                        }`}
                                >
                                    보내기 💌
                                </button>
                            </div>

                            {isInitialized && messages.length >= 2 && (
                                <div className="mt-3 text-right">
                                    <button
                                        onClick={handleEndConversation}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-orange-100 text-orange-600 hover:bg-orange-200 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        🏁 대화 종료하기
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default ChatScreen
