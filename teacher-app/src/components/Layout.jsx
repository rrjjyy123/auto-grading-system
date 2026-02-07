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
        <div className="min-h-screen flex">
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
                w-64 bg-[#FFF8E7] border-r border-amber-200 flex flex-col min-h-screen
                transform transition-transform duration-200
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* 상단: 앱 제목 + 이메일 (클릭 가능) */}
                <div
                    className="p-4 border-b border-amber-200 cursor-pointer hover:bg-amber-50 transition-colors"
                    onClick={handleLogoClick}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="font-bold text-gray-800">자동채점 시스템</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>

                {/* 새 학급 만들기 버튼 */}
                {onCreateClass && !selectedClass && (
                    <div className="p-4">
                        <button
                            onClick={onCreateClass}
                            className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="text-lg">+</span>
                            새 학급 만들기
                        </button>
                    </div>
                )}

                {/* 현재 선택된 학급 표시 */}
                {selectedClass && (
                    <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                        <p className="text-xs text-blue-500 mb-1">현재 학급</p>
                        <p className="font-bold text-blue-700 truncate">📚 {selectedClass.name}</p>
                    </div>
                )}

                {/* 메뉴 */}
                <nav className="flex-1 px-4 py-2 overflow-y-auto">
                    <p className="text-xs text-gray-400 mb-2 mt-2">메뉴</p>
                    <button
                        onClick={() => onMenuChange?.('classes')}
                        className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-colors flex items-center gap-3 ${activeMenu === 'classes' && !selectedClass
                            ? 'bg-green-100 text-green-700 font-semibold'
                            : 'text-gray-600 hover:bg-amber-100'
                            }`}
                    >
                        <span>📋</span>
                        학급 목록
                    </button>

                    {/* 학급 선택 시 시험관리/학생관리 메뉴 표시 */}
                    {selectedClass && (
                        <>
                            <button
                                onClick={() => onClassMenuChange?.('exams')}
                                className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-colors flex items-center gap-3 ${activeMenu === 'exams'
                                    ? 'bg-green-100 text-green-700 font-semibold'
                                    : 'text-gray-600 hover:bg-amber-100'
                                    }`}
                            >
                                <span>📝</span>
                                시험 관리
                            </button>
                            <button
                                onClick={() => onClassMenuChange?.('students')}
                                className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-colors flex items-center gap-3 ${activeMenu === 'students'
                                    ? 'bg-green-100 text-green-700 font-semibold'
                                    : 'text-gray-600 hover:bg-amber-100'
                                    }`}
                            >
                                <span>👥</span>
                                학생 관리
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => onMenuChange?.('guide')}
                        className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-colors flex items-center gap-3 ${activeMenu === 'guide'
                            ? 'bg-green-100 text-green-700 font-semibold'
                            : 'text-gray-600 hover:bg-amber-100'
                            }`}
                    >
                        <span>📖</span>
                        사용 안내
                    </button>

                    <p className="text-xs text-gray-400 mt-6 mb-2">바로가기</p>
                    <a
                        href="https://auto-grading-for-student.vercel.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-left px-4 py-3 rounded-xl mb-1 transition-colors flex items-center gap-3 text-gray-600 hover:bg-amber-100"
                    >
                        <span>🎓</span>
                        학생용 앱
                    </a>
                </nav>

                {/* 하단: 로그아웃 */}
                <div className="p-4 border-t border-amber-200">
                    <button
                        onClick={onLogout}
                        className="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-red-600 hover:bg-red-50"
                    >
                        <span>🚪</span>
                        로그아웃
                    </button>
                </div>
            </aside>

            {/* 모바일 메뉴 버튼 */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="fixed bottom-4 left-4 z-40 lg:hidden w-12 h-12 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* 메인 콘텐츠 */}
            <main className="flex-1 p-6 bg-[#FFFDF5] lg:ml-0">
                {children}
            </main>
        </div>
    )
}

export default Layout
