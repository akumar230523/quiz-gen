import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '@/services/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    });
    const [loading, setLoading] = useState(true);

    // Verify token on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            authAPI.me()
                .then(res => setUser(res.data))
                .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const refreshUser = useCallback(async () => {
        const me = await authAPI.me();
        localStorage.setItem('user', JSON.stringify(me.data));
        setUser(me.data);
        return me.data;
    }, []);

    const login = useCallback(async (username, password) => {
        const res = await authAPI.login({ username, password });
        const { token } = res.data;
        localStorage.setItem('token', token);
        const me = await authAPI.me();
        localStorage.setItem('user', JSON.stringify(me.data));
        setUser(me.data);
        return me.data;
    }, []);

    const register = useCallback(async (data) => {
        const res = await authAPI.register(data);
        const { token } = res.data;
        localStorage.setItem('token', token);
        const me = await authAPI.me();
        localStorage.setItem('user', JSON.stringify(me.data));
        setUser(me.data);
        return me.data;
    }, []);

    const logout = useCallback(async () => {
        try { await authAPI.logout(); } catch { }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    }, []);

    return (
        <AuthCtx.Provider value={{ user, loading, login, register, logout, refreshUser, isAuth: !!user }}>
            {children}
        </AuthCtx.Provider>
    );
}

export const useAuth = () => useContext(AuthCtx);