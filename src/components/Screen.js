import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Polyline, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useStore } from '../core/store';
import { initials } from '../core/utils';
import { Icon } from './ui';
import { C } from '../theme';

export function Logo({ size = 30 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="twlogo" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#4f8cff" />
          <Stop offset="1" stopColor="#16d68a" />
        </LinearGradient>
      </Defs>
      <Rect width="64" height="64" rx="16" fill="#0f1a33" />
      <Polyline points="12,42 24,30 32,36 48,18" fill="none" stroke="url(#twlogo)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="40,18 48,18 48,26" fill="none" stroke="#16d68a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Barra superior: logo o botón atrás, título, notificaciones y perfil */
export function Header({ title, back }) {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const unread = state.notifications.filter((n) => !n.read).length;
  return (
    <View style={[st.header, { paddingTop: insets.top + 8 }]}>
      {back ? (
        <TouchableOpacity style={st.iconBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <Icon name="chevron-back" size={22} />
        </TouchableOpacity>
      ) : (
        <View style={st.brand}>
          <Logo />
          <Text style={st.brandText}>
            TRADE<Text style={{ color: C.green }}>WATCH</Text>
          </Text>
        </View>
      )}
      {back ? (
        <Text style={st.title} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <TouchableOpacity style={st.iconBtn} onPress={() => router.push('/notificaciones')}>
        <Icon name="notifications-outline" size={21} />
        {unread > 0 && (
          <View style={st.badge}>
            <Text style={st.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={st.avatar} onPress={() => router.push('/perfil')}>
        <Text style={{ color: '#04101f', fontWeight: '900' }}>{initials(state.user.name) || 'TW'}</Text>
      </TouchableOpacity>
    </View>
  );
}

/** Contenedor de pantalla con encabezado y desplazamiento */
export function Screen({ title, back, children, scroll = true, contentStyle }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={title} back={back} />
      {scroll ? (
        <ScrollView contentContainerStyle={[st.content, contentStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[st.content, { flex: 1 }, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: 'rgba(120,150,220,0.07)',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandText: { color: C.text, fontWeight: '900', letterSpacing: 1.5, fontSize: 16 },
  title: { flex: 1, color: C.text, fontWeight: '800', fontSize: 17 },
  iconBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -5, right: -5, minWidth: 19, height: 19, borderRadius: 10, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.bg },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
});
