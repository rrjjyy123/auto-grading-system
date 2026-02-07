import { useState, useEffect } from 'react'
import {
    subscribeToMyClasses,
    createClass,
    deleteClass,
    toggleClassActive,
    getStudentCodes
} from '../lib/firebase'
import ClassDetail from './ClassDetail'
import QRGenerator from './QRGenerator'
import UsageGuide from './UsageGuide'

function Dashboard({ user, onLogout }) {
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [selectedClass, setSelectedClass] = useState(null)
    const [showQRModal, setShowQRModal] = useState(false)
    const [qrClass, setQRClass] = useState(null)
    const [studentCodes, setStudentCodes] = useState([])

    // 사이드바 탭
    const [activeTab, setActiveTab] = useState('classes') // 'classes', 'guide'

    // 새 학급 생성 폼
    const [newClassName, setNewClassName] = useState('')
    const [newStudentCount, setNewStudentCount] = useState(30)
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        const unsubscribe = subscribeToMyClasses((classList) => {
            setClasses(classList)
            setLoading(false)
        })
        return () => unsubscribe()
    }, [])

    const handleCreateClass = async () => {
        if (!newClassName.trim()) {
            alert('학급 이름을 입력하세요')
            return
        }
        if (newStudentCount < 1 || newStudentCount > 500) {
            alert('학생 수는 1~500명 사이로 입력하세요')
            return
        }

        setCreating(true)
        const { data, error } = await createClass(newClassName.trim(), newStudentCount)
        setCreating(false)

        if (error) {
            alert('학급 생성 실패: ' + error)
            return
        }

        setShowCreateModal(false)
        setNewClassName('')
        setNewStudentCount(30)
        alert(`${data.name} 학급이 생성되었습니다! (${data.studentCount}명)`)
    }

    const handleDeleteClass = async (classId, className) => {
        if (!confirm(`"${className}" 학급을 삭제하시겠습니까?\n관련된 모든 시험과 성적이 삭제됩니다.`)) {
            return
        }
        const { error } = await deleteClass(classId)
        if (error) {
            alert('삭제 실패: ' + error)
        }
    }

    const handleToggleActive = async (classId, currentActive) => {
        await toggleClassActive(classId, !currentActive)
    }

    const handleShowQR = async (classItem) => {
        const codes = await getStudentCodes(classItem.id)
        setStudentCodes(codes)
        setQRClass(classItem)
        setShowQRModal(true)
    }

    const handleViewClass = (classItem) => {
        setSelectedClass(classItem)
    }

    // 학급 상세 보기
    if (selectedClass) {
        return (
            <ClassDetail
                classData={selectedClass}
                onBack={() => setSelectedClass(null)}
            />
        )
    }

    return (
        <div className="min-h-screen flex">
            {/* 사이드바 */}
            <aside className="w-64 bg-[#FFF8E7] border-r border-amber-200 flex flex-col min-h-screen">
                {/* 상단: 앱 제목 + 이메일 */}
                <div className="p-4 border-b border-amber-200">
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
                <div className="p-4">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="text-lg">+</span>
                        새 학급 만들기
                    </button>
                </div>

                {/* 메뉴 */}
                <nav className="flex-1 px-4">
                    <p className="text-xs text-gray-400 mb-2">메뉴</p>
                    <button
                        onClick={() => setActiveTab('classes')}
                        className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-colors flex items-center gap-3 ${activeTab === 'classes'
                                ? 'bg-green-100 text-green-700 font-semibold'
                                : 'text-gray-600 hover:bg-amber-100'
                            }`}
                    >
                        <span>📋</span>
                        학급 목록
                    </button>
                    <button
                        onClick={() => setActiveTab('guide')}
                        className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-colors flex items-center gap-3 ${activeTab === 'guide'
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

            {/* 메인 콘텐츠 */}
            <main className="flex-1 p-6 bg-[#FFFDF5]">
                {activeTab === 'classes' && (
                    <div className="max-w-5xl mx-auto">
                        {/* 헤더 */}
                        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <span>📋</span>
                                내 학급 목록
                            </h2>
                        </div>

                        {/* 학급 목록 */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                                    <p className="text-gray-500">로딩중...</p>
                                </div>
                            ) : classes.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-500 mb-4">아직 생성된 학급이 없습니다</p>
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                                    >
                                        첫 학급 만들기
                                    </button>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {classes.map((classItem) => (
                                        <div
                                            key={classItem.id}
                                            className={`border-2 rounded-xl p-4 transition-all ${classItem.isActive
                                                ? 'border-green-200 bg-green-50'
                                                : 'border-gray-200 bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-lg">📚</span>
                                                        <h3 className="text-lg font-bold text-gray-800">{classItem.name}</h3>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${classItem.isActive
                                                            ? 'bg-green-200 text-green-800'
                                                            : 'bg-gray-300 text-gray-600'
                                                            }`}>
                                                            {classItem.isActive ? '활성' : '비활성'}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-500 text-sm">
                                                        학생 {classItem.studentCount}명 •
                                                        {classItem.createdAt?.toDate?.().toLocaleDateString('ko-KR') || '방금 전'}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => handleViewClass(classItem)}
                                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors text-sm"
                                                    >
                                                        시험 관리
                                                    </button>
                                                    <button
                                                        onClick={() => handleShowQR(classItem)}
                                                        className="px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors text-sm"
                                                    >
                                                        QR 코드
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(classItem.id, classItem.isActive)}
                                                        className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${classItem.isActive
                                                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                            }`}
                                                    >
                                                        {classItem.isActive ? '비활성화' : '활성화'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClass(classItem.id, classItem.name)}
                                                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition-colors text-sm"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'guide' && (
                    <UsageGuide />
                )}
            </main>

            {/* 학급 생성 모달 */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">새 학급 만들기</h2>

                        {/* 개인정보 보호 안내 */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                            <p className="text-yellow-800 font-semibold text-sm mb-1">⚠️ 개인정보 보호 안내</p>
                            <p className="text-yellow-700 text-xs mb-2">
                                학급 이름에 학교명, 학년, 반 등 식별 가능한 정보 대신 <strong>가칭(별명)</strong>을 사용해주세요.
                            </p>
                            <div className="text-xs">
                                <p className="text-green-600">✅ 권장: 사랑반, 행복반, 열정반</p>
                                <p className="text-red-600">❌ 금지: 서울OO초 6학년 3반</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">학급 이름</label>
                                <input
                                    type="text"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    placeholder="예: 사랑반, 행복반"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">학생 수 (1번 ~ N번)</label>
                                <input
                                    type="number"
                                    value={newStudentCount}
                                    onChange={(e) => setNewStudentCount(parseInt(e.target.value) || 1)}
                                    min="1"
                                    max="500"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                />
                                <p className="text-sm text-gray-500 mt-1">각 학생에게 고유한 6자리 코드가 생성됩니다</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreateClass}
                                disabled={creating}
                                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                                {creating ? '생성중...' : '생성하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR 코드 모달 */}
            {showQRModal && qrClass && (
                <QRGenerator
                    classData={qrClass}
                    studentCodes={studentCodes}
                    onClose={() => setShowQRModal(false)}
                />
            )}
        </div>
    )
}

export default Dashboard
