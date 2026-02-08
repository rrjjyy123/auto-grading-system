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
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3 pointer-events-none">
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
        const timer = setTimeout(() => setIsVisible(true), 10)
        return () => clearTimeout(timer)
    }, [])

    const styles = {
        success: {
            bg: 'bg-white border-l-4 border-emerald-500',
            text: 'text-gray-800',
            icon: 'text-emerald-500 bg-emerald-50',
            iconChar: '✓'
        },
        error: {
            bg: 'bg-white border-l-4 border-rose-500',
            text: 'text-gray-800',
            icon: 'text-rose-500 bg-rose-50',
            iconChar: '✕'
        },
        info: {
            bg: 'bg-gray-800 border-l-4 border-gray-600',
            text: 'text-white',
            icon: 'text-white bg-gray-700',
            iconChar: 'ℹ'
        }
    }[type]

    return (
        <div className={`
            flex items-center gap-4 px-5 py-4 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] 
            transform transition-all duration-500 ease-out min-w-[320px] max-w-md pointer-events-auto border border-gray-100/10
            ${styles.bg}
            ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        `}>
            <span className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-lg font-bold ${styles.icon}`}>
                {styles.iconChar}
            </span>
            <span className={`font-bold text-sm ${styles.text}`}>{message}</span>
        </div>
    )
}

export default Toast
