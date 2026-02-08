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

    // 통계 계산
    const totalClasses = classes.length
    const totalStudents = classes.reduce((sum, c) => sum + (c.studentCount || 0), 0)
    const activeClasses = classes.filter(c => c.isActive).length

    // 메인 콘텐츠 렌더링
    const renderMainContent = () => {
        if (activeTab === 'guide') {
            return <UsageGuide />
        }

        // 학급 목록
        return (
            <div className="max-w-6xl mx-auto space-y-8">
                {/* 상단 웰컴 섹션 & 통계 위젯 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-3 bg-gradient-to-r from-primary to-indigo-700 rounded-3xl p-8 text-white shadow-xl flex items-center justify-between overflow-hidden relative">
                        <div className="relative z-10">
                            <h2 className="text-3xl font-extrabold mb-2">환영합니다, 선생님! 👋</h2>
                            <p className="text-indigo-100 font-medium">오늘도 OnMarking과 함께 스마트한 학급 관리를 시작해보세요.</p>
                        </div>
                        {/* 장식 배경 */}
                        <div className="absolute right-0 top-0 h-full w-1/2 bg-white/5 skew-x-12 transform translate-x-20"></div>
                        <div className="absolute right-10 bottom-[-20px] text-white/10 text-9xl font-black rotate-12">OM</div>
                    </div>

                    {/* 통계 카드 */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl">
                            📋
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm font-semibold">총 학급</p>
                            <p className="text-2xl font-bold text-gray-900">{totalClasses}개</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl">
                            👥
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm font-semibold">총 학생 수</p>
                            <p className="text-2xl font-bold text-gray-900">{totalStudents}명</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl">
                            ⚡
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm font-semibold">활성 학급</p>
                            <p className="text-2xl font-bold text-gray-900">{activeClasses}개</p>
                        </div>
                    </div>
                </div>

                {/* 학급 목록 헤더 */}
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span>🏫</span>
                        나의 학급
                    </h3>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        새 학급 만들기
                    </button>
                </div>

                {/* 학급 목록 그리드 */}
                <div className="grid gap-6">
                    {loading ? (
                        <div className="text-center py-20">
                            <div className="animate-spin w-10 h-10 border-4 border-gray-200 border-t-primary rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-500 font-medium">데이터를 불러오는 중입니다...</p>
                        </div>
                    ) : classes.length === 0 ? (
                        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
                                📭
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">아직 생성된 학급이 없습니다</h3>
                            <p className="text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
                                오른쪽 상단의 '새 학급 만들기' 버튼을 눌러<br />첫 번째 학급을 시작해보세요!
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {classes.map((classItem) => (
                                <div
                                    key={classItem.id}
                                    onClick={() => handleViewClass(classItem)}
                                    className={`
                                        group relative overflow-hidden bg-white rounded-3xl p-6 transition-all duration-300 border cursor-pointer hover:-translate-y-1
                                        ${classItem.isActive
                                            ? 'border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100'
                                            : 'border-gray-100 shadow-sm opacity-80 bg-gray-50 hover:opacity-100'
                                        }
                                    `}
                                >
                                    {/* 상태 뱃지 */}
                                    <div className="absolute top-4 right-4 z-10">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${classItem.isActive
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-gray-200 text-gray-500'
                                            }`}>
                                            {classItem.isActive ? '운영중' : '비활성'}
                                        </span>
                                    </div>

                                    {/* 카드 상단 장식 */}
                                    <div className={`absolute top-0 left-0 w-full h-1.5 ${classItem.isActive ? 'bg-gradient-to-r from-primary to-indigo-400' : 'bg-gray-200'}`} />

                                    <div className="mt-2 mb-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${classItem.isActive ? 'bg-indigo-50 text-primary' : 'bg-gray-200 text-gray-400'}`}>
                                                📚
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900 truncate flex-1">{classItem.name}</h3>
                                        </div>
                                        <p className="text-gray-500 text-sm font-medium flex items-center gap-2 pl-1">
                                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">학생 {classItem.studentCount}명</span>
                                            <span className="text-gray-300">|</span>
                                            <span>{classItem.createdAt?.toDate?.().toLocaleDateString('ko-KR') || '방금 전'} 생성</span>
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-50">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleActive(classItem.id, classItem.isActive);
                                            }}
                                            className={`py-2 rounded-xl text-sm font-bold transition-colors ${classItem.isActive
                                                    ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                }`}
                                        >
                                            {classItem.isActive ? '비활성화' : '다시 활성화'}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClass(classItem.id, classItem.name);
                                            }}
                                            className="py-2 bg-white text-rose-500 border border-rose-100 rounded-xl text-sm font-bold hover:bg-rose-50 transition-colors"
                                        >
                                            삭제
                                        </button>
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-indigo-400" />

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
                                ✨
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">새 학급 만들기</h2>
                            <p className="text-gray-500 text-sm mt-1">학생들과 함께할 새로운 공간을 만듭니다</p>
                        </div>

                        {/* 개인정보 보호 안내 */}
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-amber-500">🛡️</span>
                                <p className="text-amber-800 font-bold text-sm">개인정보 보호를 위해</p>
                            </div>
                            <p className="text-amber-700 text-xs leading-relaxed mb-3">
                                식별 가능한 정보(학교명, 학년반) 대신 <br />
                                <strong>친근한 별명(가칭)</strong>을 사용해주세요.
                            </p>
                            <div className="flex gap-2 text-[11px] font-medium">
                                <span className="px-2 py-1 bg-white rounded border border-amber-200 text-emerald-600">✅ 사랑반, 행복반</span>
                                <span className="px-2 py-1 bg-white rounded border border-amber-200 text-rose-500 decoration-line-through">6학년 3반</span>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">학급 이름</label>
                                <input
                                    type="text"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    placeholder="예: 독서토론반, 열정반"
                                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all font-medium placeholder:text-gray-300"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    학생 수
                                    <span className="ml-2 text-xs font-normal text-gray-400">최대 500명</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={newStudentCount}
                                        onChange={(e) => setNewStudentCount(parseInt(e.target.value) || 1)}
                                        min="1"
                                        max="500"
                                        className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all font-medium text-lg"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">명</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreateClass}
                                disabled={creating}
                                className="flex-1 px-4 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                            >
                                {creating ? '생성중...' : '학급 생성하기'}
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
