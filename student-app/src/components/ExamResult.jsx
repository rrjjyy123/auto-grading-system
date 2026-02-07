import { useState, useMemo } from 'react'
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Legend
} from 'recharts'

/**
 * 시험 결과 상세 보기 (학생용)
 * 선생님의 공개 설정에 따라 다른 정보를 표시함
 */
function ExamResult({ examData, submissionData, onBack }) {
    const resultConfig = examData.resultConfig || {}
    const statistics = examData.statistics || {}
    const { itemResults, score, totalScore } = submissionData

    const [expandedExplanation, setExpandedExplanation] = useState(null)

    // 레이더 차트 데이터 계산
    const radarData = useMemo(() => {
        if (!resultConfig?.showRadar) return []

        // questions 또는 questionTypes (호환성)
        const questions = examData.questions || examData.questionTypes || []
        const questionMap = {}
        questions.forEach(q => {
            if (q.category && q.category.trim()) {
                questionMap[q.num] = { category: q.category.trim(), points: q.points }
            }
        })

        // 영역 정보가 없으면 빈 배열
        if (Object.keys(questionMap).length === 0) return []

        // 내 영역별 점수 계산
        const myStats = {}
        // itemResults가 없는 경우 대비
        const results = itemResults || []

        results.forEach(item => {
            const qInfo = questionMap[item.questionNum]
            if (qInfo) {
                const cat = qInfo.category
                if (!myStats[cat]) myStats[cat] = { total: 0, earned: 0 }
                myStats[cat].earned += (item.points || 0)
                myStats[cat].total += qInfo.points
            }
        })

        // 차트 데이터 포맷으로 변환
        const cats = Object.keys(myStats)
        return cats.map(cat => {
            const { total, earned } = myStats[cat]
            const myScore = total > 0 ? Math.round((earned / total) * 100) : 0

            const dataPoint = {
                subject: cat,
                A: myScore, // 내 점수
                fullMark: 100
            }

            // 반 평균 데이터 추가
            if (resultConfig.showClassAverage && statistics?.categoryAverages) {
                dataPoint.B = statistics.categoryAverages[cat] || 0
            }

            return dataPoint
        })
    }, [examData, submissionData, resultConfig])

    // 문항 리스트 (questions 정보와 결과 병합)
    const displayItems = useMemo(() => {
        const questions = examData.questions || examData.questionTypes || []
        const results = itemResults || []

        return results.map(item => {
            const q = questions.find(q => q.num === item.questionNum) || questions[item.questionNum - 1] || {}
            return {
                ...item,
                category: q.category || '',
                explanation: q.explanation || ''
            }
        })
    }, [itemResults, examData])

    // 답안 렌더링 헬퍼
    const formatAnswer = (ans) => {
        if (Array.isArray(ans) && ans.length === 1 && (ans[0] === 'O' || ans[0] === 'X')) {
            return ans[0]
        }
        if (Array.isArray(ans)) return ans.join(', ')
        return ans
    }

    return (
        <div className="bg-gray-50 min-h-screen p-4 pb-24">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* 헤더 & 점수 */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h1 className="text-xl font-bold text-gray-800 mb-2">{examData.subject} | {examData.title}</h1>

                    {resultConfig.showScore ? (
                        <div className="mt-4 text-center">
                            <span className="text-gray-500 text-sm">내 점수</span>
                            <div className="text-4xl font-black text-blue-600">
                                {score} <span className="text-lg text-gray-400 font-normal">/ {examData.totalPoints}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 p-4 bg-blue-50 text-blue-800 text-center rounded-xl">
                            결과가 도착했습니다. 아래 내용을 확인하세요.
                        </div>
                    )}
                </div>

                {/* 레이더 차트 */}
                {resultConfig.showRadar && radarData.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-lg font-bold text-gray-700 mb-4">📊 영역별 성취도 분석</h2>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" />
                                    <PolarRadiusAxis domain={[0, 100]} angle={30} tick={false} />
                                    <Radar
                                        name="내 점수"
                                        dataKey="A"
                                        stroke="#2563eb"
                                        fill="#3b82f6"
                                        fillOpacity={0.5}
                                    />
                                    {resultConfig.showClassAverage && (
                                        <Radar
                                            name="반 평균"
                                            dataKey="B"
                                            stroke="#10b981"
                                            fill="#10b981"
                                            fillOpacity={0.3}
                                        />
                                    )}
                                    <Legend />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        {resultConfig.showClassAverage && (
                            <p className="text-center text-xs text-gray-500 mt-2">
                                * 초록색 영역은 반 전체 학생의 평균입니다.
                            </p>
                        )}
                    </div>
                )}

                {/* 문항별 상세 결과 */}
                {(resultConfig.showAnswers || resultConfig.showExplanation) && (
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        <div className="p-4 border-b bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-700">문항별 상세</h2>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {displayItems.map((item, idx) => (
                                <div key={idx} className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg font-bold text-gray-600">
                                                {item.questionNum}
                                            </span>
                                            {item.category && (
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                                    {item.category}
                                                </span>
                                            )}
                                        </div>
                                        {resultConfig.showAnswers && (
                                            <div className={`px-3 py-1 rounded-full text-sm font-bold ${item.correct === true ? 'bg-green-100 text-green-700' :
                                                item.correct === false ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {item.correct === true ? '정답' :
                                                    item.correct === false ? '오답' : '부분점수/채점중'}
                                            </div>
                                        )}
                                    </div>

                                    {resultConfig.showAnswers && (
                                        <div className="text-sm mb-3 pl-10">
                                            {/* 서술형 문항 */}
                                            {item.type === 'essay' ? (
                                                <div>
                                                    <span className="text-gray-500 mr-2">내 답:</span>
                                                    <p className="mt-1 p-2 bg-gray-50 rounded text-gray-700 whitespace-pre-wrap">
                                                        {item.studentAnswer || '(미작성)'}
                                                    </p>
                                                </div>
                                            ) : item.hasSubQuestions && item.subResults ? (
                                                /* 소문항 있는 문항 */
                                                <div className="space-y-2">
                                                    {item.subResults.map((sub, sIdx) => (
                                                        <div key={sIdx} className="flex items-center gap-2">
                                                            <span className="text-purple-600 font-bold">({sub.subNum})</span>
                                                            <span className={sub.correct ? 'text-green-600' : 'text-red-500'}>
                                                                {sub.studentAnswer || '(미작성)'}
                                                            </span>
                                                            {sub.correctAnswer && (
                                                                <span className="text-gray-400 ml-2">
                                                                    (정답: {formatAnswer(sub.correctAnswer)})
                                                                </span>
                                                            )}
                                                            <span className={`ml-auto text-xs ${sub.correct ? 'text-green-600' : 'text-red-400'}`}>
                                                                {sub.correct ? '✓' : '✗'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                /* 일반 문항 */
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-gray-500 mr-2">내 답:</span>
                                                        <span className={`font-semibold ${item.correct ? 'text-green-600' : 'text-red-500'}`}>
                                                            {formatAnswer(item.studentAnswer)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 mr-2">정답:</span>
                                                        <span className="font-semibold text-gray-800">
                                                            {formatAnswer(item.correctAnswer)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {resultConfig.showExplanation && item.explanation && (
                                        <div className="pl-10 mt-2">
                                            <button
                                                onClick={() => setExpandedExplanation(expandedExplanation === idx ? null : idx)}
                                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 focus:outline-none"
                                            >
                                                {expandedExplanation === idx ? '▼ 해설 접기' : '▶ 해설 보기'}
                                            </button>
                                            {expandedExplanation === idx && (
                                                <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-gray-700 leading-relaxed animate-fadeIn">
                                                    <span className="font-bold text-blue-800 block mb-1">해설</span>
                                                    {item.explanation}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={onBack}
                        className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ExamResult
