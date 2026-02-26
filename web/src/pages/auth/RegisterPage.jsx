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
            <h2 className="text-xl font-bold text-gray-900 mb-0.5">Create account</h2>
            <p className="text-sm text-gray-500 mb-5">Join the DAM Disaster Alert System</p>

            {error && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}

            <form onSubmit={submit} className="space-y-3.5">
                {[
                    { name: 'fullName', label: 'Full name *', type: 'text', placeholder: 'John Doe' },
                    { name: 'email', label: 'Email *', type: 'email', placeholder: 'you@example.com' },
                    { name: 'phoneNumber', label: 'Phone (optional)', type: 'tel', placeholder: '+94771234567' },
                    { name: 'password', label: 'Password *', type: 'password', placeholder: 'Min. 8 characters' },
                    { name: 'confirmPassword', label: 'Confirm password *', type: 'password', placeholder: 'Repeat password' },
                ].map(({ name, label, type, placeholder }) => (
                    <div key={name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                        <input type={type} name={name} value={form[name]} onChange={handle} placeholder={placeholder}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
                    </div>
                ))}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <select name="languagePreference" value={form.languagePreference} onChange={handle}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all">
                        <option value="en">English</option>
                        <option value="si">සිංහල</option>
                        <option value="ta">தமிழ்</option>
                    </select>
                </div>
                <button type="submit" disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 mt-1">
                    {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {loading ? 'Creating…' : 'Create account'}
                </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-4">
                Have an account? <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
            </p>
        </div>
    );
}
