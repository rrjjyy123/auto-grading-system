import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { signOut, getMySessions, createSession, toggleSessionActive, deleteSession, getConversationsBySession } from '../lib/supabase'

function TeacherDashboard({ user, onViewSession }) {
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newSessionName, setNewSessionName] = useState('')
    const [creating, setCreating] = useState(false)
    const [sessionConversationCounts, setSessionConversationCounts] = useState({})
    const [showQRModal, setShowQRModal] = useState(false)
    const [qrSession, setQrSession] = useState(null)
    const [showPrivacyInfoModal, setShowPrivacyInfoModal] = useState(false)
    const [dontShowPrivacyAgain, setDontShowPrivacyAgain] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [currentView, setCurrentView] = useState('dashboard') // 'dashboard' or 'guide'

    // 학생용 앱 URL (배포 후 실제 URL로 변경)
    const STUDENT_APP_URL = 'https://mediation-for-student.vercel.app'

    const loadSessions = async () => {
        setLoading(true)
        const data = await getMySessions()
        setSessions(data)

        // 각 세션의 대화 수 로드
        const counts = {}
        for (const session of data) {
            const conversations = await getConversationsBySession(session.code)
            counts[session.id] = conversations.length
        }
        setSessionConversationCounts(counts)

        setLoading(false)
    }

    useEffect(() => {
        loadSessions()
    }, [])

    const handleLogout = async () => {
        await signOut()
    }

    const handleCreateSession = async () => {
        setCreating(true)
        const { data, error } = await createSession(newSessionName)
        if (error) {
            alert('세션 생성에 실패했습니다: ' + error)
        } else {
            setSessions([data, ...sessions])
            setShowCreateModal(false)
            setNewSessionName('')
        }
        setCreating(false)
    }

    const handleToggleActive = async (sessionId, currentActive) => {
        const { error } = await toggleSessionActive(sessionId, !currentActive)
        if (!error) {
            setSessions(sessions.map(s =>
                s.id === sessionId ? { ...s, is_active: !currentActive } : s
            ))
        }
    }

    const handleDeleteSession = async (sessionId) => {
        if (!confirm('정말 이 학급을 삭제하시겠습니까? 삭제한 학급은 복구할 수 없습니다.')) return

        const { error } = await deleteSession(sessionId)
        if (!error) {
            setSessions(sessions.filter(s => s.id !== sessionId))
        }
    }

    const copyToClipboard = (code) => {
        navigator.clipboard.writeText(code)
        alert(`학급 코드 "${code}"가 복사되었습니다!`)
    }

    const handleShowQR = (session) => {
        setQrSession(session)
        setShowQRModal(true)
    }

    const getQRUrl = (code) => {
        return `${STUDENT_APP_URL}?code=${code}`
    }

    const handleOpenCreateModal = () => {
        const hidePrivacyInfo = localStorage.getItem('hide_privacy_info_popup') === 'true'
        if (hidePrivacyInfo) {
            setShowCreateModal(true)
        } else {
            setShowPrivacyInfoModal(true)
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* 사이드바 */}
            <aside className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
                {/* 사이드바 헤더 */}
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'hidden' : ''}`}>
                            <span className="text-2xl">🌱</span>
                            <div>
                                <h1 className="text-lg font-bold text-green-600">관계 회복 대화 모임</h1>
                            </div>
                        </div>
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            {sidebarCollapsed ? '»' : '«'}
                        </button>
                    </div>
                    {!sidebarCollapsed && (
                        <p className="text-xs text-gray-400 mt-1 truncate">{user.email}</p>
                    )}
                </div>

                {/* 네비게이션 메뉴 */}
                <nav className="flex-1 p-3 space-y-1">
                    <button
                        onClick={handleOpenCreateModal}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors font-medium ${sidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <span className="text-lg">➕</span>
                        {!sidebarCollapsed && <span>새 학급 만들기</span>}
                    </button>

                    <div className={`pt-4 ${sidebarCollapsed ? 'hidden' : ''}`}>
                        <p className="px-3 text-xs text-gray-400 font-medium mb-2">메뉴</p>
                    </div>

                    <button
                        onClick={() => setCurrentView('dashboard')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${sidebarCollapsed ? 'justify-center' : ''} ${currentView === 'dashboard' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        <span className="text-lg">📋</span>
                        {!sidebarCollapsed && <span>학급 목록</span>}
                    </button>

                    <button
                        onClick={() => setCurrentView('guide')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${sidebarCollapsed ? 'justify-center' : ''} ${currentView === 'guide' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        <span className="text-lg">📖</span>
                        {!sidebarCollapsed && <span>사용 안내</span>}
                    </button>

                    <div className={`pt-4 ${sidebarCollapsed ? 'hidden' : ''}`}>
                        <p className="px-3 text-xs text-gray-400 font-medium mb-2">바로가기</p>
                    </div>

                    <a
                        href={STUDENT_APP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <span className="text-lg">👨‍🎓</span>
                        {!sidebarCollapsed && <span>학생용 앱</span>}
                    </a>
                </nav>

                {/* 하단 영역 */}
                <div className="p-3 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <span className="text-lg">🚪</span>
                        {!sidebarCollapsed && <span>로그아웃</span>}
                    </button>
                </div>
            </aside>

            {/* 메인 콘텐츠 */}
            <main className="flex-1 p-6 overflow-auto">
                <div className="max-w-4xl mx-auto">
                    {currentView === 'dashboard' ? (
                        /* 학급 목록 뷰 */
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h2 className="text-xl font-bold text-gray-700 mb-4">📋 내 학급 목록</h2>

                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
                                </div>
                            ) : sessions.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <p className="text-4xl mb-2">📝</p>
                                    <p>아직 생성된 학급이 없습니다.</p>
                                    <p className="text-sm">사이드바에서 새 학급을 만들어보세요!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {sessions.map(session => (
                                        <div
                                            key={session.id}
                                            className={`border-2 rounded-xl p-4 transition-all ${session.is_active
                                                ? 'border-green-200 bg-green-50'
                                                : 'border-gray-200 bg-gray-50 opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${session.is_active
                                                            ? 'bg-green-200 text-green-700'
                                                            : 'bg-gray-200 text-gray-500'
                                                            }`}>
                                                            {session.is_active ? '활성' : '비활성'}
                                                        </span>
                                                        <h3 className="font-bold text-gray-700">{session.name}</h3>
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-2">
                                                        <code className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-lg font-bold tracking-wider">
                                                            {session.code}
                                                        </code>
                                                        <button
                                                            onClick={() => copyToClipboard(session.code)}
                                                            className="text-blue-500 hover:text-blue-700 text-sm"
                                                            title="코드 복사"
                                                        >
                                                            📋 복사
                                                        </button>
                                                        <button
                                                            onClick={() => handleShowQR(session)}
                                                            className="text-purple-500 hover:text-purple-700 text-sm"
                                                            title="QR 코드"
                                                        >
                                                            📱 QR
                                                        </button>
                                                    </div>

                                                    <div className="mt-2 text-sm text-gray-500">
                                                        <span>대화 {sessionConversationCounts[session.id] || 0}건</span>
                                                        <span className="mx-2">•</span>
                                                        <span>{new Date(session.created_at).toLocaleDateString('ko-KR')}</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        onClick={() => onViewSession(session)}
                                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                                                    >
                                                        📚 대화 보기
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(session.id, session.is_active)}
                                                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${session.is_active
                                                            ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                                                            }`}
                                                    >
                                                        {session.is_active ? '⏸ 비활성화' : '▶ 활성화'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSession(session.id)}
                                                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                                                    >
                                                        🗑 삭제
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* 사용 안내 뷰 */
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-700 mb-2">📖 사용 안내</h2>
                                <p className="text-gray-500">관계 회복 대화 모임을 처음 사용하시는 선생님을 위한 가이드입니다.</p>
                            </div>

                            {/* 프로그램 소개 */}
                            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-100">
                                <h3 className="text-lg font-bold text-gray-700 mb-3">🌱 관계 회복 대화 모임이란?</h3>
                                <p className="text-gray-600 mb-4">
                                    <strong className="text-green-600">회복적 생활교육</strong> 철학을 기반으로 한 AI 갈등 조정 프로그램입니다.
                                    학생들 간 갈등이 발생했을 때, AI가 중립적 조정자 역할을 하여 학생들이 <strong>스스로 감정을 표현하고,
                                        상대방을 이해하며, 해결책을 찾도록</strong> 안내합니다.
                                </p>
                                <div className="grid md:grid-cols-3 gap-3 text-sm">
                                    <div className="bg-white rounded-xl p-3 text-center">
                                        <span className="text-2xl">⚖️</span>
                                        <p className="font-medium text-gray-700 mt-1">중립적 공감</p>
                                        <p className="text-gray-500 text-xs">선입견 없이 공정하게 경청</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 text-center">
                                        <span className="text-2xl">🕐</span>
                                        <p className="font-medium text-gray-700 mt-1">24시간 대기</p>
                                        <p className="text-gray-500 text-xs">언제든지 사용 가능</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 text-center">
                                        <span className="text-2xl">📋</span>
                                        <p className="font-medium text-gray-700 mt-1">자동 기록</p>
                                        <p className="text-gray-500 text-xs">대화 내용 및 AI 요약</p>
                                    </div>
                                </div>
                            </div>

                            {/* 회복적 대화 6단계 */}
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <h3 className="text-lg font-bold text-green-600 mb-4">🎭 AI의 회복적 대화 6단계</h3>
                                <p className="text-sm text-gray-500 mb-4">AI 조정자는 다음 6단계를 자연스럽게 오가며 대화를 진행합니다.</p>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-400">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                                            <span className="font-medium text-gray-700">상황 알아보기</span>
                                        </div>
                                        <p className="text-xs text-gray-500">무슨 일이 있었는지 파악</p>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-400">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                                            <span className="font-medium text-gray-700">영향 살펴보기</span>
                                        </div>
                                        <p className="text-xs text-gray-500">각자에게 미친 영향 탐색</p>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-400">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                                            <span className="font-medium text-gray-700">방법 찾아보기</span>
                                        </div>
                                        <p className="text-xs text-gray-500">해결 방안 모색</p>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-400">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                                            <span className="font-medium text-gray-700">관계 다져가기</span>
                                        </div>
                                        <p className="text-xs text-gray-500">앞으로의 관계 설정</p>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-400">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                                            <span className="font-medium text-gray-700">함께 노력하기</span>
                                        </div>
                                        <p className="text-xs text-gray-500">함께 노력할 부분 약속</p>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-400">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">6</span>
                                            <span className="font-medium text-gray-700">한 뼘 더 자라기</span>
                                        </div>
                                        <p className="text-xs text-gray-500">배운 점 성찰</p>
                                    </div>
                                </div>
                            </div>

                            {/* 주요 기능 */}
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <h3 className="text-lg font-bold text-blue-600 mb-4">📱 주요 기능</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="flex gap-3 p-3 bg-blue-50 rounded-xl">
                                        <span className="text-2xl">🔢</span>
                                        <div>
                                            <p className="font-medium text-gray-700">학급 코드 시스템</p>
                                            <p className="text-sm text-gray-500">6자리 고유 코드로 학급 관리, 활성화/비활성화 통제</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 p-3 bg-blue-50 rounded-xl">
                                        <span className="text-2xl">📱</span>
                                        <div>
                                            <p className="font-medium text-gray-700">QR 코드 공유</p>
                                            <p className="text-sm text-gray-500">QR 코드 자동 생성, 교실에 출력해서 비치 가능</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 p-3 bg-blue-50 rounded-xl">
                                        <span className="text-2xl">🎤</span>
                                        <div>
                                            <p className="font-medium text-gray-700">음성 입력 지원</p>
                                            <p className="text-sm text-gray-500">글쓰기 어려운 저학년도 쉽게 사용</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 p-3 bg-blue-50 rounded-xl">
                                        <span className="text-2xl">📝</span>
                                        <div>
                                            <p className="font-medium text-gray-700">자동 대화 요약</p>
                                            <p className="text-sm text-gray-500">갈등 원인, 감정 변화, 합의 내용 자동 정리</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 p-3 bg-blue-50 rounded-xl">
                                        <span className="text-2xl">📥</span>
                                        <div>
                                            <p className="font-medium text-gray-700">대화 내보내기</p>
                                            <p className="text-sm text-gray-500">대화 기록을 TXT 파일로 저장</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 p-3 bg-blue-50 rounded-xl">
                                        <span className="text-2xl">💬</span>
                                        <div>
                                            <p className="font-medium text-gray-700">메모 기능</p>
                                            <p className="text-sm text-gray-500">후속 조치, 상담 내용 기록</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 교사용 앱 사용 방법 */}
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <h3 className="text-lg font-bold text-green-600 mb-4 flex items-center gap-2">
                                    🍎 교사용 앱 사용 방법
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-green-50 rounded-xl p-4">
                                        <div className="flex gap-3">
                                            <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                                            <div>
                                                <p className="font-medium text-gray-700">학급 만들기</p>
                                                <p className="text-sm text-gray-500 mt-1">"새 학급 만들기" 버튼 → 학급 이름 입력 → 6자리 코드 자동 생성</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-4">
                                        <div className="flex gap-3">
                                            <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                                            <div>
                                                <p className="font-medium text-gray-700">코드 공유하기</p>
                                                <p className="text-sm text-gray-500 mt-1">📋 복사 버튼 또는 📱 QR 버튼으로 학생들에게 공유</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-4">
                                        <div className="flex gap-3">
                                            <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                                            <div>
                                                <p className="font-medium text-gray-700">대화 기록 확인</p>
                                                <p className="text-sm text-gray-500 mt-1">"대화 보기" → 해결/미해결 상태 확인 → AI 요약 확인</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-4">
                                        <div className="flex gap-3">
                                            <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
                                            <div>
                                                <p className="font-medium text-gray-700">후속 조치</p>
                                                <p className="text-sm text-gray-500 mt-1">📝 메모 기능으로 상담 내용 기록, 미해결 건 선별 지도</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 학생용 앱 안내 */}
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <h3 className="text-lg font-bold text-blue-600 mb-4 flex items-center gap-2">
                                    👦 학생들에게 안내하기
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex gap-3 items-start">
                                        <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                                        <div>
                                            <p className="font-medium text-gray-700">학급 코드 입력</p>
                                            <p className="text-sm text-gray-500">선생님이 알려준 6자리 코드 입력 또는 QR 스캔</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                                        <div>
                                            <p className="font-medium text-gray-700">참여자 이름 입력</p>
                                            <p className="text-sm text-gray-500">대화에 참여하는 친구들 이름 모두 입력 (최소 2명 ~ 최대 6명)</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                                        <div>
                                            <p className="font-medium text-gray-700">대화 규칙 동의</p>
                                            <p className="text-sm text-gray-500">상대방 말 끝까지 듣기, 비난하지 않기, 비밀 유지하기</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
                                        <div>
                                            <p className="font-medium text-gray-700">AI 선생님과 대화</p>
                                            <p className="text-sm text-gray-500">이름 선택 → 메시지 입력 또는 🎤 음성 입력 → AI 질문에 답하기</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">5</span>
                                        <div>
                                            <p className="font-medium text-gray-700">대화 종료</p>
                                            <p className="text-sm text-gray-500">"대화 종료하기" → 해결됨/미해결 선택 → AI 자동 요약 생성</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 개인정보 보호 안내 */}
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
                                    🔒 학생 개인정보 보호 안내
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    14세 미만 아동의 개인정보 보호를 위해 <strong className="text-red-600">실제 학교명</strong>을 사용하지 않습니다.
                                </p>
                                <div className="space-y-3">
                                    <div className="bg-white rounded-xl p-4">
                                        <p className="font-medium text-gray-700 mb-2">📌 학급명 설정</p>
                                        <p className="text-sm text-gray-600 mb-2">
                                            실제 학교명이나 정확한 반 정보 대신, 우리 반만의 애칭을 사용해주세요.
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✅ 사랑반, 행복한 교실</span>
                                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">❌ 서울OO초 4-2</span>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-xl p-4">
                                        <p className="font-medium text-gray-700 mb-2">📌 학생 이름</p>
                                        <p className="text-sm text-gray-600">
                                            학생들에게 닉네임(가명) 사용을 안내하면 개인정보 보호에 더욱 효과적입니다.
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-3">
                                    ※ 비식별 정보로 운영하면 별도의 법정대리인 동의 없이 서비스를 이용할 수 있습니다.
                                </p>
                            </div>

                            {/* 팁 */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                                <h4 className="font-bold text-yellow-700 mb-3">💡 활용 팁</h4>
                                <ul className="text-sm text-gray-600 space-y-2">
                                    <li className="flex items-start gap-2">
                                        <span className="text-yellow-500">•</span>
                                        <span>QR 코드를 <strong>교실에 출력해서 비치</strong>해두면 학생들이 쉽게 접근할 수 있어요.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-yellow-500">•</span>
                                        <span>학급을 <strong>비활성화</strong>하면 해당 코드로 접속할 수 없어요. 방학 중 관리에 유용!</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-yellow-500">•</span>
                                        <span>미해결된 대화는 담임 선생님과 함께 <strong>후속 상담</strong>을 진행하세요.</span>
                                    </li>

                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* 세션 생성 모달 */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-fade-in">
                        <h2 className="text-2xl font-bold text-gray-700 mb-4">🆕 새 학급 만들기</h2>

                        <div className="mb-4">
                            <label className="block text-gray-600 mb-2">학급 이름 (선택)</label>
                            <input
                                type="text"
                                value={newSessionName}
                                onChange={(e) => setNewSessionName(e.target.value)}
                                placeholder="예: 평화반"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-400"
                            />
                        </div>

                        <p className="text-sm text-gray-500 mb-4">
                            학급 코드는 자동으로 생성됩니다. 학생들에게 이 코드를 알려주세요.
                        </p>

                        {/* 가칭 사용 안내 */}
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-xs text-blue-700">
                                💡 <strong>주의:</strong> 학교명, 학년, 반 등 아동을 식별할 수 있는 정보 대신
                                <strong>"평화반"</strong>처럼 가칭을 사용해 주세요.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreateSession}
                                disabled={creating}
                                className="flex-1 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {creating ? '생성 중...' : '생성하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR 코드 모달 */}
            {showQRModal && qrSession && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-fade-in text-center">
                        <h2 className="text-xl font-bold text-gray-700 mb-2">
                            📱 QR 코드
                        </h2>
                        <p className="text-gray-500 mb-4">{qrSession.name}</p>

                        <div id="qr-code-container" className="bg-white p-4 rounded-xl inline-block mb-4">
                            <QRCodeSVG
                                id="qr-code-svg"
                                value={getQRUrl(qrSession.code)}
                                size={200}
                                level="H"
                                includeMargin={true}
                            />
                        </div>

                        <p className="text-sm text-gray-400 mb-2">
                            학급 코드: <strong className="text-blue-600">{qrSession.code}</strong>
                        </p>
                        <p className="text-xs text-gray-400 mb-4">
                            학생들이 이 QR을 스캔하면 바로 접속됩니다
                        </p>

                        {/* 다운로드 및 인쇄 버튼 */}
                        <div className="flex gap-2 mb-3">
                            <button
                                onClick={() => {
                                    const svg = document.getElementById('qr-code-svg')
                                    const canvas = document.createElement('canvas')
                                    const ctx = canvas.getContext('2d')
                                    const img = new Image()
                                    const svgData = new XMLSerializer().serializeToString(svg)
                                    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
                                    const url = URL.createObjectURL(svgBlob)

                                    img.onload = () => {
                                        canvas.width = img.width
                                        canvas.height = img.height
                                        ctx.fillStyle = 'white'
                                        ctx.fillRect(0, 0, canvas.width, canvas.height)
                                        ctx.drawImage(img, 0, 0)

                                        const pngUrl = canvas.toDataURL('image/png')
                                        const a = document.createElement('a')
                                        a.href = pngUrl
                                        a.download = `QR코드_${qrSession.name}_${qrSession.code}.png`
                                        a.click()
                                        URL.revokeObjectURL(url)
                                    }
                                    img.src = url
                                }}
                                className="flex-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                📥 이미지 저장
                            </button>
                            <button
                                onClick={() => {
                                    const printWindow = window.open('', '_blank')
                                    const svg = document.getElementById('qr-code-svg')
                                    const svgData = new XMLSerializer().serializeToString(svg)

                                    printWindow.document.write(`
                                        <html>
                                            <head>
                                                <title>QR 코드 - ${qrSession.name}</title>
                                                <style>
                                                    @page {
                                                        margin: 0;
                                                        size: A4;
                                                    }
                                                    @media print {
                                                        html, body {
                                                            -webkit-print-color-adjust: exact !important;
                                                            print-color-adjust: exact !important;
                                                        }
                                                    }
                                                    * {
                                                        margin: 0;
                                                        padding: 0;
                                                        box-sizing: border-box;
                                                    }
                                                    body { 
                                                        display: flex; 
                                                        flex-direction: column;
                                                        align-items: center; 
                                                        justify-content: center; 
                                                        min-height: 100vh; 
                                                        padding: 40px;
                                                        font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
                                                        background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%);
                                                    }
                                                    .poster {
                                                        background: white;
                                                        border-radius: 24px;
                                                        padding: 48px;
                                                        box-shadow: 0 4px 24px rgba(0,0,0,0.1);
                                                        border: 3px solid #22c55e;
                                                        text-align: center;
                                                        max-width: 480px;
                                                        width: 100%;
                                                    }
                                                    .header {
                                                        display: flex;
                                                        align-items: center;
                                                        justify-content: center;
                                                        gap: 12px;
                                                        margin-bottom: 8px;
                                                    }
                                                    .logo {
                                                        font-size: 40px;
                                                    }
                                                    .title {
                                                        font-size: 28px;
                                                        font-weight: bold;
                                                        color: #166534;
                                                    }
                                                    .subtitle {
                                                        font-size: 16px;
                                                        color: #6b7280;
                                                        margin-bottom: 24px;
                                                        padding-bottom: 16px;
                                                        border-bottom: 2px dashed #d1d5db;
                                                    }
                                                    .qr-container {
                                                        background: white;
                                                        padding: 16px;
                                                        border-radius: 16px;
                                                        display: inline-block;
                                                        margin: 16px 0;
                                                    }
                                                    .qr-container svg {
                                                        width: 220px !important;
                                                        height: 220px !important;
                                                    }
                                                    .code-section {
                                                        background: #eff6ff;
                                                        border-radius: 12px;
                                                        padding: 16px;
                                                        margin: 20px 0;
                                                    }
                                                    .code-label {
                                                        font-size: 14px;
                                                        color: #6b7280;
                                                        margin-bottom: 4px;
                                                    }
                                                    .code-value {
                                                        font-size: 32px;
                                                        font-weight: bold;
                                                        color: #2563eb;
                                                        letter-spacing: 4px;
                                                    }
                                                    .instructions {
                                                        background: #fef9c3;
                                                        border-radius: 12px;
                                                        padding: 16px;
                                                        margin-top: 20px;
                                                    }
                                                    .instructions-title {
                                                        font-size: 16px;
                                                        font-weight: bold;
                                                        color: #854d0e;
                                                        margin-bottom: 8px;
                                                    }
                                                    .instructions-text {
                                                        font-size: 14px;
                                                        color: #713f12;
                                                        line-height: 1.6;
                                                    }
                                                    .class-name {
                                                        margin-top: 24px;
                                                        padding-top: 16px;
                                                        border-top: 2px dashed #d1d5db;
                                                        font-size: 18px;
                                                        color: #374151;
                                                    }
                                                    .class-badge {
                                                        display: inline-block;
                                                        background: #dcfce7;
                                                        color: #166534;
                                                        padding: 8px 20px;
                                                        border-radius: 20px;
                                                        font-weight: bold;
                                                    }
                                                </style>
                                            </head>
                                            <body>
                                                <div class="poster">
                                                    <div class="header">
                                                        <span class="logo">🌱</span>
                                                        <span class="title">관계 회복 대화 모임</span>
                                                    </div>
                                                    <p class="subtitle">갈등이 생겼을 때, AI 선생님과 함께 이야기해요!</p>
                                                    
                                                    <div class="qr-container">
                                                        ${svgData}
                                                    </div>
                                                    
                                                    <div class="code-section">
                                                        <p class="code-label">학급 코드</p>
                                                        <p class="code-value">${qrSession.code}</p>
                                                    </div>
                                                    
                                                    <div class="instructions">
                                                        <p class="instructions-title">📱 사용 방법</p>
                                                        <p class="instructions-text">
                                                            1. 휴대폰으로 QR코드를 스캔하거나<br>
                                                            2. 위 학급 코드를 입력하세요!
                                                        </p>
                                                    </div>
                                                    
                                                    <div class="class-name">
                                                        <span class="class-badge">🏫 ${qrSession.name}</span>
                                                    </div>
                                                </div>
                                            </body>
                                        </html>
                                    `)
                                    printWindow.document.close()
                                    printWindow.onload = () => {
                                        printWindow.print()
                                    }
                                }}
                                className="flex-1 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                🖨️ 인쇄
                            </button>
                        </div>

                        <button
                            onClick={() => setShowQRModal(false)}
                            className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}


            {/* 14세 미만 아동 개인정보 보호 안내 모달 */}
            {showPrivacyInfoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl animate-fade-in my-4 max-h-[90vh] overflow-y-auto">
                        <div className="text-center mb-4">
                            <div className="text-4xl mb-2">🔒</div>
                            <h2 className="text-xl font-bold text-gray-700">학생 개인정보 보호를 위한<br />'학급명 가칭 사용' 및 이용 안내</h2>
                        </div>

                        {/* 1. 원칙 */}
                        <div className="mb-4">
                            <h3 className="font-bold text-gray-700 mb-2">1. 14세 미만 아동의 개인정보 처리에 관한 원칙</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                현행 개인정보보호법에 따라 14세 미만 아동의 식별 가능한 개인정보(학교, 학년, 반, 실명 등이 결합된 정보)를
                                수집할 경우 법정대리인의 동의가 필수적입니다. 하지만, <strong className="text-blue-600">다른 정보와 결합하여도
                                    특정 개인을 알아볼 수 없는 '비식별 정보'</strong>는 동의 대상에 포함되지 않습니다.
                            </p>
                        </div>

                        {/* 2. 운영 정책 */}
                        <div className="mb-4">
                            <h3 className="font-bold text-gray-700 mb-2">2. 비식별화(Anonymous) 운영 정책</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                <strong>관계 회복 대화 모임</strong>은 별도의 법정대리인 동의 절차 없이 서비스를 편리하게 이용하실 수 있도록,
                                아동 식별이 불가능한 최소한의 정보로 운영하는 것을 원칙으로 합니다.
                                이를 위해 학급 생성 시 아래의 <strong>[입력 가이드]</strong>를 반드시 준수해주시기 바랍니다.
                            </p>
                        </div>

                        {/* 3. 입력 가이드 */}
                        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-4">
                            <h3 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                                📋 [필독] 선생님을 위한 입력 가이드
                            </h3>
                            <p className="text-sm text-yellow-700 mb-3">
                                서비스 내에서 학생 개인을 특정할 수 있는 정보가 저장되지 않도록 협조 부탁드립니다.
                            </p>

                            {/* 학급명 설정 */}
                            <div className="bg-white rounded-lg p-3 mb-3">
                                <p className="font-medium text-gray-700 mb-2">📌 학급명 설정</p>
                                <p className="text-sm text-gray-600 mb-2">
                                    실제 학교명이나 정확한 반 정보(예: OO초등학교 4학년 2반) 대신,
                                    우리 반만의 애칭이나 가칭을 사용해주세요.
                                </p>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✅ 사랑반</span>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✅ 행복한 교실</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">❌ 서울OO초 4-2</span>
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">❌ 부산XX초 5-1</span>
                                </div>
                            </div>

                            {/* 학생 이름 */}
                            <div className="bg-white rounded-lg p-3">
                                <p className="font-medium text-gray-700 mb-2">📌 학생 이름</p>
                                <p className="text-sm text-gray-600">
                                    닉네임(가명) 사용을 안내하면 개인정보 보호에 더욱 효과적입니다.
                                </p>
                            </div>
                        </div>

                        <label className="flex items-center gap-2 mb-4 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={dontShowPrivacyAgain}
                                onChange={(e) => setDontShowPrivacyAgain(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-600">다시 보지 않기</span>
                        </label>

                        <button
                            onClick={() => {
                                if (dontShowPrivacyAgain) {
                                    localStorage.setItem('hide_privacy_info_popup', 'true')
                                }
                                setShowPrivacyInfoModal(false)
                                setShowCreateModal(true)
                            }}
                            className="w-full py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium"
                        >
                            네, 인지했습니다
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default TeacherDashboard

