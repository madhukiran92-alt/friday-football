import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, StatusBar, SafeAreaView,
} from 'react-native';
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
              style={[styles.btn, disabled && styles.btnDisabled]}
              onPress={saveName}
              disabled={disabled}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>{loading ? 'Saving…' : "Let's go →"}</Text>
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
  root: { flex: 1, backgroundColor: C.surface },
  kav: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 28 },
  logoSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoCircle: {
    width: 88, height: 88, borderRadius: 26, backgroundColor: C.greenUltra,
    alignItems: 'center', justifyContent: 'center', ...C.shadowMd,
  },
  logoEmoji: { fontSize: 42 },
  form: { paddingBottom: 20 },
  formTitle: { fontSize: 26, fontWeight: '800', color: C.inkSoft, letterSpacing: -0.4, marginBottom: 6 },
  formSub: { fontSize: 15, color: C.muted, marginBottom: 24, lineHeight: 22 },
  input: {
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: 'transparent',
    borderRadius: C.rMd, paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 17, color: C.inkSoft, marginBottom: 14,
  },
  inputFocused: { borderColor: C.green, backgroundColor: C.surface },

  btn: {
    backgroundColor: C.green, borderRadius: C.rMd, paddingVertical: 16,
    alignItems: 'center', ...C.shadowMd,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  consent: {
    fontSize: 12, color: C.subtle, textAlign: 'center',
    lineHeight: 18, marginTop: 16,
  },
  consentLink: { color: C.muted, textDecorationLine: 'underline' },
});
