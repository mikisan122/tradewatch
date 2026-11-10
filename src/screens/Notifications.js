import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../core/store';
import { fmtDateTime } from '../core/utils';
import { NOTE_META } from '../core/noteMeta';
import { Screen } from '../components/Screen';
import { Card, Empty, Icon, Row } from '../components/ui';
import { useToast } from '../components/Toast';
import { C } from '../theme';

export default function Notifications() {
  const { state, dispatch } = useStore();
  const toast = useToast();

  useEffect(() => {
    const t = setTimeout(() => dispatch({ type: 'READ_NOTES' }), 1500);
    return () => clearTimeout(t);
  }, [dispatch, state.notifications.length]);

  return (
    <Screen back title="Notificaciones">
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: C.muted, fontSize: 12.5 }}>{state.settings.notifications ? 'Notificaciones activadas' : 'Notificaciones desactivadas'}</Text>
        <Row gap={14}>
          <TouchableOpacity onPress={() => { dispatch({ type: 'ADD_SUMMARY', now: Date.now() }); toast('Resumen diario generado', 'info'); }}>
            <Text style={{ color: C.blue, fontWeight: '700' }}>Generar resumen</Text>
          </TouchableOpacity>
          {state.notifications.length > 0 && (
            <TouchableOpacity onPress={() => dispatch({ type: 'CLEAR_NOTES' })}>
              <Text style={{ color: C.red, fontWeight: '700' }}>Borrar</Text>
            </TouchableOpacity>
          )}
        </Row>
      </Row>
      {!state.settings.notifications && (
        <Card style={{ borderColor: 'rgba(255,199,90,0.35)' }}>
          <Text style={{ color: C.text }}>Las notificaciones están apagadas.</Text>
          <TouchableOpacity onPress={() => router.push('/perfil')}>
            <Text style={{ color: C.blue, fontWeight: '700' }}>Activarlas en Perfil</Text>
          </TouchableOpacity>
        </Card>
      )}
      {state.notifications.length === 0 ? (
        <Empty icon="notifications-outline" title="Sin notificaciones" text="Verás alertas de subidas, bajadas, cambios del portafolio y resúmenes diarios." />
      ) : (
        <Card style={{ paddingVertical: 4, gap: 0 }}>
          {state.notifications.map((n, i) => {
            const m = NOTE_META[n.kind] || NOTE_META.info;
            return (
              <TouchableOpacity
                key={n.id}
                disabled={!n.symbol}
                onPress={() => router.push(`/accion/${n.symbol}`)}
                style={[
                  { flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(140,165,220,0.22)' },
                ]}
              >
                <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center'}}>
                  <Icon name={m.icon} size={18} color={m.color} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: C.text, fontWeight: '700' }}>
                    {!n.read ? <Text style={{ color: C.blue }}>● </Text> : null}
                    {n.title}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 12.5 }}>{n.body}</Text>
                  <Text style={{ color: C.muted, fontSize: 11.5 }}>{fmtDateTime(n.date)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
