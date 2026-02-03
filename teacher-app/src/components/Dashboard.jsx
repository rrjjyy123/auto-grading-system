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

function Dashboard({ user, onLogout }) {
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [selectedClass, setSelectedClass] = useState(null)
    const [showQRModal, setShowQRModal] = useState(false)
    const [qrClass, setQRClass] = useState(null)
    const [studentCodes, setStudentCodes] = useState([])

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

    if (selectedClass) {
        return (
            <ClassDetail
                classData={selectedClass}
                onBack={() => setSelectedClass(null)}
            />
        )
    }

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                {/* 헤더 */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">자동채점 시스템</h1>
                            <p className="text-gray-500">{user.email}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex-1 md:flex-none px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                            >
                                + 새 학급 만들기
                            </button>
                            <button
                                onClick={onLogout}
                                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                            >
                                로그아웃
                            </button>
                        </div>
                    </div>
                </div>

                {/* 학급 목록 */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">내 학급</h2>

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

            {/* 학급 생성 모달 */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">새 학급 만들기</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">학급 이름</label>
                                <input
                                    type="text"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    placeholder="예: 6학년 3반"
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
