import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
            </div>
            <div className="relative w-full max-w-sm">
                <div className="text-center mb-6">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 mb-3 shadow-lg shadow-blue-500/30">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </span>
                    <h1 className="text-xl font-bold text-white">DDAS</h1>
                    <p className="text-slate-400 text-xs mt-0.5">Dam Disaster Alert System</p>
                </div>
                <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-7">
                    <Outlet />
                </div>
                <p className="text-center text-slate-600 text-xs mt-5">© {new Date().getFullYear()} DDAS</p>
            </div>
        </div>
    );
}
