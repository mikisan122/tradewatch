import { useMemo, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../core/store';
import { SECTORS, STOCKS } from '../core/data';
import { dayChangePct } from '../core/selectors';
import { fmtTime, money, trendColor } from '../core/utils';
import { AreaChart } from '../components/Charts';
import { Screen } from '../components/Screen';
import { Button, Card, ChangePill, Chips, Empty, Icon, Pair, Row, Select, StockLogo, s } from '../components/ui';
import { useToast } from '../components/Toast';
import { C } from '../theme';
import { ChartSource } from '../components/MarketInfo';

const FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'fav', label: '★ Favoritas' },
  { value: 'up', label: 'Ganadoras' },
  { value: 'down', label: 'Perdedoras' },
  { value: 'owned', label: 'En cartera' },
];

export default function Market() {
  const { state, dispatch, market } = useStore();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [sector, setSector] = useState('all');
  const [sort, setSort] = useState('name');

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return STOCKS.map((st) => ({ ...st, p: state.prices[st.symbol], ch: dayChangePct(state.prices[st.symbol]) }))
      .filter((st) => !term || st.symbol.toLowerCase().includes(term) || st.name.toLowerCase().includes(term))
      .filter((st) => sector === 'all' || st.sector === sector)
      .filter((st) => {
        if (filter === 'fav') return state.favorites.includes(st.symbol);
        if (filter === 'up') return st.ch >= 0;
        if (filter === 'down') return st.ch < 0;
        if (filter === 'owned') return !!state.holdings[st.symbol];
        return true;
      })
      .sort((a, b) => (sort === 'price' ? b.p.price - a.p.price : sort === 'change' ? b.ch - a.ch : a.short.localeCompare(b.short)));
  }, [q, filter, sector, sort, state.prices, state.favorites, state.holdings]);

  const fav = (sym) => {
    const was = state.favorites.includes(sym);
    dispatch({ type: 'TOGGLE_FAV', symbol: sym });
    toast(was ? `${sym} eliminada de favoritas` : `${sym} agregada a favoritas`, 'info');
  };

  return (
    <Screen>
      <View>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: '900' }}>Mercado bursátil</Text>
        <Text style={{ color: C.muted, fontSize: 12.5 }}>
          {market.marketOpen ? '● Mercado abierto' : 'Mercado cerrado'}
          {market.updatedAt ? ` · actualizado ${fmtTime(market.updatedAt)}` : ''}
          {market.error && !market.updatedAt ? ' · sin conexión con el servidor' : ''}
        </Text>
      </View>
      <View style={s.input}>
        <Icon name="search" size={18} color={C.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar empresa o símbolo (ej. AAPL)"
          placeholderTextColor="#55627f"
          style={{ flex: 1, color: C.text, fontSize: 16, marginLeft: 10 }}
          autoCapitalize="none"
        />
        {q ? (
          <TouchableOpacity onPress={() => setQ('')} hitSlop={10}>
            <Icon name="close-circle" size={18} color={C.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Chips options={FILTERS} value={filter} onChange={setFilter} />
      <Pair>
        <Select value={sector} onChange={setSector} options={[{ value: 'all', label: 'Todos los sectores' }, ...SECTORS.map((x) => ({ value: x, label: x }))]} />
        <Select
          value={sort}
          onChange={setSort}
          options={[
            { value: 'name', label: 'Orden: Nombre' },
            { value: 'price', label: 'Orden: Precio' },
            { value: 'change', label: 'Orden: Variación' },
          ]}
        />
      </Pair>

      {list.length === 0 && <Empty icon="search" title="Sin resultados" text="Prueba con otro nombre, símbolo o filtro." />}

      {list.map((st) => {
        const isFav = state.favorites.includes(st.symbol);
        return (
          <Card key={st.symbol} style={{ gap: 12 }}>
            <Row gap={12}>
              <StockLogo symbol={st.symbol} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{st.short}</Text>
                <Text style={{ color: C.muted, fontSize: 12.5 }}>
                  {st.symbol} · {st.sector}
                </Text>
              </View>
              <TouchableOpacity onPress={() => fav(st.symbol)} hitSlop={10}>
                <Icon name={isFav ? 'star' : 'star-outline'} size={22} color={isFav ? C.amber : '#56627f'} />
              </TouchableOpacity>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: C.text, fontSize: 24, fontWeight: '900' }}>
                {money(st.p.price)} <Text style={{ color: C.muted, fontSize: 12, fontWeight: '500' }}>USD</Text>
              </Text>
              <ChangePill value={st.ch} />
            </Row>
            <AreaChart data={st.p.intraday} height={64} color={trendColor(st.ch)} />
            <ChartSource />
            <Pair>
              <Button title="Ver detalles" variant="ghost" size="sm" onPress={() => router.push(`/accion/${st.symbol}`)} />
              <Button title="Comprar" variant="buy" size="sm" onPress={() => router.push({ pathname: '/operar', params: { mode: 'buy', symbol: st.symbol } })} />
            </Pair>
          </Card>
        );
      })}
    </Screen>
  );
}
