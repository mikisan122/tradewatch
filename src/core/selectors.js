import { STOCK_MAP } from './data';
import { fmtShortDate, fmtTime } from './utils';

// Variación del día respecto al cierre anterior (como en los brokers)
const ref = (p) => p.prevClose || p.open;
export const dayChangePct = (p) => ((p.price - ref(p)) / ref(p)) * 100;
export const dayChangeAbs = (p) => p.price - ref(p);

export function computeTotals(state) {
  const holdings = Object.entries(state.holdings)
    .filter(([s]) => state.prices[s])
    .map(([symbol, h]) => {
      const p = state.prices[symbol];
      const value = h.qty * p.price;
      const cost = h.qty * h.avg;
      const pnl = value - cost;
      return {
        symbol,
        stock: STOCK_MAP[symbol],
        qty: h.qty,
        avg: h.avg,
        price: p.price,
        value,
        cost,
        pnl,
        pnlPct: cost ? (pnl / cost) * 100 : 0,
        dayPnl: h.qty * (p.price - ref(p)),
        dayPct: dayChangePct(p),
      };
    })
    .sort((a, b) => b.value - a.value);

  let deposits = 0, withdrawals = 0, realized = 0, buys = 0, sells = 0;
  for (const t of state.transactions) {
    if (t.type === 'deposit') deposits += t.amount;
    else if (t.type === 'withdraw') withdrawals += t.amount;
    else if (t.type === 'buy') buys += t.amount;
    else if (t.type === 'sell') { sells += t.amount; realized += t.pnl || 0; }
  }

  const invested = holdings.reduce((a, h) => a + h.value, 0);
  const cost = holdings.reduce((a, h) => a + h.cost, 0);
  const dayPnl = holdings.reduce((a, h) => a + h.dayPnl, 0);
  const cash = state.balance;
  const total = cash + invested;
  const contributions = deposits - withdrawals;
  const totalPnl = total - contributions;
  const startOfDay = total - dayPnl;

  return {
    holdings,
    invested,
    cost,
    unrealized: invested - cost,
    unrealizedPct: cost ? ((invested - cost) / cost) * 100 : 0,
    realized,
    cash,
    total,
    deposits,
    withdrawals,
    buys,
    sells,
    contributions,
    totalPnl,
    totalPct: contributions ? (totalPnl / contributions) * 100 : 0,
    dayPnl,
    dayPct: startOfDay ? (dayPnl / startOfDay) * 100 : 0,
  };
}

// Días de mercado (lun–vie) equivalentes a N días naturales
const tradingDays = (calendarDays) => Math.max(2, Math.round((calendarDays * 5) / 7));

// Valor estimado del portafolio en los últimos N días con las posiciones actuales (cierres reales)
export function historySeries(state, days, investedOnly = false) {
  const syms = Object.keys(state.holdings).filter((s) => state.prices[s]);
  const refSym = syms[0] || 'AAPL';
  const refDaily = state.prices[refSym]?.daily || [];
  const refTimes = state.prices[refSym]?.dailyTimes || [];
  const n = Math.min(tradingDays(days), refDaily.length);
  const values = [];
  const labels = [];
  for (let i = n; i >= 1; i--) {
    let v = investedOnly ? 0 : state.balance;
    for (const s of syms) {
      const d = state.prices[s].daily;
      v += state.holdings[s].qty * d[Math.max(0, d.length - i)];
    }
    values.push(v);
    const t = refTimes[refTimes.length - i];
    labels.push(t ? fmtShortDate(t) : '');
  }
  let cur = investedOnly ? 0 : state.balance;
  for (const s of syms) cur += state.holdings[s].qty * state.prices[s].price;
  values.push(cur);
  labels.push('Hoy');
  return { values, labels };
}

export function priceSeries(p, range) {
  if (range === '1D') {
    return { values: p.intraday, labels: p.intradayTimes ? p.intradayTimes.map(fmtTime) : null };
  }
  const n = range === '1S' ? 5 : range === '1M' ? 21 : p.daily.length;
  const values = [...p.daily.slice(-n), p.price];
  const times = (p.dailyTimes || []).slice(-n);
  const labels = values.map((_, i) => (i === values.length - 1 ? 'Ahora' : times[i] ? fmtShortDate(times[i]) : ''));
  return { values, labels };
}
