import { useState, useEffect } from 'react'
import { validateStudentCode } from '../lib/firebase'

function CodeEntry({ onValidated }) {
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // URL에서 코드 파라미터 자동 처리
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const codeParam = params.get('code')
        if (codeParam && codeParam.length === 6) {
            setCode(codeParam)
            handleValidate(codeParam)
        }
    }, [])

    const handleValidate = async (codeToValidate) => {
        const trimmedCode = (codeToValidate || code).trim()

        if (trimmedCode.length !== 6) {
            setError('6자리 코드를 입력하세요')
            return
        }

        if (!/^\d{6}$/.test(trimmedCode)) {
            setError('숫자 6자리를 입력하세요')
            return
        }

        setLoading(true)
        setError('')

        const { valid, data, error: validateError } = await validateStudentCode(trimmedCode)

        setLoading(false)

        if (valid && data) {
            onValidated(data)
        } else {
            setError(validateError || '코드 확인에 실패했습니다')
        }
    }

    const handleCodeChange = (e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6)
        setCode(value)
        setError('')
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleValidate()
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">시험 응시</h1>
                    <p className="text-gray-500">배부받은 코드를 입력하세요</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">학생 코드</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={code}
                            onChange={handleCodeChange}
                            onKeyPress={handleKeyPress}
                            placeholder="6자리 숫자 입력"
                            className="w-full px-4 py-4 text-center text-2xl font-mono font-bold tracking-[0.5em] border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                            maxLength={6}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-center text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={() => handleValidate()}
                        disabled={loading || code.length !== 6}
                        className="w-full py-4 bg-blue-500 text-white rounded-xl font-semibold text-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                확인 중...
                            </span>
                        ) : '확인'}
                    </button>
                </div>

                <p className="text-center text-sm text-gray-400 mt-6">
                    QR코드를 스캔하면 자동으로 코드가 입력됩니다
                </p>
            </div>
        </div>
    )
}

export default CodeEntry
