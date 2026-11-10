import { ActivityIndicator, Text, View } from 'react-native';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '../core/store';
import { ToastProvider } from '../components/Toast';
import { WatchLinkProvider } from '../sync/WatchLink';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import AuthScreen from '../auth/AuthScreen';
import { Logo } from '../components/Screen';
import { C } from '../theme';

function Splash({ text }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Logo size={64} />
      <ActivityIndicator color={C.green} />
      <Text style={{ color: C.muted }}>{text}</Text>
    </View>
  );
}

function AppContent() {
  const { ready } = useStore();
  if (!ready) return <Splash text="Cargando tu cuenta…" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }} />;
}

/** Sin sesión → pantalla de acceso. Con sesión → la app con los datos de esa cuenta. */
function Gate() {
  const { session, ready, expire } = useAuth();
  if (!ready) return <Splash text="Iniciando…" />;
  if (!session) return <AuthScreen />;
  return (
    <StoreProvider key={session.user.id} session={session} onSessionExpired={expire}>
      <WatchLinkProvider>
        <AppContent />
      </WatchLinkProvider>
    </StoreProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <StatusBar style="light" />
          <AuthProvider device="phone">
            <Gate />
          </AuthProvider>
        </View>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
