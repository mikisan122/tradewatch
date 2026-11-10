import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../core/store';
import { buildWatchSnapshot } from './snapshot';
import { createLink, syncUrl } from './link';

const Ctx = createContext(null);
export const useWatchLink = () => useContext(Ctx);

/**
 * Lado TELÉFONO del enlace con el smartwatch.
 * Envía el estado al reloj (en otro emulador) y recibe su estado de conexión.
 */
export function WatchLinkProvider({ children }) {
  const { state, totals, ready, session } = useStore();
  const [server, setServer] = useState(false);
  const [watch, setWatch] = useState({ online: false, power: false, phase: 'off', lastSeen: null });
  const [lastSent, setLastSent] = useState(null);
  const link = useRef(null);
  const latest = useRef(null);
  const timer = useRef(null);

  latest.current = { state, totals };

  const push = useCallback(() => {
    if (!link.current?.isOpen() || !latest.current) return;
    const { state: s, totals: t } = latest.current;
    link.current.send({ type: 'snapshot', data: { ...buildWatchSnapshot(s, t), account: { username: session.user.username, name: session.user.name } } });
    setLastSent(Date.now());
  }, []);

  useEffect(() => {
    link.current = createLink('phone', session.token, {
      onOpen: () => {
        setServer(true);
        push();
      },
      onClose: () => {
        setServer(false);
        setWatch((w) => ({ ...w, online: false }));
      },
      onMessage: (msg) => {
        if (msg.type === 'watch') {
          setWatch({ online: msg.online, power: msg.power, phase: msg.phase, lastSeen: msg.lastSeen });
          if (msg.online) push();
        }
      },
    });
    return () => link.current?.close();
  }, [push, session.token]);

  // Cada cambio de estado (compra, venta, precio, alerta) se envía al reloj
  useEffect(() => {
    if (!ready) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(push, 250);
    return () => clearTimeout(timer.current);
  }, [state, ready, push]);

  const setPower = useCallback((on) => link.current?.send({ type: 'command', cmd: 'power', on }), []);

  const status = !server || !watch.online ? 'offline' : !watch.power ? 'off' : watch.phase === 'on' ? 'on' : 'syncing';
  const value = useMemo(() => ({ server, watch, status, lastSent, setPower, url: syncUrl() }), [server, watch, status, lastSent, setPower]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
