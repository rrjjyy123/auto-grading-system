import { useState, useEffect } from 'react'
import { initializeSupabase, validateSessionCode } from '../lib/supabase'

function SetupScreen({ onStart }) {
    const [sessionCode, setSessionCode] = useState('')
    const [nameInput, setNameInput] = useState('')
    const [participants, setParticipants] = useState([])
    const [error, setError] = useState('')
    const [isValidating, setIsValidating] = useState(false)
    const [sessionInfo, setSessionInfo] = useState(null)

    useEffect(() => {
        initializeSupabase()

        // URL에서 code 파라미터 읽기 (QR 코드 스캔 시)
        const params = new URLSearchParams(window.location.search)
        const codeFromUrl = params.get('code')
        if (codeFromUrl) {
            setSessionCode(codeFromUrl.toUpperCase())
        }
    }, [])

    // 학급 코드 유효성 검증
    const handleValidateCode = async () => {
        if (!sessionCode.trim()) {
            setError('학급 코드를 입력해주세요.')
            return
        }

        setIsValidating(true)
        setError('')

        const result = await validateSessionCode(sessionCode.trim())

        if (result.valid) {
            setSessionInfo(result.session)
            setError('')
        } else {
            setSessionInfo(null)
            setError(result.error || '유효하지 않은 학급 코드입니다.')
        }

        setIsValidating(false)
    }

    const handleAddParticipant = () => {
        const trimmedName = nameInput.trim()

        if (!trimmedName) {
            setError('이름을 입력해주세요.')
            return
        }

        if (participants.includes(trimmedName)) {
            setError('이미 추가된 이름이에요.')
            return
        }

        if (participants.length >= 6) {
            setError('최대 6명까지만 참여할 수 있어요.')
            return
        }

        setParticipants([...participants, trimmedName])
        setNameInput('')
        setError('')
    }

    const handleRemoveParticipant = (name) => {
        setParticipants(participants.filter(p => p !== name))
    }

    const handleKeyPress = (e, action) => {
        if (e.key === 'Enter') {
            action()
        }
    }

    const canStart = sessionInfo && participants.length >= 2

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md animate-fade-in">
                {/* 헤더 */}
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4 animate-bounce-soft">🌱</div>
                    <h1 className="text-3xl text-green-600 mb-2">관계 회복 대화 모임</h1>
                    <p className="text-gray-500 text-lg">
                        함께 마음을 나누고 해결해봐요
                    </p>
                </div>

                {/* 세션 코드 입력 */}
                <div className="mb-6">
                    <label className="block text-gray-600 mb-2 text-lg">
                        📋 선생님이 알려준 학급 코드
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={sessionCode}
                            onChange={(e) => {
                                setSessionCode(e.target.value.toUpperCase())
                                setSessionInfo(null)
                            }}
                            onKeyPress={(e) => handleKeyPress(e, handleValidateCode)}
                            placeholder="예: ABC123"
                            className="flex-1 px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-400 text-lg transition-colors uppercase tracking-wider text-center font-bold"
                            maxLength={10}
                            disabled={sessionInfo !== null}
                        />
                        {!sessionInfo ? (
                            <button
                                onClick={handleValidateCode}
                                disabled={isValidating}
                                className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isValidating ? '확인중...' : '확인'}
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    setSessionInfo(null)
                                    setSessionCode('')
                                }}
                                className="px-6 py-3 bg-gray-400 text-white rounded-xl hover:bg-gray-500 transition-colors text-lg font-medium"
                            >
                                변경
                            </button>
                        )}
                    </div>

                    {/* 세션 정보 표시 */}
                    {sessionInfo && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                            <p className="text-blue-700 font-medium">
                                ✅ {sessionInfo.name || '학급'} 연결됨
                            </p>
                        </div>
                    )}
                </div>

                {/* 참여자 입력 - 세션 확인 후에만 표시 */}
                {sessionInfo && (
                    <>
                        <div className="mb-6">
                            <label className="block text-gray-600 mb-2 text-lg">
                                대화에 참여할 친구 이름을 알려주세요
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    onKeyPress={(e) => handleKeyPress(e, handleAddParticipant)}
                                    placeholder="이름 입력..."
                                    className="flex-1 px-4 py-3 border-2 border-green-200 rounded-xl focus:outline-none focus:border-green-400 text-lg transition-colors"
                                    maxLength={10}
                                />
                                <button
                                    onClick={handleAddParticipant}
                                    className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors text-lg font-medium"
                                >
                                    추가
                                </button>
                            </div>
                        </div>

                        {/* 참여자 목록 */}
                        <div className="mb-6">
                            <p className="text-gray-500 mb-3 text-sm">
                                참여자 ({participants.length}/6명)
                                {participants.length < 2 && (
                                    <span className="text-orange-400 ml-2">
                                        최소 2명이 필요해요
                                    </span>
                                )}
                            </p>
                            <div className="flex flex-wrap gap-2 min-h-[48px]">
                                {participants.length === 0 ? (
                                    <p className="text-gray-300 italic">
                                        아직 참여자가 없어요...
                                    </p>
                                ) : (
                                    participants.map((name, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 px-4 py-2 bg-soft-green rounded-full animate-fade-in"
                                        >
                                            <span className="text-green-700">{name}</span>
                                            <button
                                                onClick={() => handleRemoveParticipant(name)}
                                                className="text-green-500 hover:text-red-400 transition-colors"
                                                title="삭제"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* 에러 메시지 */}
                {error && (
                    <p className="text-red-400 mb-4 text-sm text-center">{error}</p>
                )}

                {/* 시작 버튼 */}
                <button
                    onClick={() => onStart(participants, sessionCode.toUpperCase())}
                    disabled={!canStart}
                    className={`w-full py-4 rounded-xl text-xl font-medium transition-all ${canStart
                        ? 'bg-gradient-to-r from-green-400 to-green-500 text-white hover:from-green-500 hover:to-green-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {!sessionInfo
                        ? '먼저 학급 코드를 확인해주세요'
                        : canStart
                            ? '🌈 조정 시작하기'
                            : '참여자를 추가해주세요'
                    }
                </button>

                {/* 안내 문구 */}
                <p className="text-center text-gray-400 mt-6 text-sm">
                    AI 선생님이 여러분의 이야기를 잘 들어줄 거예요 💚
                </p>
            </div>
        </div>
    )
}

export default SetupScreen
