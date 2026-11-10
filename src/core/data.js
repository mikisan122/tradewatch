import { round2 } from './utils';

// Catálogo de empresas. Los precios reales vienen del servidor (Yahoo Finance);
// `base` solo se usa como respaldo si no hay conexión.
export const STOCKS = [
  {
    symbol: 'AAPL', name: 'Apple Inc.', short: 'Apple', sector: 'Tecnología',
    base: 350.69, vol: 0.0032, trend: 0.0012, shares: 15.2, pe: 29.4, dividend: 0.52,
    colors: ['#f3f4f6', '#8b93a3'], fg: '#0b1220', mono: 'A',
    founded: 1976, hq: 'Cupertino, California', ceo: 'Tim Cook', employees: '~160,000',
    description:
      'Diseña y comercializa dispositivos electrónicos de consumo, software y servicios digitales. Su ecosistema incluye teléfonos, computadoras, relojes inteligentes, tabletas y servicios de suscripción.',
  },
  {
    symbol: 'TSLA', name: 'Tesla, Inc.', short: 'Tesla', sector: 'Automotriz',
    base: 378.05, vol: 0.0058, trend: -0.0006, shares: 3.2, pe: 61.8, dividend: 0,
    colors: ['#ff4b5c', '#9b0f22'], fg: '#ffffff', mono: 'T',
    founded: 2003, hq: 'Austin, Texas', ceo: 'Elon Musk', employees: '~140,000',
    description:
      'Fabrica vehículos eléctricos, sistemas de almacenamiento de energía y paneles solares. Es conocida por impulsar la movilidad eléctrica y la conducción asistida.',
  },
  {
    symbol: 'AMZN', name: 'Amazon.com, Inc.', short: 'Amazon', sector: 'Comercio',
    base: 266.93, vol: 0.0038, trend: 0.0009, shares: 10.5, pe: 42.1, dividend: 0,
    colors: ['#ffb547', '#d16f00'], fg: '#1a1205', mono: 'a',
    founded: 1994, hq: 'Seattle, Washington', ceo: 'Andy Jassy', employees: '~1,500,000',
    description:
      'Empresa de comercio electrónico y computación en la nube. Opera una de las mayores plataformas de venta en línea y servicios de infraestructura digital del mundo.',
  },
  {
    symbol: 'MSFT', name: 'Microsoft Corp.', short: 'Microsoft', sector: 'Tecnología',
    base: 545.18, vol: 0.0028, trend: 0.0010, shares: 7.43, pe: 35.2, dividend: 0.72,
    colors: ['#4fb3ff', '#1d5fd1'], fg: '#ffffff', mono: 'M',
    founded: 1975, hq: 'Redmond, Washington', ceo: 'Satya Nadella', employees: '~220,000',
    description:
      'Desarrolla software, servicios en la nube, videojuegos y hardware. Sus productos de productividad y su plataforma de nube son usados por empresas en todo el mundo.',
  },
  {
    symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', short: 'Google', sector: 'Comunicación',
    base: 288.15, vol: 0.0034, trend: 0.0007, shares: 12.3, pe: 24.6, dividend: 0.45,
    colors: ['#4285f4', '#34a853'], fg: '#ffffff', mono: 'G',
    founded: 1998, hq: 'Mountain View, California', ceo: 'Sundar Pichai', employees: '~180,000',
    description:
      'Matriz de Google. Opera el buscador más utilizado, plataformas de video, publicidad digital, sistemas operativos móviles y servicios de inteligencia artificial y nube.',
  },
  {
    symbol: 'NVDA', name: 'NVIDIA Corp.', short: 'NVIDIA', sector: 'Semiconductores',
    base: 178.67, vol: 0.0052, trend: 0.0022, shares: 24.5, pe: 58.3, dividend: 0.03,
    colors: ['#9be15d', '#3f8f00'], fg: '#06120a', mono: 'N',
    founded: 1993, hq: 'Santa Clara, California', ceo: 'Jensen Huang', employees: '~30,000',
    description:
      'Diseña procesadores gráficos (GPU) y chips para centros de datos, inteligencia artificial, videojuegos y vehículos autónomos.',
  },
  {
    symbol: 'META', name: 'Meta Platforms, Inc.', short: 'Meta', sector: 'Comunicación',
    base: 641.37, vol: 0.004, trend: 0.001,
    colors: ['#4f9dff', '#1450c8'], fg: '#ffffff', mono: 'M',
    founded: 2004, hq: 'Menlo Park, California',
    description:
      'Opera Facebook, Instagram, WhatsApp y Messenger. Sus ingresos provienen principalmente de la publicidad digital y también invierte en realidad virtual e inteligencia artificial.',
  },
  {
    symbol: 'NFLX', name: 'Netflix, Inc.', short: 'Netflix', sector: 'Entretenimiento',
    base: 63.95, vol: 0.004, trend: 0.001,
    colors: ['#ff3b46', '#7d0a12'], fg: '#ffffff', mono: 'N',
    founded: 1997, hq: 'Los Gatos, California',
    description:
      'Servicio de streaming de series, películas y videojuegos por suscripción, con producción propia de contenido y presencia en más de 190 países.',
  },
  {
    symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', short: 'AMD', sector: 'Semiconductores',
    base: 508.58, vol: 0.005, trend: 0.001,
    colors: ['#ff6a6a', '#2b2b2b'], fg: '#ffffff', mono: 'A',
    founded: 1969, hq: 'Santa Clara, California',
    description:
      'Diseña procesadores (CPU), tarjetas gráficas (GPU) y chips para centros de datos, computadoras personales y consolas de videojuegos.',
  },
  {
    symbol: 'INTC', name: 'Intel Corporation', short: 'Intel', sector: 'Semiconductores',
    base: 59.37, vol: 0.005, trend: 0,
    colors: ['#3fb6ff', '#0a5fb0'], fg: '#ffffff', mono: 'i',
    founded: 1968, hq: 'Santa Clara, California',
    description:
      'Fabricante de microprocesadores y semiconductores para computadoras, servidores y redes. Además ofrece servicios de fabricación de chips para otras empresas.',
  },
  {
    symbol: 'DIS', name: 'The Walt Disney Company', short: 'Disney', sector: 'Entretenimiento',
    base: 119.12, vol: 0.003, trend: 0,
    colors: ['#6aa8ff', '#1d3c8f'], fg: '#ffffff', mono: 'D',
    founded: 1923, hq: 'Burbank, California',
    description:
      'Conglomerado de entretenimiento: estudios de cine, parques temáticos, cruceros, canales de televisión, ESPN y la plataforma de streaming Disney+.',
  },
  {
    symbol: 'KO', name: 'The Coca-Cola Company', short: 'Coca-Cola', sector: 'Consumo',
    base: 96.03, vol: 0.002, trend: 0,
    colors: ['#ff5252', '#b0000f'], fg: '#ffffff', mono: 'C',
    founded: 1892, hq: 'Atlanta, Georgia',
    description:
      'Empresa de bebidas con marcas como Coca-Cola, Sprite, Fanta, aguas, jugos y cafés, vendidas en más de 200 países.',
  },
  {
    symbol: 'JPM', name: 'JPMorgan Chase & Co.', short: 'JPMorgan', sector: 'Finanzas',
    base: 342.08, vol: 0.003, trend: 0,
    colors: ['#b8c3d6', '#4a5874'], fg: '#ffffff', mono: 'J',
    founded: 1799, hq: 'Nueva York, Nueva York',
    description:
      'Uno de los bancos más grandes del mundo: banca de consumo, banca de inversión, gestión de patrimonio y servicios financieros para empresas.',
  },
  {
    symbol: 'V', name: 'Visa Inc.', short: 'Visa', sector: 'Finanzas',
    base: 422.16, vol: 0.0025, trend: 0,
    colors: ['#3d5bff', '#1a1f71'], fg: '#ffffff', mono: 'V',
    founded: 1958, hq: 'San Francisco, California',
    description:
      'Red global de pagos electrónicos que procesa transacciones con tarjetas de débito y crédito entre consumidores, comercios y bancos.',
  },
  {
    symbol: 'WMT', name: 'Walmart Inc.', short: 'Walmart', sector: 'Comercio',
    base: 125.66, vol: 0.0025, trend: 0,
    colors: ['#4fa3ff', '#0b4fa8'], fg: '#ffc220', mono: 'W',
    founded: 1962, hq: 'Bentonville, Arkansas',
    description:
      'La cadena minorista más grande del mundo, con supermercados, tiendas de descuento, clubes de precio (Sam\'s Club) y comercio en línea.',
  },
  {
    symbol: 'NKE', name: 'NIKE, Inc.', short: 'Nike', sector: 'Consumo',
    base: 39.88, vol: 0.0035, trend: 0,
    colors: ['#f2f2f2', '#9a9a9a'], fg: '#111111', mono: 'N',
    founded: 1964, hq: 'Beaverton, Oregón',
    description:
      'Diseña y vende calzado, ropa y equipo deportivo. Es una de las marcas deportivas más reconocidas del mundo.',
  },
];

