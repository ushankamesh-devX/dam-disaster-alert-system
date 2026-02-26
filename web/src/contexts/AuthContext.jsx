import { createContext, useContext, useEffect, useState } from 'react';
import useAuthStore from '../stores/auth.store';
import { getCurrentUser } from '../services/user.service';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const {
        token, user,
        setAuth, setUser, clearAuth,
        isAuthenticated, isAdmin, isDashboardUser,
    } = useAuthStore();

    // Start loading=true; resolve once we know auth state is finalised
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const bootstrap = async () => {
            if (token && user) {
                // Zustand persist already restored both token + user — no API call needed.
                // isDashboardUser / isAdmin are already set via setUser on rehydration.
                setLoading(false);
                return;
            }

            if (token && !user) {
                // Orphaned token in storage (user object was somehow lost).
                // Verify it by calling /users/me.
                try {
                    const freshUser = await getCurrentUser(); // GET /users/me  → {success, data: UserResponse}
                    setUser(freshUser);                        // re-derives isAdmin / isDashboardUser
                } catch {
                    clearAuth();                              // token is invalid/expired → log out
                }
            }

            // No token → nothing to do
            setLoading(false);
        };

        bootstrap();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const value = {
        user,
        token,
        isAuthenticated,
        isAdmin,
        isDashboardUser,
        loading,
        setAuth,
        clearAuth,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export default AuthContext;

