import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, PanResponder, Pressable, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PAGES, W } from './watchTheme';
import { WText } from './WText';
import {
  DialSize, StatusBarMini, WatchAccount, WatchAlertDetail, WatchAlerts, WatchFavorites, WatchHome, WatchOff, WatchPerformance, WatchPopup, WatchStock, WatchSync,
} from './screens/WatchPages';

export const SYNC_MS = 2600;

/**
 * Interfaz nativa del smartwatch (pantalla circular completa del reloj).
 * Controles táctiles:
 *  - Deslizar ← → : cambiar de pantalla
 *  - Botones ‹ › en los bordes y puntos inferiores: navegar
 *  - Tocar una favorita o alerta: abrir detalle
 *  - Botón Atrás del reloj / deslizar → en un detalle: volver
 *  - Mantener presionado en Inicio: apagar
 * Solo consulta: no compra, no vende, no retira dinero.
 */
export default function WatchFace({ data, size, power, connected, phoneOnline, user, onLogout, onPowerChange, onPhaseChange }) {
  const [phase, setPhase] = useState(power ? 'syncing' : 'off');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [popup, setPopup] = useState(null);
  const [synced, setSynced] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const lastNote = useRef(data?.notifications?.[0]?.id);
  const lastTx = useRef(data?.lastTxId);
  const nav = useRef({});
  nav.current = { phase, page, detail, popup };

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (power) {
      setPhase('syncing');
      setPage(0);
      setDetail(null);
    } else {
      setPhase('off');
      setPopup(null);
    }
  }, [power]);

  // Sincroniza al encender (espera a tener datos del teléfono)
  useEffect(() => {
    if (phase !== 'syncing') return undefined;
    const t = setTimeout(() => {
      if (data) {
        setPhase('on');
        Vibration.vibrate(40);
      }
    }, SYNC_MS);
    return () => clearTimeout(t);
  }, [phase, data]);

  useEffect(() => onPhaseChange?.(phase), [phase, onPhaseChange]);

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [page, detail, phase, fade]);

  // Nueva alerta del teléfono → aviso emergente con vibración
  const newest = data?.notifications?.[0];
  useEffect(() => {
    if (!newest || newest.id === lastNote.current) return;
    lastNote.current = newest.id;
    if (phase === 'on' && data.popupsOn) {
      setPopup(newest);
      Vibration.vibrate([0, 60, 80, 60]);
    }
  }, [newest, phase, data?.popupsOn]);

  useEffect(() => {
    if (!popup) return undefined;
    const t = setTimeout(() => setPopup(null), 4500);
    return () => clearTimeout(t);
  }, [popup]);

  // Compra / venta en el teléfono → indicador SYNC
  useEffect(() => {
    if (!data || data.lastTxId === lastTx.current) return undefined;
    lastTx.current = data.lastTxId;
    if (phase !== 'on') return undefined;
    setSynced(true);
    Vibration.vibrate(30);
    const t = setTimeout(() => setSynced(false), 2500);
    return () => clearTimeout(t);
  }, [data?.lastTxId, phase]);

  const go = (p) => {
    setDetail(null);
    setPage((p + PAGES.length) % PAGES.length);
  };

  const back = () => {
    const { phase: ph, detail: dt, popup: pp, page: pg } = nav.current;
    if (ph !== 'on') return false;
    if (pp) return setPopup(null), true;
    if (dt) return setDetail(null), true;
    if (pg !== 0) return go(0), true;
    return false; // en Inicio: el sistema cierra la app
  };

  // Botón físico / gesto Atrás de Wear OS
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, []);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        const { phase: ph, page: pg, detail: dt } = nav.current;
        if (ph !== 'on') return;
        if (dt) {
          if (g.dx > 40) setDetail(null);
          return;
        }
        if (g.dx < -40) go(pg + 1);
        else if (g.dx > 40) go(pg - 1);
      },
    })
  ).current;

  let content;
  if (phase === 'off') content = <WatchOff />;
  else if (phase === 'syncing') content = <WatchSync duration={SYNC_MS} waiting={!data} username={user?.username} />;
  else if (detail?.type === 'stock') content = <WatchStock data={data} symbol={detail.id} />;
  else if (detail?.type === 'alert') content = <WatchAlertDetail data={data} id={detail.id} />;
  else {
    const key = PAGES[page].key;
    if (key === 'home') content = <WatchHome data={data} now={now} />;
    else if (key === 'performance') content = <WatchPerformance data={data} />;
    else if (key === 'account') content = <WatchAccount user={user} connected={connected} phoneOnline={phoneOnline} onLogout={onLogout} />;
    else if (key === 'favorites') content = <WatchFavorites data={data} onOpen={(sym) => setDetail({ type: 'stock', id: sym })} />;
    else content = <WatchAlerts data={data} onOpen={(id) => setDetail({ type: 'alert', id })} />;
  }

  const isHome = phase === 'on' && !detail && PAGES[page].key === 'home';
  // La hora pequeña solo en listas (en Inicio ya está grande y en Rendimiento no cabe)
  const showStatus = !detail && ['favorites', 'alerts'].includes(PAGES[page].key);

  return (
    <DialSize.Provider value={size}>
      <View style={[st.screen, { width: size, height: size, borderRadius: size / 2 }]} {...pan.panHandlers}>
        {phase === 'off' ? (
          <Pressable style={{ flex: 1 }} onPress={() => onPowerChange(true)}>
            {content}
          </Pressable>
        ) : isHome ? (
          <Pressable style={{ flex: 1 }} delayLongPress={800} onLongPress={() => { Vibration.vibrate(80); onPowerChange(false); }}>
            <Animated.View style={{ flex: 1, opacity: fade }}>{content}</Animated.View>
          </Pressable>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fade }}>{content}</Animated.View>
        )}

        {phase === 'on' && !popup && (showStatus || synced || !connected) && <StatusBarMini now={now} synced={synced} offline={!connected} />}

        {/* Botones táctiles laterales */}
        {phase === 'on' && !popup && !detail && (
          <>
            <TouchableOpacity style={[st.edge, { left: 0 }]} onPress={() => go(page - 1)} hitSlop={6}>
              <Ionicons name="chevron-back" size={16} color="#5b6787" />
            </TouchableOpacity>
            <TouchableOpacity style={[st.edge, { right: 0 }]} onPress={() => go(page + 1)} hitSlop={6}>
              <Ionicons name="chevron-forward" size={16} color="#5b6787" />
            </TouchableOpacity>
          </>
        )}

        {phase === 'on' && !popup && (
          <View style={st.dots}>
            {detail ? (
              <TouchableOpacity onPress={() => setDetail(null)} style={st.backBtn}>
                <Ionicons name="chevron-back" size={12} color={W.text} />
                <WText style={{ color: W.text, fontSize: 10.5, fontWeight: '800' }}>ATRÁS</WText>
              </TouchableOpacity>
            ) : (
              PAGES.map((p, i) => (
                <TouchableOpacity key={p.key} onPress={() => go(i)} hitSlop={8}>
                  <View style={[st.dot, i === page && st.dotOn]} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {popup && phase === 'on' && <WatchPopup note={popup} onClose={() => setPopup(null)} />}
      </View>
    </DialSize.Provider>
  );
}

const st = StyleSheet.create({
  screen: { backgroundColor: W.bg, overflow: 'hidden' },
  edge: { position: 'absolute', top: '50%', marginTop: -22, width: 22, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 6 },
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, zIndex: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3a4562' },
  dotOn: { width: 14, backgroundColor: '#ffffff' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: W.surface2, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
});
