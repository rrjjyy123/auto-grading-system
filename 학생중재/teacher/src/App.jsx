import { useState, useEffect } from 'react'
import { initializeSupabase, onAuthStateChange, getCurrentUser } from './lib/supabase'
import LoginScreen from './components/LoginScreen'
import TeacherDashboard from './components/TeacherDashboard'
import SessionDetail from './components/SessionDetail'

function App() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [screen, setScreen] = useState('dashboard') // 'dashboard' or 'session'
    const [selectedSession, setSelectedSession] = useState(null)

    useEffect(() => {
        initializeSupabase()

        // 현재 사용자 확인
        const checkUser = async () => {
            const currentUser = await getCurrentUser()
            setUser(currentUser)
            setLoading(false)
        }
        checkUser()

        // 인증 상태 변화 리스너
        const unsubscribe = onAuthStateChange((event, session) => {
            setUser(session?.user || null)
            if (!session?.user) {
                setScreen('dashboard')
                setSelectedSession(null)
            }
        })

        return () => unsubscribe()
    }, [])

    const handleViewSession = (session) => {
        setSelectedSession(session)
        setScreen('session')
    }

    const handleBackToDashboard = () => {
        setScreen('dashboard')
        setSelectedSession(null)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-warm-yellow flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">로딩중...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return <LoginScreen />
    }

    return (
        <div className="min-h-screen bg-warm-yellow">
            {screen === 'dashboard' ? (
                <TeacherDashboard
                    user={user}
                    onViewSession={handleViewSession}
                />
            ) : (
                <SessionDetail
                    session={selectedSession}
                    onBack={handleBackToDashboard}
                />
            )}
        </div>
    )
}

export default App
