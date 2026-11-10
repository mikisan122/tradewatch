// Utilidades de formato sin depender de Intl (funciona igual en Android e iOS)
export const GREEN = '#16d68a';
export const RED = '#ff4d6a';

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

const z = (n) => (Math.abs(n) < 0.005 ? 0 : n);

function num(n, d = 2) {
  const fixed = Math.abs(n).toFixed(d);
  const [int, dec] = fixed.split('.');
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec ? `${withCommas}.${dec}` : withCommas;
}

export const money = (n, d = 2) => (z(n) < 0 ? '-$' : '$') + num(n, d);
export const signedMoney = (n, d = 2) => (z(n) < 0 ? '-$' : '+$') + num(n, d);
export const pct = (n) => (z(n) < 0 ? '-' : '+') + num(n, 2) + '%';
export const absPct = (n) => num(n, 2) + '%';
export const isUp = (n) => z(n) >= 0;
export const trendColor = (n) => (isUp(n) ? GREEN : RED);

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const pad = (n) => String(n).padStart(2, '0');

export const fmtTime = (ts) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fmtTimeSec = (ts) => {
  const d = new Date(ts);
  return `${fmtTime(ts)}:${pad(d.getSeconds())}`;
};
export const fmtDate = (ts) => {
  const d = new Date(ts);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
export const fmtShortDate = (ts) => {
  const d = new Date(ts);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`;
};
export const fmtDateTime = (ts) => `${fmtDate(ts)} · ${fmtTime(ts)}`;
export const fmtWatchDate = (ts) => {
  const d = new Date(ts);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return fmtShortDate(ts);
}

export function gauss() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
};

export const initials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
