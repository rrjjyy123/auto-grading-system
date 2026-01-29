import { useState, useEffect } from 'react'
import { getConversationsBySession, getConversationById, deleteConversation, updateMemo } from '../lib/supabase'

function SessionDetail({ session, onBack }) {
    const [conversations, setConversations] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedConversation, setSelectedConversation] = useState(null)
    const [viewingDetail, setViewingDetail] = useState(false)
    const [showMemoModal, setShowMemoModal] = useState(false)
    const [memoConversation, setMemoConversation] = useState(null)
    const [memoText, setMemoText] = useState('')
    const [savingMemo, setSavingMemo] = useState(false)

    // 내보내기 관련 상태
    const [exportMode, setExportMode] = useState(false)
    const [selectedForExport, setSelectedForExport] = useState([])
    const [showExportOptionsModal, setShowExportOptionsModal] = useState(false)
    const [exportType, setExportType] = useState('combined')
    const [isExporting, setIsExporting] = useState(false)

    useEffect(() => {
        loadConversations()
    }, [session])

    const loadConversations = async () => {
        setLoading(true)
        const data = await getConversationsBySession(session.code)
        setConversations(data)
        setLoading(false)
    }

    const handleViewConversation = async (conv) => {
        const detail = await getConversationById(conv.id)
        setSelectedConversation(detail)
        setViewingDetail(true)
    }

    const handleDeleteConversation = async (convId) => {
        if (!confirm('이 대화 기록을 삭제하시겠습니까?')) return
        const success = await deleteConversation(convId)
        if (success) {
            setConversations(conversations.filter(c => c.id !== convId))
        }
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusBadge = (status, resolution) => {
        if (status === 'completed') {
            if (resolution === 'resolved') {
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">✅ 해결</span>
            } else {
                return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">💭 미해결</span>
            }
        }
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">🔄 진행중</span>
    }

    const handleOpenMemo = (conv) => {
        setMemoConversation(conv)
        setMemoText(conv.memo || '')
        setShowMemoModal(true)
    }

    const handleSaveMemo = async () => {
        if (!memoConversation) return
        setSavingMemo(true)
        const { error } = await updateMemo(memoConversation.id, memoText)
        if (!error) {
            setConversations(conversations.map(c =>
                c.id === memoConversation.id ? { ...c, memo: memoText } : c
            ))
            if (selectedConversation?.id === memoConversation.id) {
                setSelectedConversation({ ...selectedConversation, memo: memoText })
            }
            setShowMemoModal(false)
        } else {
            alert('메모 저장에 실패했습니다.')
        }
        setSavingMemo(false)
    }

    // TXT 형식으로 대화 내용 생성
    const generateConversationTxt = (conv) => {
        const lines = []
        lines.push('========================================')
        lines.push('관계 회복 대화 모임 - 대화 기록')
        lines.push('========================================')
        lines.push('')
        lines.push(`📅 일시: ${formatDate(conv.created_at)}`)
        if (conv.ended_at) {
            lines.push(`📅 종료: ${formatDate(conv.ended_at)}`)
        }
        lines.push(`👥 참여자: ${conv.participants?.join(', ') || ''}`)

        const statusText = conv.status === 'completed'
            ? (conv.resolution === 'resolved' ? '해결됨' : '미해결')
            : '진행중'
        lines.push(`✅ 상태: ${statusText}`)
        lines.push('')

        if (conv.summary) {
            lines.push('----------------------------------------')
            lines.push('[AI 요약]')
            lines.push('----------------------------------------')
            lines.push('')
            lines.push(conv.summary)
            lines.push('')
        }

        lines.push('----------------------------------------')
        lines.push('[대화 내용]')
        lines.push('----------------------------------------')
        lines.push('')

        if (conv.messages && conv.messages.length > 0) {
            conv.messages.forEach(msg => {
                if (msg.type === 'ai') {
                    lines.push(`[AI 선생님] ${msg.timestamp || ''}`)
                } else {
                    lines.push(`[${msg.speaker}] ${msg.timestamp || ''}`)
                }
                lines.push(msg.content)
                lines.push('')
            })
        } else {
            lines.push('(대화 내용 없음)')
            lines.push('')
        }

        if (conv.memo) {
            lines.push('----------------------------------------')
            lines.push('[교사 메모]')
            lines.push('----------------------------------------')
            lines.push('')
            lines.push(conv.memo)
            lines.push('')
        }

        lines.push('========================================')
        lines.push('')
        return lines.join('\n')
    }

    // 내보내기 버튼 클릭 시 옵션 모달 열기
    const handleExportClick = () => {
        if (selectedForExport.length === 0) {
            alert('내보낼 대화를 선택해주세요.')
            return
        }
        setShowExportOptionsModal(true)
    }

    // 합본(단일 파일)으로 내보내기
    const exportAsCombined = async () => {
        setIsExporting(true)
        const selectedConvs = conversations.filter(c => selectedForExport.includes(c.id))

        let content = ''
        content += '╔══════════════════════════════════════╗\n'
        content += '║   관계 회복 대화 모임 - 대화 기록    ║\n'
        content += '╚══════════════════════════════════════╝\n\n'
        content += `학급: ${session.name}\n`
        content += `내보내기 일시: ${formatDate(new Date().toISOString())}\n`
        content += `총 ${selectedForExport.length}개 대화\n\n`

        for (const conv of selectedConvs) {
            const detail = await getConversationById(conv.id)
            if (detail) {
                content += generateConversationTxt(detail)
                content += '\n'
            }
        }

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const dateStr = new Date().toISOString().split('T')[0]
        const filename = `대화기록_${session.name}_${dateStr}_${selectedForExport.length}건.txt`

        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        finishExport()
    }

    // 개별 파일로 내보내기
    const exportAsIndividual = async () => {
        setIsExporting(true)
        const selectedConvs = conversations.filter(c => selectedForExport.includes(c.id))

        for (const conv of selectedConvs) {
            const detail = await getConversationById(conv.id)
            if (detail) {
                const content = generateConversationTxt(detail)
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
                const url = URL.createObjectURL(blob)

                const date = new Date(conv.created_at)
                const dateStr = date.toISOString().split('T')[0]
                const participants = conv.participants?.join('_') || 'conversation'
                const filename = `대화기록_${dateStr}_${participants}.txt`

                const a = document.createElement('a')
                a.href = url
                a.download = filename
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                await new Promise(resolve => setTimeout(resolve, 300))
            }
        }
        finishExport()
    }

    // 내보내기 완료 처리
    const finishExport = () => {
        setIsExporting(false)
        setShowExportOptionsModal(false)
        setExportMode(false)
        setSelectedForExport([])
    }

    // 선택에 따라 내보내기 실행
    const handleExportConfirm = () => {
        if (exportType === 'combined') {
            exportAsCombined()
        } else {
            exportAsIndividual()
        }
    }

    // 체크박스 토글
    const toggleSelectForExport = (convId) => {
        if (selectedForExport.includes(convId)) {
            setSelectedForExport(selectedForExport.filter(id => id !== convId))
        } else {
            setSelectedForExport([...selectedForExport, convId])
        }
    }

    // 전체 선택/해제
    const toggleSelectAll = () => {
        if (selectedForExport.length === conversations.length) {
            setSelectedForExport([])
        } else {
            setSelectedForExport(conversations.map(c => c.id))
        }
    }

    // 대화 상세 보기 화면
    if (viewingDetail && selectedConversation) {
        return (
            <div className="min-h-screen">
                <header className="bg-white shadow-sm py-4 px-6">
                    <div className="max-w-4xl mx-auto flex items-center gap-4">
                        <button
                            onClick={() => setViewingDetail(false)}
                            className="px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            ← 목록으로
                        </button>
                        <div>
                            <h1 className="text-xl text-green-600">대화 상세</h1>
                            <p className="text-xs text-gray-400">
                                {selectedConversation.participants?.join(', ')} • {formatDate(selectedConversation.created_at)}
                            </p>
                        </div>
                    </div>
                </header>

                <main className="max-w-4xl mx-auto p-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            {getStatusBadge(selectedConversation.status, selectedConversation.resolution)}
                            <span className="text-gray-500">
                                참여자: {selectedConversation.participants?.join(', ')}
                            </span>
                        </div>

                        {selectedConversation.summary && (
                            <div className="bg-green-50 rounded-xl p-4">
                                <h3 className="font-bold text-green-700 mb-2">📝 AI 요약</h3>
                                <p className="text-gray-700 text-sm whitespace-pre-wrap">
                                    {selectedConversation.summary}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-700 mb-4">💬 대화 내용</h2>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            {selectedConversation.messages?.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`flex ${msg.type === 'ai' ? 'justify-start' : 'justify-end'}`}
                                >
                                    <div className="max-w-[80%]">
                                        {msg.type !== 'ai' && (
                                            <div className="text-right mb-1">
                                                <span className="text-sm font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                                    {msg.speaker}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`px-4 py-3 rounded-2xl ${msg.type === 'ai'
                                            ? 'bg-gray-100 text-gray-700'
                                            : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                {msg.content}
                                            </p>
                                        </div>
                                        <div className={`mt-1 text-xs text-gray-400 ${msg.type === 'ai' ? 'text-left' : 'text-right'}`}>
                                            {msg.timestamp}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    // 대화 목록 화면
    return (
        <div className="min-h-screen">
            <header className="bg-white shadow-sm py-4 px-6">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        ← 대시보드
                    </button>
                    <div>
                        <h1 className="text-xl text-green-600">{session.name}</h1>
                        <p className="text-xs text-gray-400">세션 코드: {session.code}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-700">📚 대화 기록</h2>
                        {conversations.length > 0 && (
                            <div className="flex gap-2">
                                {exportMode ? (
                                    <>
                                        <button
                                            onClick={handleExportClick}
                                            disabled={selectedForExport.length === 0}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                                                ${selectedForExport.length > 0
                                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                        >
                                            📥 {selectedForExport.length}개 내보내기
                                        </button>
                                        <button
                                            onClick={() => {
                                                setExportMode(false)
                                                setSelectedForExport([])
                                            }}
                                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                                        >
                                            취소
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setExportMode(true)}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-2"
                                    >
                                        📥 대화 내보내기
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {exportMode && conversations.length > 0 && (
                        <div className="mb-4 pb-3 border-b border-gray-200">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                                <input
                                    type="checkbox"
                                    checked={selectedForExport.length === conversations.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
                                />
                                전체 선택 ({selectedForExport.length}/{conversations.length})
                            </label>
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <p className="text-4xl mb-2">💬</p>
                            <p>아직 이 학급에서 진행된 대화가 없습니다.</p>
                            <p className="text-sm mt-1">학생들이 학급 코드 <strong>{session.code}</strong>로 접속하면 대화가 시작됩니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {conversations.map(conv => (
                                <div
                                    key={conv.id}
                                    className={`border-2 rounded-xl p-4 transition-colors ${exportMode && selectedForExport.includes(conv.id)
                                            ? 'border-green-400 bg-green-50'
                                            : 'border-gray-100 hover:border-green-200'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3 flex-1">
                                            {exportMode && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedForExport.includes(conv.id)}
                                                    onChange={() => toggleSelectForExport(conv.id)}
                                                    className="w-5 h-5 mt-1 rounded border-gray-300 text-green-500 focus:ring-green-500"
                                                />
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {getStatusBadge(conv.status, conv.resolution)}
                                                    <span className="font-medium text-gray-700">
                                                        {conv.participants?.join(', ')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {formatDate(conv.created_at)}
                                                    {conv.ended_at && ` ~ ${new Date(conv.ended_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
                                                </p>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    메시지 {conv.messages?.length || 0}개
                                                </p>
                                            </div>
                                        </div>
                                        {!exportMode && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleViewConversation(conv)}
                                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                                                >
                                                    상세 보기
                                                </button>
                                                <button
                                                    onClick={() => handleOpenMemo(conv)}
                                                    className={`px-3 py-2 rounded-lg transition-colors text-sm ${conv.memo ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                    title={conv.memo ? '메모 있음' : '메모 추가'}
                                                >
                                                    📝
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteConversation(conv.id)}
                                                    className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm"
                                                >
                                                    🗑
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* 메모 모달 */}
            {showMemoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl animate-fade-in">
                        <h2 className="text-xl font-bold text-gray-700 mb-4">
                            📝 메모 - {memoConversation?.participants?.join(', ')}
                        </h2>
                        <textarea
                            value={memoText}
                            onChange={(e) => setMemoText(e.target.value)}
                            placeholder="이 대화에 대한 메모를 작성하세요..."
                            className="w-full h-40 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-400 resize-none"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => setShowMemoModal(false)}
                                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSaveMemo}
                                disabled={savingMemo}
                                className="flex-1 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium disabled:opacity-50"
                            >
                                {savingMemo ? '저장 중...' : '저장하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 내보내기 옵션 모달 */}
            {showExportOptionsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-fade-in">
                        <h2 className="text-xl font-bold text-gray-700 mb-4">
                            📥 내보내기 옵션
                        </h2>
                        <p className="text-sm text-gray-500 mb-4">
                            {selectedForExport.length}개의 대화를 내보냅니다. 내보내기 방식을 선택해주세요.
                        </p>

                        <div className="space-y-3 mb-6">
                            <label
                                className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${exportType === 'combined' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="exportType"
                                    value="combined"
                                    checked={exportType === 'combined'}
                                    onChange={(e) => setExportType(e.target.value)}
                                    className="w-5 h-5 text-green-500"
                                />
                                <div>
                                    <p className="font-medium text-gray-700">📄 합본 (단일 파일)</p>
                                    <p className="text-sm text-gray-500">모든 대화를 하나의 TXT 파일로 저장</p>
                                </div>
                            </label>

                            <label
                                className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${exportType === 'individual' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="exportType"
                                    value="individual"
                                    checked={exportType === 'individual'}
                                    onChange={(e) => setExportType(e.target.value)}
                                    className="w-5 h-5 text-green-500"
                                />
                                <div>
                                    <p className="font-medium text-gray-700">📁 개별 파일</p>
                                    <p className="text-sm text-gray-500">각 대화를 별도의 TXT 파일로 저장</p>
                                </div>
                            </label>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowExportOptionsModal(false)}
                                disabled={isExporting}
                                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleExportConfirm}
                                disabled={isExporting}
                                className="flex-1 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isExporting ? (
                                    <>
                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                        내보내는 중...
                                    </>
                                ) : (
                                    '내보내기'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SessionDetail
