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

        // Trigger auto check-in on login success
        console.log('[AuthStore] Login successful, triggering auto check-in...');
        if (window.electronAPI?.triggerAutoCheckInOnLogin) {
          console.log('[AuthStore] electronAPI.triggerAutoCheckInOnLogin available, calling...');
          window.electronAPI.triggerAutoCheckInOnLogin()
            .then((result) => {
              console.log('[AuthStore] Auto check-in on login triggered successfully:', result);
            })
            .catch((error) => {
              console.error('[AuthStore] Failed to trigger auto check-in on login:', error);
            });
        } else {
          console.warn('[AuthStore] electronAPI.triggerAutoCheckInOnLogin not available!');
        }
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

          // Trigger auto check-in after successful auth initialization
          console.log('[AuthStore] Auth initialization successful, triggering auto check-in...');
          if (window.electronAPI?.triggerAutoCheckInOnAuthInit) {
            console.log('[AuthStore] electronAPI.triggerAutoCheckInOnAuthInit available, calling...');
            window.electronAPI.triggerAutoCheckInOnAuthInit()
              .then((result) => {
                console.log('[AuthStore] Auto check-in triggered successfully:', result);
              })
              .catch((error) => {
                console.error('[AuthStore] Failed to trigger auto check-in on auth init:', error);
              });
          } else {
            console.warn('[AuthStore] electronAPI.triggerAutoCheckInOnAuthInit not available!');
          }
        } catch (error) {
          // Session invalid, clear auth state
           
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

