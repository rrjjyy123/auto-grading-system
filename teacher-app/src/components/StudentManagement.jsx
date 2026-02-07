import { useState, useEffect, useMemo } from 'react'
import {
    getStudentCodes,
    updateStudentMemo,
    subscribeToClassSubmissions,
    addStudent,
    deleteStudent
} from '../lib/firebase'
import QRGenerator from './QRGenerator'
import { useToast } from './Toast'

/**
 * 학생 관리 컴포넌트
 * - 학생 목록 (번호, 코드, 메모)
 * - 메모 기능 (이름 대신 활용)
 * - 시험 결과 조회
 * - QR 코드 인쇄
 */
function StudentManagement({ classData, exams }) {
    const { success, error: toastError } = useToast()
    const [students, setStudents] = useState([])
    const [submissions, setSubmissions] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingMemo, setEditingMemo] = useState(null)
    const [memoValue, setMemoValue] = useState('')
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [showQRModal, setShowQRModal] = useState(false)
    const [selectedForQR, setSelectedForQR] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isAdding, setIsAdding] = useState(false)

    // 학생 코드 목록 로드
    useEffect(() => {
        const loadStudents = async () => {
            const codes = await getStudentCodes(classData.id)
            setStudents(codes)
            setLoading(false)
        }
        loadStudents()
    }, [classData.id])

    // 제출물 구독
    useEffect(() => {
        const unsubscribe = subscribeToClassSubmissions(classData.id, setSubmissions)
        return () => unsubscribe()
    }, [classData.id])

    // 학생별 시험 결과 집계
    const studentStats = useMemo(() => {
        const stats = {}
        students.forEach(s => {
            const studentSubs = submissions.filter(sub => sub.studentNumber === s.number)
            const gradedSubs = studentSubs.filter(sub => sub.graded)
            const totalScore = gradedSubs.reduce((sum, sub) => sum + (sub.score || 0), 0)
            const avgScore = gradedSubs.length > 0 ? Math.round(totalScore / gradedSubs.length) : null

            stats[s.number] = {
                totalExams: studentSubs.length,
                gradedExams: gradedSubs.length,
                avgScore,
                submissions: studentSubs
            }
        })
        return stats
    }, [students, submissions])

    // 검색 필터링
    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students
        const query = searchQuery.toLowerCase()
        return students.filter(s =>
            s.number.toString().includes(query) ||
            s.code.includes(query) ||
            (s.memo || '').toLowerCase().includes(query)
        )
    }, [students, searchQuery])

    // 메모 저장
    const handleSaveMemo = async () => {
        if (editingMemo === null) return

        await updateStudentMemo(classData.id, editingMemo, memoValue)

        setStudents(prev => prev.map(s =>
            s.number === editingMemo ? { ...s, memo: memoValue } : s
        ))
        setEditingMemo(null)
        setMemoValue('')
    }

    // QR 코드 선택 토글
    const toggleQRSelection = (number) => {
        setSelectedForQR(prev =>
            prev.includes(number)
                ? prev.filter(n => n !== number)
                : [...prev, number]
        )
    }

    // 전체 선택/해제
    const toggleSelectAll = () => {
        if (selectedForQR.length === filteredStudents.length) {
            setSelectedForQR([])
        } else {
            setSelectedForQR(filteredStudents.map(s => s.number))
        }
    }

    // QR 인쇄할 학생들
    const studentsForQR = useMemo(() => {
        return students.filter(s => selectedForQR.includes(s.number))
    }, [students, selectedForQR])

    // 학생 추가
    const handleAddStudent = async () => {
        setIsAdding(true)
        const { data, error } = await addStudent(classData.id)
        if (error) {
            toastError('학생 추가 실패: ' + error)
        } else {
            setStudents(prev => [...prev, { number: data.number, code: data.code }])
            success(`${data.number}번 학생이 추가되었습니다`)
        }
        setIsAdding(false)
    }

    // 학생 삭제
    const handleDeleteStudent = async (number) => {
        if (!confirm(`${number}번 학생을 삭제하시겠습니까?\n해당 학생의 모든 응시 기록은 유지됩니다.`)) return

        const { error } = await deleteStudent(classData.id, number)
        if (error) {
            toastError('삭제 실패: ' + error)
        } else {
            setStudents(prev => prev.filter(s => s.number !== number))
            setSelectedForQR(prev => prev.filter(n => n !== number))
            success(`${number}번 학생이 삭제되었습니다`)
        }
    }

    if (loading) {
        return (
            <div className="text-center py-20">
                <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500 font-medium">학생 목록을 불러오는 중...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* 상단 액션 바 */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex-1 w-full md:max-w-md">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="번호, 코드, 메모로 검색..."
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleAddStudent}
                        disabled={isAdding}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                        {isAdding ? '추가 중...' : '+ 학생 추가'}
                    </button>
                    <button
                        onClick={() => setShowQRModal(true)}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors"
                    >
                        📱 QR 인쇄 {selectedForQR.length > 0 && `(${selectedForQR.length}명)`}
                    </button>
                </div>
            </div>

            {/* 학생 목록 테이블 */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {filteredStudents.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                            👥
                        </div>
                        <p className="text-xl font-bold text-gray-800 mb-2">
                            {searchQuery ? '검색 결과가 없습니다' : '등록된 학생이 없습니다'}
                        </p>
                        <p className="text-gray-500 mb-8">
                            {searchQuery ? '다른 검색어로 시도해보세요' : '우측 상단 버튼을 눌러 학생을 추가해보세요'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={handleAddStudent}
                                disabled={isAdding}
                                className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors shadow-md hover:shadow-lg disabled:opacity-50"
                            >
                                {isAdding ? '추가 중...' : '+ 첫 학생 추가하기'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedForQR.length === filteredStudents.length && filteredStudents.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded"
                                            />
                                            <span className="text-xs text-gray-500">전체</span>
                                        </label>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">번호</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">코드</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">메모</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">응시</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">평균</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">상세</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">삭제</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.map((student) => {
                                    const stats = studentStats[student.number] || {}
                                    return (
                                        <tr key={student.number} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedForQR.includes(student.number)}
                                                    onChange={() => toggleQRSelection(student.number)}
                                                    className="w-4 h-4 rounded"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-bold text-gray-800">{student.number}번</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                                                    {student.code}
                                                </code>
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingMemo === student.number ? (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={memoValue}
                                                            onChange={(e) => setMemoValue(e.target.value)}
                                                            placeholder="메모 입력..."
                                                            className="flex-1 px-2 py-1 border rounded text-sm"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSaveMemo()
                                                                if (e.key === 'Escape') setEditingMemo(null)
                                                            }}
                                                        />
                                                        <button
                                                            onClick={handleSaveMemo}
                                                            className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                                                        >
                                                            저장
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingMemo(null)}
                                                            className="px-2 py-1 bg-gray-300 rounded text-xs"
                                                        >
                                                            취소
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setEditingMemo(student.number)
                                                            setMemoValue(student.memo || '')
                                                        }}
                                                        className="text-left text-sm text-gray-600 hover:text-blue-600"
                                                    >
                                                        {student.memo || <span className="text-gray-400 italic">메모 추가...</span>}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-sm text-gray-600">
                                                    {stats.totalExams || 0}회
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {stats.avgScore !== null ? (
                                                    <span className={`font-semibold ${stats.avgScore >= 80 ? 'text-green-600' :
                                                        stats.avgScore >= 60 ? 'text-yellow-600' : 'text-red-500'
                                                        }`}>
                                                        {stats.avgScore}점
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => setSelectedStudent(student)}
                                                    className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-200"
                                                >
                                                    보기
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleDeleteStudent(student.number)}
                                                    className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-200"
                                                >
                                                    삭제
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 학생 상세 모달 */}
            {selectedStudent && (
                <StudentDetailModal
                    student={selectedStudent}
                    stats={studentStats[selectedStudent.number]}
                    onClose={() => setSelectedStudent(null)}
                    exams={exams}
                />
            )}

            {/* QR 코드 모달 */}
            {showQRModal && (
                <QRGenerator
                    classData={classData}
                    studentCodes={studentsForQR.length > 0 ? studentsForQR : students}
                    onClose={() => setShowQRModal(false)}
                />
            )}
        </div>
    )
}

