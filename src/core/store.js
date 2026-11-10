import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../auth/api';
import { STOCKS, STOCK_MAP, buildInitialPrices } from './data';
import { computeTotals, dayChangePct } from './selectors';
import { money, pct, round2, signedMoney, todayKey, uid } from './utils';

const STORAGE_KEY = 'tradewatch:state:v2';
// v2 = precios reales (Yahoo Finance). Las cuentas v1 tenían precios inventados.
const STATE_VERSION = 2;
export const MARKET_POLL_MS = 20000;

export const DEFAULT_SETTINGS = {
  notifications: true,
  priceAlerts: true,
  threshold: 1.5,
  portfolioAlerts: true,
  portfolioThreshold: 1,
  dailySummary: true,
  watchAlerts: true,
  simulation: true,
};

/* ---------- Precios reales ---------- */

/** Convierte la respuesta de /api/market al formato de precios de la app */
export function pricesFromMarket(market, prev = {}) {
  const out = {};
  for (const st of STOCKS) {
    const m = market?.symbols?.[st.symbol];
    if (!m) {
      out[st.symbol] = prev[st.symbol] || buildInitialPrices()[st.symbol];
      continue;
    }
    out[st.symbol] = {
      price: m.price,
      open: m.open,
      prevClose: m.prevClose,
      high: m.high,
      low: m.low,
      volume: m.volume,
      week52High: m.week52High,
      week52Low: m.week52Low,
      marketOpen: m.marketOpen,
      marketTime: m.marketTime,
      exchange: m.exchange,
      sessionStart: m.sessionStart,
      sessionEnd: m.sessionEnd,
      intraday: m.intraday.length > 1 ? m.intraday : [m.prevClose, m.price],
      intradayTimes: m.intradayTimes,
      daily: m.daily,
      dailyTimes: m.dailyTimes,
    };
  }
  return out;
}

/* ---------- Estado inicial de una cuenta nueva ---------- */

export function createSeedState(profile, market) {
  const now = Date.now();
  const prices = pricesFromMarket(market);
  const balance = 25000;
  return {
    version: STATE_VERSION,
    day: todayKey(),
    user: {
      name: profile?.name || 'Inversionista',
      email: profile?.email || '',
      phone: profile?.phone || '',
      memberSince: profile?.memberSince || now,
    },
    balance,
    holdings: {},
    favorites: ['AAPL', 'NVDA', 'TSLA', 'MSFT'],
    transactions: [{ id: uid(), type: 'deposit', amount: balance, date: now, note: 'Depósito inicial' }],
    prices,
    settings: { ...DEFAULT_SETTINGS },
    customAlerts: [],
    notifications: [
      {
        id: uid(), kind: 'info', date: now, read: false,
        title: 'Bienvenido a TradeWatch',
        body: 'Tu cuenta está lista con $25,000 de saldo. Los precios son del mercado real.',
      },
    ],
    alertRefs: {},
    portfolioRef: null,
    lastSummaryDay: null,
    watchOn: false,
    lastTick: market?.updatedAt || now,
    portfolioHistory: [
      { t: now - 1000, v: balance },
      { t: now, v: balance },
    ],
  };
}

// Día nuevo: se reinician las referencias de alertas (los precios los da el mercado)
function rollDay(s) {
  if (s.day === todayKey()) return s;
  return { ...s, day: todayKey(), alertRefs: {}, portfolioRef: null };
}

const valid = (s) => s && s.version === STATE_VERSION && s.prices && typeof s.prices === 'object';
const isLegacy = (s) => s && s.version === 1;
// Limpia textos antiguos guardados en la cuenta ("virtual", "simulado", "demostración")
const NOTE_FIX = { 'Depósito virtual': 'Depósito', 'Retiro virtual': 'Retiro', 'Depósito inicial de demostración': 'Depósito inicial' };
const cleanText = (t) => (typeof t === 'string' ? t.replace(/\s*Precio simulado\.?/g, '').replace(/Tienes dinero virtual para practicar\. Todos los precios son datos simulados\./, 'Tu cuenta está lista. Explora el mercado y arma tu portafolio.') : t);
function clean(s) {
  return {
    ...s,
    transactions: (s.transactions || []).map((t) => (NOTE_FIX[t.note] ? { ...t, note: NOTE_FIX[t.note] } : t)),
    notifications: (s.notifications || []).map((n) => ({ ...n, body: cleanText(n.body) })),
  };
}
const normalize = (s, profile) => {
  const seed = createSeedState(profile);
  // Si se agregaron acciones nuevas al catálogo, se completan sus precios
  return rollDay(clean({ ...seed, ...s, prices: { ...seed.prices, ...s.prices }, settings: { ...DEFAULT_SETTINGS, ...s.settings } }));
};

