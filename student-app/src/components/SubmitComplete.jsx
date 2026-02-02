function SubmitComplete({ result, onRestart }) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
                {/* 체크 아이콘 */}
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-gray-800 mb-2">제출 완료!</h1>
                <p className="text-gray-500 mb-6">답안이 성공적으로 제출되었습니다</p>

                {/* 제출 정보 카드 */}
                <div className="bg-blue-50 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-sm font-semibold">
                            {result.subject}
                        </span>
                        <span className="text-gray-600">{result.examTitle}</span>
                    </div>

                    <div className="text-4xl mb-2">📝</div>

                    <div className="text-gray-700 font-medium">
                        총 {result.totalQuestions}문항 제출
                    </div>

                    {/* 서술형 안내 */}
                    {result.hasEssay && (
                        <div className="mt-3 text-sm text-gray-500">
                            (서술형 {result.essayCount}문항 포함)
                        </div>
                    )}
                </div>

                {/* 안내 메시지 */}
                <div className="p-4 bg-yellow-50 rounded-xl mb-6 text-left">
                    <p className="text-yellow-800 font-medium mb-2">📌 안내</p>
                    <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• 선생님이 채점 후 점수를 확인할 수 있습니다</li>
                        <li>• 제출 후에는 수정이 불가능합니다</li>
                    </ul>
                </div>

                <button
                    onClick={onRestart}
                    className="w-full py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold text-lg hover:bg-gray-300 transition-colors"
                >
                    처음으로 돌아가기
                </button>
            </div>
        </div>
    )
}

export default SubmitComplete
