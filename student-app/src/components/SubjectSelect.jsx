import { useState, useEffect } from 'react'
import { getActiveExams, checkExistingSubmission } from '../lib/firebase'

function SubjectSelect({ studentData, onSelectExam, onBack }) {
    const [activeExams, setActiveExams] = useState([])
    const [submittedExams, setSubmittedExams] = useState([])
    // const [submissionMap, setSubmissionMap] = useState({})
    const [loading, setLoading] = useState(true)

    const { studentCode, classData } = studentData

    useEffect(() => {
        loadExams()
    }, [classData.id])

    const loadExams = async () => {
        setLoading(true)
        const examList = await getActiveExams(classData.id)

        // 내 제출 내역 한 번에 가져오기
        const { data: mySubmissions } = await import('../lib/firebase').then(m => m.getMyClassSubmissions(classData.id, studentCode.studentNumber))

        const submitted = []
        const active = []

        examList.forEach(exam => {
            if (mySubmissions && mySubmissions[exam.id]) {
                submitted.push({ ...exam, submission: mySubmissions[exam.id] })
            } else {
                active.push(exam)
            }
        })

        setActiveExams(active)
        setSubmittedExams(submitted)
        // setSubmissionMap(mySubmissions || {})
        setLoading(false)
    }

    const handleSelectExam = (exam) => {
        onSelectExam(exam)
    }

    const handleCheckResult = (exam) => {
        const submission = exam.submission

        // 결과 공개 설정 확인
        // resultConfig가 없거나, 공개 설정이 모두 false인 경우
        const config = exam.resultConfig
        const isReleased = config && (config.showScore || config.showAnswer || config.showExplanation)

        if (!isReleased) {
            alert('선생님이 아직 결과를 공개하지 않았습니다. 잠시만 기다려주세요.')
            return
        }

        // 결과 화면으로 이동 (App.jsx의 handleResultCheck와 유사)
        onSelectExam({
            ...exam,
            isResultCheck: true, // 플래그 전달
            submission // 제출 데이터 전달
        })
    }

    return (
        <div className="min-h-screen p-4 pb-20">
            <div className="max-w-md mx-auto space-y-6">
                {/* 학생 정보 카드 */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
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
                </div>

                {/* 응시 가능한 시험 */}
                <div>
                    <h2 className="text-lg font-bold text-gray-800 mb-3 px-1">📝 응시 가능한 시험</h2>
                    {loading ? (
                        <div className="text-center py-8 bg-white rounded-2xl shadow-sm">
                            <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                            <p className="text-gray-500">목록 불러오는 중...</p>
                        </div>
                    ) : activeExams.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                            <p className="text-gray-400">현재 응시 가능한 시험이 없습니다</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeExams.map((exam) => (
                                <button
                                    key={exam.id}
                                    onClick={() => handleSelectExam(exam)}
                                    className="w-full p-5 rounded-2xl text-left bg-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all border border-blue-100 group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                                                    {exam.subject}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
                                                {exam.title}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {exam.questionCount}문항 • {exam.timeLimit > 0 ? `${exam.timeLimit}분` : '시간제한 없음'}
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                                            <svg className="w-5 h-5 text-blue-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 제출 완료 / 결과 확인 */}
                <div>
                    <h2 className="text-lg font-bold text-gray-800 mb-3 px-1 mt-8">✅ 제출한 시험</h2>
                    {submittedExams.length === 0 ? (
                        <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
                            <p className="text-gray-400">아직 제출한 시험이 없습니다</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {submittedExams.map((exam) => {
                                // const submission = exam.submission
                                const config = exam.resultConfig
                                const isReleased = config && (config.showScore || config.showAnswer || config.showExplanation)

                                return (
                                    <div key={exam.id} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <span className="text-xs font-bold text-gray-400 block mb-1">{exam.subject}</span>
                                                <h3 className="font-bold text-gray-800">{exam.title}</h3>
                                            </div>
                                            <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                제출완료
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleCheckResult(exam)}
                                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                                                    ${isReleased
                                                        ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
                                                        : 'bg-gray-100 text-gray-400 cursor-default'
                                                    }`}
                                            >
                                                {isReleased ? (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                        </svg>
                                                        결과 확인
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        결과 미공개
                                                    </>
                                                )}
                                            </button>

                                            {/* 재응시 버튼 (허용된 경우) */}
                                            {exam.allowRetake && (
                                                <button
                                                    onClick={() => handleSelectExam(exam)}
                                                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    다시 풀기
                                                </button>
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
    )
}

export default SubjectSelect
