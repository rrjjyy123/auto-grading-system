import { useState, useEffect } from 'react'
import { fetchExamLogs } from '../lib/firebase'
import { useToast } from './Toast'

/**
 * 접속 확인 패널 (저비용 모니터링)
 * 버튼을 누를 때만 데이터를 가져와서 표시
 */
function MonitorPanel({ exam, classData, onClose }) {
    const { error: toastError } = useToast()
    const [logs, setLogs] = useState({})
    const [loading, setLoading] = useState(false)
    const [lastUpdated, setLastUpdated] = useState(null)

    const checkConnection = async () => {
        setLoading(true)
        const { data, error } = await fetchExamLogs(exam.id)
        if (data) {
            setLogs(data)
            setLastUpdated(new Date())
        } else if (error) {
            toastError('로그 조회 실패: ' + error)
        }
        setLoading(false)
    }

    // 컴포넌트 마운트 시 최초 1회 조회
    useEffect(() => {
        checkConnection()
    }, [])

    // 상태별 스타일 및 텍스트
    const getStatusStyle = (studentNum) => {
        const log = logs[studentNum]

        if (!log) {
            return {
                bg: 'bg-white',
                border: 'border-2 border-dashed border-gray-200',
                text: 'text-gray-300',
                label: '미접속',
                icon: ''
            }
        }

        if (log.status === 'submitted') {
            return {
                bg: 'bg-indigo-50',
                border: 'border-2 border-primary',
                text: 'text-primary font-bold',
                label: '제출완료',
                icon: '👑'
            }
        }

        if (log.status === 'connected') {
            return {
                bg: 'bg-emerald-50',
                border: 'border-2 border-emerald-400',
                text: 'text-emerald-700 font-bold',
                label: '접속중',
                icon: '🟢'
            }
        }

        return {
            bg: 'bg-gray-50',
            border: 'border-2 border-gray-200',
            text: 'text-gray-500',
            label: '알수없음',
            icon: '?'
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-100">
                {/* 헤더 */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                            <span className="text-2xl">📡</span>
                            실시간 접속 현황
                            <span className="px-2 py-1 bg-gray-100 rounded-lg text-sm font-medium text-gray-500">{exam.title}</span>
                        </h2>
                        <p className="text-sm text-gray-400 mt-1 font-medium flex items-center gap-2">
                            {lastUpdated ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    마지막 업데이트: {lastUpdated.toLocaleTimeString()}
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"></span>
                                    데이터 가져오는 중...
                                </>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={checkConnection}
                            disabled={loading}
                            className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${loading
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-primary text-white hover:bg-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                    확인 중...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    새로고침
                                </>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            닫기
                        </button>
                    </div>
                </div>

                {/* 범례 */}
                <div className="px-6 py-4 border-b border-gray-100 flex gap-6 text-sm bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-gray-300 bg-white"></div>
                        <span className="text-gray-500 font-medium">미접속</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                        <span className="text-emerald-700 font-bold">접속중</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_rgba(79,70,229,0.4)]"></div>
                        <span className="text-primary font-bold">제출완료</span>
                    </div>
                </div>

                {/* 학생 그리드 */}
                <div className="flex-1 overflow-auto p-6 bg-gray-50/30">
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
                        {Array.from({ length: classData.studentCount }, (_, i) => i + 1).map(num => {
                            const style = getStatusStyle(num)
                            return (
                                <div
                                    key={num}
                                    className={`relative p-2 rounded-2xl flex flex-col items-center justify-center aspect-square transition-all duration-300 ${style.bg} ${style.border} ${style.label === '미접속' ? 'opacity-60 hover:opacity-100 hover:border-gray-300' : 'shadow-sm hover:shadow-md hover:-translate-y-1'}`}
                                >
                                    <div className="absolute top-2 right-2 text-xs">{style.icon}</div>
                                    <span className={`text-3xl font-black mb-1 ${style.label === '미접속' ? 'text-gray-300' : 'text-gray-800'}`}>{num}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.label === '미접속' ? 'bg-gray-100 text-gray-400' :
                                            style.label === '제출완료' ? 'bg-indigo-100 text-indigo-700' :
                                                'bg-emerald-100 text-emerald-700'
                                        }`}>{style.label}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MonitorPanel
