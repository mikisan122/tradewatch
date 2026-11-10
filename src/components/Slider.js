import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';

/** Selector de porcentaje 0.5 % – 5 % con segmentos táctiles y botones − / + */
export default function Slider({ label, value, onChange, min = 0.5, max = 5, step = 0.5, disabled }) {
  const steps = Math.round((max - min) / step) + 1;
  const idx = Math.round((value - min) / step);
  const setIdx = (i) => !disabled && onChange(Math.min(max, Math.max(min, min + i * step)));
  return (
    <View style={{ paddingVertical: 6, gap: 8, opacity: disabled ? 0.4 : 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: C.muted, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: C.text, fontWeight: '800' }}>{value.toFixed(1)}%</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity onPress={() => setIdx(idx - 1)} hitSlop={8}>
          <Ionicons name="remove-circle" size={26} color={C.muted} />
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
          {Array.from({ length: steps }, (_, i) => (
            <TouchableOpacity key={i} onPress={() => setIdx(i)} style={{ flex: 1, paddingVertical: 8 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: i <= idx ? C.green : '#26314f' }} />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setIdx(idx + 1)} hitSlop={8}>
          <Ionicons name="add-circle" size={26} color={C.green} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
