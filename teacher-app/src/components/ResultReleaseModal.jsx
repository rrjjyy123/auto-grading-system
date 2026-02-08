import { useState, useEffect } from 'react'
import { useToast } from './Toast'

/**
 * 결과 전송 설정 모달
 * 학생에게 공개할 정보를 교사가 선택
 */
function ResultReleaseModal({ examId, currentConfig, onClose, onSave }) {
    const { success } = useToast()
    const [config, setConfig] = useState({
        showScore: false,       // 점수 공개
        showAnswers: false,     // 정답 및 정오표 공개
        showExplanation: false, // 해설 공개
        showRadar: false,       // 레이더 차트 공개
        showClassAverage: false // 반 평균 비교 (레이더 차트 옵션)
    })

    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (currentConfig) {
            setConfig(currentConfig)
        }
    }, [currentConfig])

    const handleToggle = (field) => {
        setConfig(prev => {
            const newState = { ...prev, [field]: !prev[field] }

            // 의존성 처리
            if (field === 'showRadar' && !newState.showRadar) {
                // 레이더 차트 끄면 반 평균 비교도 끔
                newState.showClassAverage = false
            }

            return newState
        })
    }

    const handleSave = async () => {
        setSaving(true)
        await onSave(examId, config)
        setSaving(false)
        success('설정이 저장되었습니다')
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100">
                <div className="p-6 border-b border-gray-100 bg-white">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-2xl">📢</span>
                        결과 전송 설정
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium">학생들에게 공개할 항목을 선택하세요.</p>
                </div>

                <div className="p-6 space-y-4">
                    {/* 1. 점수 공개 */}
                    <div
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${config.showScore ? 'border-primary/50 bg-indigo-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                            }`}
                        onClick={() => handleToggle('showScore')}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${config.showScore ? 'bg-primary border-primary' : 'border-gray-300'
                                }`}>
                                {config.showScore && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <div>
                                <h3 className={`font-bold ${config.showScore ? 'text-primary' : 'text-gray-700'}`}>점수 공개</h3>
                                <p className="text-xs text-gray-500 font-medium">학생이 본인의 총점을 확인할 수 있습니다.</p>
                            </div>
                        </div>
                    </div>

                    {/* 2. 정답 공개 */}
                    <div
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${config.showAnswers ? 'border-primary/50 bg-indigo-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                            }`}
                        onClick={() => handleToggle('showAnswers')}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${config.showAnswers ? 'bg-primary border-primary' : 'border-gray-300'
                                }`}>
                                {config.showAnswers && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <div>
                                <h3 className={`font-bold ${config.showAnswers ? 'text-primary' : 'text-gray-700'}`}>정답 및 채점 결과 공개</h3>
                                <p className="text-xs text-gray-500 font-medium">내 답안, 정답, 정오표(O/X)를 확인할 수 있습니다.</p>
                            </div>
                        </div>
                    </div>

                    {/* 3. 해설 공개 */}
                    <div
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${config.showExplanation ? 'border-primary/50 bg-indigo-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                            }`}
                        onClick={() => handleToggle('showExplanation')}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${config.showExplanation ? 'bg-primary border-primary' : 'border-gray-300'
                                }`}>
                                {config.showExplanation && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <div>
                                <h3 className={`font-bold ${config.showExplanation ? 'text-primary' : 'text-gray-700'}`}>해설 공개</h3>
                                <p className="text-xs text-gray-500 font-medium">선생님이 작성한 문항별 해설을 볼 수 있습니다.</p>
                            </div>
                        </div>
                    </div>

                    {/* 4. 레이더 차트 공개 */}
                    <div
                        className={`p-4 rounded-2xl border-2 transition-all ${config.showRadar ? 'border-primary/50 bg-indigo-50/50 shadow-sm' : 'border-gray-100'
                            }`}
                    >
                        <div
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => handleToggle('showRadar')}
                        >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${config.showRadar ? 'bg-primary border-primary' : 'border-gray-300'
                                }`}>
                                {config.showRadar && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <div>
                                <h3 className={`font-bold ${config.showRadar ? 'text-primary' : 'text-gray-700'}`}>성취도 분석 (레이더 차트)</h3>
                                <p className="text-xs text-gray-500 font-medium">영역별 득점률을 그래프로 표시합니다.</p>
                            </div>
                        </div>

                        {/* 하위 옵션: 반 평균 비교 */}
                        {config.showRadar && (
                            <div className="mt-3 pl-9 border-t border-primary/10 pt-3 animate-in fade-in slide-in-from-top-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={config.showClassAverage}
                                        onChange={() => handleToggle('showClassAverage')}
                                        className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer border-gray-300"
                                    />
                                    <span className="text-sm text-gray-600 font-bold group-hover:text-primary transition-colors">반 평균과 비교하기</span>
                                </label>
                                <p className="text-xs text-gray-400 mt-1 pl-6 font-medium">
                                    체크 시 학생 그래프 위에 반 평균 그래프가 겹쳐서 표시됩니다.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                    >
                        {saving ? '저장 중...' : '확인 및 전송'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ResultReleaseModal
