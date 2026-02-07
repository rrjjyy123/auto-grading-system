import { useState, useEffect } from 'react'
import {
    subscribeToMyClasses,
    createClass,
    deleteClass,
    toggleClassActive,
    getStudentCodes
} from '../lib/firebase'
import Layout from './Layout'
import ClassDetail from './ClassDetail'
import QRGenerator from './QRGenerator'
import UsageGuide from './UsageGuide'
import { useToast } from './Toast'

function Dashboard({ user, onLogout }) {
    const { success, error: toastError, info } = useToast()
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
            toastError('학급 이름을 입력하세요')
            return
        }
        if (newStudentCount < 1 || newStudentCount > 500) {
            toastError('학생 수는 1~500명 사이로 입력하세요')
            return
        }

        setCreating(true)
        const { data, error } = await createClass(newClassName.trim(), newStudentCount)
        setCreating(false)

        if (error) {
            toastError('학급 생성 실패: ' + error)
            return
        }

        setShowCreateModal(false)
        setNewClassName('')
        setNewStudentCount(30)
        success(`${data.name} 학급이 생성되었습니다! (${data.studentCount}명)`)
    }

    const handleDeleteClass = async (classId, className) => {
        if (!confirm(`"${className}" 학급을 삭제하시겠습니까?\n관련된 모든 시험과 성적이 삭제됩니다.`)) {
            return
        }
        const { error } = await deleteClass(classId)
        if (error) {
            toastError('삭제 실패: ' + error)
        } else {
            success('학급이 삭제되었습니다')
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
        setClassTab('exams') // 기본 탭
    }

    const handleBackFromClass = () => {
        setSelectedClass(null)
    }

    // 학급 내 탭 상태 (시험관리/학생관리)
    const [classTab, setClassTab] = useState('exams')

    // 학급 상세 보기 (Layout 안에서 렌더링)
    if (selectedClass) {
        return (
            <Layout
                user={user}
                onLogout={onLogout}
                activeMenu={classTab}
                selectedClass={selectedClass}
                onMenuChange={(menu) => {
                    setSelectedClass(null)  // 학급 상세에서 나가기
                    setActiveTab(menu)
                }}
                onClassMenuChange={(tab) => setClassTab(tab)}
            >
                <ClassDetail
                    classData={selectedClass}
                    onBack={handleBackFromClass}
                    initialTab={classTab}
                    onTabChange={(tab) => setClassTab(tab)}
                />
            </Layout>
        )
    }

    // 메인 콘텐츠 렌더링
    const renderMainContent = () => {
        if (activeTab === 'guide') {
            return <UsageGuide />
        }

        // 학급 목록
        return (
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
                        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-5xl">🏫</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">아직 생성된 학급이 없습니다</h3>
                            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                                새로운 학급을 만들어 학생들을 관리하고<br />시험을 배포하여 자동 채점 결과를 확인해보세요.
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-8 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                            >
                                + 첫 학급 만들기
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {classes.map((classItem) => (
                                <div
                                    key={classItem.id}
                                    onClick={() => handleViewClass(classItem)}
                                    className={`border-2 rounded-xl p-4 transition-all cursor-pointer hover:shadow-md ${classItem.isActive
                                        ? 'border-green-200 bg-green-50 hover:border-green-300'
                                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
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
                                        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
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
        )
    }

    return (
        <>
            <Layout
                user={user}
                onLogout={() => {
                    if (confirm('로그아웃 하시겠습니까?')) {
                        onLogout()
                    }
                }}
                activeMenu={activeTab}
                onMenuChange={setActiveTab}
                onCreateClass={() => setShowCreateModal(true)}
            >
                {renderMainContent()}
            </Layout>

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
        </>
    )
}

export default Dashboard
