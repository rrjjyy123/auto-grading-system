import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // 다음 렌더링에서 폴백 UI가 보이도록 상태를 업데이트합니다.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // 에러 리포팅 서비스에 에러를 기록할 수도 있습니다.
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // 폴백 UI를 커스텀할 수 있습니다.
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-gray-100">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">⚠️</span>
                        </div>
                        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
                            오류가 발생했습니다
                        </h1>
                        <p className="text-gray-500 text-center mb-6">
                            죄송합니다. 예상치 못한 오류로 인해 앱을 표시할 수 없습니다.
                        </p>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 overflow-auto max-h-40 text-xs text-left font-mono text-gray-600">
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            새로고침
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
