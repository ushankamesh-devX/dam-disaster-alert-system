import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
    const { user, clearAuth } = useAuth();
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome, {user?.fullName?.split(' ')[0] || 'User'}</h1>
                <p className="text-gray-500 text-sm mb-6">DAM Disaster Alert System — User Portal</p>
                <button onClick={() => { clearAuth(); navigate('/login'); }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                    Sign out
                </button>
            </div>
        </div>
    );
}
