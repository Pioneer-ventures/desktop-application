/**
 * Authentication Store - Zustand
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState, User, UserRole } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthStore extends AuthState {
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

export const authStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user: User, accessToken: string, refreshToken: string) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      logout: async () => {
        // Always clear local state, even if server call fails
        // This ensures user can always logout locally
        const clearState = () => {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        };

        try {
          // Try to notify server, but don't fail if it doesn't work
          const { accessToken } = get();
          if (accessToken) {
            await authService.logout();
          }
        } catch (error: any) {
          // Ignore server logout errors - always allow local logout
        } finally {
          // Always clear local state
          clearState();
        }
      },

      setUser: (user: User) => {
        set({ user });
      },

      hasRole: (role: UserRole) => {
        const { user } = get();
        return user?.role === role;
      },

      hasAnyRole: (roles: UserRole[]) => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

