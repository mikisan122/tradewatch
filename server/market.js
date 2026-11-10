/**
 * Precios REALES de acciones desde la API pública de Yahoo Finance (gratuita, sin clave).
 * El servidor consulta cada 20 s, guarda en memoria y la app lee de /api/market.
 */
// Debe coincidir con src/core/data.js
const SYMBOLS = [
  'AAPL', 'TSLA', 'AMZN', 'MSFT', 'GOOGL', 'NVDA',
  'META', 'NFLX', 'AMD', 'INTC', 'DIS', 'KO', 'JPM', 'V', 'WMT', 'NKE',
];
const QUOTE_EVERY_MS = 20 * 1000;
const DAILY_EVERY_MS = 30 * 60 * 1000;
const UA = 'Mozilla/5.0 (TradeWatch)';

const cache = { source: 'Yahoo Finance', updatedAt: null, error: null, symbols: {} };
const daily = {}; // symbol → { closes, times, fetchedAt }

const round2 = (n) => Math.round(n * 100) / 100;

async function chart(symbol, range, interval) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Yahoo ${symbol} HTTP ${res.status}`);
  const json = await res.json();
  const r = json?.chart?.result?.[0];
  if (!r) throw new Error(`Yahoo ${symbol}: sin datos`);
  return r;
}

// Quita puntos vacíos (minutos sin operaciones)
function series(r) {
  const closes = r.indicators?.quote?.[0]?.close || [];
  const times = r.timestamp || [];
  const out = { closes: [], times: [] };
  closes.forEach((c, i) => {
    if (c != null) {
      out.closes.push(round2(c));
      out.times.push(times[i] * 1000);
    }
  });
  return out;
}

async function loadDaily(symbol) {
  const d = daily[symbol];
  if (d && Date.now() - d.fetchedAt < DAILY_EVERY_MS) return d;
  const s = series(await chart(symbol, '3mo', '1d'));
  daily[symbol] = { ...s, fetchedAt: Date.now() };
  return daily[symbol];
}

async function loadSymbol(symbol) {
  const r = await chart(symbol, '1d', '5m');
  const m = r.meta;
  const intra = series(r);
  const opens = r.indicators?.quote?.[0]?.open || [];
  const open = opens.find((o) => o != null) ?? m.chartPreviousClose;
  const reg = m.currentTradingPeriod?.regular;
  const now = Date.now() / 1000;
  const d = await loadDaily(symbol);
  // El histórico diario incluye hoy: se quita la última vela si es del mismo día que el precio actual
  const lastDaily = d.times[d.times.length - 1];
  const sameDay = lastDaily && new Date(lastDaily).toDateString() === new Date(m.regularMarketTime * 1000).toDateString();
  return {
    symbol,
    name: m.longName || m.shortName || symbol,
    price: round2(m.regularMarketPrice),
    prevClose: round2(m.chartPreviousClose ?? m.previousClose),
    open: round2(open),
    high: round2(m.regularMarketDayHigh ?? Math.max(...intra.closes)),
    low: round2(m.regularMarketDayLow ?? Math.min(...intra.closes)),
    volume: m.regularMarketVolume ?? null,
    week52High: m.fiftyTwoWeekHigh ?? null,
    week52Low: m.fiftyTwoWeekLow ?? null,
    currency: m.currency || 'USD',
    exchange: m.fullExchangeName || m.exchangeName,
    marketOpen: !!reg && now >= reg.start && now < reg.end,
    // Horario regular de la sesión (hora exacta, la app lo muestra en hora local)
    sessionStart: reg ? reg.start * 1000 : null,
    sessionEnd: reg ? reg.end * 1000 : null,
    timezone: m.exchangeTimezoneName || 'America/New_York',
    marketTime: m.regularMarketTime * 1000,
    intraday: intra.closes,
    intradayTimes: intra.times,
    daily: sameDay ? d.closes.slice(0, -1) : d.closes,
    dailyTimes: sameDay ? d.times.slice(0, -1) : d.times,
  };
}

async function refresh(log) {
  const results = await Promise.allSettled(SYMBOLS.map(loadSymbol));
  let ok = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      cache.symbols[SYMBOLS[i]] = r.value;
      ok += 1;
    }
  });
  if (ok) {
    cache.updatedAt = Date.now();
    cache.error = null;
  } else {
    const msg = results[0].reason?.message || 'error desconocido';
    if (cache.error !== msg) log?.(`No se pudieron obtener precios de Yahoo Finance: ${msg}`);
    cache.error = msg;
  }
  return ok;
}

function startMarket(log) {
  refresh(log).then((ok) => ok && log?.(`Precios reales cargados (${ok} acciones) · Yahoo Finance`));
  setInterval(() => refresh(log), QUOTE_EVERY_MS);
}

const getMarket = () => cache;

module.exports = { startMarket, getMarket, SYMBOLS };
