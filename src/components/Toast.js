import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

const ICON = { success: ['checkmark', C.green, '#032316'], error: ['close', C.red, '#fff'], info: ['information', C.blue, '#fff'] };

function ToastItem({ t }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7 }),
      Animated.delay(2400),
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [anim]);
  const [icon, bg, fg] = ICON[t.type] || ICON.success;
  return (
    <Animated.View
      style={[
        st.toast,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      ]}
    >
      <View style={[st.icon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={15} color={fg} />
      </View>
      <Text style={st.text}>{t.message}</Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const insets = useSafeAreaInsets();
  const toast = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setList((l) => [...l.slice(-2), { id, message, type }]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 3000);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <View pointerEvents="none" style={[st.wrap, { top: insets.top + 60 }]}>
        {list.map((t) => (
          <ToastItem key={t.id} t={t} />
        ))}
      </View>
    </ToastCtx.Provider>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, gap: 8, zIndex: 100, elevation: 100 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 16,
    backgroundColor: 'rgba(16,30,62,0.97)', borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  icon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { color: C.text, fontWeight: '600', fontSize: 14, flex: 1 },
});
