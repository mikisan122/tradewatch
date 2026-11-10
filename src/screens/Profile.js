import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../core/store';
import { STOCKS } from '../core/data';
import { fmtDate, initials, money } from '../core/utils';
import { Screen } from '../components/Screen';
import { Button, Card, ConfirmSheet, Field, Icon, Pair, Row, SectionTitle, Select, Sheet, StockLogo, Toggle, s } from '../components/ui';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthProvider';
import { C } from '../theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function LinkRow({ icon, label, onPress, danger }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <Icon name={icon} size={19} color={danger ? C.red : C.text} />
      <Text style={{ flex: 1, color: danger ? C.red : C.text, fontWeight: '600' }}>{label}</Text>
      {!danger && <Icon name="chevron-forward" size={16} color={C.muted} />}
    </TouchableOpacity>
  );
}

export default function Profile() {
  const params = useLocalSearchParams();
  const { state, dispatch, totals, session, cloud, saveNow } = useStore();
  const { logout } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const toast = useToast();
  const scrollTarget = useRef(null);
  const set = (patch) => dispatch({ type: 'UPDATE_SETTINGS', settings: patch });
  const st = state.settings;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(state.user);
  const [errors, setErrors] = useState({});
  const [reset, setReset] = useState(false);
  const [alert, setAlert] = useState({ symbol: 'AAPL', condition: 'above', price: '' });
  const [alertErr, setAlertErr] = useState('');
  const [favHint, setFavHint] = useState(params.section === 'favorites');

  useEffect(() => {
    if (!favHint) return undefined;
    const t = setTimeout(() => setFavHint(false), 2500);
    return () => clearTimeout(t);
  }, [favHint]);

  const saveProfile = () => {
    const e = {};
    const name = form.name.trim();
    if (name.length < 2) e.name = 'El nombre debe tener al menos 2 caracteres.';
    else if (name.length > 40) e.name = 'Máximo 40 caracteres.';
    else if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ .'-]+$/.test(name)) e.name = 'Usa solo letras y espacios.';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Ingresa un correo válido (ej. nombre@correo.com).';
    if (form.phone && !/^\+?[\d\s-]{8,16}$/.test(form.phone.trim())) e.phone = 'Teléfono inválido (8 a 16 dígitos).';
    setErrors(e);
    if (Object.keys(e).length) return;
    dispatch({ type: 'UPDATE_USER', user: { name, email: form.email.trim(), phone: (form.phone || '').trim() } });
    setEditing(false);
    toast('Perfil actualizado');
  };

  const addAlert = () => {
    const v = parseFloat(alert.price);
    if (!/^\d+(\.\d{1,2})?$/.test(alert.price) || !(v > 0)) return setAlertErr('Ingresa un precio objetivo válido.');
    const cur = state.prices[alert.symbol].price;
    if (alert.condition === 'above' && v <= cur) return setAlertErr(`Para "sube a", el precio debe ser mayor al actual (${money(cur)}).`);
    if (alert.condition === 'below' && v >= cur) return setAlertErr(`Para "baja a", el precio debe ser menor al actual (${money(cur)}).`);
    setAlertErr('');
    dispatch({ type: 'ADD_ALERT', alert: { symbol: alert.symbol, condition: alert.condition, price: v }, now: Date.now() });
    setAlert({ ...alert, price: '' });
    toast(`Alerta creada para ${alert.symbol}`, 'info');
  };

  return (
    <Screen back title="Perfil y configuración">
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#04101f', fontWeight: '900', fontSize: 22 }}>{initials(state.user.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 19, fontWeight: '900' }}>{state.user.name}</Text>
          <Text style={{ color: C.green, fontSize: 13, fontWeight: '700' }}>@{session.user.username}</Text>
          <Text style={{ color: C.muted, fontSize: 12.5 }}>{state.user.email}</Text>
          {state.user.phone ? <Text style={{ color: C.muted, fontSize: 12.5 }}>{state.user.phone}</Text> : null}
          <Text style={{ color: C.muted, fontSize: 12.5 }}>Miembro desde {fmtDate(state.user.memberSince)}</Text>
        </View>
        <TouchableOpacity style={s.iconBtn} onPress={() => { setForm(state.user); setErrors({}); setEditing(true); }}>
          <Icon name="create-outline" size={18} />
        </TouchableOpacity>
      </Card>

      <Card style={{ flexDirection: 'row' }}>
        {[['Cuenta total', money(totals.total, 0)], ['Posiciones', String(totals.holdings.length)], ['Operaciones', String(state.transactions.length)]].map(([l, v]) => (
          <View key={l} style={{ flex: 1 }}>
            <Text style={{ color: C.muted, fontSize: 11.5 }}>{l}</Text>
            <Text style={{ color: C.text, fontWeight: '800' }}>{v}</Text>
          </View>
        ))}
      </Card>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icon name={cloud.status === 'ok' ? 'cloud-done-outline' : 'cloud-offline-outline'} size={22} color={cloud.status === 'ok' ? C.green : C.amber} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontWeight: '700' }}>{cloud.status === 'ok' ? 'Datos guardados en tu cuenta' : 'Sin conexión con el servidor'}</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>
            {cloud.status === 'ok' ? 'Base de datos TradeWatch · se sincroniza automáticamente' : 'Se guardan en el teléfono y se subirán al reconectar'}
          </Text>
        </View>
      </Card>

      <SectionTitle title="Alertas de precio personalizadas" />
      <Card style={{ gap: 12 }}>
        <Pair>
          <Select label="Acción" value={alert.symbol} onChange={(v) => setAlert({ ...alert, symbol: v })} options={STOCKS.map((x) => ({ value: x.symbol, label: x.symbol }))} />
          <Select label="Condición" value={alert.condition} onChange={(v) => setAlert({ ...alert, condition: v })} options={[{ value: 'above', label: 'Sube a ≥' }, { value: 'below', label: 'Baja a ≤' }]} />
        </Pair>
        <Field
          prefix="$"
          value={alert.price}
          onChangeText={(t) => setAlert({ ...alert, price: t.replace(',', '.').trim() })}
          keyboardType="decimal-pad"
          placeholder={`Actual ${money(state.prices[alert.symbol].price)}`}
          error={alertErr}
        />
        <Button title="Crear alerta" icon="notifications" onPress={addAlert} />
        {state.customAlerts.map((a) => (
          <Row key={a.id} gap={12} style={{ paddingVertical: 6 }}>
            <StockLogo symbol={a.symbol} size={32} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: '700' }}>{a.symbol} {a.condition === 'above' ? '≥' : '≤'} {money(a.price)}</Text>
              <Text style={{ color: a.triggered ? C.green : C.muted, fontSize: 12 }}>{a.triggered ? '✓ Activada' : `Pendiente · actual ${money(state.prices[a.symbol].price)}`}</Text>
            </View>
            <TouchableOpacity onPress={() => dispatch({ type: 'REMOVE_ALERT', id: a.id })} hitSlop={10}>
              <Icon name="trash-outline" size={18} color={C.red} />
            </TouchableOpacity>
          </Row>
        ))}
      </Card>

      <View ref={scrollTarget} />
      <SectionTitle title={`Acciones favoritas (${state.favorites.length})`} />
      <Card style={{ paddingVertical: 4, gap: 0 }}>
        {STOCKS.map((x, i) => {
          const on = state.favorites.includes(x.symbol);
          return (
            <TouchableOpacity
              key={x.symbol}
              onPress={() => dispatch({ type: 'TOGGLE_FAV', symbol: x.symbol })}
              style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(140,165,220,0.22)' }]}
            >
              <StockLogo symbol={x.symbol} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '700' }}>{x.short}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{x.symbol}</Text>
              </View>
              <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: on ? C.green : '#34405f', backgroundColor: on ? C.green : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {on && <Icon name="checkmark" size={15} color="#032316" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </Card>
      <Text style={{ color: C.muted, fontSize: 12 }}>Las favoritas aparecen en Inicio y en la pantalla de favoritas del smartwatch.</Text>

      <SectionTitle title="Aplicación" />
      <Card style={{ gap: 0 }}>
        <Toggle label="Precios en vivo" hint="Actualiza los precios del mercado cada 20 segundos" value={st.simulation} onChange={(v) => set({ simulation: v })} />
        <LinkRow icon="wallet-outline" label="Billetera" onPress={() => router.navigate('/billetera')} />
        <LinkRow icon="time-outline" label="Historial de operaciones" onPress={() => router.push('/historial')} />
        <LinkRow icon="refresh" label="Restablecer cuenta" danger onPress={() => setReset(true)} />
        <LinkRow icon="log-out-outline" label="Cerrar sesión" danger onPress={() => setConfirmLogout(true)} />
      </Card>
      <Text style={{ color: C.muted, fontSize: 11.5, textAlign: 'center' }}>TradeWatch 2.0</Text>

      <Sheet
        visible={editing}
        title="Editar perfil"
        onClose={() => setEditing(false)}
        footer={
          <>
            <Button title="Cancelar" variant="ghost" onPress={() => setEditing(false)} style={{ flex: 1 }} />
            <Button title="Guardar" onPress={saveProfile} style={{ flex: 1 }} />
          </>
        }
      >
        <Field label="Nombre completo" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} error={errors.name} maxLength={50} />
        <Field label="Correo electrónico" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Teléfono (opcional)" value={form.phone || ''} onChangeText={(t) => setForm({ ...form, phone: t })} error={errors.phone} keyboardType="phone-pad" />
      </Sheet>

      <ConfirmSheet
        visible={confirmLogout}
        title="Cerrar sesión"
        confirmLabel="Cerrar sesión"
        variant="sell"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setConfirmLogout(false);
          await saveNow();
          logout();
        }}
      >
        <Text style={{ color: '#c3cde6' }}>Tus datos quedan guardados en tu cuenta @{session.user.username}. Podrás volver a entrar desde este teléfono o desde otro dispositivo.</Text>
      </ConfirmSheet>

      <ConfirmSheet
        visible={reset}
        title="Restablecer datos"
        confirmLabel="Restablecer"
        variant="sell"
        onCancel={() => setReset(false)}
        onConfirm={() => { dispatch({ type: 'RESET' }); setReset(false); toast('Cuenta restablecida', 'info'); }}
      >
        <Text style={{ color: '#c3cde6' }}>
          Se borrarán tus operaciones, saldo, alertas y configuración, y tu cuenta volverá al saldo y portafolio iniciales. Esta acción no se puede deshacer.
        </Text>
      </ConfirmSheet>
    </Screen>
  );
}
