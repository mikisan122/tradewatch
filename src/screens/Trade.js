import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../core/store';
import { STOCKS, STOCK_MAP } from '../core/data';
import { dayChangePct } from '../core/selectors';
import { fmtDateTime, money, round2, signedMoney, trendColor } from '../core/utils';
import { Screen } from '../components/Screen';
import {
  Button, Card, ChangePill, Chips, ConfirmSheet, Divider, Empty, Icon, Pair, Row, Segmented, Select, StockLogo, SummaryRow, s,
} from '../components/ui';
import { useToast } from '../components/Toast';
import { TextInput } from 'react-native';
import { C } from '../theme';

const MAX_QTY = 10000;

export default function Trade() {
  const params = useLocalSearchParams();
  const { state, dispatch } = useStore();
  const toast = useToast();
  const owned = Object.keys(state.holdings);
  const [mode, setMode] = useState(params.mode === 'sell' ? 'sell' : 'buy');
  const [symbol, setSymbol] = useState(params.symbol || (params.mode === 'sell' ? owned[0] || '' : 'AAPL'));
  const [qtyStr, setQtyStr] = useState('1');
  const [touched, setTouched] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (mode === 'sell' && !state.holdings[symbol]) setSymbol(owned[0] || '');
    if (mode === 'buy' && !symbol) setSymbol('AAPL');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const isBuy = mode === 'buy';
  const p = symbol ? state.prices[symbol] : null;
  const holding = state.holdings[symbol];
  const qtyValid = /^\d+$/.test(qtyStr);
  const qty = qtyValid ? parseInt(qtyStr, 10) : 0;
  const total = p ? round2(qty * p.price) : 0;

  let error = '';
  if (!symbol) error = isBuy ? 'Selecciona una empresa.' : 'No tienes acciones para vender.';
  else if (!qtyStr) error = 'Indica la cantidad de acciones.';
  else if (!qtyValid) error = 'La cantidad debe ser un número entero, sin decimales ni signos.';
  else if (qty < 1) error = 'La cantidad mínima es 1 acción.';
  else if (qty > MAX_QTY) error = `La cantidad máxima por operación es ${MAX_QTY.toLocaleString()} acciones.`;
  else if (isBuy && total > state.balance) error = `Saldo insuficiente. Te faltan ${money(total - state.balance)}.`;
  else if (!isBuy && (!holding || qty > holding.qty)) error = `Solo tienes ${holding?.qty || 0} acciones de ${symbol}.`;

  const maxQty = !p ? 0 : isBuy ? Math.min(MAX_QTY, Math.floor(state.balance / p.price)) : holding?.qty || 0;
  const setQty = (v) => {
    setTouched(true);
    setQtyStr(v);
  };
  const step = (d) => setQty(String(Math.max(1, Math.min(MAX_QTY, (qtyValid ? qty : 0) + d))));

  const submit = () => {
    setTouched(true);
    if (error) return toast(error, 'error');
    setConfirm(true);
  };

  const execute = () => {
    setConfirm(false);
    const price = state.prices[symbol].price;
    const amount = round2(price * qty);
    if (isBuy && amount > state.balance) return toast('El precio cambió y tu saldo ya no alcanza.', 'error');
    if (!isBuy && (!state.holdings[symbol] || qty > state.holdings[symbol].qty)) return toast('Cantidad no disponible.', 'error');
    const avg = state.holdings[symbol]?.avg ?? 0;
    dispatch({ type: isBuy ? 'BUY' : 'SELL', symbol, qty, now: Date.now() });
    setDone({ mode, symbol, qty, price, amount, pnl: isBuy ? null : round2((price - avg) * qty), date: Date.now() });
    toast(isBuy ? `¡Compra exitosa! ${qty} ${symbol} por ${money(amount)}` : `¡Venta exitosa! Recibiste ${money(amount)}`);
  };

  if (done) {
    const buy = done.mode === 'buy';
    return (
      <Screen back title={buy ? 'Compra realizada' : 'Venta realizada'}>
        <Card style={{ alignItems: 'center', paddingVertical: 26, gap: 12 }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: buy ? C.green : C.amber, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="checkmark" size={40} color="#032316" />
          </View>
          <Text style={{ color: C.text, fontSize: 24, fontWeight: '900' }}>{buy ? '¡Compra exitosa!' : '¡Venta exitosa!'}</Text>
          <Text style={{ color: C.muted }}>{fmtDateTime(done.date)}</Text>
          <View style={{ alignSelf: 'stretch', gap: 6, paddingVertical: 8 }}>
            <SummaryRow label="Empresa" value={`${STOCK_MAP[done.symbol].short} (${done.symbol})`} />
            <SummaryRow label="Cantidad" value={`${done.qty} acciones`} />
            <SummaryRow label={buy ? 'Precio de compra' : 'Precio de venta'} value={money(done.price)} />
            <SummaryRow label={buy ? 'Total pagado' : 'Importe recibido'} value={money(done.amount)} strong />
            {!buy && <SummaryRow label="Resultado" value={signedMoney(done.pnl)} color={trendColor(done.pnl)} />}
            <SummaryRow label="Saldo disponible" value={money(state.balance)} />
          </View>
          <View style={{ alignSelf: 'stretch' }}>
            <Pair>
              <Button title="Nueva operación" variant="ghost" onPress={() => { setDone(null); setQtyStr('1'); setTouched(false); }} />
              <Button title="Ver portafolio" onPress={() => router.navigate('/portafolio')} />
            </Pair>
          </View>
        </Card>
      </Screen>
    );
  }

  const options = (isBuy ? STOCKS.map((x) => x.symbol) : owned).map((sym) => ({
    value: sym,
    label: `${STOCK_MAP[sym].short} (${sym})${!isBuy ? ` · ${state.holdings[sym].qty} acc.` : ''}`,
  }));

  return (
    <Screen back title={isBuy ? 'Comprar acciones' : 'Vender acciones'}>
      <Segmented
        value={mode}
        onChange={(m) => { setMode(m); setTouched(false); setQtyStr('1'); }}
        options={[{ value: 'buy', label: 'Comprar' }, { value: 'sell', label: 'Vender' }]}
      />

      {!isBuy && owned.length === 0 ? (
        <Empty icon="pie-chart-outline" title="No tienes acciones" text="Compra acciones primero para poder venderlas." action="Comprar acciones" onAction={() => setMode('buy')} />
      ) : (
        <>
          <Card style={{ gap: 14 }}>
            <Select label={isBuy ? 'Empresa' : 'Acción que posees'} value={symbol} options={options} onChange={(v) => { setSymbol(v); setTouched(false); }} />
            {p && (
              <TouchableOpacity onPress={() => router.push(`/accion/${symbol}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
                <StockLogo symbol={symbol} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '800' }}>{STOCK_MAP[symbol].name}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{isBuy ? 'Precio unitario' : 'Precio de venta'} · en vivo</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <Text style={{ color: C.text, fontWeight: '800' }}>{money(p.price)}</Text>
                  <ChangePill value={dayChangePct(p)} small />
                </View>
              </TouchableOpacity>
            )}
            <View style={{ gap: 7 }}>
              <Text style={{ color: C.muted, fontWeight: '600', fontSize: 13 }}>
                Cantidad de acciones{!isBuy && holding ? ` · disponibles: ${holding.qty}` : ''}
              </Text>
              <Row>
                <TouchableOpacity style={qtyBtn} onPress={() => step(-1)}>
                  <Icon name="remove" />
                </TouchableOpacity>
                <View style={[s.input, { flex: 1 }, touched && error && { borderColor: C.red }]}>
                  <TextInput
                    value={qtyStr}
                    onChangeText={(t) => setQty(t.trim())}
                    keyboardType="number-pad"
                    style={{ flex: 1, color: C.text, fontSize: 20, fontWeight: '800', textAlign: 'center' }}
                  />
                </View>
                <TouchableOpacity style={qtyBtn} onPress={() => step(1)}>
                  <Icon name="add" />
                </TouchableOpacity>
              </Row>
            </View>
            <Chips
              wrap
              value={null}
              onChange={(v) => setQty(v === 'max' ? String(Math.max(1, maxQty)) : String(v))}
              options={[1, 5, 10, 25].map((n) => ({ value: n, label: String(n) })).concat({ value: 'max', label: `Máx (${maxQty})`, disabled: maxQty < 1 })}
            />
            {touched && error ? <Text style={s.error}>{error}</Text> : null}
          </Card>

          <Card>
            <SummaryRow label={isBuy ? 'Precio unitario' : 'Precio de venta'} value={p ? money(p.price) : '—'} />
            <SummaryRow label="Cantidad" value={qtyValid ? String(qty) : '—'} />
            <SummaryRow label={isBuy ? 'Costo total' : 'Importe a recibir'} value={money(total)} strong />
            <Divider />
            <SummaryRow label="Saldo disponible" value={money(state.balance)} />
            <SummaryRow label="Saldo después" value={money(isBuy ? state.balance - total : state.balance + total)} color={isBuy && total > state.balance ? C.red : undefined} />
            {!isBuy && holding && qty > 0 && p ? (
              <SummaryRow label="Ganancia / pérdida estimada" value={signedMoney((p.price - holding.avg) * qty)} color={trendColor(p.price - holding.avg)} />
            ) : null}
          </Card>

          <Button title={isBuy ? 'Confirmar compra' : 'Confirmar venta'} variant={isBuy ? 'buy' : 'sell'} size="lg" onPress={submit} disabled={!!error && touched} />
        </>
      )}

      <ConfirmSheet
        visible={confirm}
        title={isBuy ? 'Confirmar compra' : 'Confirmar venta'}
        confirmLabel={isBuy ? 'Comprar ahora' : 'Vender ahora'}
        variant={isBuy ? 'buy' : 'sell'}
        onCancel={() => setConfirm(false)}
        onConfirm={execute}
      >
        {p ? (
          <>
            <Row gap={12}>
              <StockLogo symbol={symbol} size={40} />
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{STOCK_MAP[symbol].short} · {symbol}</Text>
            </Row>
            <SummaryRow label="Cantidad" value={`${qty} acciones`} />
            <SummaryRow label="Precio actual" value={money(p.price)} />
            <SummaryRow label={isBuy ? 'Total a pagar' : 'Total a recibir'} value={money(total)} strong />
            <Text style={{ color: C.muted, fontSize: 12.5 }}>El precio final se fija al confirmar.</Text>
          </>
        ) : null}
      </ConfirmSheet>
    </Screen>
  );
}

const qtyBtn = { width: 48, height: 48, borderRadius: 14, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' };
