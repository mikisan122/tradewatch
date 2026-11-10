import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

/**
 * Sesión de la cuenta TradeWatch (token guardado en el dispositivo).
 * storageKey distinto en teléfono y reloj: cada dispositivo inicia su propia sesión.
 */
export function AuthProvider({ children, device = 'phone' }) {
  const KEY = `tradewatch:session:${device}`;
  const [session, setSession] = useState(null); // { token, user }
  const [ready, setReady] = useState(false);

  const save = useCallback(
    async (s) => {
      setSession(s);
      try {
        if (s) await AsyncStorage.setItem(KEY, JSON.stringify(s));
        else await AsyncStorage.removeItem(KEY);
      } catch {
        /* sin almacenamiento */
      }
    },
    [KEY]
  );

  // Restaurar sesión y validarla con el servidor
  useEffect(() => {
    (async () => {
      let saved = null;
      try {
        saved = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null');
      } catch {
        saved = null;
      }
      if (saved?.token) {
        try {
          const { user } = await api('/api/me', { token: saved.token });
          saved = { ...saved, user };
          await AsyncStorage.setItem(KEY, JSON.stringify(saved));
        } catch (e) {
          if (e.status === 401) saved = null; // sesión revocada → volver a iniciar sesión
          // sin conexión: se conserva la sesión guardada
        }
      }
      setSession(saved);
      setReady(true);
    })();
  }, [KEY]);

  const login = useCallback(async (loginId, password) => {
    const data = await api('/api/login', { method: 'POST', body: { login: loginId, password, device } });
    await save({ token: data.token, user: data.user });
    return data.user;
  }, [device, save]);

  const register = useCallback(async (fields) => {
    const data = await api('/api/register', { method: 'POST', body: { ...fields, device } });
    await save({ token: data.token, user: data.user });
    return data.user;
  }, [device, save]);

  const logout = useCallback(async () => {
    const token = session?.token;
    await save(null);
    if (token) api('/api/logout', { method: 'POST', token }).catch(() => {});
  }, [session, save]);

  const value = useMemo(() => ({ session, ready, login, register, logout, expire: () => save(null) }), [session, ready, login, register, logout, save]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
