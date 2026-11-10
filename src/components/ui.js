import { Children, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STOCK_MAP } from '../core/data';
import { absPct, isUp } from '../core/utils';
import { C, R } from '../theme';

export const Icon = ({ name, size = 22, color = C.text, style }) => <Ionicons name={name} size={size} color={color} style={style} />;

export function T({ style, muted, small, bold, color, children, ...rest }) {
  return (
    <Text
      style={[
        { color: color || (muted ? C.muted : C.text), fontSize: small ? 12.5 : 15 },
        bold && { fontWeight: '700' },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

/** Bloque de contenido plano: sin fondo ni bordes, separado por una línea fina */
export function Card({ style, children, last }) {
  return <View style={[s.card, last && { borderBottomWidth: 0 }, style]}>{children}</View>;
}

export function StockLogo({ symbol, size = 42 }) {
  const st = STOCK_MAP[symbol];
  return (
    <LinearGradient
      colors={st.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size * 0.3, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: st.fg, fontSize: size * 0.44, fontWeight: '900', fontFamily: 'serif' }}>{st.mono}</Text>
    </LinearGradient>
  );
}

export function ChangePill({ value, small }) {
  const up = isUp(value);
  return (
    <View style={[s.pill, { backgroundColor: up ? 'rgba(22,214,138,0.14)' : 'rgba(255,77,106,0.14)' }, small && { paddingHorizontal: 6, paddingVertical: 2 }]}>
      <Text style={{ color: up ? C.green : C.red, fontWeight: '700', fontSize: small ? 11.5 : 13 }}>
        {up ? '▲ ' : '▼ '}
        {absPct(Math.abs(value))}
      </Text>
    </View>
  );
}

export function SectionTitle({ title, action, onAction }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionText}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction} hitSlop={10}>
          <Text style={{ color: C.blue, fontWeight: '600' }}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function Segmented({ options, value, onChange, small }) {
  return (
    <View style={[s.seg, small && { padding: 3 }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <TouchableOpacity key={String(o.value)} style={[s.segBtn, small && { paddingVertical: 7 }, on && s.segOn]} onPress={() => onChange(o.value)}>
            <Text style={{ color: on ? C.text : C.muted, fontWeight: '700', fontSize: small ? 12.5 : 14 }}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Chips({ options, value, onChange, wrap }) {
  const content = options.map((o) => {
    const on = o.value === value;
    return (
      <TouchableOpacity
        key={String(o.value)}
        disabled={o.disabled}
        onPress={() => onChange(o.value)}
        style={[s.chip, on && { backgroundColor: C.blue, borderColor: C.blue }, o.disabled && { opacity: 0.4 }]}
      >
        <Text style={{ color: on ? '#fff' : C.muted, fontWeight: '600', fontSize: 13 }}>{o.label}</Text>
      </TouchableOpacity>
    );
  });
  if (wrap) return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{content}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
      {content}
    </ScrollView>
  );
}

const BTN = {
  primary: ['#4f8cff', '#2f64e0'],
  buy: ['#1fe39a', '#0fb171'],
  sell: ['#ff6680', '#e3324f'],
};

export function Button({ title, onPress, variant = 'primary', icon, size = 'md', style, disabled }) {
  const h = size === 'lg' ? 54 : size === 'sm' ? 38 : 46;
  const fg = variant === 'buy' ? '#032316' : C.text;
  const inner = (
    <>
      {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 18} color={variant === 'ghost' ? C.text : fg} /> : null}
      <Text style={{ color: variant === 'ghost' ? C.text : fg, fontWeight: '800', fontSize: size === 'lg' ? 16 : size === 'sm' ? 13.5 : 15 }}>{title}</Text>
    </>
  );
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} disabled={disabled} style={[{ opacity: disabled ? 0.45 : 1 }, style]}>
      {variant === 'ghost' ? (
        <View style={[s.btn, { height: h, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border }]}>{inner}</View>
      ) : (
        <LinearGradient colors={BTN[variant]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.btn, { height: h }]}>
          {inner}
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
}

export function Row({ children, style, gap = 10 }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Pair({ children }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {Children.map(children, (c) => (c ? <View style={{ flex: 1 }}>{c}</View> : null))}
    </View>
  );
}

export function SummaryRow({ label, value, strong, color }) {
  return (
    <View style={s.sumRow}>
      <Text style={{ color: C.muted, fontSize: strong ? 15.5 : 14 }}>{label}</Text>
      <Text style={{ color: color || C.text, fontWeight: strong ? '800' : '600', fontSize: strong ? 16 : 14, flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />;
}

export function Toggle({ label, hint, value, onChange, disabled }) {
  return (
    <Pressable onPress={() => !disabled && onChange(!value)} style={[s.toggle, disabled && { opacity: 0.4 }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontWeight: '600', fontSize: 14.5 }}>{label}</Text>
        {hint ? <Text style={{ color: C.muted, fontSize: 12 }}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: '#26314f', true: C.green }}
        thumbColor="#ffffff"
      />
    </Pressable>
  );
}

export function Field({ label, error, style, inputStyle, prefix, ...props }) {
  return (
    <View style={[{ gap: 7 }, style]}>
      {label ? <Text style={{ color: C.muted, fontWeight: '600', fontSize: 13 }}>{label}</Text> : null}
      <View style={[s.input, error && { borderColor: C.red }]}>
        {prefix ? <Text style={{ color: C.muted, fontWeight: '700', fontSize: 18, marginRight: 6 }}>{prefix}</Text> : null}
        <TextInput placeholderTextColor="#55627f" style={[{ flex: 1, color: C.text, fontSize: 16, paddingVertical: 0 }, inputStyle]} {...props} />
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

/** Selector nativo simple (lista de opciones en hoja inferior) */
export function Select({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 7, flex: 1 }}>
      {label ? <Text style={{ color: C.muted, fontWeight: '600', fontSize: 13 }}>{label}</Text> : null}
      <TouchableOpacity style={s.input} onPress={() => setOpen(true)}>
        <Text style={{ color: C.text, fontSize: 15, flex: 1 }} numberOfLines={1}>
          {current ? current.label : 'Seleccionar'}
        </Text>
        <Icon name="chevron-down" size={18} color={C.muted} />
      </TouchableOpacity>
      <Sheet visible={open} title={label || 'Seleccionar'} onClose={() => setOpen(false)}>
        {options.map((o) => (
          <TouchableOpacity
            key={String(o.value)}
            style={s.option}
            onPress={() => {
              onChange(o.value);
              setOpen(false);
            }}
          >
            <Text style={{ color: C.text, fontSize: 15.5, flex: 1 }}>{o.label}</Text>
            {o.value === value ? <Icon name="checkmark-circle" color={C.green} /> : null}
          </TouchableOpacity>
        ))}
      </Sheet>
    </View>
  );
}

export function Sheet({ visible, title, onClose, children, footer }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={[s.sheet, { paddingBottom: insets.bottom + 18 }]} onPress={() => {}}>
          <View style={s.handle} />
          <View style={[s.section, { marginBottom: 12, marginTop: 0 }]}>
            <Text style={{ color: C.text, fontSize: 19, fontWeight: '800' }}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={s.iconBtn}>
              <Icon name="close" size={18} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
            {children}
          </ScrollView>
          {footer ? <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>{footer}</View> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ConfirmSheet({ visible, title, children, onConfirm, onCancel, confirmLabel = 'Confirmar', variant = 'primary' }) {
  return (
    <Sheet
      visible={visible}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button title="Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
          <Button title={confirmLabel} variant={variant} onPress={onConfirm} style={{ flex: 1 }} />
        </>
      }
    >
      {children}
    </Sheet>
  );
}

export function Empty({ icon = 'information-circle-outline', title, text, action, onAction }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name={icon} size={26} color={C.blue} />
      </View>
      <Text style={{ color: C.text, fontWeight: '700', fontSize: 16 }}>{title}</Text>
      {text ? <Text style={{ color: C.muted, textAlign: 'center', fontSize: 13.5 }}>{text}</Text> : null}
      {action ? <Button title={action} size="sm" onPress={onAction} /> : null}
    </View>
  );
}

export const s = StyleSheet.create({
  card: { paddingVertical: 16, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(140,165,220,0.22)' },
  pill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  sectionText: { color: C.text, fontSize: 17, fontWeight: '800' },
  seg: { flexDirection: 'row', backgroundColor: '#0a1328', borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 4, gap: 4 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  segOn: { backgroundColor: C.card2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  btn: { borderRadius: R.btn, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 2 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  input: {
    minHeight: 48, borderRadius: 14, backgroundColor: C.input, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center',
  },
  error: { color: C.red, fontSize: 13, fontWeight: '600' },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,3,12,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0d1833', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 8, borderWidth: 1, borderColor: C.border },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#34405f', alignSelf: 'center', marginVertical: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 30 },
  emptyIcon: { alignItems: 'center', justifyContent: 'center' },
});