/**
 * Carga los datos de la CUENTA: primero de la base de datos del servidor,
 * si no hay conexión, de la copia local (AsyncStorage) de ese usuario.
 */
async function loadState(session, profile) {
  const localKey = `${STORAGE_KEY}:${session.user.id}`;
  try {
    const { state } = await api('/api/state', { token: session.token });
    if (valid(state)) return { state: normalize(state, profile), source: 'server' };
    return { state: null, legacy: isLegacy(state) ? state : null, source: 'server' }; // cuenta nueva o antigua
  } catch (e) {
    if (e.status === 401) throw e;
  }
  try {
    const raw = await AsyncStorage.getItem(localKey);
    const s = raw && JSON.parse(raw);
    if (valid(s)) return { state: normalize(s, profile), source: 'local' };
  } catch {
    /* sin copia local */
  }
  return { state: null, source: 'local' };
}

/** Precios reales desde el servidor (null si no hay conexión o aún no hay datos) */
async function fetchMarket() {
  try {
    const m = await api('/api/market', { timeout: 6000 });
    return m && m.symbols && Object.keys(m.symbols).length ? m : null;
  } catch {
    return null;
  }
}

/* ---------- Notificaciones ---------- */

function pushNotes(state, notes, now) {
  if (!notes.length || !state.settings.notifications) return state;
  const list = notes.map((n) => ({ id: uid(), date: now, read: false, ...n }));
  return { ...state, notifications: [...list.reverse(), ...state.notifications].slice(0, 60) };
}

export function buildSummary(state) {
  const t = computeTotals(state);
  const movers = STOCKS.map((s) => ({ s: s.symbol, c: dayChangePct(state.prices[s.symbol]) })).sort((a, b) => b.c - a.c);
  const best = movers[0];
  const worst = movers[movers.length - 1];
  return {
    kind: 'summary',
    title: 'Resumen diario de inversiones',
    body: `Portafolio ${money(t.total)} · Hoy ${signedMoney(t.dayPnl)} (${pct(t.dayPct)}). Mejor: ${best.s} ${pct(best.c)} · Peor: ${worst.s} ${pct(worst.c)}.`,
  };
}

function runAlerts(state, totals, now) {
  const s = state.settings;
  if (!s.notifications) return state;
  const notes = [];
  const alertRefs = { ...state.alertRefs };
  let { portfolioRef, lastSummaryDay } = state;
  let customAlerts = state.customAlerts;

  if (s.priceAlerts) {
    const watched = [...new Set([...state.favorites, ...Object.keys(state.holdings)])];
    for (const sym of watched) {
      const price = state.prices[sym]?.price;
      if (!price) continue;
      const ref = alertRefs[sym];
      if (ref == null) { alertRefs[sym] = price; continue; }
      const ch = ((price - ref) / ref) * 100;
      if (Math.abs(ch) >= s.threshold) {
        const up = ch > 0;
        notes.push({
          kind: up ? 'up' : 'down',
          symbol: sym,
          title: `${STOCK_MAP[sym].short} ${up ? 'sube' : 'baja'} ${pct(ch)}`,
          body: `${sym} cotiza en ${money(price)} (antes ${money(ref)}).`,
        });
        alertRefs[sym] = price;
      }
    }
  }

  if (customAlerts.some((a) => !a.triggered)) {
    customAlerts = customAlerts.map((a) => {
      if (a.triggered) return a;
      const price = state.prices[a.symbol].price;
      const hit = a.condition === 'above' ? price >= a.price : price <= a.price;
      if (!hit) return a;
      notes.push({
        kind: a.condition === 'above' ? 'up' : 'down',
        symbol: a.symbol,
        title: `Alerta de precio: ${a.symbol}`,
        body: `${a.symbol} ${a.condition === 'above' ? 'superó' : 'bajó de'} ${money(a.price)}. Actual: ${money(price)}.`,
      });
      return { ...a, triggered: true, triggeredAt: now };
    });
  }

  if (s.portfolioAlerts) {
    if (portfolioRef == null) portfolioRef = totals.total;
    else {
      const ch = ((totals.total - portfolioRef) / portfolioRef) * 100;
      if (Math.abs(ch) >= s.portfolioThreshold) {
        notes.push({
          kind: 'portfolio',
          title: `Cambio importante en tu portafolio ${pct(ch)}`,
          body: `Valor total: ${money(totals.total)} (antes ${money(portfolioRef)}).`,
        });
        portfolioRef = totals.total;
      }
    }
  }

  if (s.dailySummary && lastSummaryDay !== todayKey()) {
    notes.push(buildSummary(state));
    lastSummaryDay = todayKey();
  }

  return pushNotes({ ...state, alertRefs, portfolioRef, lastSummaryDay, customAlerts }, notes, now);
}

/* ---------- Reducer ---------- */

