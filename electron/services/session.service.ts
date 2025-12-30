/**
 * Session Service - Session validation for auto attendance
 * Reads session from renderer process via IPC or from secure storage
 */

import { BrowserWindow } from 'electron';

// Local type definitions
interface SessionState {
  isValid: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  accessToken?: string;
  refreshToken?: string;
}

class SessionService {
  private mainWindow: BrowserWindow | null = null;

  /**
   * Set main window reference for IPC communication
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * Get session state from renderer process via IPC
   */
  async getSessionFromRenderer(): Promise<SessionState> {
    console.log('[SessionService] Getting session from renderer...');
    
    if (!this.mainWindow) {
      console.log('[SessionService] ❌ Main window not available');
      return { isValid: false };
    }

    console.log('[SessionService] Main window available, checking if webContents is ready...');
    const isReady = !this.mainWindow.webContents.isLoading();
    console.log(`[SessionService] WebContents ready: ${isReady}`);

    try {
      // Send IPC message to renderer to get session
      console.log('[SessionService] Executing JavaScript to read session from localStorage...');
      const session = await this.mainWindow.webContents.executeJavaScript(`
        (() => {
          try {
            const authData = localStorage.getItem('auth-storage');
            if (!authData) {
              console.log('[SessionService] No auth-storage found in localStorage');
              return { isValid: false };
            }
            
            const parsed = JSON.parse(authData);
            const state = parsed.state || parsed;
            
            if (!state.refreshToken || !state.user) {
              console.log('[SessionService] Missing refreshToken or user in state');
              return { isValid: false };
            }
            
            console.log('[SessionService] Session found - user:', state.user?.email || 'N/A');
            return {
              isValid: true,
              user: state.user,
              accessToken: state.accessToken,
              refreshToken: state.refreshToken,
            };
          } catch (error) {
            console.error('[SessionService] Failed to read session:', error);
            return { isValid: false };
          }
        })()
      `);

      console.log(`[SessionService] Session retrieval result: isValid=${session.isValid}, user=${session.user?.email || 'N/A'}`);
      return session as SessionState;
    } catch (error) {
      console.error('[SessionService] ❌ Failed to get session from renderer:', error);
      return { isValid: false };
    }
  }

  /**
   * Validate session
   * Checks if session exists and has required fields
   */
  async validateSession(): Promise<SessionState> {
    // Try to get session from renderer
    const session = await this.getSessionFromRenderer();

    if (!session.isValid) {
      return { isValid: false };
    }

    // Basic validation - check if required fields exist
    if (!session.user || !session.refreshToken) {
      return { isValid: false };
    }

    // Additional validation could be done here:
    // - Check token expiration
    // - Verify with backend
    // For now, we rely on backend validation during API calls

    return session;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    console.log('[SessionService] Checking if user is authenticated...');
    const session = await this.validateSession();
    console.log(`[SessionService] Authentication check result: ${session.isValid}`);
    return session.isValid;
  }

  /**
   * Get access token for API calls
   */
  async getAccessToken(): Promise<string | null> {
    console.log('[SessionService] Getting access token...');
    const session = await this.validateSession();
    const token = session.accessToken || null;
    console.log(`[SessionService] Access token available: ${!!token}, length: ${token?.length || 0}`);
    return token;
  }

  /**
   * Get user info
   */
  async getUser(): Promise<SessionState['user']> {
    const session = await this.validateSession();
    return session.user;
  }
}

export const sessionService = new SessionService();

