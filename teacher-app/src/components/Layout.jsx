import { useState } from 'react'

/**
 * 전역 레이아웃 - 사이드바 + 메인 콘텐츠
 * 모든 페이지에서 공통으로 사용
 */
function Layout({ user, onLogout, children, activeMenu, onMenuChange, onCreateClass, selectedClass, onClassMenuChange }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)

    // 로고 클릭 시 메인 페이지로 이동
    const handleLogoClick = () => {
        onMenuChange?.('classes')
    }

    return (
        <div className="min-h-screen flex bg-background">
            {/* 모바일 오버레이 */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* 사이드바 */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-30
                w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen
                transform transition-transform duration-200 shadow-sm
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* 상단: 로고 */}
                <div
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={handleLogoClick}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <span className="block font-extrabold text-xl text-gray-900 tracking-tight leading-none">OnMarking</span>
                            <span className="text-[10px] text-primary font-bold tracking-widest uppercase">Teacher</span>
                        </div>
                    </div>
                </div>

                {/* 새 학급 만들기 버튼 */}
                {onCreateClass && !selectedClass && (
                    <div className="px-4 mb-4">
                        <button
                            onClick={onCreateClass}
                            className="w-full py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
                        >
                            <span className="bg-white/20 rounded-lg p-1 group-hover:bg-white/30 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                </svg>
                            </span>
                            새 학급 만들기
                        </button>
                    </div>
                )}

                {/* 현재 선택된 학급 표시 */}
                {selectedClass && (
                    <div className="px-4 mb-4">
                        <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                            <p className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">Current Class</p>
                            <p className="font-bold text-gray-900 truncate text-lg">{selectedClass.name}</p>
                        </div>
                    </div>
                )}

                {/* 메뉴 */}
                <nav className="flex-1 px-4 py-2 overflow-y-auto space-y-1">
                    <p className="px-4 text-xs font-semibold text-gray-400 mb-2 mt-2 uppercase tracking-wider">Menu</p>

                    <button
                        onClick={() => onMenuChange?.('classes')}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 font-medium ${activeMenu === 'classes' && !selectedClass
                            ? 'bg-indigo-50 text-primary font-bold shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <span className="text-lg">📋</span>
                        학급 목록
                    </button>

                    {/* 학급 선택 시 시험관리/학생관리 메뉴 표시 */}
                    {selectedClass && (
                        <>
                            <button
                                onClick={() => onClassMenuChange?.('exams')}
                                className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 font-medium ${activeMenu === 'exams'
                                    ? 'bg-indigo-50 text-primary font-bold shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <span className="text-lg">📝</span>
                                시험 관리
                            </button>
                            <button
                                onClick={() => onClassMenuChange?.('students')}
                                className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 font-medium ${activeMenu === 'students'
                                    ? 'bg-indigo-50 text-primary font-bold shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <span className="text-lg">👥</span>
                                학생 관리
                            </button>
                        </>
                    )}

                    <div className="pt-4 mt-2 border-t border-gray-100">
                        <p className="px-4 text-xs font-semibold text-gray-400 mb-2 mt-2 uppercase tracking-wider">Support</p>
                        <button
                            onClick={() => onMenuChange?.('guide')}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 font-medium ${activeMenu === 'guide'
                                ? 'bg-indigo-50 text-primary font-bold shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <span className="text-lg">📖</span>
                            사용 안내
                        </button>

                        <a
                            href="https://auto-grading-for-student.vercel.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        >
                            <span className="text-lg">🎓</span>
                            학생용 앱
                        </a>
                    </div>
                </nav>

                {/* 하단: 프로필 & 로그아웃 */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3 mb-3 px-2">
                        <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xl shadow-sm">
                            🧑‍🏫
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">선생님</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full py-2 px-4 rounded-lg border border-gray-200 bg-white text-gray-600 text-sm font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-sm"
                    >
                        로그아웃
                    </button>
                </div>
            </aside>

            {/* 모바일 메뉴 버튼 */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="fixed bottom-6 left-6 z-40 lg:hidden w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:scale-105 transition-transform"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* 메인 콘텐츠 */}
            <main className="flex-1 p-4 lg:p-8 overflow-y-auto w-full lg:w-auto">
                <div className="max-w-7xl mx-auto h-full">
                    {children}
                </div>
            </main>
        </div>
    )
}

export default Layout
