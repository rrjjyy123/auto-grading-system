import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import {
    gradeSubmission,
    gradeAllSubmissions,
    updateSubmissionScore,
    updateResultConfig,
    updateExam
} from '../lib/firebase'
import SubmissionDetailModal from './SubmissionDetailModal'
import ResultReleaseModal from './ResultReleaseModal'
import { useToast } from './Toast'

function ResultsView({ classData, examData, answerData, submissions, onBack, onRefresh }) {
    const { success, error: toastError } = useToast()
    const [viewMode, setViewMode] = useState('scores') // 'scores', 'items', 'analysis'
    const [sortBy, setSortBy] = useState('number')
    const [grading, setGrading] = useState(false)
    const [processedSubmissions, setProcessedSubmissions] = useState([])
    const [selectedSubmission, setSelectedSubmission] = useState(null)
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [showReleaseModal, setShowReleaseModal] = useState(false)

    // 재응시 허용 로컬 상태 (즉시 UI 업데이트용)
    const [allowRetake, setAllowRetake] = useState(examData.allowRetake || false)

    // 미채점 제출물 수
    const ungradedCount = submissions.filter(s => !s.graded).length

    // 서술형 문항 있는지 확인
    const hasEssayQuestions = answerData?.questions?.some(q => q.type === 'essay') || false

    // 서술형 없는 시험의 미채점 제출물 자동 채점
    useEffect(() => {
        if (!answerData || hasEssayQuestions) return

        const ungradedSubmissions = submissions.filter(s => !s.graded)
        if (ungradedSubmissions.length === 0) return

        // 자동 채점 실행
        const autoGrade = async () => {
            setGrading(true)
            const { error } = await gradeAllSubmissions(examData.id, ungradedSubmissions, answerData)
            if (!error && onRefresh) {
                onRefresh()
            }
            setGrading(false)
        }

        autoGrade()
    }, [submissions.length, hasEssayQuestions, answerData])

    // 제출물 채점 처리
    useEffect(() => {
        if (!answerData) return

        const processed = submissions.map(sub => {
            // 이미 채점된 경우
            if (sub.graded && sub.score !== null) {
                // itemResults가 없으면 다시 계산
                const gradeResult = gradeSubmission(sub, answerData)
                return {
                    ...sub,
                    itemResults: gradeResult.itemResults,
                    correctCount: sub.correctCount ?? gradeResult.correctCount,
                    score: sub.score ?? gradeResult.autoScore
                }
            }

            // 미채점 → 클라이언트에서 채점 결과 미리보기
            const gradeResult = gradeSubmission(sub, answerData)
            return {
                ...sub,
                correctCount: gradeResult.correctCount,
                score: gradeResult.autoScore,
                itemResults: gradeResult.itemResults,
                hasEssay: gradeResult.hasEssay,
                essayCount: gradeResult.essayCount,
                preview: true // DB에 저장 안됨 표시
            }
        })

        setProcessedSubmissions(processed)
    }, [submissions, answerData])

    // 정렬
    const sortedSubmissions = [...processedSubmissions].sort((a, b) => {
        if (sortBy === 'number') return a.studentNumber - b.studentNumber
        if (sortBy === 'score') return (b.score || 0) - (a.score || 0)
        return 0
    })

    // 통계 계산
    const gradedSubs = processedSubmissions.filter(s => s.score !== null)
    const stats = {
        totalStudents: classData.studentCount,
        submitted: submissions.length,
        graded: submissions.filter(s => s.graded).length,
        avgScore: gradedSubs.length > 0
            ? (gradedSubs.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubs.length).toFixed(1)
            : 0,
        maxScore: gradedSubs.length > 0
            ? Math.max(...gradedSubs.map(s => s.score || 0))
            : 0,
        minScore: gradedSubs.length > 0
            ? Math.min(...gradedSubs.map(s => s.score || 0))
            : 0,
        fullScore: examData.totalPoints || (examData.questionCount * examData.pointsPerQuestion)
    }

    // 문항별 정답률 계산
    const getItemStats = () => {
        if (processedSubmissions.length === 0) return []

        const questionCount = answerData?.questions?.length || examData.questionCount

        return Array.from({ length: questionCount }, (_, idx) => {
            const correctCount = processedSubmissions.filter(s =>
                s.itemResults?.[idx]?.correct === true
            ).length
            const rate = processedSubmissions.length > 0
                ? (correctCount / processedSubmissions.length * 100).toFixed(1)
                : 0

            const question = answerData?.questions?.[idx]
            const correctAnswer = question?.correctAnswers || answerData?.answers?.[idx]

            return {
                questionNum: idx + 1,
                type: question?.type || 'choice4',
                correctAnswer,
                correctCount,
                rate,
                isWeak: parseFloat(rate) < 50,
                maxPoints: question?.points || examData.pointsPerQuestion
            }
        })
    }

    const itemStats = getItemStats()

    // 일괄 채점
    const handleGradeAll = async () => {
        if (!confirm(`${ungradedCount}개의 미채점 제출물을 채점합니다.\n계속하시겠습니까?`)) {
            return
        }

        setGrading(true)
        const { results, error } = await gradeAllSubmissions(examData.id, submissions, answerData)

        if (error) {
            toastError('채점 중 오류: ' + error)
        } else {
            success(`${results.length}개 제출물 채점 완료!`)
            if (onRefresh) onRefresh()
        }
        setGrading(false)
    }

    // 정답 표시 포맷
    const formatAnswer = (answer, type) => {
        if (!answer) return '-'

        if (type === 'ox') {
            const val = Array.isArray(answer) ? answer[0] : answer
            return val === 'O' || val === true ? 'O' : 'X'
        }
        if (type === 'short' || type === 'essay') {
            return Array.isArray(answer) ? answer.join(', ') : answer
        }
        // 객관식
        const choices = ['①', '②', '③', '④', '⑤']
        if (Array.isArray(answer)) {
            return answer.map(a => choices[a - 1] || a).join(',')
        }
        return choices[answer - 1] || answer
    }

    // 엑셀 내보내기
    const handleExportExcel = () => {
        // 성적표 시트
        const scoresData = sortedSubmissions.map((sub, idx) => ({
            '순위': idx + 1,
            '번호': sub.studentNumber,
            '점수': sub.score ?? '미채점',
            '정답수': sub.correctCount ?? '-',
            '채점상태': sub.graded ? '완료' : '미채점',
            '제출시간': sub.submittedAt?.toDate?.().toLocaleString('ko-KR') || ''
        }))

        // 문항별 정오표 시트
        const itemsData = sortedSubmissions.map(sub => {
            const row = { '번호': sub.studentNumber }
            sub.itemResults?.forEach((item, idx) => {
                if (item.type === 'essay') {
                    row[`${idx + 1}번`] = '서술형'
                } else {
                    row[`${idx + 1}번`] = item.correct ? 'O' : 'X'
                }
            })
            row['점수'] = sub.score ?? '미채점'
            return row
        })

        // 문항별 통계 시트
        const statsData = itemStats.map(item => ({
            '문항': item.questionNum,
            '유형': item.type,
            '정답': formatAnswer(item.correctAnswer, item.type),
            '배점': item.maxPoints,
            '정답자수': item.correctCount,
            '정답률(%)': item.rate
        }))

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(scoresData), '성적표')
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemsData), '정오표')
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statsData), '문항분석')

        XLSX.writeFile(wb, `${classData.name}_${examData.subject}_${examData.title}.xlsx`)
    }

    const handleSaveReleaseConfig = async (examId, config) => {
        let statistics = null

        // 레이더 차트 및 반 평균 옵션 활성화 시 통계 계산
        if (config.showRadar && config.showClassAverage) {
            const categoryStats = {}

            const questions = answerData.questions || []
            const questionMap = {}

            questions.forEach(q => {
                if (q.category && q.category.trim()) {
                    questionMap[q.num] = { category: q.category.trim(), points: q.points }
                }
            })

            // 영역 정보가 있는 경우에만 계산
            if (Object.keys(questionMap).length > 0) {
                let studentCount = 0

                processedSubmissions.forEach(sub => {
                    if (!sub.graded) return
                    studentCount++

                    sub.itemResults?.forEach(item => {
                        const qInfo = questionMap[item.questionNum]
                        if (qInfo) {
                            const cat = qInfo.category
                            if (!categoryStats[cat]) categoryStats[cat] = { total: 0, earned: 0 }
                            categoryStats[cat].earned += (item.points || 0)
                            categoryStats[cat].total += qInfo.points
                        }
                    })
                })

                const categoryAverages = {}
                Object.keys(categoryStats).forEach(cat => {
                    const { total, earned } = categoryStats[cat]
                    if (total > 0) {
                        categoryAverages[cat] = Math.round((earned / total) * 100)
                    } else {
                        categoryAverages[cat] = 0
                    }
                })

                statistics = { categoryAverages, studentCount }
            }
        }

        const { error } = await updateResultConfig(examId, config, statistics)
        if (error) {
            toastError('설정 저장 실패: ' + error)
        } else {
            success('결과 전송 설정이 적용되었습니다.')
        }
    }

    // 재응시 허용 토글
    const handleToggleRetake = async () => {
        const newValue = !allowRetake
        setAllowRetake(newValue) // 즉시 UI 업데이트

        const { error } = await updateExam(examData.id, classData.id, {
            ...examData,
            allowRetake: newValue
        })

        if (error) {
            setAllowRetake(!newValue) // 실패 시 롤백
            toastError('설정 변경 실패: ' + error)
        }
    }

    // 오답 분석 상세 보기
    const [selectedAnalysisItem, setSelectedAnalysisItem] = useState(null)

    // 문항별 선택 분포 계산
    const getAnswerDistribution = (questionNum) => {
        const distribution = {}
        const processed = processedSubmissions.filter(s => s.score !== null)

        processed.forEach(sub => {
            const item = sub.itemResults?.find(i => i.questionNum === questionNum)
            if (item) {
                const ans = item.studentAnswer
                const key = Array.isArray(ans) ? ans.join(',') : String(ans)
                if (!distribution[key]) distribution[key] = { count: 0, studentNumbers: [] }
                distribution[key].count++
                distribution[key].studentNumbers.push(sub.studentNumber)
            }
        })
        return distribution
    }

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* 헤더 */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-sm font-semibold">
                                    {examData.subject}
                                </span>
                                <h1 className="text-xl font-bold text-gray-800">{examData.title}</h1>
                                {allowRetake && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md text-xs font-bold border border-purple-200">
                                        재응시 허용중
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-500">
                                {classData.name} • {examData.questionCount}문항 • {stats.fullScore}점 만점
                            </p>
                        </div>
                        <div className="flex gap-2 items-center">
                            {/* 재응시 허용 토글 (ON/OFF 스타일) */}
                            <button
                                onClick={handleToggleRetake}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-sm transition-all shadow-sm border mr-2 ${allowRetake
                                    ? 'bg-green-500 border-green-600 text-white'
                                    : 'bg-gray-200 border-gray-300 text-gray-500 hover:bg-gray-300'
                                    }`}
                            >
                                {allowRetake ? (
                                    <>
                                        재응시 ON
                                        <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                                    </>
                                ) : (
                                    <>
                                        <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                                        재응시 OFF
                                    </>
                                )}
                            </button>

                            {/* 서술형 있는 시험만 수동 채점 버튼 표시 */}
                            {ungradedCount > 0 && hasEssayQuestions && (
                                <button
                                    onClick={handleGradeAll}
                                    disabled={grading}
                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
                                >
                                    {grading ? '채점 중...' : `📝 ${ungradedCount}개 채점`}
                                </button>
                            )}
                            {/* 서술형 없는 시험은 자동 채점 중 표시 */}
                            {grading && !hasEssayQuestions && (
                                <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold">
                                    ⏳ 자동 채점 중...
                                </span>
                            )}
                            <button
                                onClick={() => setShowReleaseModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                <span>📤</span> 결과 전송
                            </button>
                            <button
                                onClick={handleExportExcel}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                            >
                                <span>📊</span> 엑셀 다운로드
                            </button>
                        </div>
                    </div>

                    {/* 미채점 알림 */}
                    {ungradedCount > 0 && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <span className="text-yellow-800">
                                ⚠️ <strong>{ungradedCount}개</strong>의 미채점 제출물이 있습니다.
                                채점을 진행하면 점수가 DB에 저장됩니다.
                            </span>
                        </div>
                    )}

                    {/* 통계 카드 */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.submitted}/{stats.totalStudents}</div>
                            <div className="text-sm text-gray-600">제출 인원</div>
                        </div>
                        <div className="bg-green-50 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">{stats.avgScore}</div>
                            <div className="text-sm text-gray-600">평균 점수</div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-purple-600">{stats.maxScore}</div>
                            <div className="text-sm text-gray-600">최고 점수</div>
                        </div>
                        <div className="bg-orange-50 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-orange-600">{stats.minScore}</div>
                            <div className="text-sm text-gray-600">최저 점수</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-gray-600">{stats.graded}/{stats.submitted}</div>
                            <div className="text-sm text-gray-600">채점 완료</div>
                        </div>
                    </div>
                </div>

                {/* 탭 버튼 */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setViewMode('scores')}
                        className={`px-6 py-2 rounded-lg font-semibold transition-colors ${viewMode === 'scores'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        학생별 성적
                    </button>
                    <button
                        onClick={() => setViewMode('items')}
                        className={`px-6 py-2 rounded-lg font-semibold transition-colors ${viewMode === 'items'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        문항별 정오표
                    </button>
                    <button
                        onClick={() => setViewMode('analysis')}
                        className={`px-6 py-2 rounded-lg font-semibold transition-colors ${viewMode === 'analysis'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        오답 분석
                    </button>
                </div>

                {/* 성적표 뷰 */}
                {viewMode === 'scores' && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 overflow-x-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-800">학생별 성적</h2>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-2 border rounded-lg"
                            >
                                <option value="number">번호순</option>
                                <option value="score">점수순</option>
                            </select>
                        </div>

                        {sortedSubmissions.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">아직 제출된 답안이 없습니다</p>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-gray-200">
                                        <th className="p-3 text-left">순위</th>
                                        <th className="p-3 text-left">번호</th>
                                        <th className="p-3 text-center">정답수</th>
                                        <th className="p-3 text-center">점수</th>
                                        <th className="p-3 text-center">상태</th>
                                        <th className="p-3 text-right">제출시간</th>
                                        <th className="p-3 text-center">상세</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedSubmissions.map((sub, idx) => (
                                        <tr
                                            key={sub.id}
                                            className={`border-b border-gray-100 hover:bg-blue-50 cursor-pointer ${sub.preview ? 'bg-yellow-50' : ''}`}
                                            onClick={() => setSelectedSubmission(sub)}
                                        >
                                            <td className="p-3 font-semibold">{idx + 1}</td>
                                            <td className="p-3">{sub.studentNumber}번</td>
                                            <td className="p-3 text-center">
                                                {sub.correctCount ?? '-'}/{examData.questionCount}
                                            </td>
                                            <td className="p-3 text-center font-bold text-blue-600">
                                                {sub.score !== null ? `${sub.score}점` : '-'}
                                            </td>
                                            <td className="p-3 text-center">
                                                {sub.graded ? (
                                                    sub.hasEssay && !sub.manualGradingComplete ? (
                                                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">서술형 미채점</span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">완료</span>
                                                    )
                                                ) : (
                                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">미채점</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right text-sm text-gray-500">
                                                {sub.submittedAt?.toDate?.().toLocaleString('ko-KR') || '-'}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedSubmission(sub) }}
                                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
                                                >
                                                    📋 보기
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* 정오표 뷰 */}
                {viewMode === 'items' && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 overflow-x-auto">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">문항별 정오표</h2>

                        {/* 정답 표시 */}
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg flex flex-wrap gap-2">
                            <span className="font-semibold">정답:</span>
                            {itemStats.map((item, i) => (
                                <span key={i} className="inline-block">
                                    {i + 1}.{formatAnswer(item.correctAnswer, item.type)}
                                </span>
                            ))}
                        </div>

                        {sortedSubmissions.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">아직 제출된 답안이 없습니다</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-gray-200">
                                        <th className="p-2 text-left sticky left-0 bg-white">번호</th>
                                        {itemStats.map((_, i) => (
                                            <th key={i} className="p-2 text-center min-w-[32px]">{i + 1}</th>
                                        ))}
                                        <th className="p-2 text-center">점수</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedSubmissions.map(sub => (
                                        <tr key={sub.id} className="border-b border-gray-100">
                                            <td className="p-2 font-semibold sticky left-0 bg-white">{sub.studentNumber}번</td>
                                            {sub.itemResults?.map((item, i) => (
                                                <td
                                                    key={i}
                                                    className={`p-2 text-center font-bold ${item.type === 'essay'
                                                        ? 'text-gray-400'
                                                        : item.correct
                                                            ? 'text-green-500'
                                                            : 'text-red-500'
                                                        }`}
                                                >
                                                    {item.type === 'essay' ? '📝' : item.correct ? 'O' : 'X'}
                                                </td>
                                            ))}
                                            <td className="p-2 text-center font-bold text-blue-600">
                                                {sub.score ?? '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* 오답 분석 뷰 */}
                {viewMode === 'analysis' && (
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">문항별 정답률 분석</h2>
                        <p className="text-sm text-gray-500 mb-4">문항을 클릭하면 학생들이 어떤 답을 선택했는지 상세 분포를 확인할 수 있습니다.</p>

                        <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                            {itemStats.map(item => (
                                <button
                                    key={item.questionNum}
                                    onClick={() => setSelectedAnalysisItem(item)}
                                    className={`p-3 rounded-xl text-center transition-all hover:scale-105 active:scale-95 ${item.type === 'essay'
                                        ? 'bg-gray-100 border border-gray-200 hover:border-gray-400'
                                        : item.isWeak
                                            ? 'bg-red-100 border-2 border-red-300 hover:border-red-500'
                                            : 'bg-green-50 border border-green-200 hover:border-green-400'
                                        }`}
                                >
                                    <div className="text-sm text-gray-600 mb-1">{item.questionNum}번</div>
                                    <div className="text-lg font-bold mb-1">
                                        {item.type === 'essay' ? '📝' : formatAnswer(item.correctAnswer, item.type)}
                                    </div>
                                    <div className={`text-sm font-semibold ${item.type === 'essay'
                                        ? 'text-gray-500'
                                        : item.isWeak
                                            ? 'text-red-600'
                                            : 'text-green-600'
                                        }`}>
                                        {item.type === 'essay' ? '서술형' : `${item.rate}%`}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {itemStats.some(i => i.isWeak && i.type !== 'essay') && (
                            <div className="mt-6 p-4 bg-red-50 rounded-xl">
                                <h3 className="font-bold text-red-800 mb-2">⚠️ 취약 문항 (정답률 50% 미만)</h3>
                                <p className="text-red-700">
                                    {itemStats.filter(i => i.isWeak && i.type !== 'essay').map(i => `${i.questionNum}번`).join(', ')}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 개별 제출물 상세 보기 모달 */}
            {selectedSubmission && (
                <SubmissionDetailModal
                    submission={selectedSubmission}
                    examData={examData}
                    answerData={answerData}
                    itemResults={selectedSubmission.itemResults}
                    onClose={() => setSelectedSubmission(null)}
                    onUpdate={onRefresh}
                />
            )}
            {/* 결과 전송 설정 모달 */}
            {showReleaseModal && (
                <ResultReleaseModal
                    examId={examData.id}
                    currentConfig={examData.resultConfig}
                    onClose={() => setShowReleaseModal(false)}
                    onSave={handleSaveReleaseConfig}
                />
            )}

            {/* 문항 상세 분석 모달 */}
            {selectedAnalysisItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">
                                {selectedAnalysisItem.questionNum}번 문항 상세 분석
                            </h3>
                            <button onClick={() => setSelectedAnalysisItem(null)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex gap-4 mb-6">
                                <div className="flex-1 bg-blue-50 p-4 rounded-xl text-center">
                                    <span className="block text-sm text-gray-500 mb-1">정답</span>
                                    <span className="text-xl font-bold text-blue-600">
                                        {formatAnswer(selectedAnalysisItem.correctAnswer, selectedAnalysisItem.type)}
                                    </span>
                                </div>
                                <div className="flex-1 bg-green-50 p-4 rounded-xl text-center">
                                    <span className="block text-sm text-gray-500 mb-1">정답률</span>
                                    <span className="text-xl font-bold text-green-600">
                                        {selectedAnalysisItem.rate}%
                                    </span>
                                </div>
                            </div>

                            <h4 className="font-bold text-gray-700 mb-3">학생 선택 분포</h4>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                {Object.entries(getAnswerDistribution(selectedAnalysisItem.questionNum))
                                    .sort((a, b) => b[1].count - a[1].count)
                                    .map(([ans, info]) => {
                                        const isCorrect = String(ans) === String(Array.isArray(selectedAnalysisItem.correctAnswer) ? selectedAnalysisItem.correctAnswer.join(',') : selectedAnalysisItem.correctAnswer)
                                        const percentage = Math.round((info.count / processedSubmissions.length) * 100)

                                        return (
                                            <div key={ans} className={`p-3 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'}`}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-gray-700'}`}>
                                                        {formatAnswer(ans.split(',').map(s => isNaN(s) ? s : Number(s)), selectedAnalysisItem.type)}
                                                        {isCorrect && <span className="text-xs ml-2 bg-green-200 text-green-800 px-1.5 py-0.5 rounded">정답</span>}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-500">
                                                        {info.count}명 ({percentage}%)
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                                    <div
                                                        className={`h-2 rounded-full ${isCorrect ? 'bg-green-500' : 'bg-gray-500'}`}
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                                <div className="text-xs text-gray-400 flex flex-wrap gap-1">
                                                    {info.studentNumbers.slice(0, 10).map(n => (
                                                        <span key={n} className="bg-white border px-1 rounded">{n}번</span>
                                                    ))}
                                                    {info.studentNumbers.length > 10 && <span>...외 {info.studentNumbers.length - 10}명</span>}
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ResultsView