export const STOCK_MAP = Object.fromEntries(STOCKS.map((s) => [s.symbol, s]));
export const SECTORS = [...new Set(STOCKS.map((s) => s.sector))];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DAILY_POINTS = 90;
export const INTRADAY_POINTS = 48;

// Genera historial ficticio reproducible para cada acción.
export function buildInitialPrices() {
  const out = {};
  STOCKS.forEach((s, idx) => {
    const rnd = mulberry32(7919 + idx * 131);
    const g = () => {
      let u = 0, v = 0;
      while (!u) u = rnd();
      while (!v) v = rnd();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    const daily = [s.base];
    let p = s.base;
    for (let i = 1; i < DAILY_POINTS; i++) {
      p = p / (1 + g() * s.vol * 4.5 + s.trend);
      daily.unshift(round2(p));
    }
    const prevClose = daily[daily.length - 1];
    const open = round2(prevClose * (1 + g() * s.vol));
    const intraday = [open];
    let q = open;
    for (let i = 1; i < INTRADAY_POINTS; i++) {
      q = q * (1 + g() * s.vol);
      intraday.push(round2(q));
    }
    out[s.symbol] = {
      price: q > 0 ? round2(q) : open,
      open,
      prevClose,
      high: Math.max(...intraday),
      low: Math.min(...intraday),
      daily,
      intraday,
    };
  });
  return out;
}
