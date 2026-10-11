import { FlatIcon as SvgIcon } from '../../components/ui/controls';
import { Typography } from '@mui/material';
import { AppInput, AppSelect, AppButton } from '../../components/ui/controls';
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
                <Typography component="h2" variant="h2" className="text-2xl font-bold text-gray-900">Create your account</Typography>
                <p className="text-gray-500 mt-1">Join the Dam Disaster Alert System</p>
            </div>
            {/* Mobile heading */}
            <div className="lg:hidden mb-6">
                <Typography component="h2" variant="h2" className="text-xl font-bold text-gray-900 mb-0.5">Create account</Typography>
                <p className="text-sm text-gray-500">Join the DAM Disaster Alert System</p>
            </div>

            {error && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    <SvgIcon aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </SvgIcon>
                    {error}
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                {/* Two-column row for name & email on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="field-RegisterPage-3141" className="block text-sm font-medium text-gray-700 mb-1.5">Full name *</label>
                        <AppInput id="field-RegisterPage-3141" type="text" name="fullName" value={form.fullName} onChange={handle} placeholder="John Doe"
                            className="w-full placeholder-gray-400" />
                    </div>
                    <div>
                        <label htmlFor="field-RegisterPage-3660" className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                        <AppInput id="field-RegisterPage-3660" type="email" name="email" value={form.email} onChange={handle} placeholder="you@example.com"
                            className="w-full placeholder-gray-400" />
                    </div>
                </div>

                {/* Two-column row for phone & language */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="field-RegisterPage-4350" className="block text-sm font-medium text-gray-700 mb-1.5">Phone (optional)</label>
                        <AppInput id="field-RegisterPage-4350" type="tel" name="phoneNumber" value={form.phoneNumber} onChange={handle} placeholder="+94771234567"
                            className="w-full placeholder-gray-400" />
                    </div>
                    <div>
                        <label htmlFor="field-RegisterPage-4879" className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
                        <AppSelect id="field-RegisterPage-4879" name="languagePreference" value={form.languagePreference} onChange={handle}
                            className="w-full">
                            <option value="en">English</option>
                            <option value="si">සිංහල</option>
                            <option value="ta">தமிழ்</option>
                        </AppSelect>
                    </div>
                </div>

                {/* Two-column row for passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="field-RegisterPage-5743" className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                        <AppInput id="field-RegisterPage-5743" type="password" name="password" value={form.password} onChange={handle} placeholder="Min. 8 characters"
                            className="w-full placeholder-gray-400" />
                    </div>
                    <div>
                        <label htmlFor="field-RegisterPage-6286" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password *</label>
                        <AppInput id="field-RegisterPage-6286" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handle} placeholder="Repeat password"
                            className="w-full placeholder-gray-400" />
                    </div>
                </div>

                <AppButton variant="contained" type="submit" disabled={loading}
                    className="w-full disabled:opacity-60 flex items-center justify-center gap-2 mt-1">
                    {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {loading ? 'Creating account…' : 'Create account'}
                </AppButton>
            </form>
            <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{' '}<Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
            </p>
        </div>
    );
}
