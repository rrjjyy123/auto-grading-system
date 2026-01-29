import { useState } from 'react'
import * as XLSX from 'xlsx'

function ResultsView({ classData, examData, submissions, onBack }) {
    const [viewMode, setViewMode] = useState('scores') // 'scores' or 'items'
    const [sortBy, setSortBy] = useState('number') // 'number', 'score', 'name'

    // 점수 계산 및 정렬된 제출 목록
    const processedSubmissions = submissions.map(sub => {
        let correctCount = 0
        const itemResults = sub.answers.map((answer, idx) => {
            const isCorrect = answer === examData.answers[idx]
            if (isCorrect) correctCount++
            return { answer, correct: isCorrect }
        })
        return {
            ...sub,
            correctCount,
            score: correctCount * examData.pointsPerQuestion,
            itemResults
        }
    })

    const sortedSubmissions = [...processedSubmissions].sort((a, b) => {
        if (sortBy === 'number') return a.studentNumber - b.studentNumber
        if (sortBy === 'score') return b.score - a.score
        return 0
    })

    // 통계 계산
    const stats = {
        totalStudents: classData.studentCount,
        submitted: submissions.length,
        avgScore: submissions.length > 0
            ? (processedSubmissions.reduce((sum, s) => sum + s.score, 0) / submissions.length).toFixed(1)
            : 0,
        maxScore: submissions.length > 0
            ? Math.max(...processedSubmissions.map(s => s.score))
            : 0,
        minScore: submissions.length > 0
            ? Math.min(...processedSubmissions.map(s => s.score))
            : 0,
        fullScore: examData.questionCount * examData.pointsPerQuestion
    }

    // 문항별 정답률
    const itemStats = examData.answers.map((correctAnswer, idx) => {
        const correctCount = processedSubmissions.filter(s => s.itemResults[idx]?.correct).length
        const rate = submissions.length > 0 ? (correctCount / submissions.length * 100).toFixed(1) : 0
        return {
            questionNum: idx + 1,
            correctAnswer,
            correctCount,
            rate,
            isWeak: parseFloat(rate) < 50
        }
    })

    // 엑셀 내보내기
    const handleExportExcel = () => {
        // 성적표 시트
        const scoresData = sortedSubmissions.map((sub, idx) => ({
            '순위': idx + 1,
            '번호': sub.studentNumber,
            '점수': sub.score,
            '정답수': sub.correctCount,
            '제출시간': sub.submittedAt?.toDate?.().toLocaleString('ko-KR') || ''
        }))

        // 문항별 정오표 시트
        const itemsData = sortedSubmissions.map(sub => {
            const row = { '번호': sub.studentNumber }
            sub.itemResults.forEach((item, idx) => {
                row[`${idx + 1}번`] = item.correct ? 'O' : 'X'
            })
            row['점수'] = sub.score
            return row
        })

        // 문항별 통계 시트
        const statsData = itemStats.map(item => ({
            '문항': item.questionNum,
            '정답': item.correctAnswer,
            '정답자수': item.correctCount,
            '정답률(%)': item.rate
        }))

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(scoresData), '성적표')
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemsData), '정오표')
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statsData), '문항분석')

        XLSX.writeFile(wb, `${classData.name}_${examData.subject}_${examData.title}.xlsx`)
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
                            </div>
                            <p className="text-gray-500">{classData.name} • {examData.questionCount}문항 × {examData.pointsPerQuestion}점</p>
                        </div>
                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
                        >
                            📊 엑셀 다운로드
                        </button>
                    </div>

                    {/* 통계 카드 */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.submitted}/{stats.totalStudents}</div>
                            <div className="text-sm text-gray-600">응시 인원</div>
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
                            <div className="text-2xl font-bold text-gray-600">{stats.fullScore}</div>
                            <div className="text-sm text-gray-600">만점</div>
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
                                        <th className="p-3 text-right">제출시간</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedSubmissions.map((sub, idx) => (
                                        <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="p-3 font-semibold">{idx + 1}</td>
                                            <td className="p-3">{sub.studentNumber}번</td>
                                            <td className="p-3 text-center">{sub.correctCount}/{examData.questionCount}</td>
                                            <td className="p-3 text-center font-bold text-blue-600">{sub.score}점</td>
                                            <td className="p-3 text-right text-sm text-gray-500">
                                                {sub.submittedAt?.toDate?.().toLocaleString('ko-KR') || '-'}
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

                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                            <span className="font-semibold">정답: </span>
                            {examData.answers.map((a, i) => (
                                <span key={i} className="inline-block mx-1">
                                    {i + 1}.{['①', '②', '③', '④'][a - 1]}
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
                                        {examData.answers.map((_, i) => (
                                            <th key={i} className="p-2 text-center min-w-[32px]">{i + 1}</th>
                                        ))}
                                        <th className="p-2 text-center">점수</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedSubmissions.map(sub => (
                                        <tr key={sub.id} className="border-b border-gray-100">
                                            <td className="p-2 font-semibold sticky left-0 bg-white">{sub.studentNumber}번</td>
                                            {sub.itemResults.map((item, i) => (
                                                <td
                                                    key={i}
                                                    className={`p-2 text-center font-bold ${item.correct ? 'text-green-500' : 'text-red-500'
                                                        }`}
                                                >
                                                    {item.correct ? 'O' : 'X'}
                                                </td>
                                            ))}
                                            <td className="p-2 text-center font-bold text-blue-600">{sub.score}</td>
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

                        <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                            {itemStats.map(item => (
                                <div
                                    key={item.questionNum}
                                    className={`p-3 rounded-xl text-center ${item.isWeak
                                            ? 'bg-red-100 border-2 border-red-300'
                                            : 'bg-green-50 border border-green-200'
                                        }`}
                                >
                                    <div className="text-sm text-gray-600 mb-1">{item.questionNum}번</div>
                                    <div className="text-lg font-bold mb-1">
                                        {['①', '②', '③', '④'][item.correctAnswer - 1]}
                                    </div>
                                    <div className={`text-sm font-semibold ${item.isWeak ? 'text-red-600' : 'text-green-600'
                                        }`}>
                                        {item.rate}%
                                    </div>
                                </div>
                            ))}
                        </div>

                        {itemStats.some(i => i.isWeak) && (
                            <div className="mt-6 p-4 bg-red-50 rounded-xl">
                                <h3 className="font-bold text-red-800 mb-2">⚠️ 취약 문항 (정답률 50% 미만)</h3>
                                <p className="text-red-700">
                                    {itemStats.filter(i => i.isWeak).map(i => `${i.questionNum}번`).join(', ')}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ResultsView
