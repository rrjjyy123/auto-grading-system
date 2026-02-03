import { useState, useEffect } from 'react'

/**
 * 결과 전송 설정 모달
 * 학생에게 공개할 정보를 교사가 선택
 */
function ResultReleaseModal({ examId, currentConfig, onClose, onSave }) {
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
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">결과 전송 설정</h2>
                    <p className="text-sm text-gray-500 mt-1">학생들에게 공개할 항목을 선택하세요.</p>
                </div>

                <div className="p-6 space-y-4">
                    {/* 1. 점수 공개 */}
                    <div
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${config.showScore ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        onClick={() => handleToggle('showScore')}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${config.showScore ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                                }`}>
                                {config.showScore && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">점수 공개</h3>
                                <p className="text-xs text-gray-500">학생이 본인의 총점을 확인할 수 있습니다.</p>
                            </div>
                        </div>
                    </div>

                    {/* 2. 정답 공개 */}
                    <div
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${config.showAnswers ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        onClick={() => handleToggle('showAnswers')}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${config.showAnswers ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                                }`}>
                                {config.showAnswers && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">정답 및 채점 결과 공개</h3>
                                <p className="text-xs text-gray-500">내 답안, 정답, 정오표(O/X)를 확인할 수 있습니다.</p>
                            </div>
                        </div>
                    </div>

                    {/* 3. 해설 공개 */}
                    <div
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${config.showExplanation ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        onClick={() => handleToggle('showExplanation')}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${config.showExplanation ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                                }`}>
                                {config.showExplanation && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">해설 공개</h3>
                                <p className="text-xs text-gray-500">선생님이 작성한 문항별 해설을 볼 수 있습니다.</p>
                            </div>
                        </div>
                    </div>

                    {/* 4. 레이더 차트 공개 */}
                    <div
                        className={`p-4 rounded-xl border-2 transition-all ${config.showRadar ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                    >
                        <div
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => handleToggle('showRadar')}
                        >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${config.showRadar ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                                }`}>
                                {config.showRadar && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">성취도 분석 (레이더 차트)</h3>
                                <p className="text-xs text-gray-500">영역별 득점률을 그래프로 표시합니다.</p>
                            </div>
                        </div>

                        {/* 하위 옵션: 반 평균 비교 */}
                        {config.showRadar && (
                            <div className="mt-3 pl-9 border-t border-blue-200 pt-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.showClassAverage}
                                        onChange={() => handleToggle('showClassAverage')}
                                        className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700 font-medium">반 평균과 비교하기</span>
                                </label>
                                <p className="text-xs text-gray-500 mt-1 pl-6">
                                    체크 시 학생 그래프 위에 반 평균 그래프가 겹쳐서 표시됩니다.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t bg-gray-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                        {saving ? '저장 중...' : '확인 및 전송'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ResultReleaseModal
