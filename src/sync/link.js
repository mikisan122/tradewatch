import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { isWatchDevice } from './device';

export const SYNC_PORT = 8090;

/** Dirección del servidor: la misma computadora que sirve Metro (funciona en emuladores y en teléfonos reales) */
export function syncUrl() {
  if (Platform.OS === 'android' && !Device.isDevice) {
    // Reloj Wear OS: apaga su red cuando está inactivo → túnel adb reverse (lo crea npm run sync)
    if (isWatchDevice()) return `ws://localhost:${SYNC_PORT}`;
    // Teléfono en emulador: 10.0.2.2 es siempre la computadora anfitriona
    return `ws://10.0.2.2:${SYNC_PORT}`;
  }
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost || '';
  let host = hostUri.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `ws://${host}:${SYNC_PORT}`;
}

/** Dirección HTTP de la API (mismo servidor) */
export const apiUrl = () => syncUrl().replace(/^ws/, 'http');

/**
 * Conexión WebSocket con reconexión automática, autenticada con el token de la cuenta.
 * role: 'phone' | 'watch'
 */
export function createLink(role, token, { onMessage, onOpen, onClose, onAuthError }) {
  let ws = null;
  let closed = false;
  let retry = null;

  const connect = () => {
    if (closed) return;
    ws = new WebSocket(syncUrl());
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'hello', role, token }));
      onOpen?.();
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'auth-error') {
          closed = true;
          onAuthError?.(msg.error);
          ws.close();
          return;
        }
        onMessage?.(msg);
      } catch {
        /* mensaje inválido */
      }
    };
    ws.onclose = () => {
      onClose?.();
      if (!closed) retry = setTimeout(connect, 2000);
    };
    ws.onerror = () => ws?.close();
  };
  connect();

  return {
    // Fuerza reconexión (p. ej. si la conexión quedó muda)
    reconnect: () => ws?.close(),
    send: (msg) => ws?.readyState === 1 && ws.send(JSON.stringify(msg)),
    isOpen: () => ws?.readyState === 1,
    close: () => {
      closed = true;
      clearTimeout(retry);
      ws?.close();
    },
  };
}
