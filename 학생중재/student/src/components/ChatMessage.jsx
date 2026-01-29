function ChatMessage({ message }) {
    const { type, speaker, content, timestamp, color } = message
    const isAI = type === 'ai'

    // 기본 색상 (color가 없는 경우)
    const msgColor = color || { bg: 'bg-green-100', text: 'text-green-800' }

    return (
        <div
            className={`flex ${isAI ? 'justify-start' : 'justify-end'} animate-fade-in`}
        >
            <div
                className={`max-w-[80%] ${isAI ? 'order-2' : 'order-1'}`}
            >
                {/* 이름 태그 (학생만) */}
                {!isAI && (
                    <div className="text-right mb-1">
                        <span className={`text-sm font-medium px-2 py-1 rounded-full ${msgColor.bg} ${msgColor.text}`}>
                            {speaker}
                        </span>
                    </div>
                )}

                <div className="flex items-end gap-2">
                    {/* AI 아이콘 */}
                    {isAI && (
                        <div className="flex-shrink-0 w-10 h-10 bg-soft-green rounded-full flex items-center justify-center text-xl shadow-sm">
                            🌱
                        </div>
                    )}

                    {/* 말풍선 */}
                    <div
                        className={`px-4 py-3 rounded-2xl shadow-sm ${isAI
                            ? 'bg-white text-gray-700 rounded-bl-md'
                            : `${msgColor.bg} ${msgColor.text} rounded-br-md`
                            }`}
                    >
                        <p className="text-lg leading-relaxed whitespace-pre-wrap">
                            {content}
                        </p>
                    </div>
                </div>

                {/* 시간 표시 */}
                <div className={`mt-1 text-xs text-gray-400 ${isAI ? 'text-left ml-12' : 'text-right'}`}>
                    {timestamp}
                </div>
            </div>
        </div>
    )
}

export default ChatMessage
