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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-auto animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-3xl p-8 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-8 print:hidden flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                            <span className="p-2 bg-indigo-50 rounded-xl text-primary text-xl">📱</span>
                            {classData.name} 학생 코드 배포
                        </h2>
                        <p className="text-gray-500 font-medium mt-1 ml-1">총 {studentCodes.length}명의 학생 코드가 생성되었습니다.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handlePrint}
                            className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <span>🖨️</span> 인쇄하기
                        </button>
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            닫기
                        </button>
                    </div>
                </div>

                {/* QR 카드 그리드 */}
                <div className="flex-1 overflow-auto pr-2 pb-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4">
                        {studentCodes.map((student) => (
                            <div
                                key={student.id}
                                className="border-2 border-gray-100 rounded-2xl p-6 text-center bg-white hover:border-primary/30 hover:shadow-lg transition-all group print:border-gray-200 print:shadow-none print:break-inside-avoid"
                            >
                                <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">{classData.name}</div>
                                <div className="text-3xl font-black text-primary mb-4 group-hover:scale-110 transition-transform inline-block">
                                    {student.studentNumber}번
                                </div>
                                <div className="flex justify-center mb-4 p-2 bg-white rounded-xl">
                                    <QRCodeSVG
                                        value={getQRUrl(student.code)}
                                        size={120}
                                        level="M"
                                        includeMargin={false}
                                        className="group-hover:opacity-90 transition-opacity"
                                    />
                                </div>
                                <div className="bg-gray-50 py-2 rounded-lg mb-2 group-hover:bg-indigo-50 transition-colors">
                                    <div className="text-xl font-mono font-black text-gray-800 tracking-widest group-hover:text-primary transition-colors">
                                        {student.code}
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-400 font-bold">
                                    카메라로 스캔하거나 코드를 입력하세요
                                </div>
                            </div>
                        ))}
                    </div>
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
              height: auto;
              background: white;
              padding: 20px;
              box-shadow: none;
              border: none;
            }
            .fixed > div * { visibility: visible; }
            .print\\:hidden { display: none !important; }
            button { display: none !important; }
            /* 인쇄 시 배경 그래픽 포함 설정은 브라우저 설정에 따라 다름 */
          }
        `}</style>
            </div>
        </div>
    )
}

export default QRGenerator
