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

export default useAuthStore;
