import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../core/store';
import { historySeries, dayChangePct } from '../core/selectors';
import { STOCK_MAP } from '../core/data';
import { fmtTime, greeting, money, pct, signedMoney, trendColor } from '../core/utils';
import { AreaChart, Sparkline } from '../components/Charts';
import { Screen } from '../components/Screen';
import { Card, ChangePill, Empty, Icon, SectionTitle, Segmented, StockLogo } from '../components/ui';
import { C } from '../theme';
import { ChartSource } from '../components/MarketInfo';

function Stat({ icon, color, label, value, valueColor, sub }) {
  return (
    <Card style={st.stat}>
      <View style={st.statIcon}>
        <Icon name={icon} size={17} color={color} />
      </View>
      <Text style={st.label}>{label}</Text>
      <Text style={[st.statValue, valueColor && { color: valueColor }]}>{value}</Text>
      {sub ? <Text style={{ color: C.muted, fontSize: 12 }}>{sub}</Text> : null}
    </Card>
  );
}

export default function Dashboard() {
  const { state, totals } = useStore();
  const [range, setRange] = useState('live');

  const series = useMemo(() => {
    if (range === 'live') return { values: state.portfolioHistory.map((p) => p.v), labels: state.portfolioHistory.map((p) => fmtTime(p.t)) };
    return historySeries(state, range === '7d' ? 7 : 30);
  }, [range, state]);

  const first = state.user.name.trim().split(' ')[0] || 'Inversionista';
  const chartCh = series.values.length > 1 ? series.values[series.values.length - 1] - series.values[0] : 0;

  const quick = [
    { icon: 'cart', label: 'Comprar', c: C.green, on: () => router.push({ pathname: '/operar', params: { mode: 'buy' } }) },
    { icon: 'pricetag', label: 'Vender', c: C.red, on: () => router.push({ pathname: '/operar', params: { mode: 'sell' } }) },
    { icon: 'trending-up', label: 'Mercado', c: C.blue, on: () => router.navigate('/mercado') },
    { icon: 'wallet', label: 'Billetera', c: C.amber, on: () => router.navigate('/billetera') },
    { icon: 'time', label: 'Historial', c: C.purple, on: () => router.push('/historial') },
  ];

  return (
    <Screen>
      <View style={st.greet}>
        <View>
          <Text style={{ color: C.muted }}>{greeting()},</Text>
          <Text style={st.name}>{first} 👋</Text>
        </View>
      </View>

      <Card>
        <Text style={st.label}>Valor total de la cuenta</Text>
        <Text style={st.hero}>{money(totals.total)}</Text>
        <Text style={{ color: trendColor(totals.totalPnl), fontWeight: '700' }}>
          {signedMoney(totals.totalPnl)} ({pct(totals.totalPct)}) <Text style={{ color: C.muted, fontWeight: '400' }}>rendimiento total</Text>
        </Text>
        <AreaChart data={series.values} labels={series.labels} height={130} interactive format={(v) => money(v)} color={trendColor(chartCh)} />
        <ChartSource />
        <Segmented
          small
          value={range}
          onChange={setRange}
          options={[
            { value: 'live', label: 'En vivo' },
            { value: '7d', label: '7 días' },
            { value: '30d', label: '30 días' },
          ]}
        />
      </Card>

      <View style={st.grid}>
        <Stat icon="wallet-outline" color={C.blue} label="Saldo disponible" value={money(totals.cash)} />
        <Stat icon="pie-chart-outline" color={C.purple} label="Inversiones" value={money(totals.invested)} />
        <Stat icon="trending-up" color={trendColor(totals.totalPnl)} label="Ganancia / pérdida" value={signedMoney(totals.totalPnl)} valueColor={trendColor(totals.totalPnl)} />
        <Stat icon="flash-outline" color={C.amber} label="Rendimiento" value={pct(totals.totalPct)} valueColor={trendColor(totals.totalPct)} sub={`Hoy ${pct(totals.dayPct)}`} />
      </View>

      <View style={st.quick}>
        {quick.map((q) => (
          <TouchableOpacity key={q.label} style={{ alignItems: 'center', gap: 6, flex: 1 }} onPress={q.on}>
            <View style={[st.quickIcon, { borderColor: q.c + '55' }]}>
              <Icon name={q.icon} size={21} color={q.c} />
            </View>
            <Text style={{ color: C.muted, fontSize: 11.5, fontWeight: '600' }}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionTitle title="Acciones favoritas" action="Editar" onAction={() => router.push({ pathname: '/perfil', params: { section: 'favorites' } })} />
      {state.favorites.length === 0 ? (
        <Empty icon="star-outline" title="Sin favoritas" text="Marca acciones con la estrella para verlas aquí y en tu smartwatch." action="Ir al mercado" onAction={() => router.navigate('/mercado')} />
      ) : (
        <Card style={{ paddingVertical: 4, gap: 0 }}>
          {state.favorites.map((sym, i) => {
            const p = state.prices[sym];
            const ch = dayChangePct(p);
            return (
              <TouchableOpacity key={sym} style={[st.row, i > 0 && st.rowBorder]} onPress={() => router.push(`/accion/${sym}`)}>
                <StockLogo symbol={sym} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '800' }}>{sym}</Text>
                  <Text style={{ color: C.muted, fontSize: 12.5 }}>{STOCK_MAP[sym].short}</Text>
                </View>
                <Sparkline data={p.intraday.slice(-40)} color={trendColor(ch)} />
                <View style={{ alignItems: 'flex-end', gap: 3, minWidth: 80 }}>
                  <Text style={{ color: C.text, fontWeight: '800' }}>{money(p.price)}</Text>
                  <ChangePill value={ch} small />
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

export const st = StyleSheet.create({
  greet: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  name: { color: C.text, fontSize: 24, fontWeight: '900' },
  label: { color: C.muted, fontSize: 12.5, fontWeight: '600' },
  hero: { color: C.text, fontSize: 34, fontWeight: '900', letterSpacing: -0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { width: '47%', flexGrow: 1, paddingVertical: 10, gap: 3, borderBottomWidth: 0 },
  statIcon: { marginBottom: 2 },
  statValue: { color: C.text, fontSize: 18, fontWeight: '800' },
  quick: { flexDirection: 'row', justifyContent: 'space-between' },
  quickIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(140,165,220,0.22)' },
});
