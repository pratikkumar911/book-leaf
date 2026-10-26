import { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { api } from './api.js';
import { bookleafApi } from './store/api.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
    const dispatch = useDispatch();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        localStorage.removeItem('bl_token');
        localStorage.removeItem('bl_refresh');
        api.me().then(setUser)
            .catch((error) => {
                if (error.status !== 401) setAuthError(error.message);
            })
            .finally(() => setLoading(false));
    }, []);

    async function login(email, password) {
        setAuthError(null);
        await api.login(email, password);
        const me = await api.me();
        dispatch(bookleafApi.util.resetApiState());
        setUser(me);
        return me;
    }

    async function logout() {
        await api.logout();
        dispatch(bookleafApi.util.resetApiState());
        setUser(null);
    }

    return <Ctx.Provider value={{ user, loading, authError, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);