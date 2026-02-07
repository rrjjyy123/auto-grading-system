function UsageGuide() {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-2">
                    <span>📖</span>
                    사용 안내
                </h1>
                <p className="text-gray-500">자동채점 시스템 사용 방법을 안내합니다.</p>
            </div>

            {/* 시작하기 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                    시작하기
                </h2>

                <div className="space-y-4">
                    <div className="bg-blue-50 rounded-xl p-4">
                        <h3 className="font-semibold text-blue-800 mb-2">🏫 학급 생성</h3>
                        <ol className="list-decimal list-inside text-gray-700 space-y-1 text-sm">
                            <li><strong>"+ 새 학급 만들기"</strong> 버튼을 클릭합니다.</li>
                            <li>학급 이름을 입력합니다. (예: 사랑반, 행복반)</li>
                            <li>학생 수를 입력하면 자동으로 학생 코드가 생성됩니다.</li>
                        </ol>
                        <div className="mt-3 p-2 bg-yellow-100 rounded-lg text-xs text-yellow-800">
                            ⚠️ <strong>주의:</strong> 학교명, 학년, 반 대신 <strong>가칭(별명)</strong>을 사용해주세요.
                        </div>
                    </div>

                    <div className="bg-purple-50 rounded-xl p-4">
                        <h3 className="font-semibold text-purple-800 mb-2">📱 학생 코드 배포</h3>
                        <ol className="list-decimal list-inside text-gray-700 space-y-1 text-sm">
                            <li>학급 목록에서 <strong>"QR 코드"</strong> 버튼을 클릭합니다.</li>
                            <li>학생별 고유 코드를 확인하고 배포합니다.</li>
                            <li>학생들은 코드를 입력해 시험에 참여합니다.</li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* 시험 만들기 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    시험 만들기
                </h2>

                <div className="space-y-4">
                    <div className="bg-green-50 rounded-xl p-4">
                        <h3 className="font-semibold text-green-800 mb-2">📝 정답 입력 방법</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-green-200">
                                    <th className="text-left py-2 text-green-700">문항 유형</th>
                                    <th className="text-left py-2 text-green-700">입력 예시</th>
                                    <th className="text-left py-2 text-green-700">설명</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-700">
                                <tr className="border-b border-green-100">
                                    <td className="py-2">객관식 (5지선다)</td>
                                    <td className="py-2 font-mono">①, ③, 1, 3</td>
                                    <td className="py-2">원문자 또는 숫자</td>
                                </tr>
                                <tr className="border-b border-green-100">
                                    <td className="py-2">O/X</td>
                                    <td className="py-2 font-mono">O, X, ○, ×</td>
                                    <td className="py-2">자동 인식</td>
                                </tr>
                                <tr className="border-b border-green-100">
                                    <td className="py-2">단답형</td>
                                    <td className="py-2 font-mono">ㄴ, ㄷ 또는 서울</td>
                                    <td className="py-2">쉼표로 복수정답 구분</td>
                                </tr>
                                <tr>
                                    <td className="py-2">서술형</td>
                                    <td className="py-2 font-mono">풀이 참조, 서술형</td>
                                    <td className="py-2">키워드로 자동 인식</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-orange-50 rounded-xl p-4">
                        <h3 className="font-semibold text-orange-800 mb-2">🎯 복수 정답 설정</h3>
                        <ul className="text-gray-700 space-y-1 text-sm">
                            <li>• 정답 입력 시 쉼표(,)로 구분: <code className="bg-orange-100 px-1 rounded">1, 3</code></li>
                            <li>• <strong>AND</strong>: 모든 정답을 맞춰야 정답</li>
                            <li>• <strong>OR</strong>: 하나만 맞아도 정답</li>
                        </ul>
                    </div>

                    <div className="bg-indigo-50 rounded-xl p-4">
                        <h3 className="font-semibold text-indigo-800 mb-2">⚙️ 배점 및 영역 설정</h3>
                        <ul className="text-gray-700 space-y-1 text-sm">
                            <li>• 각 문항별로 배점을 설정할 수 있습니다.</li>
                            <li>• 기본값은 문항당 1점입니다.</li>
                            <li>• 영역/단원별 분류를 설정하면 <strong>레이더 차트</strong>로 영역별 성취도를 분석할 수 있습니다.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* 채점 및 결과 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <span className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                    채점 및 결과 확인
                </h2>

                <div className="space-y-4">
                    <div className="bg-red-50 rounded-xl p-4">
                        <h3 className="font-semibold text-red-800 mb-2">✅ 자동 채점</h3>
                        <ul className="text-gray-700 space-y-1 text-sm">
                            <li>• 객관식, O/X, 단답형은 <strong>자동 채점</strong>됩니다.</li>
                            <li>• 학생이 제출하면 즉시 점수가 계산됩니다.</li>
                        </ul>
                    </div>

                    <div className="bg-pink-50 rounded-xl p-4">
                        <h3 className="font-semibold text-pink-800 mb-2">✍️ 서술형 수동 채점</h3>
                        <ul className="text-gray-700 space-y-1 text-sm">
                            <li>• 서술형 문항은 교사가 직접 채점합니다.</li>
                            <li>• 결과 페이지에서 학생별 답안을 확인하고 점수를 입력합니다.</li>
                        </ul>
                    </div>

                    <div className="bg-cyan-50 rounded-xl p-4">
                        <h3 className="font-semibold text-cyan-800 mb-2">📊 결과 분석</h3>
                        <ul className="text-gray-700 space-y-1 text-sm">
                            <li>• <strong>문항별 정답률</strong>: 각 문항의 정답률을 확인합니다.</li>
                            <li>• <strong>학생별 성적</strong>: 개별 학생의 점수와 답안을 확인합니다.</li>
                            <li>• <strong>영역별 레이더 차트</strong>: 영역(단원)별 성취도를 시각적으로 분석합니다.</li>
                            <li>• <strong>엑셀 내보내기</strong>: 성적 데이터를 다운로드합니다.</li>
                        </ul>
                    </div>

                    <div className="bg-emerald-50 rounded-xl p-4">
                        <h3 className="font-semibold text-emerald-800 mb-2">📤 학생에게 결과 전송</h3>
                        <ul className="text-gray-700 space-y-1 text-sm">
                            <li>• <strong>"결과 공개"</strong> 설정을 켜면 학생이 자신의 결과를 확인할 수 있습니다.</li>
                            <li>• 학생에게 전송되는 정보:</li>
                            <li className="ml-4">📊 총점 및 문항별 정오답</li>
                            <li className="ml-4">📝 정답 및 해설 (설정 시)</li>
                            <li className="ml-4">📈 영역별 레이더 차트</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* 팁 */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-lg p-6 text-white">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                    <span>💡</span>
                    유용한 팁
                </h2>
                <ul className="space-y-2 text-sm">
                    <li>• <strong>"재응시 허용"</strong> 설정으로 학생들이 다시 풀 수 있게 할 수 있습니다.</li>
                    <li>• 영역(단원)을 설정하면 학생별로 취약 영역을 파악할 수 있습니다.</li>
                    <li>• 결과 공개 전에 서술형 채점을 완료해주세요.</li>
                </ul>
            </div>
        </div>
    )
}

export default UsageGuide
