import { useState } from 'react'

function LoginScreen({ onLogin }) {
    const [agreedPrivacy, setAgreedPrivacy] = useState(false)
    const [showPrivacy, setShowPrivacy] = useState(false)
    const [loggingIn, setLoggingIn] = useState(false)

    const handleLogin = async () => {
        if (!agreedPrivacy) {
            alert('개인정보 처리방침에 동의해주세요.')
            return
        }
        setLoggingIn(true)
        const { error } = await onLogin()
        setLoggingIn(false)
        if (error) {
            alert('로그인에 실패했습니다: ' + error)
        }
    }

    return (
        <div className="min-h-screen bg-[#FFF8E7] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                {/* 로고 및 제목 */}
                <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-1">자동채점 시스템</h1>
                    <p className="text-gray-500">교사용 관리 페이지</p>
                </div>

                {/* 주요 기능 */}
                <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-100">
                    <div className="flex items-center gap-2 text-green-700 font-semibold mb-3">
                        <span>🌟</span>
                        <span>주요 기능</span>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>학급 코드 생성 및 관리</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>시험 생성 및 자동 채점</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>실시간 성적 확인 및 분석</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>문항별 오답률 통계</span>
                        </li>
                    </ul>
                </div>

                {/* 개인정보 동의 */}
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={agreedPrivacy}
                        onChange={(e) => setAgreedPrivacy(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">
                        <button
                            onClick={() => setShowPrivacy(true)}
                            className="text-blue-600 underline hover:text-blue-800"
                        >
                            개인정보 처리방침
                        </button>
                        에 동의합니다
                    </span>
                </label>

                {/* 로그인 버튼 */}
                <button
                    onClick={handleLogin}
                    disabled={loggingIn}
                    className={`w-full flex items-center justify-center gap-3 rounded-xl py-4 px-6 font-semibold transition-all ${agreedPrivacy
                            ? 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                            : 'bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {loggingIn ? '로그인 중...' : 'Google 계정으로 로그인'}
                </button>

                <p className="text-center text-xs text-gray-400 mt-6">
                    교사 계정으로 로그인하면 학급을 관리할 수 있습니다.
                </p>
            </div>

            {/* 개인정보 처리방침 모달 */}
            {showPrivacy && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800">개인정보 처리방침</h2>
                            <button onClick={() => setShowPrivacy(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                        </div>
                        <div className="p-6 overflow-y-auto prose prose-sm max-w-none">
                            <h3>제1조 (개인정보의 처리 목적)</h3>
                            <p>운영자는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행합니다.</p>
                            <ol>
                                <li><strong>서비스 제공</strong>: 시험 생성, 자동 채점, 성적 관리 서비스 제공</li>
                                <li><strong>교사 계정 관리</strong>: Google 계정을 통한 교사 인증 및 학급 관리</li>
                                <li><strong>성적 데이터 관리</strong>: 학생별 시험 응답 및 점수 저장</li>
                            </ol>

                            <h3>제2조 (개인정보의 처리 및 보유 기간)</h3>
                            <p>운영자는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 동의받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.</p>
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="text-left">구분</th>
                                        <th className="text-left">보유 기간</th>
                                        <th className="text-left">파기 시점</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td>교사 계정 정보</td><td>서비스 이용 기간</td><td>회원 탈퇴 시 또는 서비스 종료 시</td></tr>
                                    <tr><td>학급 정보</td><td>교사가 삭제할 때까지</td><td>교사의 삭제 요청 시</td></tr>
                                    <tr><td>시험 및 성적 데이터</td><td>교사가 삭제할 때까지</td><td>시험 삭제 시 또는 학급 삭제 시</td></tr>
                                </tbody>
                            </table>

                            <h3>제3조 (처리하는 개인정보의 항목)</h3>
                            <p>운영자는 서비스 제공을 위해 필요 최소한의 개인정보만을 수집합니다.</p>

                            <h4>가. 교사용 앱 (회원가입 및 로그인)</h4>
                            <ul className="list-disc pl-5">
                                <li>Google 계정 ID, 이메일, 이름 (Google OAuth 로그인 시 필수 수집)</li>
                            </ul>

                            <h4>나. 학급 정보</h4>
                            <ul className="list-disc pl-5">
                                <li>학급명 (교사 입력, <strong>가칭 권장</strong>)</li>
                                <li>학생 코드 (자동 생성된 6자리 랜덤 코드)</li>
                            </ul>

                            <h4>다. 시험 및 성적 데이터</h4>
                            <ul className="list-disc pl-5">
                                <li>시험 정답, 학생 응답, 채점 점수</li>
                            </ul>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 my-4">
                                <p className="text-yellow-800 font-semibold mb-1">⚠️ 중요 안내</p>
                                <p className="text-yellow-700 text-sm">
                                    본 서비스는 14세 미만 아동의 개인정보 보호를 위해 <strong>학교명, 학년, 반, 실명 등 식별 가능한 정보의 입력을 권장하지 않습니다</strong>.
                                    학급명에는 반드시 <strong>가칭(별명)</strong>을 사용해 주시기 바랍니다.
                                </p>
                            </div>

                            <h3>제4조 (만 14세 미만 아동의 개인정보 처리)</h3>
                            <p>본 서비스는 법정대리인 동의 절차 없이 서비스를 편리하게 이용할 수 있도록, <strong>아동 식별이 불가능한 비식별 정보로만 운영</strong>하는 것을 원칙으로 합니다.</p>

                            <h3>제5조 (개인정보 처리의 위탁)</h3>
                            <p>운영자는 원활한 서비스 제공을 위하여 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="text-left">수탁자</th>
                                        <th className="text-left">위탁 업무</th>
                                        <th className="text-left">보유 기간</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td>Google LLC (Firebase)</td><td>클라우드 데이터 저장 및 인증</td><td>서비스 이용 기간</td></tr>
                                </tbody>
                            </table>

                            <h3>제6조 (정보주체의 권리 및 행사 방법)</h3>
                            <ol>
                                <li><strong>열람 및 삭제</strong>: 교사는 서비스 내에서 학급 및 시험 데이터를 직접 열람하고 삭제할 수 있습니다.</li>
                                <li><strong>계정 삭제</strong>: Google 계정 연동 해제를 통해 서비스 이용을 중단할 수 있습니다.</li>
                            </ol>

                            <h3>제7조 (권익침해 구제방법)</h3>
                            <p>정보주체는 아래 기관에 분쟁 해결이나 상담 등을 신청할 수 있습니다.</p>
                            <ul className="list-disc pl-5">
                                <li>개인정보분쟁조정위원회: 1833-6972 (www.kopico.go.kr)</li>
                                <li>개인정보침해신고센터: 118 (privacy.kisa.or.kr)</li>
                            </ul>
                        </div>
                        <div className="p-4 border-t">
                            <button
                                onClick={() => { setAgreedPrivacy(true); setShowPrivacy(false); }}
                                className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600"
                            >
                                동의하고 닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default LoginScreen
