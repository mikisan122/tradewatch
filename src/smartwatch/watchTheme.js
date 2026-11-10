export const W = {
  DIAL: 252, // diámetro de la pantalla circular
  CASE: 300, // diámetro de la caja del reloj
  bg: '#000000',
  surface: '#0d1426',
  surface2: '#131d36',
  text: '#ffffff',
  sub: '#8a96b6',
  green: '#16d68a',
  red: '#ff4d6a',
  orange: '#ff9f43',
  blue: '#4f8cff',
};

export const PAGES = [
  { key: 'home', label: 'Inicio', icon: 'time' },
  { key: 'performance', label: 'Rendimiento', icon: 'stats-chart' },
  { key: 'favorites', label: 'Favoritas', icon: 'star' },
  { key: 'alerts', label: 'Alertas', icon: 'notifications' },
  { key: 'account', label: 'Cuenta', icon: 'person' },
];

/** Arco SVG (ángulos en grados, 0 = arriba, sentido horario) */
export function arcPath(cx, cy, r, start, end) {
  const toXY = (a) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [sx, sy] = toXY(start);
  const [ex, ey] = toXY(end);
  const large = end - start > 180 ? 1 : 0;
  return `M${sx.toFixed(2)},${sy.toFixed(2)} A${r},${r} 0 ${large} 1 ${ex.toFixed(2)},${ey.toFixed(2)}`;
}
