import { useState, useEffect } from 'react'
import { getActiveExams, checkExistingSubmission } from '../lib/firebase'

function SubjectSelect({ studentData, onSelectExam, onBack }) {
    const [exams, setExams] = useState([])
    const [loading, setLoading] = useState(true)
    const [submittedExams, setSubmittedExams] = useState(new Set())

    const { studentCode, classData } = studentData

    useEffect(() => {
        loadExams()
    }, [classData.id])

    const loadExams = async () => {
        setLoading(true)
        const examList = await getActiveExams(classData.id)
        setExams(examList)

        // 이미 제출한 시험 확인
        const submitted = new Set()
        for (const exam of examList) {
            const hasSubmitted = await checkExistingSubmission(exam.id, studentCode.studentNumber)
            if (hasSubmitted) {
                submitted.add(exam.id)
            }
        }
        setSubmittedExams(submitted)
        setLoading(false)
    }

    const handleSelectExam = (exam) => {
        if (submittedExams.has(exam.id)) {
            alert('이미 제출한 시험입니다.')
            return
        }
        onSelectExam(exam)
    }

    return (
        <div className="min-h-screen p-4">
            <div className="max-w-md mx-auto">
                {/* 학생 정보 카드 */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">{classData.name}</div>
                            <div className="text-2xl font-bold text-blue-600">{studentCode.studentNumber}번</div>
                        </div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                        <p className="text-gray-600">환영합니다! 응시할 과목을 선택하세요.</p>
                    </div>
                </div>

                {/* 시험 목록 */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">응시 가능한 시험</h2>

                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                            <p className="text-gray-500">로딩중...</p>
                        </div>
                    ) : exams.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-gray-500">현재 응시 가능한 시험이 없습니다</p>
                            <p className="text-sm text-gray-400 mt-2">선생님께 문의하세요</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {exams.map((exam) => {
                                const isSubmitted = submittedExams.has(exam.id)
                                return (
                                    <button
                                        key={exam.id}
                                        onClick={() => handleSelectExam(exam)}
                                        disabled={isSubmitted}
                                        className={`w-full p-4 rounded-xl text-left transition-all ${isSubmitted
                                            ? 'bg-gray-100 cursor-not-allowed'
                                            : 'bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-400'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="px-2 py-0.5 bg-blue-200 text-blue-800 rounded text-sm font-semibold">
                                                        {exam.subject}
                                                    </span>
                                                    {isSubmitted && (
                                                        <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded text-xs font-semibold">
                                                            제출완료
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="font-bold text-gray-800">{exam.title}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {exam.questionCount}문항 • {exam.totalPoints || (exam.questionCount * exam.pointsPerQuestion)}점 만점
                                                    {exam.manualGradablePoints > 0 && ` (서술형 포함)`}
                                                    {exam.timeLimit > 0 && ` • ${exam.timeLimit}분`}
                                                </p>
                                            </div>
                                            {!isSubmitted && (
                                                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default SubjectSelect
