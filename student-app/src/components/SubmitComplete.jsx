function SubmitComplete({ result, onRestart }) {
    const percentage = Math.round((result.correctCount / result.totalQuestions) * 100)

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

                {/* 결과 카드 */}
                <div className="bg-blue-50 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-sm font-semibold">
                            {result.subject}
                        </span>
                        <span className="text-gray-600">{result.examTitle}</span>
                    </div>

                    <div className="text-5xl font-bold text-blue-600 mb-2">
                        {result.score}<span className="text-2xl text-gray-400">점</span>
                    </div>

                    <div className="text-gray-600">
                        {result.totalQuestions}문항 중
                        <span className="font-bold text-green-600"> {result.correctCount}개</span> 정답
                        <span className="text-gray-400"> ({percentage}%)</span>
                    </div>
                </div>

                {/* 성취도 바 */}
                <div className="mb-6">
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${percentage >= 80 ? 'bg-green-500' :
                                    percentage >= 60 ? 'bg-blue-500' :
                                        percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                    </div>
                </div>

                {/* 응원 메시지 */}
                <div className={`p-4 rounded-xl mb-6 ${percentage >= 80 ? 'bg-green-50 text-green-700' :
                        percentage >= 60 ? 'bg-blue-50 text-blue-700' :
                            percentage >= 40 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {percentage >= 80 ? '🎉 훌륭합니다! 최고의 결과예요!' :
                        percentage >= 60 ? '👍 잘했어요! 조금만 더 노력해봐요!' :
                            percentage >= 40 ? '💪 괜찮아요! 다음엔 더 잘할 수 있어요!' :
                                '📚 조금 더 공부가 필요해요. 화이팅!'}
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
