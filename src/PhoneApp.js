import { ExpoRoot } from 'expo-router';

// App del TELÉFONO: navegación con Expo Router (rutas en src/app)
export default function PhoneApp() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}
