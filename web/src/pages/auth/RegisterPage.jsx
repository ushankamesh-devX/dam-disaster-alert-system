import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { register } from '../../services/auth.service';

export default function RegisterPage() {
    const { setAuth } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ fullName: '', email: '', phoneNumber: '', password: '', confirmPassword: '', languagePreference: 'en' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.fullName || !form.email || !form.password) { setError('Please fill in all required fields.'); return; }
        if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
        setLoading(true);
        try {
            const data = await register({ fullName: form.fullName, email: form.email, phoneNumber: form.phoneNumber || undefined, password: form.password, languagePreference: form.languagePreference });
            setAuth(data.token, data.user);
            navigate(data.user?.role?.code === 'ADMIN' ? '/admin/dashboard' : '/home', { replace: true });
        } catch (err) {
            setError(err?.response?.data?.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Desktop heading */}
            <div className="hidden lg:block mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
                <p className="text-gray-500 mt-1">Join the Dam Disaster Alert System</p>
            </div>
            {/* Mobile heading */}
            <div className="lg:hidden mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-0.5">Create account</h2>
                <p className="text-sm text-gray-500">Join the DAM Disaster Alert System</p>
            </div>

            {error && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                {/* Two-column row for name & email on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name *</label>
                        <input type="text" name="fullName" value={form.fullName} onChange={handle} placeholder="John Doe"
                            className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                        <input type="email" name="email" value={form.email} onChange={handle} placeholder="you@example.com"
                            className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                </div>

                {/* Two-column row for phone & language */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone (optional)</label>
                        <input type="tel" name="phoneNumber" value={form.phoneNumber} onChange={handle} placeholder="+94771234567"
                            className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
                        <select name="languagePreference" value={form.languagePreference} onChange={handle}
                            className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
                            <option value="en">English</option>
                            <option value="si">සිංහල</option>
                            <option value="ta">தமிழ்</option>
                        </select>
                    </div>
                </div>

                {/* Two-column row for passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                        <input type="password" name="password" value={form.password} onChange={handle} placeholder="Min. 8 characters"
                            className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password *</label>
                        <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handle} placeholder="Repeat password"
                            className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                </div>

                <button type="submit" disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-600/25 hover:shadow-md hover:shadow-blue-600/25 mt-1">
                    {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {loading ? 'Creating account…' : 'Create account'}
                </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{' '}<Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
            </p>
        </div>
    );
}
