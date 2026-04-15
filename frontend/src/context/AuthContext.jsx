/**
 * AuthContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages authentication state for the whole app.
 *
 * Provides:
 *   user        – full user object or null
 *   isAuth      – boolean shortcut
 *   loading     – true while verifying the saved token on first load
 *   login()     – throws on failure (caller handles toast)
 *   register()  – throws on failure
 *   logout()    – clears everything
 *   refreshUser()– re-fetches /auth/me and updates state
 * ─────────────────────────────────────────────────────────────────────────────
*/

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '@/services/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
    // Initialise from localStorage so the UI doesn't flash "logged out" on reload
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('qg-user')) || null;
        } catch {
            return null;
        }
    });

    // True while we verify the saved JWT against the server on first mount
    const [loading, setLoading] = useState(true);

    // ── On mount: verify the saved token is still valid ─────────────────────
    useEffect(() => {
        const token = localStorage.getItem('qg-token');
        if (!token) {
            setLoading(false);
            return;
        }
        authAPI.me()
            .then(res => {
                // Backend returns { success: true, user: {...} }
                const userData = res.data?.user || res.data;
                setUser(userData);
                localStorage.setItem('qg-user', JSON.stringify(userData));
            })
            .catch(() => {
                // Token is invalid or expired — clear everything
                localStorage.removeItem('qg-token');
                localStorage.removeItem('qg-user');
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Re-fetch the current user and update state (called after profile edits) */
    const refreshUser = useCallback(async () => {
        const res = await authAPI.me();
        const data = res.data?.user || res.data;
        localStorage.setItem('qg-user', JSON.stringify(data));
        setUser(data);
        return data;
    }, []);

    /**
     * Log in with username + password.
    */
    const login = useCallback(async (username, password) => {
        // This throws if the server returns 4xx/5xx — the caller catches it
        const res = await authAPI.login({ username, password });
        const token = res.data?.token;

        // Store token BEFORE calling /me so the request interceptor can attach it
        localStorage.setItem('qg-token', token);

        const meRes = await authAPI.me();
        const userData = meRes.data?.user || meRes.data;
        localStorage.setItem('qg-user', JSON.stringify(userData));
        setUser(userData);
        return userData;
    }, []);

    /**
     * Register a new account.
    */
    const register = useCallback(async (formData) => {
        const res = await authAPI.register(formData);
        const token = res.data?.token;

        localStorage.setItem('qg-token', token);

        const meRes = await authAPI.me();
        const userData = meRes.data?.user || meRes.data;
        localStorage.setItem('qg-user', JSON.stringify(userData));
        setUser(userData);
        return userData;
    }, []);

    /** Log out: clear token + user from memory and storage */
    const logout = useCallback(async () => {
        try { await authAPI.logout(); } catch { /* server-side logout is optional */ }
        localStorage.removeItem('qg-token');
        localStorage.removeItem('qg-user');
        setUser(null);
    }, []);

    return (
        <AuthCtx.Provider value={{ user, loading, isAuth: !!user, login, register, logout, refreshUser }}>
            {children}
        </AuthCtx.Provider>
    );
}

export const useAuth = () => useContext(AuthCtx);
