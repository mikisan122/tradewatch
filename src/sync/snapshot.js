import { STOCK_MAP } from '../core/data';
import { dayChangeAbs, dayChangePct } from '../core/selectors';

/**
 * Datos que el teléfono envía al smartwatch. Se generan a partir del mismo
 * estado de la app, así que reflejan compras, ventas, precios y alertas.
 */
export function buildWatchSnapshot(state, totals) {
  return {
    total: totals.total,
    invested: totals.invested,
    cash: totals.cash,
    totalPnl: totals.totalPnl,
    totalPct: totals.totalPct,
    dayPnl: totals.dayPnl,
    dayPct: totals.dayPct,
    positions: totals.holdings.length,
    history: state.portfolioHistory.slice(-40).map((p) => p.v),
    favorites: state.favorites.map((sym) => {
      const p = state.prices[sym];
      const h = state.holdings[sym];
      return {
        symbol: sym,
        name: STOCK_MAP[sym].short,
        price: p.price,
        change: dayChangePct(p),
        changeAbs: dayChangeAbs(p),
        intraday: p.intraday.slice(-30),
        qty: h?.qty || 0,
        pnl: h ? (p.price - h.avg) * h.qty : 0,
      };
    }),
    notifications: state.notifications.slice(0, 20),
    notificationsOn: state.settings.notifications,
    popupsOn: state.settings.watchAlerts && state.settings.notifications,
    userName: state.user.name,
    lastTick: state.lastTick,
    lastTxId: state.transactions[0]?.id || null,
    sentAt: Date.now(),
  };
}
