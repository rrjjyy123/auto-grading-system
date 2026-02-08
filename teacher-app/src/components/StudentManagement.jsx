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
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts'
import SubmissionDetailModal from './SubmissionDetailModal'

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
            <div className="text-center py-24">
                <div className="animate-spin w-10 h-10 border-4 border-gray-200 border-t-primary rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500 font-medium">학생 목록을 불러오는 중...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* 상단 액션 바 */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="relative flex-1 w-full md:max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="번호, 코드, 메모로 검색..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all shadow-sm"
                    />
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleAddStudent}
                        disabled={isAdding}
                        className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
                    >
                        {isAdding ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        )}
                        <span>{isAdding ? '추가 중...' : '학생 추가'}</span>
                    </button>
                    <button
                        onClick={() => setShowQRModal(true)}
                        className="px-5 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl font-bold hover:bg-indigo-100 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <span>📱</span>
                        <span>QR 인쇄 {selectedForQR.length > 0 && `(${selectedForQR.length}명)`}</span>
                    </button>
                </div>
            </div>

            {/* 학생 목록 테이블 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {filteredStudents.length === 0 ? (
                    <div className="text-center py-20 px-4">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
                            👥
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {searchQuery ? '검색 결과가 없습니다' : '등록된 학생이 없습니다'}
                        </h3>
                        <p className="text-gray-500 mb-8 font-medium">
                            {searchQuery ? '다른 검색어로 시도해보세요' : '우측 상단 버튼을 눌러 학생을 추가해보세요'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={handleAddStudent}
                                disabled={isAdding}
                                className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50"
                            >
                                {isAdding ? '추가 중...' : '+ 첫 학생 추가하기'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left w-16">
                                        <label className="flex items-center justify-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedForQR.length === filteredStudents.length && filteredStudents.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                            />
                                        </label>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">번호</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">학생 코드</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">메모</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">응시 횟수</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">평균 점수</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">상세 정보</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.map((student) => {
                                    const stats = studentStats[student.number] || {}
                                    return (
                                        <tr key={student.number} className="group hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-6 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedForQR.includes(student.number)}
                                                    onChange={() => toggleQRSelection(student.number)}
                                                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded text-sm">{student.number}번</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <code className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-600 font-bold">
                                                    {student.code}
                                                </code>
                                            </td>
                                            <td className="px-6 py-4">
                                                {editingMemo === student.number ? (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={memoValue}
                                                            onChange={(e) => setMemoValue(e.target.value)}
                                                            placeholder="메모 입력"
                                                            className="flex-1 px-3 py-1.5 border border-primary rounded-lg text-sm focus:outline-none shadow-sm"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSaveMemo()
                                                                if (e.key === 'Escape') setEditingMemo(null)
                                                            }}
                                                        />
                                                        <button
                                                            onClick={handleSaveMemo}
                                                            className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600"
                                                        >
                                                            저장
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingMemo(null)}
                                                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200"
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
                                                        className="text-left text-sm font-medium text-gray-600 hover:text-primary transition-colors flex items-center gap-2 group/edit"
                                                    >
                                                        {student.memo ? (
                                                            <span className="text-gray-900">{student.memo}</span>
                                                        ) : (
                                                            <span className="text-gray-400 italic flex items-center gap-1">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                                메모 추가
                                                            </span>
                                                        )}
                                                        <svg className="w-3 h-3 opacity-0 group-hover/edit:opacity-50 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    {stats.totalExams || 0}회
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {stats.avgScore !== null ? (
                                                    <span className={`font-bold ${stats.avgScore >= 80 ? 'text-emerald-600' :
                                                        stats.avgScore >= 60 ? 'text-amber-600' : 'text-rose-500'
                                                        }`}>
                                                        {stats.avgScore}점
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => setSelectedStudent(student)}
                                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                                                >
                                                    상세보기
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleDeleteStudent(student.number)}
                                                    className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="삭제"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
 * 학생 상세 모달 - 시험 결과 목록 + 성적 통계 + 과목 필터 + 성적 추이 그래프
 */
function StudentDetailModal({ student, stats, exams, onClose }) {
    const [selectedSubject, setSelectedSubject] = useState('all')
    const [selectedSubmissionIds, setSelectedSubmissionIds] = useState(new Set())
    const [detailSubmission, setDetailSubmission] = useState(null)

    const submissions = stats?.submissions || []

    // 과목 목록 추출
    const subjects = useMemo(() => {
        const subjectSet = new Set()
        submissions.forEach(sub => {
            // exams prop에서 과목 정보 우선 확인
            const exam = exams?.find(e => e.id === sub.examId)
            const subject = exam?.subject || sub.subject
            if (subject) subjectSet.add(subject)
        })
        return [...subjectSet].sort()
    }, [submissions, exams])

    // 필터링된 제출물 (과목 선택)
    const filteredSubmissions = useMemo(() => {
        let subs = [...submissions]
        if (selectedSubject !== 'all') {
            subs = subs.filter(sub => {
                const exam = exams?.find(e => e.id === sub.examId)
                const subject = exam?.subject || sub.subject
                return subject === selectedSubject
            })
        }
        // 날짜순 정렬 (오래된 순 -> 최신 순) - 그래프용
        return subs.sort((a, b) => (a.submittedAt?.seconds || 0) - (b.submittedAt?.seconds || 0))
    }, [submissions, selectedSubject, exams])

    // 초기 선택 상태 설정 (필터 변경 시 전체 선택)
    useEffect(() => {
        const ids = new Set(filteredSubmissions.map(s => s.id))
        setSelectedSubmissionIds(ids)
    }, [filteredSubmissions])

    // 선택된 제출물 (체크박스)
    const selectedSubmissions = useMemo(() => {
        return filteredSubmissions.filter(sub => selectedSubmissionIds.has(sub.id))
    }, [filteredSubmissions, selectedSubmissionIds])

    // 체크박스 핸들러
    const toggleSelection = (id) => {
        const newSet = new Set(selectedSubmissionIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedSubmissionIds(newSet)
    }

    const toggleSelectAll = () => {
        if (selectedSubmissionIds.size === filteredSubmissions.length) {
            setSelectedSubmissionIds(new Set())
        } else {
            setSelectedSubmissionIds(new Set(filteredSubmissions.map(s => s.id)))
        }
    }

    // 선택된 데이터 통계
    const selectedStats = useMemo(() => {
        const gradedSubs = selectedSubmissions.filter(sub => sub.graded)
        const totalScore = gradedSubs.reduce((sum, sub) => sum + (sub.score || 0), 0)

        const scores = gradedSubs.map(s => s.score || 0)
        const maxScore = scores.length > 0 ? Math.max(...scores) : 0
        const minScore = scores.length > 0 ? Math.min(...scores) : 0

        return {
            totalExams: selectedSubmissions.length,
            gradedExams: gradedSubs.length,
            avgScore: gradedSubs.length > 0 ? Math.round(totalScore / gradedSubs.length) : null,
            maxScore,
            minScore
        }
    }, [selectedSubmissions])

    // 그래프 데이터 변환
    const graphData = useMemo(() => {
        return selectedSubmissions.map(sub => {
            const exam = exams?.find(e => e.id === sub.examId)
            return {
                name: exam?.title || sub.examTitle || '시험',
                score: sub.graded ? (sub.score || 0) : null,
                subject: exam?.subject || sub.subject || '',
                date: sub.submittedAt?.toDate?.().toLocaleDateString()
            }
        })
    }, [selectedSubmissions, exams])

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100">
                {/* 헤더 */}
                <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                            <span className="bg-primary text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm">{student.number}</span>
                            학생 상세 분석
                            {student.memo && (
                                <span className="text-lg font-medium text-gray-500 ml-1">
                                    : {student.memo}
                                </span>
                            )}
                        </h2>
                        <p className="text-sm text-gray-400 font-mono mt-1 ml-10">CODE: {student.code}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-xl transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/50">
                    {/* 상단 컨트롤러: 과목 필터 & 통계 */}
                    <div className="flex flex-col lg:flex-row gap-6 mb-8">
                        <div className="w-full lg:w-1/3 space-y-4">
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <label className="block text-sm font-bold text-gray-700 mb-2">분석할 과목</label>
                                <div className="relative">
                                    <select
                                        value={selectedSubject}
                                        onChange={(e) => setSelectedSubject(e.target.value)}
                                        className="w-full appearance-none px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                                    >
                                        <option value="all">전체 과목 (혼합)</option>
                                        {subjects.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-center">
                                    <div className="text-3xl font-extrabold text-indigo-600 mb-1">
                                        {selectedStats.avgScore !== null ? selectedStats.avgScore : '-'}
                                        <span className="text-base ml-1">점</span>
                                    </div>
                                    <p className="text-xs font-bold text-indigo-400/80 uppercase tracking-wide">평균 점수</p>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                                    <div className="text-3xl font-extrabold text-emerald-600 mb-1">
                                        {selectedStats.gradedExams}
                                        <span className="text-base ml-1">회</span>
                                    </div>
                                    <p className="text-xs font-bold text-emerald-400/80 uppercase tracking-wide">응시 완료</p>
                                </div>
                                {selectedStats.gradedExams > 1 && (
                                    <>
                                        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-center">
                                            <div className="text-2xl font-bold text-purple-600">
                                                {selectedStats.maxScore}
                                            </div>
                                            <p className="text-xs font-bold text-purple-400/80 uppercase tracking-wide">최고 점수</p>
                                        </div>
                                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
                                            <div className="text-2xl font-bold text-amber-600">
                                                {selectedStats.minScore}
                                            </div>
                                            <p className="text-xs font-bold text-amber-400/80 uppercase tracking-wide">최저 점수</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 그래프 영역 */}
                        <div className="w-full lg:w-2/3 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm min-h-[300px] flex flex-col">
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center">📈</span>
                                성적 변화 추이
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                    {selectedSubject === 'all' ? '전체 과목' : selectedSubject}
                                </span>
                            </h3>
                            <div className="flex-1 w-full min-h-[250px]">
                                {graphData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={graphData} margin={{ top: 10, right: 30, bottom: 0, left: 0 }}>
                                            <CartesianGrid stroke="#f3f4f6" vertical={false} strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 11, fill: '#9ca3af' }}
                                                axisLine={{ stroke: '#e5e7eb' }}
                                                tickLine={false}
                                                dy={10}
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                tick={{ fontSize: 11, fill: '#9ca3af' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '12px' }}
                                                cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="score"
                                                stroke="#4F46E5"
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: '#fff', stroke: '#4F46E5', strokeWidth: 2 }}
                                                activeDot={{ r: 7, fill: '#4F46E5', stroke: '#fff', strokeWidth: 2 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                                        <p className="font-medium">표시할 데이터가 충분하지 않습니다</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 시험 결과 목록 (체크박스 포함) */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <span>📋</span> 응시 기록 상세
                            </h3>
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-500 hover:text-primary transition-colors">
                                <input
                                    type="checkbox"
                                    checked={filteredSubmissions.length > 0 && selectedSubmissionIds.size === filteredSubmissions.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                전체 선택/해제
                            </label>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                            {filteredSubmissions.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <p>해당 조건의 응시 기록이 없습니다.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {filteredSubmissions.map((sub) => {
                                        const exam = exams?.find(e => e.id === sub.examId)
                                        const title = exam?.title || sub.examTitle || '시험'
                                        const subject = exam?.subject || sub.subject || '과목'
                                        const isSelected = selectedSubmissionIds.has(sub.id)

                                        return (
                                            <div
                                                key={sub.id}
                                                onClick={() => setDetailSubmission(sub)}
                                                className={`p-4 flex items-center justify-between transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/40' : 'bg-white hover:bg-gray-50'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelection(sub.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                    />
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-bold">
                                                                {subject}
                                                            </span>
                                                            <span className="font-bold text-gray-900">{title}</span>
                                                        </div>
                                                        <span className="text-xs text-gray-400 font-medium">
                                                            {sub.submittedAt?.toDate?.().toLocaleString('ko-KR') || ''}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    {sub.graded ? (
                                                        <span className={`text-lg font-bold ${sub.score >= 80 ? 'text-emerald-600' :
                                                            sub.score >= 60 ? 'text-amber-500' : 'text-rose-500'
                                                            }`}>
                                                            {sub.score}점
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-full border border-amber-100">
                                                            채점중
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 제출물 상세 모달 */}
            {detailSubmission && (
                <SubmissionDetailModal
                    submission={detailSubmission}
                    examData={exams?.find(e => e.id === detailSubmission.examId)}
                    itemResults={detailSubmission.itemResults}
                    onClose={() => setDetailSubmission(null)}
                    hasPrev={false}
                    hasNext={false}
                />
            )}
        </div>
    )
}

export default StudentManagement
