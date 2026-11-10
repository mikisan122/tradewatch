import { Dimensions, Platform } from 'react-native';

/** true cuando la app corre en un reloj (Wear OS) o en una pantalla muy pequeña */
export function isWatchDevice() {
  if (Platform.OS === 'android' && Platform.constants?.uiMode === 'watch') return true;
  const { width, height } = Dimensions.get('screen');
  return Math.min(width, height) < 260;
}
