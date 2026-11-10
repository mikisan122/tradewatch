import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../core/store';
import { STOCK_MAP } from '../core/data';
import { dayChangeAbs, dayChangePct, priceSeries } from '../core/selectors';
import { fmtTime, money, pct, signedMoney, trendColor } from '../core/utils';
import { AreaChart } from '../components/Charts';
import { Screen } from '../components/Screen';
import { Button, Card, ChangePill, Icon, Pair, Row, Segmented, StockLogo, SummaryRow } from '../components/ui';
import { useToast } from '../components/Toast';
import { C } from '../theme';
import { ChartSource, MarketHours } from '../components/MarketInfo';

function Stat({ label, value }) {
  return (
    <View style={{ width: '46%', paddingVertical: 8, gap: 2, flexGrow: 1, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(140,165,220,0.22)' }}>
      <Text style={{ color: C.muted, fontSize: 11.5 }}>{label}</Text>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{value}</Text>
    </View>
  );
}

export default function StockDetail() {
  const { symbol } = useLocalSearchParams();
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [range, setRange] = useState('1D');
  const st = STOCK_MAP[symbol];
  if (!st) return <Screen back title="Detalle"><Text style={{ color: C.text }}>Acción no encontrada.</Text></Screen>;

  const p = state.prices[st.symbol];
  const ch = dayChangePct(p);
  const { values, labels } = priceSeries(p, range);
  const rangeCh = ((values[values.length - 1] - values[0]) / values[0]) * 100;
  const isFav = state.favorites.includes(st.symbol);
  const h = state.holdings[st.symbol];

  return (
    <Screen back title={st.short}>
      <Row gap={14}>
        <StockLogo symbol={st.symbol} size={54} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 19, fontWeight: '900' }}>{st.name}</Text>
          <Text style={{ color: C.muted }}>
            {st.symbol} · {st.sector}
          </Text>
        </View>
        <TouchableOpacity
          hitSlop={10}
          onPress={() => {
            dispatch({ type: 'TOGGLE_FAV', symbol: st.symbol });
            toast(isFav ? `${st.symbol} eliminada de favoritas` : `${st.symbol} agregada a favoritas`, 'info');
          }}
        >
          <Icon name={isFav ? 'star' : 'star-outline'} size={26} color={isFav ? C.amber : '#56627f'} />
        </TouchableOpacity>
      </Row>

      <View style={{ gap: 8 }}>
        <Text style={{ color: C.text, fontSize: 34, fontWeight: '900' }}>{money(p.price)}</Text>
        <Row>
          <ChangePill value={ch} />
          <Text style={{ color: trendColor(ch), fontWeight: '600' }}>{signedMoney(dayChangeAbs(p))} hoy</Text>
        </Row>
        <Text style={{ color: C.muted, fontSize: 12.5 }}>
          {p.marketOpen ? '● Mercado abierto' : 'Mercado cerrado · último precio'}
          {p.marketTime ? ` · ${fmtTime(p.marketTime)}` : ''}
          {p.exchange ? ` · ${p.exchange}` : ''}
        </Text>
      </View>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: C.muted, fontWeight: '600', fontSize: 12.5 }}>Gráfica histórica</Text>
          <Text style={{ color: trendColor(rangeCh), fontWeight: '700' }}>{pct(rangeCh)}</Text>
        </Row>
        <AreaChart data={values} labels={labels} height={190} interactive format={(v) => money(v)} baseline={range === '1D' ? p.prevClose : undefined} />
        <ChartSource />
        <Segmented small value={range} onChange={setRange} options={['1D', '1S', '1M', '3M'].map((r) => ({ value: r, label: r }))} />
      </Card>

      <Card>
        <MarketHours price={p} />
      </Card>

      <Pair>
        <Button title="COMPRAR" icon="cart" variant="buy" size="lg" onPress={() => router.push({ pathname: '/operar', params: { mode: 'buy', symbol: st.symbol } })} />
        <Button
          title="VENDER"
          icon="pricetag"
          variant="sell"
          size="lg"
          onPress={() => (h ? router.push({ pathname: '/operar', params: { mode: 'sell', symbol: st.symbol } }) : toast(`No tienes acciones de ${st.symbol} para vender`, 'error'))}
        />
      </Pair>

      {h && (
        <Card>
          <Text style={{ color: C.muted, fontWeight: '600', fontSize: 12.5 }}>Tu posición</Text>
          <SummaryRow label="Acciones" value={String(h.qty)} />
          <SummaryRow label="Precio promedio" value={money(h.avg)} />
          <SummaryRow label="Valor actual" value={money(h.qty * p.price)} />
          <SummaryRow label="Ganancia / pérdida" value={`${signedMoney((p.price - h.avg) * h.qty)} (${pct(((p.price - h.avg) / h.avg) * 100)})`} color={trendColor(p.price - h.avg)} strong />
        </Card>
      )}

      <Card>
        <Text style={{ color: C.muted, fontWeight: '600', fontSize: 12.5 }}>Estadísticas del día</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18 }}>
          <Stat label="Apertura" value={money(p.open)} />
          <Stat label="Cierre anterior" value={money(p.prevClose)} />
          <Stat label="Máximo" value={money(p.high)} />
          <Stat label="Mínimo" value={money(p.low)} />
          <Stat label="Volumen" value={p.volume ? p.volume.toLocaleString('en-US') : '—'} />
          <Stat label="Rango 52 semanas" value={p.week52Low ? `${money(p.week52Low, 0)} – ${money(p.week52High, 0)}` : '—'} />
        </View>
      </Card>

      <Card>
        <Text style={{ color: C.muted, fontWeight: '600', fontSize: 12.5 }}>Acerca de {st.short}</Text>
        <Text style={{ color: '#c3cde6', lineHeight: 21 }}>{st.description}</Text>
        <SummaryRow label="Fundación" value={String(st.founded)} />
        <SummaryRow label="Sede" value={st.hq} />
        {st.ceo ? <SummaryRow label="Director general" value={st.ceo} /> : null}
        {st.employees ? <SummaryRow label="Empleados" value={st.employees} /> : null}
      </Card>
    </Screen>
  );
}
