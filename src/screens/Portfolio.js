import { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../core/store';
import { historySeries } from '../core/selectors';
import { money, pct, signedMoney, trendColor } from '../core/utils';
import { AreaChart, Donut } from '../components/Charts';
import { Screen } from '../components/Screen';
import { Button, Card, Empty, Pair, Row, SectionTitle, Segmented, StockLogo, SummaryRow } from '../components/ui';
import { C } from '../theme';
import { ChartSource } from '../components/MarketInfo';

const COLORS = ['#4f8cff', '#16d68a', '#b79bff', '#ffc75a', '#ff7a9a', '#38d6e8'];

function Mini({ label, value, color }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: C.muted, fontSize: 11.5 }} numberOfLines={1}>{label}</Text>
      <Text style={{ color: color || C.text, fontWeight: '800', fontSize: 14.5 }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function Portfolio() {
  const { state, totals } = useStore();
  const [range, setRange] = useState(30);
  const series = useMemo(() => historySeries(state, range, true), [state, range]);
  const all = totals.total || 1;
  const segments = [
    ...totals.holdings.map((h, i) => ({ key: h.symbol, label: h.symbol, value: h.value, color: COLORS[i % COLORS.length] })),
    { key: 'cash', label: 'Efectivo', value: totals.cash, color: '#3a4766' },
  ];

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: '900' }}>Mi portafolio</Text>
      </Row>
      <Card>
        <Text style={{ color: C.muted, fontSize: 12.5, fontWeight: '600' }}>Valor de inversiones</Text>
        <Text style={{ color: C.text, fontSize: 32, fontWeight: '900' }}>{money(totals.invested)}</Text>
        <Text style={{ color: trendColor(totals.unrealized), fontWeight: '700' }}>
          {signedMoney(totals.unrealized)} ({pct(totals.unrealizedPct)}) <Text style={{ color: C.muted, fontWeight: '400' }}>no realizado</Text>
        </Text>
        <Row>
          <Mini label="Costo total" value={money(totals.cost)} />
          <Mini label="Hoy" value={signedMoney(totals.dayPnl)} color={trendColor(totals.dayPnl)} />
          <Mini label="Realizado" value={signedMoney(totals.realized)} color={trendColor(totals.realized)} />
        </Row>
      </Card>

      {totals.holdings.length === 0 ? (
        <Empty icon="pie-chart-outline" title="Tu portafolio está vacío" text="Compra tu primera acción para empezar." action="Ir al mercado" onAction={() => router.navigate('/mercado')} />
      ) : (
        <>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: C.muted, fontSize: 12.5, fontWeight: '600' }}>Evolución</Text>
              <View style={{ width: 170 }}>
                <Segmented small value={range} onChange={setRange} options={[{ value: 7, label: '7D' }, { value: 30, label: '30D' }, { value: 90, label: '90D' }]} />
              </View>
            </Row>
            <AreaChart data={series.values} labels={series.labels} height={150} interactive format={(v) => money(v)} />
            <Text style={{ color: C.muted, fontSize: 12 }}>Estimado con tus posiciones actuales y cierres reales.</Text>
            <ChartSource />
          </Card>

          <Card>
            <Text style={{ color: C.muted, fontSize: 12.5, fontWeight: '600' }}>Distribución</Text>
            <Row gap={16}>
              <Donut segments={segments}>
                <Text style={{ color: C.muted, fontSize: 11 }}>Total</Text>
                <Text style={{ color: C.text, fontWeight: '800' }}>{money(totals.total, 0)}</Text>
              </Donut>
              <View style={{ flex: 1, gap: 7 }}>
                {segments.map((sg) => (
                  <Row key={sg.key} gap={8}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: sg.color }} />
                    <Text style={{ color: C.text, flex: 1 }}>{sg.label}</Text>
                    <Text style={{ color: C.text, fontWeight: '800' }}>{((sg.value / all) * 100).toFixed(1)}%</Text>
                  </Row>
                ))}
              </View>
            </Row>
          </Card>

          <SectionTitle title={`Mis acciones (${totals.holdings.length})`} action="Historial" onAction={() => router.push('/historial')} />
          {totals.holdings.map((h) => (
            <Card key={h.symbol} style={{ gap: 12 }}>
              <TouchableOpacity onPress={() => router.push(`/accion/${h.symbol}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <StockLogo symbol={h.symbol} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '800' }}>{h.stock.short}</Text>
                  <Text style={{ color: C.muted, fontSize: 12.5 }}>{h.qty} acciones · {h.symbol}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: C.text, fontWeight: '800' }}>{money(h.value)}</Text>
                  <Text style={{ color: trendColor(h.pnl), fontSize: 12.5 }}>{signedMoney(h.pnl)} ({pct(h.pnlPct)})</Text>
                </View>
              </TouchableOpacity>
              <View style={{ gap: 4 }}>
                <SummaryRow label="Precio promedio" value={money(h.avg)} />
                <SummaryRow label="Precio actual" value={money(h.price)} />
                <SummaryRow label="Rendimiento" value={pct(h.pnlPct)} color={trendColor(h.pnlPct)} />
                <SummaryRow label="Peso en cartera" value={`${((h.value / all) * 100).toFixed(1)}%`} />
              </View>
              <View style={{ height: 5, backgroundColor: '#1a2440', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: 5, width: `${Math.min(100, (h.value / (totals.invested || 1)) * 100)}%`, backgroundColor: trendColor(h.pnl) }} />
              </View>
              <Pair>
                <Button title="Comprar más" variant="ghost" size="sm" onPress={() => router.push({ pathname: '/operar', params: { mode: 'buy', symbol: h.symbol } })} />
                <Button title="Vender" variant="sell" size="sm" onPress={() => router.push({ pathname: '/operar', params: { mode: 'sell', symbol: h.symbol } })} />
              </Pair>
            </Card>
          ))}

          <Card>
            <Text style={{ color: C.muted, fontSize: 12.5, fontWeight: '600' }}>Resumen general</Text>
            <SummaryRow label="Efectivo disponible" value={money(totals.cash)} />
            <SummaryRow label="Valor de inversiones" value={money(totals.invested)} />
            <SummaryRow label="Aportaciones netas" value={money(totals.contributions)} />
            <SummaryRow label="Rendimiento total" value={`${signedMoney(totals.totalPnl)} (${pct(totals.totalPct)})`} color={trendColor(totals.totalPnl)} strong />
          </Card>
        </>
      )}
    </Screen>
  );
}
