import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Href } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { C } from '../../src/lib/theme';

export default function NameScreen() {
  const { session, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  async function saveName() {
    if (!name.trim()) return;
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', session!.user.id);

    if (error) {
      setLoading(false);
      Alert.alert('Error', error.message);
      return;
    }

    await refreshProfile();
    setLoading(false);
    router.replace('/');
  }

  const disabled = !name.trim() || loading;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#D9F8EA', '#F1FBF6', 'rgba(247,248,250,0)']}
        style={styles.floodlight}
      />
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>👋</Text>
            </View>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>What's your name?</Text>
            <Text style={styles.formSub}>This is how you'll appear on the team list.</Text>

            <TextInput
              style={[styles.input, nameFocused && styles.inputFocused]}
              placeholder="e.g. Jamie Carragher"
              placeholderTextColor={C.subtle}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />

            <TouchableOpacity
              style={[styles.btnWrap, disabled && styles.btnDisabled]}
              onPress={saveName}
              disabled={disabled}
              activeOpacity={0.85}
            >
              <LinearGradient colors={C.gradGreen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
                <Text style={styles.btnText}>{loading ? 'Saving…' : "Let's go →"}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.consent}>
              By continuing you agree to our{' '}
              <Text
                style={styles.consentLink}
                onPress={() => router.push('/(app)/legal' as Href)}
              >
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text
                style={styles.consentLink}
                onPress={() => router.push('/(app)/legal' as Href)}
              >
                Privacy Policy
              </Text>.
            </Text>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  floodlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
  kav: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 28 },
  logoSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoCircle: {
    width: 92, height: 92, borderRadius: 28,
    backgroundColor: C.greenUltra,
    borderWidth: 1, borderColor: C.greenLight,
    alignItems: 'center', justifyContent: 'center',
    ...C.glowSoft,
  },
  logoEmoji: { fontSize: 42 },
  form: { paddingBottom: 24 },
  formTitle: { fontSize: 27, color: C.ink, letterSpacing: -0.5, marginBottom: 6, fontFamily: C.fontDisplay },
  formSub: { fontSize: 15, color: C.muted, marginBottom: 24, lineHeight: 22 },
  input: {
    backgroundColor: C.glass, borderWidth: 1.5, borderColor: C.border,
    borderRadius: C.rMd, paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 17, color: C.ink, marginBottom: 14,
  },
  inputFocused: { borderColor: C.green, backgroundColor: '#FFFFFF' },

  btnWrap: { borderRadius: C.rMd, ...C.glow },
  btn: { borderRadius: C.rMd, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  consent: {
    fontSize: 12, color: C.subtle, textAlign: 'center',
    lineHeight: 18, marginTop: 16,
  },
  consentLink: { color: C.muted, textDecorationLine: 'underline' },
});
