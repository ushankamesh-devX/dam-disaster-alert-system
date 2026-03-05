import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            {/* ───── Left side — Hero image + text overlay (desktop only) ───── */}
            <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
                {/* Background image */}
                <img
                    src="https://i2.wp.com/amazinglanka.com/wp/wp-content/uploads/2016/09/IMG-20110419-00085.jpg?ssl=1"
                    alt="Dam aerial view"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-blue-950/70 to-slate-900/30" />

                {/* Floating content */}
                <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
                    {/* Top — Logo */}
                    <div className="flex items-center gap-3">
                        <img src="/ddas-icon.png" alt="DDAS Logo" className="w-10 h-10 rounded-xl shadow-lg shadow-blue-600/30" />
                        <span className="text-white font-bold text-lg tracking-wide">DDAS</span>
                    </div>

                    {/* Bottom — Headline + stats */}
                    <div>
                        <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4">
                            Dam Disaster<br />Alert System
                        </h1>
                        <p className="text-blue-200/80 text-base xl:text-lg max-w-lg leading-relaxed">
                            Real-time monitoring and early warning system protecting communities across Sri Lanka with instant alerts and live sensor data.
                        </p>

                        {/* Status pills */}
                        <div className="flex flex-wrap items-center gap-4 mt-8">
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
                                </span>
                                <span className="text-sm text-white/90 font-medium">Live Monitoring</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                                <span className="text-sm text-white/90 font-medium">24/7 Alerts</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                                <span className="text-sm text-white/90 font-medium">Multi-Region</span>
                            </div>
                        </div>

                        <p className="text-slate-400 text-xs mt-10">© {new Date().getFullYear()} DDAS — Dam Disaster Alert System</p>
                    </div>
                </div>
            </div>

            {/* ───── Right side — Form (white bg) ───── */}
            <div className="flex-1 bg-white flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-20">
                <div className="w-full max-w-[420px]">
                    {/* Mobile-only branding header */}
                    <div className="lg:hidden text-center mb-8">
                        <img src="/ddas-icon.png" alt="DDAS Logo" className="w-12 h-12 rounded-2xl mb-3 shadow-lg shadow-blue-600/25 mx-auto" />
                        <h1 className="text-xl font-bold text-gray-900">DDAS</h1>
                        <p className="text-gray-500 text-xs mt-0.5">Dam Disaster Alert System</p>
                    </div>

                    {/* Page content (Login / Register form) */}
                    <Outlet />

                    {/* Mobile-only footer */}
                    <p className="lg:hidden text-center text-gray-400 text-xs mt-8">
                        © {new Date().getFullYear()} DDAS
                    </p>
                </div>
            </div>
        </div>
    );
}
