import { useState } from 'react'
import { signInWithGoogle } from '../lib/supabase'

function LoginScreen() {
    const [privacyAgreed, setPrivacyAgreed] = useState(false)
    const [showPrivacyModal, setShowPrivacyModal] = useState(false)

    const handleGoogleLogin = async () => {
        if (!privacyAgreed) {
            alert('개인정보 처리방침에 동의해주세요.')
            return
        }

        const { error } = await signInWithGoogle()
        if (error) {
            console.error('Login error:', error)
            alert('로그인에 실패했습니다. 다시 시도해주세요.')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md animate-fade-in text-center">
                {/* 헤더 */}
                <div className="mb-8">
                    <div className="text-6xl mb-4">🌱</div>
                    <h1 className="text-3xl text-green-600 mb-2">관계 회복 대화 모임</h1>
                    <p className="text-gray-500 text-lg">
                        교사용 관리 페이지
                    </p>
                </div>

                {/* 주요 기능 */}
                <div className="bg-green-50 rounded-xl p-4 mb-6 text-left">
                    <h3 className="font-bold text-green-700 mb-2">🌟 주요 기능</h3>
                    <ul className="text-gray-600 text-sm space-y-1">
                        <li>✓ 학급 코드 생성 및 관리</li>
                        <li>✓ 학생 대화 기록 조회</li>
                        <li>✓ AI 갈등 조정 (회복적 생활교육 기반 중립적 조정)</li>
                        <li>✓ AI 자동 요약 (갈등 원인, 감정 변화, 해결 현황)</li>
                    </ul>
                </div>

                {/* 개인정보 처리방침 동의 */}
                <div className="mb-4">
                    <label className="flex items-center justify-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={privacyAgreed}
                            onChange={(e) => setPrivacyAgreed(e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-green-500 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-600">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setShowPrivacyModal(true)
                                }}
                                className="text-blue-600 underline hover:text-blue-800"
                            >
                                개인정보 처리방침
                            </button>
                            에 동의합니다
                        </span>
                    </label>
                </div>

                {/* 로그인 버튼 */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={!privacyAgreed}
                    className={`w-full py-4 px-6 border-2 rounded-xl flex items-center justify-center gap-3 font-medium text-lg shadow-sm transition-all
                        ${privacyAgreed
                            ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:shadow cursor-pointer'
                            : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill={privacyAgreed ? "#4285F4" : "#9CA3AF"} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill={privacyAgreed ? "#34A853" : "#9CA3AF"} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill={privacyAgreed ? "#FBBC05" : "#9CA3AF"} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill={privacyAgreed ? "#EA4335" : "#9CA3AF"} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google 계정으로 로그인
                </button>

                <p className="text-gray-400 text-sm mt-6">
                    교사 계정으로 로그인하면 학급을 관리할 수 있습니다.
                </p>
            </div>

            {/* 개인정보 처리방침 모달 */}
            {showPrivacyModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-xl animate-fade-in">
                        {/* 모달 헤더 */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-700">📋 개인정보 처리방침</h2>
                            <button
                                onClick={() => setShowPrivacyModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                            >
                                ✕
                            </button>
                        </div>

                        {/* 모달 내용 */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] text-left prose prose-sm max-w-none">
                            <h1 className="text-2xl font-bold text-gray-800 mb-2">개인정보 처리방침</h1>
                            <p className="text-gray-600 mb-1"><strong>관계 회복 대화 모임</strong></p>
                            <p className="text-gray-500 mb-6"><strong>시행일: 2025년 12월 31일</strong></p>

                            <hr className="my-4" />

                            <h2 className="text-lg font-bold text-gray-700 mt-6 mb-3">서문</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                「관계 회복 대화 모임」(이하 "본 서비스") 운영자(이하 "운영자")는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
                            </p>

                            <hr className="my-4" />

                            <h2 className="text-lg font-bold text-gray-700 mt-6 mb-3">제1조 (개인정보의 처리 목적)</h2>
                            <p className="text-sm text-gray-600 mb-2">
                                운영자는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행합니다.
                            </p>
                            <ol className="text-sm text-gray-600 list-decimal list-inside mb-4">
                                <li><strong>서비스 제공</strong>: 학생 간 갈등 상황에서 AI 기반 회복적 생활교육 중재 대화 지원</li>
                                <li><strong>교사 계정 관리</strong>: Google 계정을 통한 교사 인증 및 학급 관리</li>
                                <li><strong>대화 기록 관리</strong>: 학생들의 대화 내용 저장 및 교사의 후속 지도 지원</li>
                            </ol>

                            <hr className="my-4" />

                            <h2 className="text-lg font-bold text-gray-700 mt-6 mb-3">제2조 (개인정보의 처리 및 보유 기간)</h2>
                            <p className="text-sm text-gray-600 mb-2">
                                1. 운영자는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 동의받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.
                            </p>
                            <p className="text-sm text-gray-600 mb-2">2. 각각의 개인정보 보유 기간은 다음과 같습니다.</p>
                            <table className="w-full text-sm border-collapse border border-gray-300 mb-4">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 px-3 py-2 text-left">구분</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">보유 기간</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">파기 시점</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600">
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">교사 계정 정보</td>
                                        <td className="border border-gray-300 px-3 py-2">서비스 이용 기간</td>
                                        <td className="border border-gray-300 px-3 py-2">회원 탈퇴 시 또는 서비스 종료 시</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">학급 정보</td>
                                        <td className="border border-gray-300 px-3 py-2">교사가 삭제할 때까지</td>
                                        <td className="border border-gray-300 px-3 py-2">교사의 삭제 요청 시</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">대화 기록</td>
                                        <td className="border border-gray-300 px-3 py-2">교사가 삭제할 때까지</td>
                                        <td className="border border-gray-300 px-3 py-2">교사의 삭제 요청 시 또는 학급 삭제 시</td>
                                    </tr>
                                </tbody>
                            </table>

                            <hr className="my-4" />

                            <h2 className="text-lg font-bold text-gray-700 mt-6 mb-3">제3조 (처리하는 개인정보의 항목)</h2>
                            <p className="text-sm text-gray-600 mb-3">운영자는 서비스 제공을 위해 필요 최소한의 개인정보만을 수집합니다.</p>

                            <h3 className="text-base font-semibold text-gray-700 mb-2">가. 교사용 앱 (회원가입 및 로그인)</h3>
                            <table className="w-full text-sm border-collapse border border-gray-300 mb-4">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 px-3 py-2 text-left">항목</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">수집 방법</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">필수 여부</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600">
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">Google 계정 ID</td>
                                        <td className="border border-gray-300 px-3 py-2">Google OAuth 로그인</td>
                                        <td className="border border-gray-300 px-3 py-2">필수</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">이메일 주소</td>
                                        <td className="border border-gray-300 px-3 py-2">Google OAuth 로그인</td>
                                        <td className="border border-gray-300 px-3 py-2">필수</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">이름</td>
                                        <td className="border border-gray-300 px-3 py-2">Google OAuth 로그인</td>
                                        <td className="border border-gray-300 px-3 py-2">필수</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h3 className="text-base font-semibold text-gray-700 mb-2">나. 학급 정보</h3>
                            <table className="w-full text-sm border-collapse border border-gray-300 mb-4">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 px-3 py-2 text-left">항목</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">입력 주체</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">비고</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600">
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">학급명</td>
                                        <td className="border border-gray-300 px-3 py-2">교사</td>
                                        <td className="border border-gray-300 px-3 py-2"><strong>가칭 사용 필수 또는 입력 안 함</strong></td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">학급 코드</td>
                                        <td className="border border-gray-300 px-3 py-2">자동 생성</td>
                                        <td className="border border-gray-300 px-3 py-2">6자리 랜덤 코드</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h3 className="text-base font-semibold text-gray-700 mb-2">다. 대화 기록</h3>
                            <table className="w-full text-sm border-collapse border border-gray-300 mb-4">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 px-3 py-2 text-left">항목</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">입력 주체</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">비고</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600">
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">참여자 이름</td>
                                        <td className="border border-gray-300 px-3 py-2">학생</td>
                                        <td className="border border-gray-300 px-3 py-2"><strong>가칭(별명) 사용 권장</strong></td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">대화 내용</td>
                                        <td className="border border-gray-300 px-3 py-2">학생</td>
                                        <td className="border border-gray-300 px-3 py-2">텍스트 및 음성 입력</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">AI 요약</td>
                                        <td className="border border-gray-300 px-3 py-2">자동 생성</td>
                                        <td className="border border-gray-300 px-3 py-2">Gemini AI 생성</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">해결 상태</td>
                                        <td className="border border-gray-300 px-3 py-2">학생</td>
                                        <td className="border border-gray-300 px-3 py-2">해결됨/미해결</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">교사 메모</td>
                                        <td className="border border-gray-300 px-3 py-2">교사</td>
                                        <td className="border border-gray-300 px-3 py-2">후속 조치 기록</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                                <p className="text-sm text-yellow-800">
                                    <strong>⚠️ 중요 안내:</strong> '관계 회복 대화 모임' 웹서비스를 통하여 등록하는 '학급명, 참여자 이름'은 모두 이용자가 임의로 기재할 수 있는 내용이나 기재하는 내용에 따라 개인이 식별될 수 있으므로 가칭 등의 이용을 권장합니다.
                                </p>
                            </div>

                            <hr className="my-4" />

                            <h2 className="text-lg font-bold text-gray-700 mt-6 mb-3">제4조 (만 14세 미만 아동의 개인정보 처리)</h2>

                            <h3 className="text-base font-semibold text-gray-700 mb-2">1. 원칙</h3>
                            <p className="text-sm text-gray-600 mb-3">
                                「개인정보 보호법」 제22조의2에 따라, 만 14세 미만 아동의 개인정보를 처리하기 위해서는 법정대리인의 동의가 필요합니다.
                            </p>

                            <h3 className="text-base font-semibold text-gray-700 mb-2">2. 비식별화(Anonymous) 운영 정책</h3>
                            <p className="text-sm text-gray-600 mb-3">
                                본 서비스는 법정대리인 동의 절차 없이 서비스를 편리하게 이용할 수 있도록, <strong>아동 식별이 불가능한 비식별 정보로만 운영</strong>하는 것을 원칙으로 합니다.
                            </p>
                            <p className="text-sm text-gray-600 mb-3">
                                「개인정보 보호법」 제2조제1호에 따르면, <strong>"다른 정보와 결합하여도 특정 개인을 알아볼 수 없는 정보"</strong>는 개인정보에 해당하지 않습니다.
                            </p>

                            <h3 className="text-base font-semibold text-gray-700 mb-2">3. 입력 가이드</h3>
                            <table className="w-full text-sm border-collapse border border-gray-300 mb-4">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 px-3 py-2 text-left">구분</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">권장 예시</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">지양 예시</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600">
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">학급명</td>
                                        <td className="border border-gray-300 px-3 py-2">사랑반, 행복한 교실, 평화반</td>
                                        <td className="border border-gray-300 px-3 py-2">서울OO초 4학년 2반, OO초등학교</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">학생 이름</td>
                                        <td className="border border-gray-300 px-3 py-2">닉네임, 가명</td>
                                        <td className="border border-gray-300 px-3 py-2">실명</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h3 className="text-base font-semibold text-gray-700 mb-2">4. 교사의 책임</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                교사는 학급 생성 및 학생 안내 시 위의 입력 가이드를 준수하여 학생의 개인정보가 수집되지 않도록 주의해야 합니다.
                            </p>

                            <hr className="my-4" />

                            <h2 className="text-lg font-bold text-gray-700 mt-6 mb-3">제5조 (개인정보의 제3자 제공)</h2>
                            <p className="text-sm text-gray-600 mb-2">
                                운영자는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 사전 동의 없이 제3자에게 제공하지 않습니다.
                            </p>
                            <p className="text-sm text-gray-600 mb-4">
                                단, 다음의 경우에는 예외로 합니다:
                            </p>
                            <ul className="text-sm text-gray-600 list-disc list-inside mb-4">
                                <li>법령에 의하여 요구되는 경우</li>
                            </ul>

                            <hr className="my-4" />

                            <h2 className="text-lg font-bold text-gray-700 mt-6 mb-3">제6조 (개인정보 처리의 위탁)</h2>
                            <p className="text-sm text-gray-600 mb-3">
                                운영자는 원활한 서비스 제공을 위하여 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.
                            </p>
                            <table className="w-full text-sm border-collapse border border-gray-300 mb-4">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 px-3 py-2 text-left">수탁자</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">위탁 업무</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">보유 및 이용 기간</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600">
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">Google LLC (Gemini API)</td>
                                        <td className="border border-gray-300 px-3 py-2">AI 대화 처리 및 요약 생성</td>
                                        <td className="border border-gray-300 px-3 py-2">처리 완료 시까지</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">Supabase Inc.</td>
                                        <td className="border border-gray-300 px-3 py-2">클라우드 데이터 저장 및 관리</td>
                                        <td className="border border-gray-300 px-3 py-2">서비스 이용 기간</td>
                                    </tr>
                                </tbody>
                            </table>

                            <hr className="my-4" />

                            <h2 className="text-lg font-bold text-gray-700 mt-6 mb-3">제7조 (개인정보의 파기 절차 및 방법)</h2>

                            <h3 className="text-base font-semibold text-gray-700 mb-2">1. 파기 절차</h3>
                            <p className="text-sm text-gray-600 mb-3">
                                운영자는 개인정보의 보유 기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 해당 개인정보를 파기합니다.
                            </p>

                            <h3 className="text-base font-semibold text-gray-700 mb-2">2. 파기 방법</h3>
                            <ul className="text-sm text-gray-600 list-disc list-inside mb-4">
                                <li><strong>전자적 파일 형태</strong>: 복구 및 재생이 불가능한 방법으로 영구 삭제</li>
                                <li><strong>기록, 인쇄물 등</strong>: 해당 사항 없음 (전자적 파일로만 저장)</li>
                            </ul>

                            <hr className="my-4" />

                            <h2 className="text-lg font-bold text-gray-700 mt-6 mb-3">제8조 (정보주체의 권리 및 행사 방법)</h2>
                            <p className="text-sm text-gray-600 mb-2">
                                정보주체는 다음의 방법으로 개인정보에 대한 권리를 행사할 수 있습니다.
                            </p>
                            <ol className="text-sm text-gray-600 list-decimal list-inside mb-3">
                                <li><strong>열람 및 삭제</strong>: 교사는 서비스 내에서 학급 및 대화 기록을 직접 열람하고 삭제할 수 있습니다.</li>
                                <li><strong>계정 삭제</strong>: Google 계정 연동 해제를 통해 서비스 이용을 중단할 수 있습니다.</li>
                            </ol>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                <p className="text-sm text-blue-800">
                                    💡 본 서비스는 사용자가 직접 데이터를 관리하는 구조로 설계되어 있습니다. (대화 및 학급 삭제시 서버에서 데이터 삭제)
                                </p>
                            </div>

                            <hr className="my-4" />

                            <h2 className="text-lg font-bold text-gray-700 mt-6 mb-3">제9조 (개인정보의 안전성 확보 조치)</h2>
                            <p className="text-sm text-gray-600 mb-2">
                                운영자는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.
                            </p>
                            <ol className="text-sm text-gray-600 list-decimal list-inside mb-4">
                                <li><strong>접근 통제</strong>: Google OAuth를 통한 인증된 교사만 학급 및 대화 기록에 접근 가능</li>
                                <li><strong>데이터 암호화</strong>: HTTPS를 통한 데이터 전송 암호화</li>
                                <li><strong>접근 제한</strong>: 각 교사는 자신이 생성한 학급의 데이터에만 접근 가능</li>
                            </ol>

                            <hr className="my-4" />

                            <h2 className="text-lg font-bold text-gray-700 mt-6 mb-3">제10조 (개인정보 보호책임자)</h2>
                            <p className="text-sm text-gray-600 mb-2">
                                운영자는 개인정보 처리에 관한 업무를 총괄하여 책임지고, 개인정보 처리와 관련한 정보주체의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                            </p>
                            <p className="text-sm text-gray-600 mb-4">
                                <strong>개인정보 보호책임자</strong><br />
                                - 담당자: 운영자<br />
                                - 이메일: [운영자 이메일 주소]
                            </p>

                            <hr className="my-4" />

                            <h2 className="text-lg font-bold text-gray-700 mt-6 mb-3">제11조 (권익침해 구제방법)</h2>
                            <p className="text-sm text-gray-600 mb-3">
                                정보주체는 개인정보침해로 인한 구제를 받기 위하여 다음 기관에 분쟁 해결이나 상담 등을 신청할 수 있습니다.
                            </p>
                            <table className="w-full text-sm border-collapse border border-gray-300 mb-4">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 px-3 py-2 text-left">기관</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">연락처</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">홈페이지</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600">
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">개인정보분쟁조정위원회</td>
                                        <td className="border border-gray-300 px-3 py-2">(국번없이) 1833-6972</td>
                                        <td className="border border-gray-300 px-3 py-2">www.kopico.go.kr</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">개인정보침해신고센터</td>
                                        <td className="border border-gray-300 px-3 py-2">(국번없이) 118</td>
                                        <td className="border border-gray-300 px-3 py-2">privacy.kisa.or.kr</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">대검찰청 사이버수사과</td>
                                        <td className="border border-gray-300 px-3 py-2">(국번없이) 1301</td>
                                        <td className="border border-gray-300 px-3 py-2">www.spo.go.kr</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-2">경찰청 사이버안전국</td>
                                        <td className="border border-gray-300 px-3 py-2">(국번없이) 182</td>
                                        <td className="border border-gray-300 px-3 py-2">ecrm.cyber.go.kr</td>
                                    </tr>
                                </tbody>
                            </table>

                            <hr className="my-4" />

                            <h2 className="text-lg font-bold text-gray-700 mt-6 mb-3">제12조 (개인정보 처리방침의 변경)</h2>
                            <p className="text-sm text-gray-600 mb-2">
                                이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제 및 정정이 있는 경우에는 시행 7일 전부터 공지사항을 통하여 고지합니다.
                            </p>
                            <ul className="text-sm text-gray-600 list-disc list-inside mb-4">
                                <li><strong>공고일</strong>: 2025년 12월 31일</li>
                                <li><strong>시행일</strong>: 2025년 12월 31일</li>
                            </ul>

                            <hr className="my-4" />

                            <h2 className="text-lg font-bold text-gray-700 mt-6 mb-3">부칙</h2>
                            <p className="text-sm text-gray-600">
                                본 개인정보 처리방침은 2025년 12월 31일부터 시행합니다.
                            </p>
                        </div>

                        {/* 모달 푸터 */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setShowPrivacyModal(false)}
                                className="w-full py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default LoginScreen
