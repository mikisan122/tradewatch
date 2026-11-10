import { registerRootComponent } from 'expo';
import { isWatchDevice } from './src/sync/device';

// Un solo proyecto Expo, dos interfaces nativas:
//  - En el emulador de TELÉFONO → aplicación TradeWatch
//  - En el emulador de RELOJ (Wear OS) → Smartwatch Virtual
if (isWatchDevice()) {
  registerRootComponent(require('./src/watch/WatchApp').default);
} else {
  registerRootComponent(require('./src/PhoneApp').default);
}
