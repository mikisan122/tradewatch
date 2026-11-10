import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Sparkline } from '../../components/Charts';
import { NOTE_META } from '../../core/noteMeta';
import { fmtDateTime, fmtTime, fmtWatchDate, money, pct, signedMoney, timeAgo, trendColor, isUp, absPct } from '../../core/utils';
import { W, arcPath } from '../watchTheme';
import { WText } from '../WText';

/** Diámetro real de la pantalla del reloj (lo define WatchFace) */
export const DialSize = createContext(W.DIAL);

/* ---------- Anillo de progreso alrededor de la esfera ---------- */
function DialRing({ value, max = 3, width = 6, inset = 4 }) {
  const D = useContext(DialSize);
  const r = D / 2 - inset - width / 2;
  const portion = Math.min(Math.abs(value) / max, 1);
  const sweep = Math.max(portion * 300, 4);
  const color = trendColor(value);
  return (
    <Svg width={D} height={D} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={arcPath(D / 2, D / 2, r, 210, 510)} stroke="#1a2238" strokeWidth={width} strokeLinecap="round" fill="none" />
      <Path d={arcPath(D / 2, D / 2, r, 210, 210 + sweep)} stroke={color} strokeWidth={width} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/* ---------- 1. Pantalla principal ---------- */
export function WatchHome({ data, now }) {
  const d = new Date(now);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const secs = String(d.getSeconds()).padStart(2, '0');
  return (
    <View style={st.center}>
      <DialRing value={data.dayPct} />
      <WText style={st.brand}>TRADEWATCH</WText>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <WText style={st.time}>{time}</WText>
        <WText style={st.secs}>{secs}</WText>
      </View>
      <WText style={st.date}>{fmtWatchDate(now)}</WText>
      <WText style={st.caption}>SALDO TOTAL</WText>
      <WText style={st.big}>{money(data.total)}</WText>
      <View style={st.pill}>
        <WText style={{ color: trendColor(data.dayPnl), fontWeight: '800', fontSize: 11 }}>
          {isUp(data.dayPnl) ? '▲' : '▼'} {signedMoney(data.dayPnl)} hoy
        </WText>
      </View>
    </View>
  );
}

/* ---------- 2. Rendimiento: ganancias, pérdidas y porcentaje ---------- */
export function WatchPerformance({ data }) {
  const color = trendColor(data.totalPnl);
  return (
    <View style={st.center}>
      <DialRing value={data.totalPct} max={10} width={8} />
      <WText style={st.title}>Rendimiento</WText>
      <WText style={[st.huge, { color }]}>{pct(data.totalPct)}</WText>
      <WText style={[st.mid, { color }]}>{signedMoney(data.totalPnl)}</WText>
      <WText style={st.caption}>GANANCIA / PÉRDIDA TOTAL</WText>
      <View style={{ marginVertical: 4 }}>
        <Sparkline data={data.history} width={84} height={16} color={color} />
      </View>
      <View style={st.split}>
        <View style={st.splitCell}>
          <WText style={st.caption}>HOY</WText>
          <WText style={[st.small, { color: trendColor(data.dayPnl) }]}>{pct(data.dayPct)}</WText>
        </View>
        <View style={st.splitCell}>
          <WText style={st.caption}>INVERTIDO</WText>
          <WText style={st.small}>{money(data.invested, 0)}</WText>
        </View>
      </View>
    </View>
  );
}

/* ---------- 3. Favoritas ---------- */
export function WatchFavorites({ data, onOpen }) {
  return (
    <ScrollView style={st.fill} contentContainerStyle={st.list} nestedScrollEnabled showsVerticalScrollIndicator={false}>
      <WText style={st.listTitle}>★ Favoritas</WText>
      {data.favorites.length === 0 && <WText style={st.empty}>Sin favoritas. Agrégalas desde la app.</WText>}
      {data.favorites.map((f) => (
        <TouchableOpacity key={f.symbol} style={st.row} onPress={() => onOpen(f.symbol)} activeOpacity={0.6}>
          <View style={[st.ind, { backgroundColor: trendColor(f.change) }]} />
          <View style={{ flex: 1 }}>
            <WText style={st.sym}>{f.symbol}</WText>
            <WText style={st.price}>{money(f.price)}</WText>
          </View>
          <WText style={[st.ch, { color: trendColor(f.change) }]}>
            {isUp(f.change) ? '▲' : '▼'}
            {absPct(Math.abs(f.change))}
          </WText>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

/* ---------- 3b. Detalle de una acción (solo consulta) ---------- */
export function WatchStock({ data, symbol }) {
  const f = data.favorites.find((x) => x.symbol === symbol);
  if (!f) return <View style={st.center}><WText style={st.empty}>Ya no está en favoritas</WText></View>;
  const color = trendColor(f.change);
  return (
    <View style={st.center}>
      <DialRing value={f.change} />
      <WText style={st.title}>{f.symbol}</WText>
      <WText style={st.caption}>{f.name.toUpperCase()}</WText>
      <WText style={st.big}>{money(f.price)}</WText>
      <WText style={[st.small, { color }]}>
        {isUp(f.change) ? '▲' : '▼'} {signedMoney(f.changeAbs)} ({pct(f.change)})
      </WText>
      <View style={{ marginVertical: 5 }}>
        <Sparkline data={f.intraday} width={110} height={26} color={color} />
      </View>
      {f.qty > 0 ? (
        <WText style={st.sub}>
          {f.qty} acc. · <WText style={{ color: trendColor(f.pnl) }}>{signedMoney(f.pnl)}</WText>
        </WText>
      ) : (
        <WText style={st.sub}>Sin posición</WText>
      )}
    </View>
  );
}

/* ---------- 4. Notificaciones bursátiles ---------- */
export function WatchAlerts({ data, onOpen }) {
  return (
    <ScrollView style={st.fill} contentContainerStyle={st.list} nestedScrollEnabled showsVerticalScrollIndicator={false}>
      <WText style={st.listTitle}>🔔 Alertas ({data.notifications.length})</WText>
      <View style={st.note}>
        <WText style={[st.noteHead, { color: '#9cc0ff' }]}>Resumen del día</WText>
        <WText style={st.noteText}>
          {money(data.total, 0)} · <WText style={{ color: trendColor(data.dayPnl) }}>{pct(data.dayPct)}</WText>
        </WText>
      </View>
      {!data.notificationsOn && <WText style={st.empty}>Notificaciones desactivadas en la app</WText>}
      {data.notifications.map((n) => {
        const m = NOTE_META[n.kind] || NOTE_META.info;
        return (
          <TouchableOpacity key={n.id} style={st.note} onPress={() => onOpen(n.id)} activeOpacity={0.6}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name={m.icon} size={10} color={m.color} />
              <WText style={[st.noteHead, { color: m.color, flex: 1 }]}>{m.label}</WText>
              {!n.read && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: W.blue }} />}
              <WText style={st.ago}>{timeAgo(n.date)}</WText>
            </View>
            <WText style={st.noteText} numberOfLines={2}>{n.title}</WText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/* ---------- 4b. Detalle de notificación ---------- */
export function WatchAlertDetail({ data, id }) {
  const n = data.notifications.find((x) => x.id === id);
  if (!n) return <View style={st.center}><WText style={st.empty}>Notificación no disponible</WText></View>;
  const m = NOTE_META[n.kind] || NOTE_META.info;
  return (
    <View style={[st.center, { paddingHorizontal: 30 }]}>
      <View style={[st.bigIcon, { backgroundColor: m.color }]}>
        <Ionicons name={m.icon} size={20} color="#04101f" />
      </View>
      <WText style={[st.small, { textAlign: 'center', fontWeight: '800' }]}>{n.title}</WText>
      <WText style={[st.sub, { textAlign: 'center' }]}>{n.body}</WText>
      <WText style={[st.ago, { marginTop: 4 }]}>{fmtDateTime(n.date)}</WText>
    </View>
  );
}

/* ---------- 5. Cuenta: confirma que es la misma cuenta del teléfono ---------- */
export function WatchAccount({ user, connected, phoneOnline, onLogout }) {
  const [confirm, setConfirm] = useState(false);
  const initials = (user?.name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return (
    <View style={st.center}>
      <View style={st.avatar}>
        <WText style={{ color: '#04101f', fontWeight: '900', fontSize: 15 }}>{initials}</WText>
      </View>
      <WText style={[st.small, { fontSize: 13 }]} numberOfLines={1}>{user?.name}</WText>
      <WText style={{ color: W.green, fontSize: 11.5, fontWeight: '800' }}>@{user?.username}</WText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: connected && phoneOnline ? W.green : connected ? W.orange : W.red }} />
        <WText style={{ color: W.sub, fontSize: 9.5 }}>
          {!connected ? 'Sin servidor' : phoneOnline ? 'Sincronizado con tu teléfono' : 'Últimos datos guardados'}
        </WText>
      </View>
      <TouchableOpacity
        onPress={() => (confirm ? onLogout() : setConfirm(true))}
        style={[st.logout, confirm && { backgroundColor: W.red }]}
      >
        <WText style={{ color: confirm ? '#fff' : W.red, fontSize: 10.5, fontWeight: '800' }}>{confirm ? '¿Seguro? Toca otra vez' : 'Cerrar sesión'}</WText>
      </TouchableOpacity>
    </View>
  );
}

/* ---------- Sincronización al encender ---------- */
const STEPS = ['Buscando teléfono…', 'Emparejando…', 'Sincronizando portafolio…', 'Actualizando precios…', 'Conectado'];
export function WatchSync({ duration, waiting, username }) {
  const spin = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState(0);
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    const ids = STEPS.map((_, i) => setTimeout(() => setStep(i), (i * duration) / STEPS.length));
    return () => {
      loop.stop();
      ids.forEach(clearTimeout);
    };
  }, [spin, duration]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={st.center}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={64} height={64}>
          <Circle cx={32} cy={32} r={28} stroke="rgba(22,214,138,0.2)" strokeWidth={4} fill="none" />
          <Path d={arcPath(32, 32, 28, 0, 100)} stroke={W.green} strokeWidth={4} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
      <WText style={[st.title, { marginTop: 10 }]}>TradeWatch</WText>
      {username ? <WText style={{ color: W.text, fontSize: 11, fontWeight: '700' }}>@{username}</WText> : null}
      <WText style={st.sub}>{waiting && step === STEPS.length - 1 ? 'Esperando al teléfono…' : STEPS[step]}</WText>
      <View style={st.progress}>
        <View style={[st.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
      </View>
    </View>
  );
}

/* ---------- Apagado ---------- */
export function WatchOff() {
  return (
    <View style={st.center}>
      <Ionicons name="power" size={24} color="#2a334d" />
      <WText style={{ color: '#3a4562', fontSize: 11, marginTop: 6 }}>Toca para encender</WText>
    </View>
  );
}

/* ---------- Aviso emergente de notificación ---------- */
export function WatchPopup({ note, onClose }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, [anim]);
  const m = NOTE_META[note.kind] || NOTE_META.info;
  return (
    <TouchableOpacity activeOpacity={1} onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.93)' }]}>
      <Animated.View style={[st.center, { paddingHorizontal: 28, opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}>
        <View style={[st.bigIcon, { backgroundColor: m.color }]}>
          <Ionicons name={m.icon} size={20} color="#04101f" />
        </View>
        <WText style={[st.small, { textAlign: 'center', fontWeight: '800' }]}>{note.title}</WText>
        <WText style={[st.sub, { textAlign: 'center' }]} numberOfLines={3}>{note.body}</WText>
        <WText style={st.ago}>Toca para cerrar</WText>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function StatusBarMini({ now, synced, offline }) {
  return (
    <View style={st.status} pointerEvents="none">
      <WText style={{ color: W.sub, fontSize: 10, fontWeight: '700' }}>{fmtTime(now)}</WText>
      {synced ? (
        <View style={st.syncBadge}>
          <Ionicons name="sync" size={9} color={W.green} />
          <WText style={{ color: W.green, fontSize: 8.5, fontWeight: '800' }}>SYNC</WText>
        </View>
      ) : (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: offline ? W.red : W.green }} />
      )}
      {offline ? <WText style={{ color: W.red, fontSize: 8.5, fontWeight: '800' }}>SIN TELÉFONO</WText> : null}
    </View>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  brand: { color: W.green, fontSize: 9, fontWeight: '900', letterSpacing: 2.5 },
  time: { color: W.text, fontSize: 46, fontWeight: '200', letterSpacing: -1, lineHeight: 52 },
  secs: { color: W.sub, fontSize: 14, fontWeight: '600', marginBottom: 9, marginLeft: 2 },
  date: { color: W.orange, fontSize: 11.5, fontWeight: '700', marginBottom: 6 },
  caption: { color: W.sub, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.8 },
  big: { color: W.text, fontSize: 21, fontWeight: '800' },
  huge: { fontSize: 24, fontWeight: '900' },
  mid: { fontSize: 14, fontWeight: '800' },
  small: { color: W.text, fontSize: 12.5, fontWeight: '700' },
  sub: { color: '#b8c3df', fontSize: 10.5 },
  title: { color: W.green, fontSize: 14, fontWeight: '900' },
  pill: { marginTop: 6 },
  split: { flexDirection: 'row', gap: 18, marginTop: 4 },
  splitCell: { alignItems: 'center' },
  list: { paddingTop: 30, paddingBottom: 44, paddingHorizontal: 24, gap: 0 },
  listTitle: { color: W.green, fontSize: 13, fontWeight: '900', textAlign: 'center', marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#232c45' },
  ind: { width: 4, height: 24, borderRadius: 2 },
  sym: { color: W.text, fontSize: 12.5, fontWeight: '800' },
  price: { color: '#aab5d3', fontSize: 10.5 },
  ch: { fontSize: 11, fontWeight: '800' },
  note: { paddingHorizontal: 4, paddingVertical: 7, gap: 1, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#232c45' },
  noteHead: { fontSize: 10, fontWeight: '800' },
  noteText: { color: '#d4dbef', fontSize: 10.5 },
  ago: { color: '#6f7b9b', fontSize: 9 },
  empty: { color: W.sub, fontSize: 10.5, textAlign: 'center', paddingVertical: 8 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: W.green, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  logout: { marginTop: 8, borderWidth: 1, borderColor: W.red, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  bigIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  progress: { width: 110, height: 4, borderRadius: 2, backgroundColor: '#1a2238', marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: W.green },
  status: { position: 'absolute', top: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, zIndex: 5 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(22,214,138,0.2)', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1 },
});
