import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, StatusBar, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { C } from '../../src/lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      setLoading(false);
      if (error) Alert.alert('Error', error.message);
      else router.replace('/');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setLoading(false);
      if (error) Alert.alert('Error', error.message);
      else router.replace('/');
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safe}>

          {/* Logo section */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>⚽</Text>
            </View>
            <Text style={styles.appName}>Friday Football</Text>
            <Text style={styles.tagline}>Organise, join & play.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>{isSignUp ? 'Create account' : 'Sign in'}</Text>

            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, emailFocused && styles.inputFocused]}
                placeholder="Email address"
                placeholderTextColor={C.subtle}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                autoFocus
              />
            </View>

            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, passwordFocused && styles.inputFocused]}
                placeholder="Password"
                placeholderTextColor={C.subtle}
                secureTextEntry
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>
                {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.toggle} activeOpacity={0.6}>
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already have an account?  ' : "Don't have an account?  "}
                <Text style={styles.toggleLink}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
              </Text>
            </TouchableOpacity>
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

  logoSection: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 8 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 26,
    backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
    ...C.shadowMd,
  },
  logoEmoji: { fontSize: 42 },
  appName: { fontSize: 30, fontWeight: '800', color: C.inkSoft, letterSpacing: -0.5, marginBottom: 6 },
  tagline: { fontSize: 15, color: C.muted },

  form: { paddingBottom: 20 },
  formTitle: { fontSize: 22, fontWeight: '800', color: C.inkSoft, letterSpacing: -0.3, marginBottom: 20 },

  inputWrap: { marginBottom: 12 },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: C.rMd,
    paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 16, color: C.inkSoft,
  },
  inputFocused: { borderColor: C.green, backgroundColor: C.surface },

  btn: {
    backgroundColor: C.green,
    borderRadius: C.rMd,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6, marginBottom: 6,
    ...C.shadowMd,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.1 },

  toggle: { marginTop: 16, alignItems: 'center' },
  toggleText: { fontSize: 14, color: C.muted },
  toggleLink: { color: C.green, fontWeight: '700' },
});
