import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../core/store';
import { fmtDateTime, money } from '../core/utils';
import { Screen } from '../components/Screen';
import { Button, Card, Chips, ConfirmSheet, Empty, Field, Icon, Row, SectionTitle, Segmented, SummaryRow, s } from '../components/ui';
import { useToast } from '../components/Toast';
import { C } from '../theme';

const MAX_DEPOSIT = 50000;

export default function Wallet() {
  const { state, dispatch, totals } = useStore();
  const toast = useToast();
  const [mode, setMode] = useState('deposit');
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const isDep = mode === 'deposit';
  const valid = /^\d+(\.\d{1,2})?$/.test(amountStr);
  const amount = valid ? parseFloat(amountStr) : 0;

  let error = '';
  if (!amountStr) error = 'Indica un monto.';
  else if (!valid) error = 'Monto inválido. Usa números con hasta 2 decimales (ej. 250.50).';
  else if (amount <= 0) error = 'El monto debe ser mayor a $0.';
  else if (isDep && amount > MAX_DEPOSIT) error = `El depósito máximo por movimiento es ${money(MAX_DEPOSIT)}.`;
  else if (!isDep && amount > state.balance) error = `Saldo insuficiente. Disponible: ${money(state.balance)}.`;
  else if (note.length > 40) error = 'El concepto admite máximo 40 caracteres.';

  const moves = state.transactions.filter((t) => t.type === 'deposit' || t.type === 'withdraw');
  const setAmount = (v) => {
    setTouched(true);
    setAmountStr(v.replace(',', '.').trim());
  };

  const submit = () => {
    setTouched(true);
    if (error) return toast(error, 'error');
    setConfirm(true);
  };
  const execute = () => {
    setConfirm(false);
    if (!isDep && amount > state.balance) return toast('Saldo insuficiente.', 'error');
    dispatch({ type: isDep ? 'DEPOSIT' : 'WITHDRAW', amount, note: note.trim(), now: Date.now() });
    toast(isDep ? `Depósito de ${money(amount)} realizado` : `Retiro de ${money(amount)} completado`);
    setAmountStr('');
    setNote('');
    setTouched(false);
  };

  return (
    <Screen>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: '900' }}>Billetera</Text>
      <Card style={{ gap: 4 }}>
        <Text style={{ color: C.muted, fontWeight: '600', fontSize: 12.5 }}>Saldo disponible</Text>
        <Text style={{ color: C.text, fontSize: 36, fontWeight: '900' }}>{money(state.balance)}</Text>
        <Text style={{ color: C.muted, fontSize: 13 }}>Invertido {money(totals.invested)}</Text>
      </Card>

      <Card style={{ flexDirection: 'row' }}>
        {[
          ['Depósitos', money(totals.deposits, 0), C.green],
          ['Retiros', money(totals.withdrawals, 0), C.red],
          ['Neto aportado', money(totals.contributions, 0), C.text],
        ].map(([l, v, c]) => (
          <View key={l} style={{ flex: 1 }}>
            <Text style={{ color: C.muted, fontSize: 11.5 }}>{l}</Text>
            <Text style={{ color: c, fontWeight: '800' }}>{v}</Text>
          </View>
        ))}
      </Card>

      <Segmented
        value={mode}
        onChange={(m) => { setMode(m); setTouched(false); }}
        options={[{ value: 'deposit', label: '+ Agregar dinero' }, { value: 'withdraw', label: '− Solicitar retiro' }]}
      />

      <Card style={{ gap: 14 }}>
        <Field
          label={isDep ? 'Monto a depositar (USD)' : 'Monto a retirar (USD)'}
          prefix="$"
          value={amountStr}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          inputStyle={{ fontSize: 20, fontWeight: '800' }}
          error={touched ? error : ''}
        />
        <Chips
          wrap
          value={null}
          onChange={(v) => setAmount(v === 'all' ? state.balance.toFixed(2) : String(v))}
          options={(isDep ? [100, 500, 1000, 5000] : [100, 500, 1000]).map((v) => ({ value: v, label: `$${v.toLocaleString()}` })).concat(isDep ? [] : [{ value: 'all', label: 'Todo' }])}
        />
        <Field label="Concepto (opcional)" value={note} onChangeText={setNote} placeholder={isDep ? 'Ej. Ahorro mensual' : 'Ej. Retiro de ganancias'} maxLength={60} />
        <View style={{ gap: 7 }}>
          <Text style={{ color: C.muted, fontWeight: '600', fontSize: 13 }}>{isDep ? 'Origen' : 'Destino'}</Text>
          <View style={s.input}>
            <Icon name="shield-checkmark-outline" size={18} color={C.green} />
            <Text style={{ color: C.text, marginLeft: 10 }}>Cuenta TradeWatch</Text>
          </View>
        </View>
        {!isDep && valid && amount > 0 && amount <= state.balance ? <SummaryRow label="Saldo después del retiro" value={money(state.balance - amount)} /> : null}
        <Button title={isDep ? 'Depositar' : 'Solicitar retiro'} variant={isDep ? 'buy' : 'primary'} size="lg" onPress={submit} />
      </Card>

      <SectionTitle title="Depósitos y retiros" action="Ver todo" onAction={() => router.push({ pathname: '/historial', params: { filter: 'wallet' } })} />
      {moves.length === 0 ? (
        <Empty icon="wallet-outline" title="Sin movimientos" text="Tus depósitos y retiros aparecerán aquí." />
      ) : (
        <Card style={{ paddingVertical: 4, gap: 0 }}>
          {moves.slice(0, 8).map((t, i) => {
            const dep = t.type === 'deposit';
            return (
              <Row key={t.id} gap={12} style={[{ paddingVertical: 12 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(140,165,220,0.22)' }]}>
                <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center'}}>
                  <Icon name={dep ? 'arrow-down' : 'arrow-up'} size={18} color={dep ? C.green : C.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700' }}>{dep ? 'Depósito' : 'Retiro'}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>{t.note} · {fmtDateTime(t.date)}</Text>
                </View>
                <Text style={{ color: dep ? C.green : C.red, fontWeight: '800' }}>{dep ? '+' : '-'}{money(t.amount)}</Text>
              </Row>
            );
          })}
        </Card>
      )}

      <ConfirmSheet
        visible={confirm}
        title={isDep ? 'Confirmar depósito' : 'Confirmar retiro'}
        confirmLabel={isDep ? 'Depositar' : 'Retirar'}
        variant={isDep ? 'buy' : 'primary'}
        onCancel={() => setConfirm(false)}
        onConfirm={execute}
      >
        <SummaryRow label="Tipo" value={isDep ? 'Depósito' : 'Retiro'} />
        <SummaryRow label="Monto" value={money(amount)} strong />
        {note.trim() ? <SummaryRow label="Concepto" value={note.trim()} /> : null}
        <SummaryRow label="Saldo actual" value={money(state.balance)} />
        <SummaryRow label="Saldo resultante" value={money(isDep ? state.balance + amount : state.balance - amount)} />
      </ConfirmSheet>
    </Screen>
  );
}
