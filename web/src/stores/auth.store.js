import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Roles that get access to the admin dashboard
// NORMAL_USER is the only role that goes to the public /home page
const DASHBOARD_ROLES = ['SUPER_ADMIN', 'ADMIN', 'DAM_OPERATOR'];

const isDashboard = (user) =>
    DASHBOARD_ROLES.includes(user?.role?.code?.toUpperCase());

const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isAdmin: false,        // true for SUPER_ADMIN | ADMIN
            isDashboardUser: false, // true for any non-NORMAL_USER role
            _hasHydrated: false,   // true after Zustand persist rehydration completes

            setAuth: (token, user) => {
                set({
                    token,
                    user,
                    isAuthenticated: true,
                    isAdmin: ['SUPER_ADMIN', 'ADMIN'].includes(user?.role?.code?.toUpperCase()),
                    isDashboardUser: isDashboard(user),
                });
            },

            setUser: (user) => {
                set({
                    user,
                    isAdmin: ['SUPER_ADMIN', 'ADMIN'].includes(user?.role?.code?.toUpperCase()),
                    isDashboardUser: isDashboard(user),
                });
            },

            clearAuth: () => {
                set({ user: null, token: null, isAuthenticated: false, isAdmin: false, isDashboardUser: false });
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ token: state.token, user: state.user }),
        }
    )
);

// Re-derive computed flags after Zustand restores token + user from localStorage.
// Must be done AFTER create() so useAuthStore is in scope (avoids TDZ).
const finalizeHydration = () => {
    const { token, user } = useAuthStore.getState();
    useAuthStore.setState({
        _hasHydrated: true,
        ...(token && user
            ? {
                  isAuthenticated: true,
                  isAdmin: ['SUPER_ADMIN', 'ADMIN'].includes(user?.role?.code?.toUpperCase()),
                  isDashboardUser: isDashboard(user),
              }
            : {}),
    });
};

// localStorage hydration is synchronous, so it's usually already done
if (useAuthStore.persist.hasHydrated()) {
    finalizeHydration();
} else {
    useAuthStore.persist.onFinishHydration(finalizeHydration);
}

export default useAuthStore;
