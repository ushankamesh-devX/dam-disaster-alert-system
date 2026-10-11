import { Typography } from '@mui/material';
import { AppButton } from '../components/ui/controls';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
    const { user, clearAuth } = useAuth();
    const navigate = useNavigate();
    return (
        <div className="md-dotted-background min-h-screen flex items-center justify-center">
            <div className="text-center">
                <Typography component="h1" variant="h1" className="text-2xl font-bold text-gray-900 mb-2">Welcome, {user?.fullName?.split(' ')[0] || 'User'}</Typography>
                <p className="text-gray-500 text-sm mb-6">DAM Disaster Alert System — User Portal</p>
                <AppButton variant="outlined" onClick={() => { clearAuth(); navigate('/login'); }}
                    className="">
                    Sign out
                </AppButton>
            </div>
        </div>
    );
}
