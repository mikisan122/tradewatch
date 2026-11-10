import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import { WatchFace } from '../smartwatch';
import WatchLogin from '../smartwatch/screens/WatchLogin';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { createLink } from '../sync/link';

/**
 * App que corre en el EMULADOR DEL RELOJ (Wear OS).
 * 1) Inicia sesión con la misma cuenta del teléfono.
 * 2) Recibe por el servidor SOLO los datos de esa cuenta y los muestra.
 */
function WatchSession({ size }) {
  const { session, logout, expire } = useAuth();
  const KEY = `tradewatch:watch:${session.user.id}`;
  const [data, setData] = useState(null);
  const [power, setPower] = useState(true);
  const [connected, setConnected] = useState(false);
  const [phoneOnline, setPhoneOnline] = useState(false);
  const phaseRef = useRef('off');
  const powerRef = useRef(power);
  powerRef.current = power;
  const link = useRef(null);
  const lastRx = useRef(Date.now());

  const report = useCallback(() => {
    link.current?.send({ type: 'status', power: powerRef.current, phase: phaseRef.current });
  }, []);

  // Últimos datos de ESTA cuenta guardados en el reloj
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved.data) setData((d) => d || saved.data);
        if (typeof saved.power === 'boolean') setPower(saved.power);
      })
      .catch(() => {});
  }, [KEY]);

  useEffect(() => {
    AsyncStorage.setItem(KEY, JSON.stringify({ data, power })).catch(() => {});
  }, [KEY, data, power]);

  // Conexión autenticada con el servidor
  useEffect(() => {
    link.current = createLink('watch', session.token, {
      onOpen: () => {
        lastRx.current = Date.now();
        setConnected(true);
        report();
      },
      onClose: () => setConnected(false),
      onAuthError: () => expire(),
      onMessage: (msg) => {
        lastRx.current = Date.now();
        if (msg.type === 'snapshot') {
          // Solo se aceptan datos de la cuenta con la que se inició sesión
          if (msg.data?.account && msg.data.account.username.toLowerCase() !== session.user.username.toLowerCase()) return;
          setData(msg.data);
          if (!msg.cached) setPhoneOnline(true);
        }
        if (msg.type === 'ping') setPhoneOnline(!!msg.phoneOnline);
        if (msg.type === 'command' && msg.cmd === 'power') setPower(!!msg.on);
      },
    });
    // Latido + vigilancia: si no llega nada en 12 s, reconectar
    const hb = setInterval(() => {
      report();
      if (link.current?.isOpen() && Date.now() - lastRx.current > 12000) {
        setConnected(false);
        link.current.reconnect();
      }
    }, 5000);
    return () => {
      clearInterval(hb);
      link.current?.close();
    };
  }, [report, session, expire]);

  useEffect(() => {
    report();
  }, [power, report]);

  const onPhaseChange = useCallback(
    (ph) => {
      phaseRef.current = ph;
      report();
    },
    [report]
  );

  const onLogout = useCallback(async () => {
    await AsyncStorage.removeItem(KEY).catch(() => {});
    logout();
  }, [KEY, logout]);

  return (
    <WatchFace
      data={data}
      size={size}
      power={power}
      connected={connected}
      phoneOnline={phoneOnline}
      user={session.user}
      onLogout={onLogout}
      onPowerChange={setPower}
      onPhaseChange={onPhaseChange}
    />
  );
}

function WatchGate({ size }) {
  const { session, ready, login } = useAuth();
  if (!ready) return <ActivityIndicator color="#16d68a" />;
  if (!session) return <WatchLogin size={size} onLogin={login} />;
  return <WatchSession key={session.user.id} size={size} />;
}

export default function WatchApp() {
  // Wear OS pausa las apps inactivas: mantenemos la pantalla del reloj activa
  useKeepAwake('tradewatch-watch');
  const { width, height } = useWindowDimensions();
  const size = Math.min(width, height);
  return (
    <View style={st.root}>
      <StatusBar hidden />
      <AuthProvider device="watch">
        <WatchGate size={size} />
      </AuthProvider>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
});