/**
 * 학생 상세 모달 - 시험 결과 목록 + 성적 통계 + 과목 필터
 */
function StudentDetailModal({ student, stats, exams, onClose }) {
    const [selectedSubject, setSelectedSubject] = useState('all')
    const submissions = stats?.submissions || []

    // 과목 목록 추출
    const subjects = useMemo(() => {
        const subjectSet = new Set()
        submissions.forEach(sub => {
            if (sub.subject) subjectSet.add(sub.subject)
        })
        return [...subjectSet].sort()
    }, [submissions])

    // 필터링된 제출물
    const filteredSubmissions = useMemo(() => {
        if (selectedSubject === 'all') return submissions
        return submissions.filter(sub => sub.subject === selectedSubject)
    }, [submissions, selectedSubject])

    // 필터링된 통계
    const filteredStats = useMemo(() => {
        const gradedSubs = filteredSubmissions.filter(sub => sub.graded)
        const totalScore = gradedSubs.reduce((sum, sub) => sum + (sub.score || 0), 0)
        return {
            totalExams: filteredSubmissions.length,
            gradedExams: gradedSubs.length,
            avgScore: gradedSubs.length > 0 ? Math.round(totalScore / gradedSubs.length) : null
        }
    }, [filteredSubmissions])

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
                {/* 헤더 */}
                <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            {student.number}번 학생
                            {student.memo && (
                                <span className="ml-2 text-sm font-normal text-gray-500">
                                    ({student.memo})
                                </span>
                            )}
                        </h2>
                        <p className="text-sm text-gray-500">코드: {student.code}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-lg"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 과목 필터 */}
                {subjects.length > 0 && (
                    <div className="px-6 pt-4">
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
                        >
                            <option value="all">전체 과목</option>
                            {subjects.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* 통계 요약 */}
                <div className="p-6 border-b">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-blue-50 p-4 rounded-xl">
                            <p className="text-2xl font-bold text-blue-600">{filteredStats.totalExams}</p>
                            <p className="text-sm text-gray-500">응시 횟수</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-xl">
                            <p className="text-2xl font-bold text-green-600">{filteredStats.gradedExams}</p>
                            <p className="text-sm text-gray-500">채점 완료</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-xl">
                            <p className="text-2xl font-bold text-purple-600">
                                {filteredStats.avgScore !== null ? `${filteredStats.avgScore}점` : '-'}
                            </p>
                            <p className="text-sm text-gray-500">평균 점수</p>
                        </div>
                    </div>
                </div>

                {/* 시험 결과 목록 */}
                <div className="p-6 overflow-y-auto max-h-[300px]">
                    <h3 className="font-bold text-gray-700 mb-3">시험 결과</h3>
                    {filteredSubmissions.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">응시한 시험이 없습니다</p>
                    ) : (
                        <div className="space-y-3">
                            {filteredSubmissions.map((sub, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            {sub.subject && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                                    {sub.subject}
                                                </span>
                                            )}
                                            <p className="font-semibold text-gray-800">
                                                {exams?.find(e => e.id === sub.examId)?.title || sub.examTitle || '시험'}
                                            </p>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {sub.submittedAt?.toDate?.().toLocaleString('ko-KR') || ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        {sub.graded ? (
                                            <p className={`font-bold ${sub.score >= 80 ? 'text-green-600' :
                                                sub.score >= 60 ? 'text-yellow-600' : 'text-red-500'
                                                }`}>
                                                {sub.score}점
                                            </p>
                                        ) : (
                                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                                                채점중
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default StudentManagement
