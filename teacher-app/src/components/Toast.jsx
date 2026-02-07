import { useState, useEffect, createContext, useContext } from 'react'

// Toast Context
const ToastContext = createContext()

export function useToast() {
    return useContext(ToastContext)
}

/**
 * 토스트 알림 Provider
 * 앱 최상위에서 감싸서 사용
 */
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const addToast = (message, type = 'info', duration = 3000) => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, duration)
    }

    const toast = {
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        info: (msg) => addToast(msg, 'info'),
    }

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <ToastContainer toasts={toasts} />
        </ToastContext.Provider>
    )
}

/**
 * 토스트 컨테이너 (우측 하단)
 */
function ToastContainer({ toasts }) {
    if (toasts.length === 0) return null

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map(toast => (
                <Toast key={toast.id} message={toast.message} type={toast.type} />
            ))}
        </div>
    )
}

/**
 * 개별 토스트 아이템
 */
function Toast({ message, type }) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // 등장 애니메이션
        setTimeout(() => setIsVisible(true), 10)
    }, [])

    const bgColor = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    }[type]

    const icon = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    }[type]

    return (
        <div className={`
            flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white min-w-[280px]
            transform transition-all duration-300
            ${bgColor}
            ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        `}>
            <span className="w-6 h-6 flex items-center justify-center bg-white/20 rounded-full text-sm font-bold">
                {icon}
            </span>
            <span className="font-medium">{message}</span>
        </div>
    )
}

export default Toast
