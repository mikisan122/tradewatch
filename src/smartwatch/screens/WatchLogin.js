import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WText } from '../WText';
import { W } from '../watchTheme';

/** Inicio de sesión en el reloj (pantalla circular). Usa la misma cuenta que el teléfono. */
export default function WatchLogin({ size, onLogin }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const passRef = useRef(null);

  const submit = async () => {
    if (!user.trim() || !pass) return setError('Escribe usuario y contraseña');
    setBusy(true);
    setError('');
    try {
      await onLogin(user.trim(), pass);
    } catch (e) {
      setError(e.offline ? 'Sin conexión con el servidor' : e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: W.bg }}>
      <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Ionicons name="person-circle" size={30} color={W.green} />
        <WText style={st.title}>TRADEWATCH</WText>
        <WText style={st.sub}>Entra con tu cuenta del teléfono</WText>
        <TextInput
          value={user}
          onChangeText={setUser}
          placeholder="Usuario o correo"
          placeholderTextColor="#55627f"
          autoCapitalize="none"
          autoCorrect={false}
          allowFontScaling={false}
          style={st.input}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => passRef.current?.focus()}
        />
        <TextInput
          ref={passRef}
          value={pass}
          onChangeText={setPass}
          placeholder="Contraseña"
          placeholderTextColor="#55627f"
          secureTextEntry
          autoCapitalize="none"
          allowFontScaling={false}
          style={st.input}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {error ? <WText style={st.error}>{error}</WText> : null}
        <TouchableOpacity style={[st.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator size="small" color="#032316" /> : <WText style={st.btnText}>Entrar</WText>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 30, paddingTop: 26, paddingBottom: 40, gap: 6 },
  title: { color: W.green, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  sub: { color: W.sub, fontSize: 10, textAlign: 'center', marginBottom: 2 },
  input: { width: '100%', height: 34, borderRadius: 17, backgroundColor: W.surface2, color: W.text, paddingHorizontal: 12, fontSize: 12, paddingVertical: 0 },
  error: { color: W.red, fontSize: 10, textAlign: 'center' },
  btn: { marginTop: 2, backgroundColor: W.green, borderRadius: 17, height: 34, width: '80%', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#032316', fontWeight: '900', fontSize: 13 },
});
