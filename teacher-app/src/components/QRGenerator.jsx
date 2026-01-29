import { QRCodeSVG } from 'qrcode.react'

function QRGenerator({ classData, studentCodes, onClose }) {
    // 학생용 앱 URL (배포 후 변경 필요)
    const studentAppUrl = import.meta.env.VITE_STUDENT_APP_URL || 'http://localhost:5174'

    const getQRUrl = (code) => {
        return `${studentAppUrl}?code=${code}`
    }

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-auto">
            <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-auto">
                <div className="flex items-center justify-between mb-6 print:hidden">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">{classData.name} QR 코드</h2>
                        <p className="text-gray-500">총 {studentCodes.length}명의 학생 코드</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                        >
                            🖨️ 인쇄하기
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                        >
                            닫기
                        </button>
                    </div>
                </div>

                {/* QR 카드 그리드 */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
                    {studentCodes.map((student) => (
                        <div
                            key={student.id}
                            className="border-2 border-gray-200 rounded-xl p-4 text-center bg-white print:border print:rounded-lg print:p-2"
                        >
                            <div className="text-sm font-semibold text-gray-500 mb-1">{classData.name}</div>
                            <div className="text-2xl font-bold text-blue-600 mb-2">{student.studentNumber}번</div>
                            <div className="flex justify-center mb-2">
                                <QRCodeSVG
                                    value={getQRUrl(student.code)}
                                    size={100}
                                    level="M"
                                    includeMargin={false}
                                />
                            </div>
                            <div className="text-lg font-mono font-bold text-gray-800 tracking-wider">
                                {student.code}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                                QR스캔 또는 코드입력
                            </div>
                        </div>
                    ))}
                </div>

                {/* 인쇄용 스타일 */}
                <style>{`
          @media print {
            body * { visibility: hidden; }
            .fixed { position: absolute !important; }
            .fixed > div { 
              visibility: visible !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
              padding: 10px;
            }
            .fixed > div * { visibility: visible; }
            .print\\:hidden { display: none !important; }
          }
        `}</style>
            </div>
        </div>
    )
}

export default QRGenerator
