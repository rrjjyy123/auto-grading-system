function ParticipantSelector({ participants, selectedSpeaker, onSelectSpeaker, colorMap, disabled }) {
    return (
        <div className="flex flex-col gap-2 min-w-[100px]">
            <p className="text-xs text-gray-500 text-center">
                💬 화자 선택
            </p>
            <div className="flex flex-col gap-2">
                {participants.map((name, index) => {
                    const color = colorMap?.[name] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' }
                    const isSelected = selectedSpeaker === name

                    return (
                        <button
                            key={index}
                            onClick={() => onSelectSpeaker(name)}
                            disabled={disabled}
                            className={`px-4 py-3 rounded-xl text-lg transition-all transform border-2 ${disabled
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : isSelected
                                    ? `${color.bg} ${color.text} ${color.border} shadow-md scale-105 font-bold`
                                    : `bg-white ${color.text} border-gray-200 hover:${color.bg} hover:${color.border} hover:scale-102`
                                }`}
                        >
                            {name}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default ParticipantSelector
