import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const api = (ep, opts = {}) => fetch(ep, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }), ...opts.headers }
  }).then(r => { if (!r.ok) throw new Error('Request failed'); return r.json(); });

  const login = async (email, password) => {
    const { access_token } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('token', access_token);
    setUser({ email });
  };

  const register = async (email, password) => {
    await api('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
    await login(email, password);
  };

  const logout = () => { localStorage.removeItem('token'); setUser(null); };

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (t) api('/progress/').then(() => setUser({ email: 'ok' })).catch(() => { localStorage.removeItem('token'); setUser(null); }).finally(() => setLoading(false));
    else setLoading(false);
  }, []);

  return <AuthContext.Provider value={{ user, login, register, logout, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}