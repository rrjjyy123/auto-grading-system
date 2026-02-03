import { useState, useEffect } from 'react'
import { fetchExamLogs } from '../lib/firebase'

/**
 * 접속 확인 패널 (저비용 모니터링)
 * 버튼을 누를 때만 데이터를 가져와서 표시
 */
function MonitorPanel({ exam, classData, onClose }) {
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
            alert('로그 조회 실패: ' + error)
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
                border: 'border-gray-200',
                text: 'text-gray-400',
                label: '미접속'
            }
        }

        if (log.status === 'submitted') {
            return {
                bg: 'bg-blue-100',
                border: 'border-blue-300',
                text: 'text-blue-700 font-bold',
                label: '제출완료'
            }
        }

        if (log.status === 'connected') {
            return {
                bg: 'bg-green-100',
                border: 'border-green-300',
                text: 'text-green-700 font-bold',
                label: '접속중'
            }
        }

        return {
            bg: 'bg-gray-50',
            border: 'border-gray-200',
            text: 'text-gray-500',
            label: '알수없음'
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* 헤더 */}
                <div className="p-6 border-b flex items-center justify-between bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            📡 접속 현황 확인
                            <span className="text-sm font-normal text-gray-500">({exam.title})</span>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {lastUpdated ? `마지막 확인: ${lastUpdated.toLocaleTimeString()}` : '데이터 가져오는 중...'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={checkConnection}
                            disabled={loading}
                            className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all ${loading
                                    ? 'bg-gray-200 text-gray-500'
                                    : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                                    확인 중...
                                </>
                            ) : (
                                <>
                                    🔄 새로고침
                                </>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            닫기
                        </button>
                    </div>
                </div>

                {/* 범례 */}
                <div className="px-6 py-3 border-b flex gap-4 text-sm bg-white">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border border-gray-200 bg-white"></div>
                        <span className="text-gray-600">미접속</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border border-green-300 bg-green-100"></div>
                        <span className="text-green-700 font-bold">접속중 (입장)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border border-blue-300 bg-blue-100"></div>
                        <span className="text-blue-700 font-bold">제출완료</span>
                    </div>
                </div>

                {/* 학생 그리드 */}
                <div className="flex-1 overflow-auto p-6 bg-gray-50">
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {Array.from({ length: classData.studentCount }, (_, i) => i + 1).map(num => {
                            const style = getStatusStyle(num)
                            return (
                                <div
                                    key={num}
                                    className={`relative p-3 rounded-xl border-2 flex flex-col items-center justify-center aspect-square transition-all ${style.bg} ${style.border}`}
                                >
                                    <span className="text-2xl font-black text-gray-800/80 mb-1">{num}</span>
                                    <span className={`text-xs ${style.text}`}>{style.label}</span>
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
