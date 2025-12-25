/**
 * Authentication Store - Zustand
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState, User, UserRole } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthStore extends AuthState {
  login: (user: User, accessToken: string, refreshToken: string, sessionId?: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  initializeAuth: () => Promise<void>;
  isInitializing: boolean;
}

export const authStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitializing: true,

      login: (user: User, accessToken: string, refreshToken: string, sessionId?: string) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isInitializing: false,
        });
      },

      initializeAuth: async () => {
        set({ isInitializing: true });
        const { refreshToken, user } = get();
        
        if (!refreshToken || !user) {
          set({ isAuthenticated: false, isInitializing: false });
          return;
        }

        try {
          // Try to refresh token to validate session
          const tokenData = await authService.refreshToken(refreshToken);
          
          set({
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            isAuthenticated: true,
            isInitializing: false,
          });
        } catch (error) {
          // Session invalid, clear auth state
          console.log('[Auth] Session expired or invalid, clearing auth state');
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isInitializing: false,
          });
        }
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
        // Don't persist isInitializing
      }),
    }
  )
);

