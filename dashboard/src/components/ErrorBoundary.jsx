import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">عذراً، حدث خطأ غير متوقع</h2>
            <p className="text-slate-500 mb-6 text-sm">
              حدث خطأ أثناء تحميل هذه الصفحة. يرجى محاولة تحديث الصفحة أو العودة للرئيسية.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#c5a880] hover:bg-[#b3956d] text-white rounded-xl font-medium transition"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
