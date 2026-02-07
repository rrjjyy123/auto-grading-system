import { useState, useEffect } from 'react'
import { onAuthChange, signInWithGoogle, signOut } from './lib/firebase'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import { ToastProvider } from './components/Toast'
import './index.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8E7] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">로딩중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onLogin={signInWithGoogle} />
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#FFF8E7]">
        <Dashboard user={user} onLogout={signOut} />
      </div>
    </ToastProvider>
  )
}

export default App
