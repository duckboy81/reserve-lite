import { API_CONFIG } from '../config/constants';

export const AuthService = {
  login: async (alpaId: string, password: string) => {
    try {
      const response = await fetch(API_CONFIG.AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ AlpaId: alpaId, Domain: 'ALPA2k', Password: password })
      });
      if (!response.ok) {
        // noinspection ExceptionCaughtLocallyJS
        throw new Error('Login failed');
      }
      const data = await response.json();
      const tokenData = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
        userInfo: data.user_info
      };
      localStorage.setItem('alpa_auth', JSON.stringify(tokenData));
      return tokenData;
    } catch (error) {
      console.error("Auth Error:", error);
      throw error;
    }
  },
  getToken: (): string | null => {
    const stored = localStorage.getItem('alpa_auth');
    if (!stored) return null;
    const data = JSON.parse(stored);
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem('alpa_auth');
      return null;
    }
    return data.token;
  },
  logout: () => {
    localStorage.removeItem('alpa_auth');
    localStorage.removeItem('guest_mode');
    // window.location.reload(); // Removed to preserve state
  },
  setGuestMode: () => {
    localStorage.setItem('guest_mode', 'true');
  },
  clearGuestMode: () => {
    localStorage.removeItem('guest_mode');
    // Do not reload, let App handle state
  },
  isGuest: (): boolean => {
    return localStorage.getItem('guest_mode') === 'true';
  },
  isAuthenticated: (): boolean => {
    const token = AuthService.getToken();
    const guest = AuthService.isGuest();
    return !!token || guest;
  }
};
