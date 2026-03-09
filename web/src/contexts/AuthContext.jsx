import { createContext, useContext, useEffect, useState } from 'react';
import useAuthStore from '../stores/auth.store';
import { getCurrentUser } from '../services/user.service';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const {
        token, user,
        setAuth, setUser, clearAuth,
        isAuthenticated, isAdmin, isDashboardUser,
        _hasHydrated,
    } = useAuthStore();

    // Start loading=true; resolve once we know auth state is finalised
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Don't do anything until Zustand persist has restored from localStorage
        if (!_hasHydrated) return;

        const bootstrap = async () => {
            if (token && user) {
                // Zustand persist restored token + user, and onRehydrateStorage
                // already re-derived isAuthenticated / isAdmin / isDashboardUser.
                setLoading(false);
                return;
            }

            if (token && !user) {
                // Orphaned token in storage (user object was somehow lost).
                // Verify it by calling /users/me.
                try {
                    const freshUser = await getCurrentUser(); // GET /users/me  → {success, data: UserResponse}
                    setAuth(token, freshUser);                // re-derives isAdmin / isDashboardUser
                } catch {
                    clearAuth();                              // token is invalid/expired → log out
                }
            }

            // No token → nothing to do
            setLoading(false);
        };

        bootstrap();
    }, [_hasHydrated]); // re-run when hydration completes

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

