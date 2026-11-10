import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from './AuthProvider';
import { Logo } from '../components/Screen';
import { Button, Card, Field, Icon, Segmented, s } from '../components/ui';
import { C } from '../theme';

const USER_RE = /^[a-zA-Z0-9_.]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Pantalla de inicio de sesión / registro de la app del teléfono */
export default function AuthScreen() {
  const { login, register } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', username: '', email: '', password: '', password2: '', login: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const isLogin = mode === 'login';

  const validate = () => {
    const e = {};
    if (isLogin) {
      if (!f.login.trim()) e.login = 'Escribe tu usuario o correo.';
      if (!f.password) e.password = 'Escribe tu contraseña.';
    } else {
      if (f.name.trim().length < 2) e.name = 'Escribe tu nombre (mínimo 2 letras).';
      if (!USER_RE.test(f.username.trim())) e.username = '3 a 20 caracteres: letras, números, punto o guion bajo.';
      if (!EMAIL_RE.test(f.email.trim())) e.email = 'Correo inválido.';
      if (f.password.length < 6) e.password = 'Mínimo 6 caracteres.';
      if (f.password2 !== f.password) e.password2 = 'Las contraseñas no coinciden.';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    setServerError('');
    if (!validate()) return;
    setBusy(true);
    try {
      if (isLogin) await login(f.login.trim(), f.password);
      else await register({ name: f.name.trim(), username: f.username.trim(), email: f.email.trim(), password: f.password });
    } catch (e) {
      setServerError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const pass = (
    <TouchableOpacity onPress={() => setShow(!show)} hitSlop={10} style={{ position: 'absolute', right: 14, bottom: 14 }}>
      <Icon name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Logo size={64} />
          <Text style={{ color: C.text, fontSize: 28, fontWeight: '900', letterSpacing: 2 }}>
            TRADE<Text style={{ color: C.green }}>WATCH</Text>
          </Text>
          <Text style={{ color: C.muted, textAlign: 'center' }}>Invierte y sigue tu portafolio desde tu smartwatch.</Text>
        </View>

        <Segmented
          value={mode}
          onChange={(m) => { setMode(m); setErrors({}); setServerError(''); }}
          options={[{ value: 'login', label: 'Iniciar sesión' }, { value: 'register', label: 'Crear cuenta' }]}
        />

        <Card style={{ gap: 14 }}>
          {isLogin ? (
            <Field label="Usuario o correo" value={f.login} onChangeText={set('login')} autoCapitalize="none" autoCorrect={false} error={errors.login} placeholder="ej. benja" />
          ) : (
            <>
              <Field label="Nombre completo" value={f.name} onChangeText={set('name')} error={errors.name} placeholder="ej. Benja López" />
              <Field label="Nombre de usuario" value={f.username} onChangeText={set('username')} autoCapitalize="none" autoCorrect={false} error={errors.username} placeholder="ej. benja" />
              <Field label="Correo electrónico" value={f.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" error={errors.email} placeholder="nombre@correo.com" />
            </>
          )}
          <View>
            <Field label="Contraseña" value={f.password} onChangeText={set('password')} secureTextEntry={!show} autoCapitalize="none" error={errors.password} placeholder="••••••" />
            {!errors.password && pass}
          </View>
          {!isLogin && (
            <Field label="Confirmar contraseña" value={f.password2} onChangeText={set('password2')} secureTextEntry={!show} autoCapitalize="none" error={errors.password2} placeholder="••••••" />
          )}
          {serverError ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: 'rgba(255,77,106,0.1)', borderRadius: 12, padding: 10 }}>
              <Icon name="alert-circle" size={18} color={C.red} />
              <Text style={[s.error, { flex: 1 }]}>{serverError}</Text>
            </View>
          ) : null}
          <Button title={busy ? 'Un momento…' : isLogin ? 'Entrar' : 'Crear cuenta'} variant={isLogin ? 'primary' : 'buy'} size="lg" onPress={submit} disabled={busy} />
        </Card>

        <Text style={{ color: C.muted, fontSize: 12.5, textAlign: 'center' }}>
          {isLogin
            ? 'Usa la misma cuenta en tu smartwatch para ver tus datos en el reloj.'
            : 'Tu cuenta empieza con $25,000 de saldo y un portafolio inicial.'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
