import { useState, useEffect } from 'react'
import { updateSubmissionScore } from '../lib/firebase'
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts'

function CategoryRadarChart({ itemResults }) {
    if (!itemResults || itemResults.length === 0) return null;

    // 카테고리별 데이터 가공
    const stats = itemResults.reduce((acc, item) => {
        const cat = item.category || '기타'; // 카테고리 없으면 '기타'
        if (!acc[cat]) {
            acc[cat] = { name: cat, total: 0, earned: 0, count: 0 };
        }
        acc[cat].total += item.maxPoints;
        // 서술형 점수는 manualScores가 상위에서 관리되므로 여기서는 정확한 반영이 어려울 수 있음
        // 하지만 itemResults는 이미 계산된 결과(correct 여부 등)를 담고 있을 수 있음.
        // item.score (획득점수)가 있다면 사용.
        // Dashboard나 ResultsView에서 이미 채점된 결과를 넘겨준다면 item.score 사용 가능.
        // 만약 없다면 correct 여부로 추정.
        if (item.score !== undefined) {
            acc[cat].earned += item.score;
        } else if (item.correct) {
            acc[cat].earned += item.maxPoints;
        }
        acc[cat].count += 1;
        return acc;
    }, {});

    const data = Object.values(stats).map(s => ({
        subject: s.name,
        A: s.total > 0 ? Math.round((s.earned / s.total) * 100) : 0,
        fullMark: 100
    }));

    if (data.length < 3) {
        // 데이터가 적을 때 모양 유지를 위해 더미 데이터 추가 가능하나, 
        // 일단 그대로 둠.
    }

    return (
        <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                    <Radar
                        name="성취도"
                        dataKey="A"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}

/**
 * 개별 제출물 상세 보기 및 서술형 채점 모달
 */
function SubmissionDetailModal({
    submission,
    examData,
    answerData,
    itemResults,
    onClose,
    onUpdate
}) {
    const [manualScores, setManualScores] = useState({})
    const [saving, setSaving] = useState(false)

    // 기존 수동 채점 점수 로드
    useEffect(() => {
        if (submission.manualScores) {
            // eslint-disable-next-line
            setManualScores(submission.manualScores)
        }
    }, [submission.manualScores])

    // 서술형 문항 목록
    const essayQuestions = itemResults?.filter(item => item.type === 'essay') || []

    // 수동 점수 변경
    const handleScoreChange = (questionNum, score) => {
        const maxPoints = itemResults.find(i => i.questionNum === questionNum)?.maxPoints || 0
        const validScore = Math.max(0, Math.min(maxPoints, parseInt(score) || 0))

        setManualScores(prev => ({
            ...prev,
            [questionNum]: validScore
        }))
    }

    // 최종 점수 계산
    const calculateTotalScore = () => {
        const autoScore = submission.autoScore || 0
        const manualTotal = Object.values(manualScores).reduce((sum, s) => sum + s, 0)
        return autoScore + manualTotal
    }

    // 저장
    const handleSave = async () => {
        setSaving(true)

        const totalScore = calculateTotalScore()
        const allEssaysGraded = essayQuestions.every(q =>
            manualScores[q.questionNum] !== undefined
        )

        const { error } = await updateSubmissionScore(submission.id, {
            score: totalScore,
            correctCount: submission.correctCount,
            autoScore: submission.autoScore,
            manualScores: manualScores,
            manualGradingComplete: allEssaysGraded
        })

        setSaving(false)

        if (error) {
            alert('저장 실패: ' + error)
        } else {
            alert('저장되었습니다!')
            if (onUpdate) onUpdate()
            onClose()
        }
    }

    // 정답 포맷팅
    const formatAnswer = (answer, type) => {
        if (answer === null || answer === undefined) return '-'

        if (type === 'ox') {
            const val = Array.isArray(answer) ? answer[0] : answer
            return val === 'O' || val === true ? 'O' : 'X'
        }
        if (type === 'short' || type === 'essay') {
            return String(answer)
        }
        // 객관식
        const choices = ['①', '②', '③', '④', '⑤']
        if (Array.isArray(answer)) {
            return answer.map(a => choices[a - 1] || a).join(', ')
        }
        return choices[answer - 1] || answer
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="p-6 border-b bg-blue-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">
                                {submission.studentNumber}번 학생 답안
                            </h2>
                            <p className="text-gray-600">
                                {examData.subject} - {examData.title}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                </div>

                {/* 차트 & 통계 - Recharts 추가 */}
                <div className="px-6 py-4 bg-gray-50 border-b flex flex-col md:flex-row gap-6">
                    <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
                        {/* 카테고리별 성취도 차트 */}
                        <CategoryRadarChart itemResults={itemResults} />
                    </div>
                    {/* 점수 요약 */}
                    <div className="flex-1 flex flex-col justify-center gap-3">
                        <div className="flex justify-between items-center bg-white p-3 rounded-lg border">
                            <span className="text-gray-500">자동 채점</span>
                            <span className="font-bold text-blue-600">{submission.autoScore || 0}점</span>
                        </div>
                        <div className="flex justify-between items-center bg-white p-3 rounded-lg border">
                            <span className="text-gray-500">서술형 채점</span>
                            <span className="font-bold text-orange-600">
                                +{Object.values(manualScores).reduce((sum, s) => sum + s, 0)}점
                            </span>
                        </div>
                        <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <span className="text-gray-700 font-bold">총점</span>
                            <span className="text-xl font-extrabold text-blue-700">{calculateTotalScore()}점</span>
                        </div>
                    </div>
                </div>

                {/* 문항별 상세 */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-4">
                        {itemResults?.map((item, idx) => (
                            <div
                                key={idx}
                                className={`p-4 rounded-xl border-2 ${item.type === 'essay'
                                    ? 'bg-orange-50 border-orange-200'
                                    : item.correct
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-red-50 border-red-200'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        {/* 문항 번호 & 타입 */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-bold text-lg">{item.questionNum}번</span>
                                            <span className={`px-2 py-0.5 rounded text-xs ${item.type === 'essay'
                                                ? 'bg-orange-200 text-orange-800'
                                                : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                {item.type === 'choice4' ? '4지선다' :
                                                    item.type === 'choice5' ? '5지선다' :
                                                        item.type === 'ox' ? 'O/X' :
                                                            item.type === 'short' ? '단답형' :
                                                                item.type === 'essay' ? '서술형' : item.type}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                ({item.maxPoints}점)
                                            </span>
                                        </div>

                                        {/* 정답 & 학생답 */}
                                        {item.type !== 'essay' && (
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-500">정답:</span>
                                                    <span className="ml-2 font-semibold text-blue-600">
                                                        {formatAnswer(item.correctAnswer, item.type)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">학생답:</span>
                                                    <span className={`ml-2 font-semibold ${item.correct ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                        {formatAnswer(item.studentAnswer, item.type)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* 서술형 답안 */}
                                        {item.type === 'essay' && (
                                            <div className="mt-2">
                                                <div className="text-sm text-gray-500 mb-1">학생 답안:</div>
                                                <div className="p-3 bg-white rounded-lg border min-h-[80px] whitespace-pre-wrap">
                                                    {item.studentAnswer || '(답변 없음)'}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 결과 표시 / 점수 입력 */}
                                    <div className="ml-4 text-right">
                                        {item.type === 'essay' ? (
                                            <div>
                                                <label className="text-sm text-gray-500 block mb-1">점수 입력</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.maxPoints}
                                                    value={manualScores[item.questionNum] ?? ''}
                                                    onChange={(e) => handleScoreChange(item.questionNum, e.target.value)}
                                                    placeholder="0"
                                                    className="w-20 px-3 py-2 border-2 border-orange-300 rounded-lg text-center font-bold text-lg focus:border-orange-500 focus:outline-none"
                                                />
                                                <div className="text-xs text-gray-400 mt-1">
                                                    / {item.maxPoints}점
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`text-2xl font-bold ${item.correct ? 'text-green-500' : 'text-red-500'
                                                }`}>
                                                {item.correct ? '✓' : '✗'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 푸터 */}
                <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        제출 시간: {submission.submittedAt?.toDate?.().toLocaleString('ko-KR') || '-'}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                        >
                            취소
                        </button>
                        {essayQuestions.length > 0 && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                                {saving ? '저장 중...' : '💾 점수 저장'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SubmissionDetailModal