// Depósitos/retiros no son ganancias ni pérdidas: se ajusta la curva para que el rendimiento siga continuo
const shiftHistory = (h, delta) => h.map((p) => ({ ...p, v: round2(p.v + delta) }));

function reducer(state, a) {
  switch (a.type) {
    case 'MARKET': {
      // Precios reales recibidos del servidor (Yahoo Finance)
      const prices = pricesFromMarket(a.market, state.prices);
      const next = { ...state, prices, lastTick: a.market.updatedAt || a.now };
      const totals = computeTotals(next);
      next.portfolioHistory = [...state.portfolioHistory, { t: a.now, v: round2(totals.total) }].slice(-180);
      return runAlerts(next, totals, a.now);
    }

    case 'BUY': {
      const price = state.prices[a.symbol].price;
      const amount = round2(price * a.qty);
      if (!Number.isInteger(a.qty) || a.qty <= 0 || amount > state.balance) return state;
      const h = state.holdings[a.symbol] || { qty: 0, avg: 0 };
      const qty = h.qty + a.qty;
      const tx = { id: uid(), type: 'buy', symbol: a.symbol, qty: a.qty, price, amount, date: a.now };
      return pushNotes(
        {
          ...state,
          balance: round2(state.balance - amount),
          holdings: { ...state.holdings, [a.symbol]: { qty, avg: (h.qty * h.avg + a.qty * price) / qty } },
          transactions: [tx, ...state.transactions],
        },
        [{ kind: 'buy', symbol: a.symbol, title: `Compra realizada: ${a.qty} ${a.symbol}`, body: `${a.qty} × ${money(price)} = ${money(amount)}` }],
        a.now
      );
    }

    case 'SELL': {
      const h = state.holdings[a.symbol];
      if (!h || !Number.isInteger(a.qty) || a.qty <= 0 || a.qty > h.qty) return state;
      const price = state.prices[a.symbol].price;
      const amount = round2(price * a.qty);
      const pnl = round2((price - h.avg) * a.qty);
      const holdings = { ...state.holdings };
      if (h.qty - a.qty <= 0) delete holdings[a.symbol];
      else holdings[a.symbol] = { ...h, qty: h.qty - a.qty };
      const tx = { id: uid(), type: 'sell', symbol: a.symbol, qty: a.qty, price, amount, pnl, date: a.now };
      return pushNotes(
        { ...state, balance: round2(state.balance + amount), holdings, transactions: [tx, ...state.transactions] },
        [{ kind: 'sell', symbol: a.symbol, title: `Venta realizada: ${a.qty} ${a.symbol}`, body: `Recibiste ${money(amount)} · Resultado ${signedMoney(pnl)}` }],
        a.now
      );
    }

    case 'DEPOSIT': {
      if (!(a.amount > 0)) return state;
      const tx = { id: uid(), type: 'deposit', amount: round2(a.amount), note: a.note || 'Depósito', date: a.now };
      return {
        ...state,
        balance: round2(state.balance + a.amount),
        transactions: [tx, ...state.transactions],
        portfolioHistory: shiftHistory(state.portfolioHistory, a.amount),
        portfolioRef: state.portfolioRef == null ? null : state.portfolioRef + a.amount,
      };
    }

    case 'WITHDRAW': {
      if (!(a.amount > 0) || a.amount > state.balance) return state;
      const tx = { id: uid(), type: 'withdraw', amount: round2(a.amount), note: a.note || 'Retiro', date: a.now };
      return {
        ...state,
        balance: round2(state.balance - a.amount),
        transactions: [tx, ...state.transactions],
        portfolioHistory: shiftHistory(state.portfolioHistory, -a.amount),
        portfolioRef: state.portfolioRef == null ? null : state.portfolioRef - a.amount,
      };
    }

    case 'TOGGLE_FAV': {
      const has = state.favorites.includes(a.symbol);
      return { ...state, favorites: has ? state.favorites.filter((s) => s !== a.symbol) : [...state.favorites, a.symbol] };
    }

    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...a.user } };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...a.settings } };

    case 'ADD_ALERT':
      return { ...state, customAlerts: [{ id: uid(), triggered: false, created: a.now, ...a.alert }, ...state.customAlerts] };

    case 'REMOVE_ALERT':
      return { ...state, customAlerts: state.customAlerts.filter((x) => x.id !== a.id) };

    case 'SET_WATCH':
      return { ...state, watchOn: a.on };

    case 'READ_NOTES':
      return state.notifications.some((n) => !n.read)
        ? { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) }
        : state;

    case 'CLEAR_NOTES':
      return { ...state, notifications: [] };

    case 'ADD_SUMMARY':
      return pushNotes(state, [buildSummary(state)], a.now);

    case 'RESET':
      return { ...createSeedState(state.user), prices: state.prices, lastTick: state.lastTick };

    case 'HYDRATE':
      return a.state;

    default:
      return state;
  }
}

