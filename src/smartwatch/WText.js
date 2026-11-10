import { Text } from 'react-native';

// Texto del reloj: tamaño fijo (Wear OS agranda las fuentes del sistema y desbordaría la esfera)
export function WText(props) {
  return <Text allowFontScaling={false} {...props} />;
}
