import { FlatIcon as SvgIcon } from '../../components/ui/controls';
import { Typography } from '@mui/material';
import { AppInput, AppButton } from '../../components/ui/controls';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { login } from '../../services/auth.service';

// Roles that have access to the admin dashboard
const DASHBOARD_ROLES = ['SUPER_ADMIN', 'ADMIN', 'DAM_OPERATOR'];

export default function LoginPage() {
    const { setAuth } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPw, setShowPw] = useState(false);

    const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
        setLoading(true);
        try {
            const data = await login(form.email, form.password);
            setAuth(data.token, data.user);

            // SUPER_ADMIN, ADMIN, DAM_OPERATOR → dashboard
            // NORMAL_USER (default registration role) → home
            const roleCode = data.user?.role?.code?.toUpperCase();
            const destination = DASHBOARD_ROLES.includes(roleCode)
                ? '/admin/dashboard'
                : '/home';

            navigate(destination, { replace: true });
        } catch (err) {
            setError(err?.response?.data?.message || 'Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Desktop heading */}
            <div className="hidden lg:block mb-8">
                <Typography component="h2" variant="h2" className="text-2xl font-bold text-gray-900">Welcome back</Typography>
                <p className="text-gray-500 mt-1">Sign in to your DDAS account</p>
            </div>
            {/* Mobile heading */}
            <div className="lg:hidden mb-6">
                <Typography component="h2" variant="h2" className="text-xl font-bold text-gray-900 mb-0.5">Sign in</Typography>
                <p className="text-sm text-gray-500">Enter your credentials to continue</p>
            </div>

            {error && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    <SvgIcon aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </SvgIcon>
                    {error}
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <label htmlFor="field-LoginPage-2959" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <AppInput id="field-LoginPage-2959" type="email" name="email" value={form.email} onChange={handle} placeholder="you@example.com" autoComplete="email"
                        className="w-full placeholder-gray-400" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                        <AppInput aria-label="••••••••" type={showPw ? 'text' : 'password'} name="password" value={form.password} onChange={handle} placeholder="••••••••" autoComplete="current-password"
                            className="w-full placeholder-gray-400" />
                        <AppButton iconOnly aria-label="View details" type="button" onClick={() => setShowPw((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2">
                            <SvgIcon aria-hidden="true" className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </SvgIcon>
                        </AppButton>
                    </div>
                </div>
                <AppButton variant="contained" type="submit" disabled={loading}
                    className="w-full disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {loading ? 'Signing in…' : 'Sign in'}
                </AppButton>
            </form>
            <p className="text-center text-sm text-gray-500 mt-6">
                Don't have an account?{' '}<Link to="/register" className="text-blue-600 font-medium hover:underline">Create one</Link>
            </p>
        </div>
    );
}
