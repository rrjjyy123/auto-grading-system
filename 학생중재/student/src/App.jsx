import { useState } from 'react'
import SetupScreen from './components/SetupScreen'
import ChatScreen from './components/ChatScreen'

function App() {
    const [screen, setScreen] = useState('setup') // 'setup' or 'chat'
    const [participants, setParticipants] = useState([])
    const [sessionCode, setSessionCode] = useState('')

    const handleStartMediation = (names, code) => {
        setParticipants(names)
        setSessionCode(code)
        setScreen('chat')
    }

    const handleRestart = () => {
        setParticipants([])
        setSessionCode('')
        setScreen('setup')
    }

    return (
        <div className="min-h-screen bg-warm-yellow">
            {screen === 'setup' ? (
                <SetupScreen onStart={handleStartMediation} />
            ) : (
                <ChatScreen
                    participants={participants}
                    sessionCode={sessionCode}
                    onRestart={handleRestart}
                />
            )}
        </div>
    )
}

export default App
