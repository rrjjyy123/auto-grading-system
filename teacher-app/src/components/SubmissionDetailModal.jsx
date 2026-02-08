import { useState, useEffect } from 'react'
import { updateSubmissionScore } from '../lib/firebase'
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts'
import { useToast } from './Toast'

function CategoryRadarChart({ itemResults, statistics }) {
    if (!itemResults || itemResults.length === 0) return null;

    // 카테고리별 데이터 가공
    const stats = itemResults.reduce((acc, item) => {
        const cat = item.category || '기타';
        if (!acc[cat]) {
            acc[cat] = { name: cat, total: 0, earned: 0, count: 0 };
        }
        acc[cat].total += item.maxPoints;
        if (item.score !== undefined) {
            acc[cat].earned += item.score;
        } else if (item.correct) {
            acc[cat].earned += item.maxPoints;
        }
        acc[cat].count += 1;
        return acc;
    }, {});

    const data = Object.values(stats).map(s => {
        const dataPoint = {
            subject: s.name,
            A: s.total > 0 ? Math.round((s.earned / s.total) * 100) : 0,
            fullMark: 100
        }

        // 반 평균 데이터 추가
        if (statistics?.categoryAverages) {
            dataPoint.B = statistics.categoryAverages[s.name] || 0
        }

        return dataPoint
    });

    return (
        <div className="w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
                    <PolarGrid stroke="#E5E7EB" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name="학생 점수"
                        dataKey="A"
                        stroke="#4F46E5"
                        strokeWidth={2}
                        fill="#4F46E5"
                        fillOpacity={0.3}
                    />
                    {statistics?.categoryAverages && (
                        <Radar
                            name="반 평균"
                            dataKey="B"
                            stroke="#10B981"
                            strokeWidth={2}
                            fill="#10B981"
                            fillOpacity={0.3}
                        />
                    )}
                </RadarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-1 text-xs font-bold">
                <div className="flex items-center gap-1 text-primary">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    학생 점수
                </div>
                {statistics?.categoryAverages && (
                    <div className="flex items-center gap-1 text-emerald-500">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        반 평균
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * 개별 제출물 상세 및 서술형 채점 모달
 */
function SubmissionDetailModal({
    submission,
    examData,
    answerData,
    itemResults,
    onClose,
    onUpdate,
    hasPrev,
    hasNext,
    onPrev,
    onNext
}) {
    const { success, error: toastError } = useToast()
    const [manualScores, setManualScores] = useState({})
    const [overrides, setOverrides] = useState({}) // 수동 재채점 오버라이드
    const [saving, setSaving] = useState(false)

    // 기존 수동 채점 점수 및 오버라이드 로드
    useEffect(() => {
        if (submission.manualScores) {
            setManualScores(submission.manualScores)
        }
        if (submission.overrides) {
            setOverrides(submission.overrides)
        }
    }, [submission.manualScores, submission.overrides])

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

    // 수동 재채점 토글
    const handleOverrideToggle = (questionNum, forceCorrect) => {
        setOverrides(prev => {
            const current = prev[questionNum]
            if (current === forceCorrect) {
                const updated = { ...prev }
                delete updated[questionNum]
                return updated
            }
            return { ...prev, [questionNum]: forceCorrect }
        })
    }

    // 오버라이드 해제
    const handleClearOverride = (questionNum) => {
        setOverrides(prev => {
            const updated = { ...prev }
            delete updated[questionNum]
            return updated
        })
    }

    // 최종 점수 계산
    const calculateTotalScore = () => {
        let total = 0
        itemResults?.forEach(item => {
            if (item.type === 'essay') {
                total += manualScores[item.questionNum] || 0
            } else if (overrides[item.questionNum] !== undefined) {
                total += overrides[item.questionNum] ? item.maxPoints : 0
            } else {
                total += item.correct ? item.maxPoints : 0
            }
        })
        return total
    }

    // 저장
    const handleSave = async () => {
        setSaving(true)

        const allEssaysGraded = essayQuestions.every(q =>
            manualScores[q.questionNum] !== undefined
        )

        const updatedItemResults = itemResults.map(item => {
            const newItem = { ...item }
            if (item.type === 'essay') {
                if (manualScores[item.questionNum] !== undefined) {
                    newItem.score = manualScores[item.questionNum]
                    newItem.correct = newItem.score === item.maxPoints
                }
            }
            if (overrides[item.questionNum] !== undefined) {
                newItem.correct = overrides[item.questionNum]
            }
            return newItem
        })

        const totalScore = updatedItemResults.reduce((sum, item) => {
            return sum + (item.score || (item.correct ? item.maxPoints : 0))
        }, 0)

        const newCorrectCount = updatedItemResults.filter(item => item.correct).length
        const newAutoScore = updatedItemResults.filter(item => item.type !== 'essay')
            .reduce((sum, item) => sum + (item.correct ? item.maxPoints : 0), 0)

        const { error } = await updateSubmissionScore(submission.id, {
            score: totalScore,
            correctCount: newCorrectCount,
            autoScore: newAutoScore,
            manualScores: manualScores,
            overrides: overrides,
            manualGradingComplete: allEssaysGraded || Object.keys(manualScores).length > 0,
            itemResults: updatedItemResults
        })

        setSaving(false)

        if (error) {
            toastError('저장 실패: ' + error)
        } else {
            success('채점 결과가 저장되었습니다')
            if (onUpdate) onUpdate()
            onClose()
        }
    }

    // 포맷팅 헬퍼
    const formatAnswer = (answer, type) => {
        if (answer === null || answer === undefined) return '-'
        if (type === 'ox') {
            const val = Array.isArray(answer) ? answer[0] : answer
            return val === 'O' || val === true ? 'O' : 'X'
        }
        if (type === 'short' || type === 'essay') {
            return String(answer)
        }
        const choices = ['①', '②', '③', '④', '⑤']
        if (Array.isArray(answer)) {
            return answer.map(a => choices[a - 1] || a).join(', ')
        }
        return choices[answer - 1] || answer
    }

    const totalScore = calculateTotalScore()
    const autoScore = submission.autoScore || 0
    const manualScorePart = Object.values(manualScores).reduce((sum, s) => sum + s, 0)
    const hasOverrides = Object.keys(overrides).length > 0

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-100">
                {/* 헤더 */}
                <div className="p-5 border-b border-gray-100 bg-white flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl">
                            🎓
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {submission.studentNumber}번 학생 답안
                            </h2>
                            <p className="text-gray-500 text-sm font-medium">
                                {examData.subject} • {examData.title}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-gray-100 rounded-xl p-1">
                            <button
                                onClick={onPrev}
                                disabled={!hasPrev}
                                className="p-2 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all text-gray-600"
                                title="이전 학생"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="w-px bg-gray-300 my-1 mx-1"></div>
                            <button
                                onClick={onNext}
                                disabled={!hasNext}
                                className="p-2 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all text-gray-600"
                                title="다음 학생"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                {/* 메인 컨텐츠 */}
                <div className="flex-1 overflow-auto bg-gray-50 p-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* 좌측: 요약 및 차트 */}
                        <div className="space-y-6">
                            {/* 점수 요약 카드 */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">점수 집계</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                        <span className="text-gray-600 font-bold">자동 채점</span>
                                        <span className="font-bold text-gray-900">{autoScore}점</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl">
                                        <span className="text-indigo-600 font-bold">서술/수동</span>
                                        <span className="font-bold text-indigo-700">+{manualScorePart}점</span>
                                    </div>
                                    <div className="h-px bg-gray-100"></div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-extrabold text-gray-800">총점</span>
                                        <span className="text-3xl font-black text-primary">{totalScore}점</span>
                                    </div>
                                </div>
                            </div>

                            {/* 영역별 분석 차트 */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">영역별 성취도</h3>
                                <div className="flex items-center justify-center">
                                    <CategoryRadarChart itemResults={itemResults} statistics={examData.statistics} />
                                </div>
                            </div>
                        </div>

                        {/* 우측: 문항 상세 리스트 */}
                        <div className="md:col-span-2 space-y-4">
                            {itemResults?.map((item, idx) => {
                                const isEssay = item.type === 'essay';
                                const isCorrect = item.correct;
                                const isOverridden = overrides[item.questionNum] !== undefined;

                                return (
                                    <div
                                        key={idx}
                                        className={`bg-white p-5 rounded-2xl shadow-sm border transition-all ${isEssay ? 'border-indigo-100' :
                                                isCorrect ? 'border-emerald-100' : 'border-rose-100'
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* 문항 번호 및 상태 아이콘 */}
                                            <div className="flex-shrink-0 flex flex-col items-center gap-2">
                                                <span className="text-xl font-black text-gray-800 tracking-tight">Q{item.questionNum}</span>
                                                {isEssay ? (
                                                    <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg border border-indigo-100">서술형</span>
                                                ) : (
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold ${isOverridden ? 'bg-purple-100 text-purple-600' :
                                                            isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                                        }`}>
                                                        {isOverridden ? '!' : (isCorrect ? '✔' : '✘')}
                                                    </div>
                                                )}
                                            </div>

                                            {/* 문항 상세 내용 */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-bold rounded">
                                                        {item.type === 'choice4' ? '4지선다' :
                                                            item.type === 'choice5' ? '5지선다' :
                                                                item.type === 'ox' ? 'O/X' :
                                                                    item.type === 'short' ? '단답형' :
                                                                        item.type === 'essay' ? '서술형' : item.type}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-bold">배점 {item.maxPoints}점</span>
                                                </div>

                                                {/* 소문항이 없는 경우 */}
                                                {!item.hasSubQuestions && !isEssay && (
                                                    <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                                        <div>
                                                            <div className="text-xs text-gray-400 font-bold mb-1">정답</div>
                                                            <div className="font-bold text-primary text-lg font-mono">
                                                                {formatAnswer(item.correctAnswer, item.type)}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-gray-400 font-bold mb-1">학생 답안</div>
                                                            <div className={`font-bold text-lg font-mono ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                {formatAnswer(item.studentAnswer, item.type)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 소문항이 있는 경우 */}
                                                {item.hasSubQuestions && item.subResults && (
                                                    <div className="space-y-2 mt-2">
                                                        <div className="text-xs font-bold text-gray-500">소문항 상세</div>
                                                        <div className="grid gap-2">
                                                            {item.subResults.map((sub, sIdx) => (
                                                                <div key={sIdx} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100 text-sm">
                                                                    <span className="font-bold text-gray-500 w-8">({sub.subNum})</span>
                                                                    <div className="flex-1 flex gap-4">
                                                                        <span className="text-gray-400">정답 <b className="text-primary">{Array.isArray(sub.correctAnswer) ? sub.correctAnswer.join(', ') : sub.correctAnswer}</b></span>
                                                                        <span className="text-gray-400">제출 <b className={sub.correct ? 'text-emerald-600' : 'text-rose-600'}>{sub.studentAnswer || '-'}</b></span>
                                                                    </div>
                                                                    <span className={sub.correct ? 'text-emerald-500' : 'text-rose-500'}>
                                                                        {sub.correct ? '✔' : '✘'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 서술형 답안 */}
                                                {isEssay && (
                                                    <div className="mt-2">
                                                        <div className="text-xs font-bold text-gray-500 mb-1">학생 서술 답안</div>
                                                        <div className="p-3 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm min-h-[60px] whitespace-pre-wrap leading-relaxed shadow-sm">
                                                            {item.studentAnswer || '(답변 없음)'}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 점수 조절 컨트롤 */}
                                            <div className="flex flex-col items-end gap-2 pl-4 border-l border-gray-100 min-w-[100px]">
                                                {isEssay ? (
                                                    <div className="text-right">
                                                        <label className="text-xs font-bold text-gray-400 block mb-1">점수 부여</label>
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={item.maxPoints}
                                                                value={manualScores[item.questionNum] ?? ''}
                                                                onChange={(e) => handleScoreChange(item.questionNum, e.target.value)}
                                                                className="w-16 px-2 py-1.5 border-2 border-primary/20 rounded-lg text-center font-bold text-lg focus:border-primary focus:outline-none"
                                                            />
                                                            <span className="text-xs text-gray-400">/{item.maxPoints}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-end gap-2 w-full">
                                                        <div className="flex items-center gap-1">
                                                            {isOverridden && <span className="text-[10px] font-bold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">수동</span>}
                                                            <span className={`text-lg font-black ${overrides[item.questionNum] ? 'text-emerald-600' : (overrides[item.questionNum] === false ? 'text-rose-600' : (item.correct ? 'text-emerald-600' : 'text-rose-600'))}`}>
                                                                {overrides[item.questionNum] ? '+' + item.maxPoints : (overrides[item.questionNum] === false ? '0' : (item.correct ? '+' + item.maxPoints : '0'))}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-1 w-full">
                                                            <button
                                                                onClick={() => handleOverrideToggle(item.questionNum, true)}
                                                                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${overrides[item.questionNum] === true
                                                                        ? 'bg-emerald-500 text-white shadow-sm'
                                                                        : 'bg-gray-100 text-gray-400 hover:bg-emerald-100 hover:text-emerald-600'
                                                                    }`}
                                                            >
                                                                정답
                                                            </button>
                                                            <button
                                                                onClick={() => handleOverrideToggle(item.questionNum, false)}
                                                                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${overrides[item.questionNum] === false
                                                                        ? 'bg-rose-500 text-white shadow-sm'
                                                                        : 'bg-gray-100 text-gray-400 hover:bg-rose-100 hover:text-rose-600'
                                                                    }`}
                                                            >
                                                                오답
                                                            </button>
                                                        </div>
                                                        {isOverridden && (
                                                            <button
                                                                onClick={() => handleClearOverride(item.questionNum)}
                                                                className="text-xs text-gray-400 hover:text-gray-600 underline decoration-gray-300"
                                                            >
                                                                되돌리기
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* 푸터 */}
                <div className="p-5 border-t border-gray-100 bg-white flex justify-between items-center z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div className="text-xs font-bold text-gray-400">
                        최초 제출: {submission.submittedAt?.toDate?.().toLocaleString('ko-KR') || '-'}
                    </div>
                    <div className="flex gap-3">
                        {(essayQuestions.length > 0 || hasOverrides) ? (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-3 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        저장 중...
                                    </>
                                ) : (
                                    <>
                                        <span>채점 완료 및 저장</span>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                닫기
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SubmissionDetailModal
