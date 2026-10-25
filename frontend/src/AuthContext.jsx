import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
import { supabase } from './supabaseClient.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('bl_token');
        if (!token) { setLoading(false); return; }
        supabase.realtime.setAuth(token);
        api.me().then(setUser)
            .catch(() => localStorage.removeItem('bl_token'))
            .finally(() => setLoading(false));
    }, []);

    async function login(email, password) {
        const res = await api.login(email, password);
        localStorage.setItem('bl_token', res.access_token);
        localStorage.setItem('bl_refresh', res.refresh_token);
        supabase.realtime.setAuth(res.access_token);
        const me = await api.me();
        setUser(me);
        return me;
    }

    function logout() {
        localStorage.removeItem('bl_token');
        localStorage.removeItem('bl_refresh');
        supabase.realtime.setAuth(null);
        setUser(null);
    }

    return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);