import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../core/store';
import { STOCK_MAP } from '../core/data';
import { fmtDate, fmtTime, money, signedMoney, trendColor } from '../core/utils';
import { Screen } from '../components/Screen';
import { Card, Chips, Empty, Icon, StockLogo } from '../components/ui';
import { C } from '../theme';

const FILTERS = [
  { value: 'all', label: 'Todo' },
  { value: 'buy', label: 'Compras' },
  { value: 'sell', label: 'Ventas' },
  { value: 'deposit', label: 'Depósitos' },
  { value: 'withdraw', label: 'Retiros' },
  { value: 'wallet', label: 'Billetera' },
];

const META = {
  buy: { label: 'Compra', icon: 'cart', sign: '-' },
  sell: { label: 'Venta', icon: 'pricetag', sign: '+' },
  deposit: { label: 'Depósito', icon: 'arrow-down', sign: '+' },
  withdraw: { label: 'Retiro', icon: 'arrow-up', sign: '-' },
};

export default function History() {
  const params = useLocalSearchParams();
  const { state, totals } = useStore();
  const [filter, setFilter] = useState(params.filter === 'wallet' ? 'wallet' : 'all');

  const groups = useMemo(() => {
    const list = state.transactions.filter(
      (t) => filter === 'all' || t.type === filter || (filter === 'wallet' && (t.type === 'deposit' || t.type === 'withdraw'))
    );
    const map = new Map();
    for (const t of list) {
      const k = fmtDate(t.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(t);
    }
    return [...map.entries()];
  }, [state.transactions, filter]);

  const count = (type) => state.transactions.filter((t) => t.type === type).length;

  return (
    <Screen back title="Historial de operaciones">
      <Card style={{ flexDirection: 'row' }}>
        {[
          [`Compras (${count('buy')})`, money(totals.buys, 0)],
          [`Ventas (${count('sell')})`, money(totals.sells, 0)],
          ['Operaciones', String(state.transactions.length)],
        ].map(([l, v]) => (
          <View key={l} style={{ flex: 1 }}>
            <Text style={{ color: C.muted, fontSize: 11.5 }}>{l}</Text>
            <Text style={{ color: C.text, fontWeight: '800' }}>{v}</Text>
          </View>
        ))}
      </Card>
      <Chips options={FILTERS} value={filter} onChange={setFilter} />
      {groups.length === 0 && <Empty icon="time-outline" title="Sin operaciones" text="No hay movimientos con este filtro." />}
      {groups.map(([day, txs]) => (
        <View key={day} style={{ gap: 8 }}>
          <Text style={{ color: C.muted, fontWeight: '800', fontSize: 12.5, textTransform: 'uppercase', marginLeft: 4 }}>{day}</Text>
          <Card style={{ paddingVertical: 4, gap: 0 }}>
            {txs.map((t, i) => {
              const m = META[t.type];
              const isStock = t.type === 'buy' || t.type === 'sell';
              const inflow = m.sign === '+';
              return (
                <TouchableOpacity
                  key={t.id}
                  disabled={!isStock}
                  onPress={() => router.push(`/accion/${t.symbol}`)}
                  style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(140,165,220,0.22)' }]}
                >
                  {isStock ? (
                    <StockLogo symbol={t.symbol} size={40} />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center'}}>
                      <Icon name={m.icon} size={18} color={inflow ? C.green : C.red} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontWeight: '700' }}>
                      {m.label}
                      {isStock ? ` · ${t.symbol}` : ''}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>
                      {isStock ? `${STOCK_MAP[t.symbol]?.short} · ${t.qty} acc. × ${money(t.price)}` : t.note}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 12 }}>{fmtTime(t.date)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: inflow ? C.green : C.red, fontWeight: '800' }}>
                      {m.sign}
                      {money(t.amount)}
                    </Text>
                    {t.type === 'sell' && t.pnl != null ? <Text style={{ color: trendColor(t.pnl), fontSize: 12 }}>P/G {signedMoney(t.pnl)}</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </Card>
        </View>
      ))}
    </Screen>
  );
}
