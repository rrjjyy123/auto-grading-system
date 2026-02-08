import { useState, useMemo } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts'
import { updateResultConfig, deleteExam, updateExamRetake } from '../lib/firebase'
import { useToast } from './Toast'
import * as XLSX from 'xlsx'
import SubmissionDetailModal from './SubmissionDetailModal'
import MonitorPanel from './MonitorPanel'

/**
 * 시험 결과 상세 및 수정 컴포넌트
 * - 종합 통계 (평균, 최고/최저, 응시율)
 * - 문항별 정답률 분석 (상/중/하 난이도 자동 분류)
 * - 학생별 점수 리스트 (상세 보기 가능, 점수 수정 제거)
 * - 엑셀 내보내기
 * - 결과 배포 관리
 */
function ResultsView({ exam, students, submissions, classId, onBack }) {
    const { success, error: toastError } = useToast()
    const [activeTab, setActiveTab] = useState('overview') // overview, questions, students, settings

    // 점수 공개 설정
    const [releaseConfig, setReleaseConfig] = useState(exam?.releaseConfig || {
        isReleased: false, // 성적표 발송 마스터 스위치
        showScore: true,
        showAnswers: false,
        showExplanation: false,
        showRadar: false,
        showClassAverage: false
        // showRanking removed
    })
    const [allowRetake, setAllowRetake] = useState(exam?.allowRetake || false)

    // 모달 상태
    const [selectedQuestionForAnalysis, setSelectedQuestionForAnalysis] = useState(null)
    const [detailSubmission, setDetailSubmission] = useState(null)

    // 정렬 상태
    const [sortConfig, setSortConfig] = useState({ key: 'number', direction: 'asc' })

    // 모니터링 패널 상태
    const [showMonitor, setShowMonitor] = useState(false)

    // 통계 계산
    const stats = useMemo(() => {
        // graded가 true이거나, 점수가 있는 경우, 또는 상세 결과가 있는 경우를 채점 완료로 간주
        const graded = submissions.filter(s => s.graded || (s.score !== undefined && s.score !== null) || (s.itemResults?.length > 0 || s.details?.length > 0))
        if (graded.length === 0) return null

        const scores = graded.map(s => {
            if (s.score !== undefined && s.score !== null) return s.score
            const items = s.itemResults || s.details || []
            return items.reduce((acc, cur) => acc + (cur.points || cur.score || (cur.correct ? cur.maxPoints : 0) || 0), 0)
        })
        const total = scores.reduce((a, b) => a + b, 0)
        const avg = total / graded.length
        const max = Math.max(...scores)
        const min = Math.min(...scores)

        // 점수대 분포 (10점 단위)
        const distribution = Array(10).fill(0)
        scores.forEach(s => {
            const idx = Math.min(Math.floor(s / 10), 9)
            distribution[idx]++
        })

        const distData = distribution.map((count, i) => ({
            range: `${i * 10}~${i * 10 + 9}`,
            count
        }))



        // 영역별 평균 계산 (레이더 차트용)
        const categoryAverages = {}
        if (exam.questions && exam.questions.length > 0) {
            // 문항별 카테고리/배점 매핑
            const catInfo = {} // { '지식': { totalPoints: 10, currentSum: 0, count: 0 } }

            // 1. 카테고리별 총 배점 계산
            exam.questions.forEach(q => {
                if (q.category && q.category.trim()) {
                    const cat = q.category.trim()
                    if (!catInfo[cat]) catInfo[cat] = { totalPoints: 0, studentScores: [] }
                    catInfo[cat].totalPoints += q.points
                }
            })

            // 2. 학생별 카테고리 획득 점수 계산
            if (Object.keys(catInfo).length > 0) {
                graded.forEach(sub => {
                    const items = sub.itemResults || sub.details || []
                    const myCatScores = {} // { '지식': 5 }

                    items.forEach(item => {
                        // itemResults에는 category가 없을 수도 있으므로 exam.questions에서 찾음
                        // item.questionNum은 1부터 시작
                        const qIdx = item.questionNum - 1
                        const q = exam.questions[qIdx]
                        if (q && q.category && q.category.trim()) {
                            const cat = q.category.trim()
                            if (!myCatScores[cat]) myCatScores[cat] = 0

                            // 획득 점수: score가 있으면 쓰고, 없으면 correct 여부로, 아니면 points
                            const earned = item.score !== undefined ? item.score : (item.correct ? item.maxPoints : 0) // 간단 처리
                            myCatScores[cat] += earned
                        }
                    })

                    // 각 카테고리별 환산 점수(100점 만점) 저장
                    Object.keys(catInfo).forEach(cat => {
                        const earned = myCatScores[cat] || 0
                        const total = catInfo[cat].totalPoints
                        // 100점 환산
                        const converted = total > 0 ? (earned / total) * 100 : 0
                        catInfo[cat].studentScores.push(converted)
                    })
                })

                // 3. 반 평균 계산
                Object.keys(catInfo).forEach(cat => {
                    const scores = catInfo[cat].studentScores
                    if (scores.length > 0) {
                        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
                        categoryAverages[cat] = Math.round(avg)
                    } else {
                        categoryAverages[cat] = 0
                    }
                })
            }
        }

        return { avg, max, min, count: graded.length, distData, categoryAverages }
    }, [submissions])

    // 문항별 분석
    const itemAnalysis = useMemo(() => {
        if (!exam.questions) return []

        // 통계에 포함될 제출물 필터링
        const gradedSubs = submissions.filter(s => s.graded || (s.score !== undefined && s.score !== null) || (s.itemResults?.length > 0 || s.details?.length > 0))

        return exam.questions.map((q, qIdx) => {
            let correctCount = 0

            gradedSubs.forEach(sub => {
                // O/X 결과가 저장된 itemResults 확인 (기존 details 호환)
                const items = sub.itemResults || sub.details || []
                const isCorrect = items.find(d => d.questionNum === q.num)?.correct
                if (isCorrect) correctCount++
            })

            const rate = gradedSubs.length > 0 ? (correctCount / gradedSubs.length) * 100 : 0

            // 난이도 판별
            let difficulty = '중'
            let color = 'text-yellow-600 bg-yellow-50'
            if (rate >= 80) { difficulty = '하'; color = 'text-emerald-600 bg-emerald-50'; }
            else if (rate < 40) { difficulty = '상'; color = 'text-rose-600 bg-rose-50'; }

            return {
                ...q,
                rate,
                difficulty,
                difficultyColor: color,
                correctCount
            }
        })
    }, [exam.questions, submissions])

    // 학생별 리스트 (정렬 적용)
    const studentList = useMemo(() => {
        let list = students.map(student => {
            const sub = submissions.find(s => s.studentNumber === student.number)

            // 점수 계산 (fallback)
            let score = 0
            let isGraded = false

            if (sub) {
                // graded 플래그가 명시적으로 있으면 그것을 따름 (서술형 미채점 상태 지원)
                if (sub.graded !== undefined) {
                    isGraded = sub.graded
                    // 점수는 계산된 값을 사용하되, 미채점 상태라도 부분 점수가 있을 수 있음
                    if (sub.score !== undefined && sub.score !== null) {
                        score = sub.score
                    } else {
                        const items = sub.itemResults || sub.details || []
                        if (items.length > 0) {
                            score = items.reduce((acc, cur) => acc + (cur.points || cur.score || (cur.correct ? cur.maxPoints : 0) || 0), 0)
                        }
                    }
                } else {
                    // Legacy 데이터 호환 (graded 플래그가 없는 경우)
                    if (sub.score !== undefined && sub.score !== null) {
                        score = sub.score
                        isGraded = true
                    } else {
                        const items = sub.itemResults || sub.details || []
                        if (items.length > 0) {
                            score = items.reduce((acc, cur) => acc + (cur.points || cur.score || (cur.correct ? cur.maxPoints : 0) || 0), 0)
                            isGraded = true
                        }
                    }
                }
            }

            return {
                ...student,
                submission: sub,
                score: (sub && sub.score !== undefined) ? sub.score : score, // 점수는 항상 표시 (부분점수 등)
                status: sub ? (isGraded ? '채점완료' : '미채점') : '미응시'
            }
        })

        // 석차 계산 (점수 내림차순 정렬 후 순위 부여)
        // 먼저 점수순으로 정렬하여 순위 계산
        list.sort((a, b) => b.score - a.score)

        let currentRank = 1
        for (let i = 0; i < list.length; i++) {
            // 제출하지 않았거나 0점인 경우(미응시) 처리 고민 -> 0점도 순위 있음. 미응시는 순위 제외
            if (!list[i].submission) {
                list[i].rank = '-'
                continue
            }

            if (i > 0 && list[i].score < list[i - 1].score) {
                // 이전 학생보다 점수가 낮으면 현재 인덱스+1이 순위
                // 단, 이전 학생이 미응시가 아니어야 함 (정렬했으니 상위는 다 응시자일 것)
                currentRank = i + 1
            }
            // 동점자 처리는 currentRank 유지
            list[i].rank = currentRank
        }

        // 사용자 지정 정렬 적용
        return list.sort((a, b) => {
            let aValue = a[sortConfig.key]
            let bValue = b[sortConfig.key]

            // 정렬 키 예외 처리
            if (sortConfig.key === 'submittedAt') {
                aValue = a.submission?.submittedAt?.seconds || 0
                bValue = b.submission?.submittedAt?.seconds || 0
            }
            if (sortConfig.key === 'rank') {
                // 미응시(-)는 항상 뒤로
                if (a.rank === '-') return 1
                if (b.rank === '-') return -1
                aValue = a.rank
                bValue = b.rank
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
            return 0
        })
    }, [students, submissions, sortConfig])

    // 정렬 핸들러
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    // 결과 공개 설정 저장
    const handleSaveConfig = async () => {
        // stats에 계산된 categoryAverages가 포함되어 있음
        const { error } = await updateResultConfig(exam.id, releaseConfig, stats)
        if (error) toastError(error)
        else success('공개 설정이 저장되었습니다')
    }

    // 재응시 설정 저장
    const handleSaveRetake = async () => {
        const { error } = await updateExamRetake(exam.id, allowRetake)
        if (error) toastError(error)
        else success('재응시 설정이 저장되었습니다')
    }

    // 엑셀 다운로드
    const handleDownloadExcel = () => {
        const data = studentList.map(s => ({
            '번호': s.number,
            '학생코드': s.code,
            '이름/메모': s.memo || '',
            '점수': s.submission ? s.score : '미응시',
            '상태': s.status,
            '제출시간': s.submission?.submittedAt?.toDate().toLocaleString() || ''
        }))

        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "성적")
        XLSX.writeFile(wb, `${exam.title}_성적.xlsx`)
    }

    // 시험 삭제
    const handleDeleteExam = async () => {
        if (!confirm('정말 이 시험을 삭제하시겠습니까? 모든 제출물 데이터도 함께 삭제됩니다.')) return
        const { error } = await deleteExam(exam.id)
        if (error) toastError(error)
        else {
            success('시험이 삭제되었습니다')
            onBack()
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* 헤더 */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                    <button
                        onClick={onBack}
                        className="text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1 transition-colors text-sm font-bold"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                        목록으로 / {exam.subject}
                    </button>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {exam.title}
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">
                        총 {exam.questionCount}문항 • {exam.totalPoints}점 만점 • {exam.createdAt?.toDate().toLocaleDateString()} 생성
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleDownloadExcel}
                        className="px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-100 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        엑셀 다운로드
                    </button>
                </div>
            </div>

            {/* 통계 요약 카드 */}
            {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 text-center">
                        <div className="text-3xl font-black text-indigo-600 mb-1">
                            {stats.count}/{students.length}
                        </div>
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wide">제출 인원</p>
                    </div>
                    <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 text-center">
                        <div className="text-3xl font-black text-emerald-600 mb-1">
                            {Math.round(stats.avg * 10) / 10}
                        </div>
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide">평균 점수</p>
                    </div>
                    <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100 text-center">
                        <div className="text-3xl font-black text-purple-600 mb-1">
                            {stats.max}
                        </div>
                        <p className="text-xs font-bold text-purple-400 uppercase tracking-wide">최고 점수</p>
                    </div>
                    <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 text-center">
                        <div className="text-3xl font-black text-amber-600 mb-1">
                            {stats.min}
                        </div>
                        <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">최저 점수</p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-center">
                        <div className="text-3xl font-black text-gray-600 mb-1">
                            {stats.count}/{exam.questionCount}
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">채점 완료</p>
                    </div>
                </div>
            ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center">
                    <div className="text-amber-500 font-bold mb-1">🚧 아직 제출된 답안이 없습니다</div>
                    <p className="text-amber-600/80 text-sm">학생들이 시험을 응시하면 여기에 결과가 표시됩니다.</p>
                </div>
            )}

            {/* 메인 탭 */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-2">
                        {['overview', 'questions', 'students', 'settings'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === tab
                                    ? 'bg-white text-primary shadow-sm ring-1 ring-primary/10'
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                    }`}
                            >
                                {tab === 'overview' && '📊 종합 분석'}
                                {tab === 'questions' && '📝 문항별 분석'}
                                {tab === 'students' && '👥 학생별 관리'}
                                {tab === 'settings' && '⚙️ 관리 및 설정'}
                            </button>
                        ))}
                    </div>
                    {/* 접속 확인 버튼 (우측 정렬) */}
                    <button
                        onClick={() => setShowMonitor(true)}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2"
                    >
                        <span>📡</span> 접속 확인
                    </button>
                </div>

                {activeTab === 'overview' && stats && (
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <span>📈</span> 점수대별 분포
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.distData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="range" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                                        <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                        <Bar dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <span>⚠️</span> 취약 문항 (정답률 50% 미만)
                            </h3>
                            <div className="space-y-3">
                                {itemAnalysis.filter(i => i.rate < 50).length > 0 ? (
                                    itemAnalysis.filter(i => i.rate < 50).map(item => (
                                        <div key={item.num} className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-100">
                                            <div className="flex items-center gap-4">
                                                <span className="w-8 h-8 flex items-center justify-center bg-white text-rose-600 font-bold rounded-lg shadow-sm border border-rose-100">
                                                    {item.num}
                                                </span>
                                                <span className="font-medium text-gray-700">
                                                    {item.type === 'choice5' ? '객관식' : item.type === 'ox' ? 'O/X' : '주관식'}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-rose-600 font-black text-lg">{Math.round(item.rate)}%</div>
                                                <div className="text-rose-400 text-xs font-bold">정답률</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                                        <span className="text-4xl mb-2">🎉</span>
                                        <p>취약 문항이 없습니다. <br />모든 문항의 정답률이 50% 이상입니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'questions' && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 w-16 text-center">No</th>
                                        <th className="px-6 py-4">유형</th>
                                        <th className="px-6 py-4">정답</th>
                                        <th className="px-6 py-4 text-center">배점</th>
                                        <th className="px-6 py-4 text-center">정답률</th>
                                        <th className="px-6 py-4 text-center">난이도</th>
                                        <th className="px-6 py-4">영역</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {itemAnalysis.map((item) => (
                                        <tr
                                            key={item.num}
                                            className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                            onClick={() => setSelectedQuestionForAnalysis(item)}
                                        >
                                            <td className="px-6 py-4 text-center font-bold text-gray-700 group-hover:text-primary transition-colors">{item.num}</td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {item.type === 'choice5' && '5지선다'}
                                                {item.type === 'choice4' && '4지선다'}
                                                {item.type === 'ox' && 'O/X'}
                                                {item.type === 'short' && '단답형'}
                                                {item.type === 'essay' && '서술형'}
                                            </td>
                                            <td className="px-6 py-4 font-mono font-medium text-gray-600">
                                                {item.displayAnswer || item.correctAnswers?.join(', ')}
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-gray-600">{item.points}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${item.rate >= 80 ? 'bg-emerald-500' :
                                                                item.rate >= 40 ? 'bg-yellow-400' : 'bg-rose-500'
                                                                }`}
                                                            style={{ width: `${item.rate}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="w-8 text-right font-bold text-gray-700">{Math.round(item.rate)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${item.difficultyColor.replace('text-', 'border-').replace('bg-', 'border-opacity-20 ')} ${item.difficultyColor}`}>
                                                    {item.difficulty}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 font-medium">
                                                {item.category || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-700">학생별 성적 리스트</h3>
                            <div className="text-xs text-gray-400">
                                학생을 클릭하면 상세 제출 답안을 확인할 수 있습니다.
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                                    <tr>
                                        <th
                                            className="px-6 py-4 w-16 text-center cursor-pointer hover:bg-gray-100/50 transition-colors"
                                            onClick={() => handleSort('rank')}
                                        >
                                            순위 {sortConfig.key === 'rank' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th
                                            className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100/50 transition-colors"
                                            onClick={() => handleSort('number')}
                                        >
                                            번호 {sortConfig.key === 'number' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th className="px-6 py-4">메모</th>
                                        <th className="px-6 py-4">학생 코드</th>
                                        <th
                                            className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100/50 transition-colors"
                                            onClick={() => handleSort('score')}
                                        >
                                            점수 {sortConfig.key === 'score' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th className="px-6 py-4 text-center">상태</th>
                                        <th className="px-6 py-4">제출 시간</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {studentList.map((student, idx) => (
                                        <tr
                                            key={student.number}
                                            onClick={() => student.submission && setDetailSubmission(student.submission)}
                                            className={`transition-colors ${student.submission ? 'hover:bg-indigo-50/30 cursor-pointer group' : ''}`}
                                        >
                                            <td className="px-6 py-4 text-center font-bold text-gray-700">
                                                {student.rank}
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-gray-700">{student.number}</td>
                                            <td className="px-6 py-4 font-medium text-gray-600">
                                                {student.memo || <span className="text-gray-300 italic"></span>}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-gray-500">{student.code}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`font-bold text-lg ${!student.submission ? 'text-gray-300' :
                                                    student.score >= 80 ? 'text-emerald-600' :
                                                        student.score >= 60 ? 'text-amber-500' : 'text-rose-500'
                                                    } ${student.submission ? 'group-hover:scale-110 transition-transform inline-block' : ''}`}>
                                                    {student.submission ? student.score : '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${student.status === '채점완료' ? 'bg-emerald-100 text-emerald-600' :
                                                    student.status === '미채점' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'
                                                    }`}>
                                                    {student.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-xs font-mono">
                                                {student.submission?.submittedAt?.toDate().toLocaleString() || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <span>📢</span> 결과 공개 설정
                            </h3>

                            <div className="space-y-4 flex-1">
                                {/* 마스터 스위치 */}
                                <div className="flex items-center justify-between p-5 bg-indigo-50 rounded-2xl border-2 border-indigo-100">
                                    <div>
                                        <div className="font-bold text-lg text-indigo-900">성적표 발송</div>
                                        <div className="text-sm text-indigo-600 mt-1">이 스위치를 켜야 학생들에게 성적표가 도착합니다.<br />(개별 채점이 완료된 학생만 볼 수 있습니다)</div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={releaseConfig.isReleased}
                                            onChange={(e) => setReleaseConfig({ ...releaseConfig, isReleased: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-14 h-8 bg-indigo-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                {/* 세부 설정 (마스터 스위치 하위 개념임을 시각적으로 표현) */}
                                <div className={`space-y-4 transition-opacity duration-200 ${!releaseConfig.isReleased ? 'opacity-60' : ''}`}>
                                    <div className="text-sm font-bold text-gray-500 ml-2 mb-2">성적표 상세 내용 설정</div>

                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                        <div>
                                            <div className="font-bold text-gray-800">점수 공개</div>
                                            <div className="text-xs text-gray-500 mt-1">학생이 본인의 점수를 확인할 수 있습니다.</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={releaseConfig.showScore}
                                                onChange={(e) => setReleaseConfig({ ...releaseConfig, showScore: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                        <div>
                                            <div className="font-bold text-gray-800">정답 및 상세 결과 공개</div>
                                            <div className="text-xs text-gray-500 mt-1">정답, 채점 결과(O/X)를 공개합니다.</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={releaseConfig.showAnswers}
                                                onChange={(e) => setReleaseConfig({ ...releaseConfig, showAnswers: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                        <div>
                                            <div className="font-bold text-gray-800">해설 공개</div>
                                            <div className="text-xs text-gray-500 mt-1">문항별 해설을 공개합니다.</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={releaseConfig.showExplanation}
                                                onChange={(e) => setReleaseConfig({ ...releaseConfig, showExplanation: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>

                                    <div className="p-4 bg-gray-50 rounded-2xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <div className="font-bold text-gray-800">성취도 분석 (레이더 차트)</div>
                                                <div className="text-xs text-gray-500 mt-1">영역별 분석 차트를 제공합니다.</div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={releaseConfig.showRadar}
                                                    onChange={(e) => setReleaseConfig({ ...releaseConfig, showRadar: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                        {releaseConfig.showRadar && (
                                            <div className="pl-4 border-l-2 border-primary/20">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={releaseConfig.showClassAverage}
                                                        onChange={(e) => setReleaseConfig({ ...releaseConfig, showClassAverage: e.target.checked })}
                                                        className="w-4 h-4 text-primary rounded focus:ring-primary border-gray-300"
                                                    />
                                                    <span className="text-sm font-bold text-gray-600">반 평균 비교 데이터 포함</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSaveConfig}
                                className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${releaseConfig.isReleased
                                    ? 'bg-primary text-white hover:bg-primary/90 shadow-primary/30'
                                    : 'bg-gray-800 text-white hover:bg-gray-900'
                                    }`}
                            >
                                {releaseConfig.isReleased
                                    ? '설정 저장 (현재 발송 중)'
                                    : '설정 저장 (발송 중지 상태)'}
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <span>⚙️</span> 시험 운영 설정
                                </h3>
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                    <div>
                                        <div className="font-bold text-gray-800">제출 후 바로 재응시 허용</div>
                                        <div className="text-xs text-gray-500 mt-1">학생이 제출 후 즉시 다시 시험을 볼 수 있게 합니다.</div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={allowRetake}
                                            onChange={(e) => setAllowRetake(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                                <button
                                    onClick={handleSaveRetake}
                                    className="w-full mt-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    재응시 설정 저장
                                </button>
                            </div>

                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-red-100">
                                <h3 className="text-lg font-bold text-rose-600 mb-4 flex items-center gap-2">
                                    <span>🗑️</span> 위험 구역
                                </h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    시험을 삭제하면 관련된 모든 제출물과 성적 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                                </p>
                                <button
                                    onClick={handleDeleteExam}
                                    className="w-full py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-bold hover:bg-rose-100 hover:text-rose-700 transition-colors"
                                >
                                    시험 삭제하기
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 문항별 상세 분석 모달 */}
            {selectedQuestionForAnalysis && (
                <QuestionAnalysisDetailModal
                    question={selectedQuestionForAnalysis}
                    submissions={submissions}
                    onClose={() => setSelectedQuestionForAnalysis(null)}
                />
            )}

            {/* 제출물 상세 모달 */}
            {detailSubmission && (
                <SubmissionDetailModal
                    submission={detailSubmission}
                    examData={exam}
                    itemResults={detailSubmission.itemResults || detailSubmission.details}
                    onClose={() => setDetailSubmission(null)}
                    onUpdate={() => { }} // 업데이트 시 목록 리프레시 (실시간이라 불필요, 화면 이동 방지)
                    hasPrev={studentList.findIndex(s => s.submission?.id === detailSubmission.id) > studentList.findIndex(s => s.submission)} // 간단 체크인 경우
                    hasNext={studentList.findIndex(s => s.submission?.id === detailSubmission.id) < studentList.findLastIndex(s => s.submission)}
                    onPrev={() => {
                        const idx = studentList.findIndex(s => s.submission?.id === detailSubmission.id)
                        for (let i = idx - 1; i >= 0; i--) {
                            if (studentList[i].submission) {
                                setDetailSubmission(studentList[i].submission)
                                return
                            }
                        }
                    }}
                    onNext={() => {
                        const idx = studentList.findIndex(s => s.submission?.id === detailSubmission.id)
                        for (let i = idx + 1; i < studentList.length; i++) {
                            if (studentList[i].submission) {
                                setDetailSubmission(studentList[i].submission)
                                return
                            }
                        }
                    }}
                />
            )}

            {/* 모니터링 패널 모달 */}
            {showMonitor && (
                <MonitorPanel
                    exam={exam}
                    classData={{ studentCount: students.length }}
                    onClose={() => setShowMonitor(false)}
                />
            )}
        </div>
    )
}

/**
 * 문항별 상세 분석 모달
 */
function QuestionAnalysisDetailModal({ question, submissions, onClose }) {
    const gradedSubs = submissions.filter(s => s.graded)

    // 선택 분포 계산
    const distribution = useMemo(() => {
        const dist = {}
        let correctCount = 0

        gradedSubs.forEach(sub => {
            const items = sub.itemResults || sub.details || []
            const itemResult = items.find(item => item.questionNum === question.num)
            if (!itemResult) return

            const studentAnswer = itemResult.studentAnswer
            // 객관식/OX의 경우
            if (question.type === 'choice5' || question.type === 'choice4' || question.type === 'ox') {
                const key = Array.isArray(studentAnswer) ? studentAnswer.join(',') : String(studentAnswer)
                dist[key] = (dist[key] || 0) + 1
            }

            if (itemResult.correct) correctCount++
        })

        return { dist, correctCount, total: gradedSubs.length }
    }, [question, gradedSubs])

    const formatAnswer = (ans) => {
        if (!ans) return '무응답'
        if (question.type === 'ox') return ans === 'O' || ans === true ? 'O' : 'X'
        if (question.type === 'choice5' || question.type === 'choice4') {
            const choices = ['①', '②', '③', '④', '⑤']
            // ans가 숫자이거나 문자열 숫자일 수 있음
            const num = parseInt(ans)
            if (!isNaN(num) && num >= 1 && num <= 5) return choices[num - 1]
            return ans
        }
        return ans
    }

    // 막대 그래프 데이터
    const chartData = Object.entries(distribution.dist).map(([answer, count]) => ({
        answer: formatAnswer(answer),
        count,
        isCorrect: isAnswerCorrect(question, answer) // 정답 여부 체크 로직 필요하지만 여기선 간단히
    })).sort((a, b) => b.count - a.count)

    function isAnswerCorrect(q, ans) {
        // 간단 비교
        if (Array.isArray(q.correctAnswers)) {
            return q.correctAnswers.some(ca => String(ca) === String(ans))
        }
        return String(q.correctAnswers) === String(ans)
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-sm">{question.num}</span>
                            문항 상세 분석
                        </h2>
                        <span className="text-xs text-gray-500 font-bold mt-1 ml-10 block">
                            {question.type === 'choice5' ? '5지선다' : question.type === 'ox' ? 'O/X' : '주관식'} • 배점 {question.points}점
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex gap-4">
                        <div className="flex-1 bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
                            <div className="text-xs font-bold text-gray-400 mb-1">정답</div>
                            <div className="text-2xl font-black text-primary">
                                {question.displayAnswer || question.correctAnswers?.join(', ')}
                            </div>
                        </div>
                        <div className="flex-1 bg-emerald-50 p-4 rounded-2xl text-center border border-emerald-100">
                            <div className="text-xs font-bold text-emerald-600/60 mb-1">정답률</div>
                            <div className="text-2xl font-black text-emerald-600">
                                {Math.round(question.rate)}%
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-gray-700 mb-3 text-sm">학생 선택 분포</h3>
                        {Object.keys(distribution.dist).length > 0 ? (
                            <div className="space-y-3">
                                {Object.entries(distribution.dist)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([ans, count]) => {
                                        const isAnsCorrect = isAnswerCorrect(question, ans)
                                        const percentage = Math.round((count / distribution.total) * 100)

                                        return (
                                            <div key={ans} className="relative">
                                                <div className="flex items-center justify-between text-sm font-bold mb-1 z-10 relative px-1">
                                                    <span className={isAnsCorrect ? 'text-emerald-600' : 'text-gray-600'}>
                                                        {isAnsCorrect && '✔ '} {formatAnswer(ans)}
                                                    </span>
                                                    <span className="text-gray-500">{count}명 ({percentage}%)</span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${isAnsCorrect ? 'bg-emerald-500' : 'bg-gray-400'}`}
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-sm">데이터가 없습니다.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ResultsView