/* ---------- Provider ---------- */

const StoreCtx = createContext(null);

export function StoreProvider({ children, session, onSessionExpired }) {
  const profile = useMemo(
    () => ({ name: session.user.name, email: session.user.email, memberSince: session.user.createdAt }),
    [session.user]
  );
  const [state, dispatch] = useReducer(reducer, profile, createSeedState);
  const [ready, setReady] = useState(false);
  const [cloud, setCloud] = useState({ status: 'loading', savedAt: null });
  const [market, setMarket] = useState({ source: 'Yahoo Finance', updatedAt: null, error: null, marketOpen: false });
  const lastMarketAt = useRef(null);
  const latest = useRef(state);
  const saveTimer = useRef(null);
  latest.current = state;
  const localKey = `${STORAGE_KEY}:${session.user.id}`;

  // Cargar los datos de esta cuenta al iniciar sesión
  useEffect(() => {
    let alive = true;
    Promise.all([loadState(session, profile), fetchMarket()])
      .then(([{ state: saved, legacy, source }, m]) => {
        if (!alive) return;
        if (saved) {
          dispatch({ type: 'HYDRATE', state: saved });
        } else {
          // Cuenta nueva, o cuenta con datos de la versión anterior (precios inventados):
          // se empieza con saldo real y precios reales, conservando perfil, favoritas y alertas.
          let fresh = createSeedState(profile, m);
          if (legacy) {
            fresh = {
              ...fresh,
              user: { ...fresh.user, ...legacy.user },
              favorites: legacy.favorites?.length ? legacy.favorites : fresh.favorites,
              settings: { ...fresh.settings, ...legacy.settings },
              notifications: [
                {
                  id: uid(), kind: 'info', date: Date.now(), read: false,
                  title: 'Tu cuenta ahora usa precios reales',
                  body: 'Los precios vienen del mercado real. Tu saldo se reinició a $25,000 para empezar con datos reales.',
                },
              ],
            };
          }
          dispatch({ type: 'HYDRATE', state: fresh });
        }
        if (m) {
          lastMarketAt.current = m.updatedAt;
          dispatch({ type: 'MARKET', market: m, now: Date.now() });
          setMarket({ source: m.source || 'Yahoo Finance', updatedAt: m.updatedAt, error: null, marketOpen: Object.values(m.symbols).some((x) => x.marketOpen) });
        }
        setCloud({ status: source === 'server' ? 'ok' : 'offline', savedAt: null });
        setReady(true);
      })
      .catch(() => onSessionExpired?.());
    return () => {
      alive = false;
    };
  }, [session, profile, onSessionExpired]);

  // Guardar en la base de datos (máximo cada 4 s) y copia local
  const flush = useCallback(async () => {
    saveTimer.current = null;
    const snapshot = latest.current;
    AsyncStorage.setItem(localKey, JSON.stringify(snapshot)).catch(() => {});
    try {
      await api('/api/state', { method: 'PUT', token: session.token, body: { state: snapshot } });
      setCloud({ status: 'ok', savedAt: Date.now() });
    } catch (e) {
      if (e.status === 401) onSessionExpired?.();
      else setCloud((c) => ({ ...c, status: 'offline' }));
    }
  }, [localKey, session.token, onSessionExpired]);

  useEffect(() => {
    if (!ready || saveTimer.current) return;
    saveTimer.current = setTimeout(flush, 4000);
  }, [state, ready, flush]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  // Precios reales: se consultan al servidor cada 20 s
  const pollMarket = useCallback(async () => {
    const m = await fetchMarket();
    if (!m) {
      setMarket((x) => ({ ...x, error: 'Sin conexión con el servidor de precios' }));
      return;
    }
    setMarket({ source: m.source || 'Yahoo Finance', updatedAt: m.updatedAt, error: m.error, marketOpen: Object.values(m.symbols).some((x) => x.marketOpen) });
    if (m.updatedAt && m.updatedAt !== lastMarketAt.current) {
      lastMarketAt.current = m.updatedAt;
      dispatch({ type: 'MARKET', market: m, now: Date.now() });
    }
  }, []);

  useEffect(() => {
    if (!ready || !state.settings.simulation) return undefined;
    const id = setInterval(pollMarket, MARKET_POLL_MS);
    return () => clearInterval(id);
  }, [ready, state.settings.simulation, pollMarket]);

  const totals = useMemo(() => computeTotals(state), [state]);
  const value = useMemo(
    () => ({ state, dispatch, totals, ready, cloud, session, market, refreshMarket: pollMarket, saveNow: flush }),
    [state, totals, ready, cloud, session, market, pollMarket, flush]
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);
