import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
      <StatusBar barStyle="light-content" />

      {/* Floodlight glow */}
      <LinearGradient
        colors={['rgba(74,222,128,0.16)', 'rgba(74,222,128,0.04)', 'transparent']}
        style={styles.floodlight}
      />

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safe}>

          {/* Wordmark */}
          <View style={styles.logoSection}>
            <View style={styles.logoRow}>
              <View style={styles.logoDot} />
              <Text style={styles.appName}>Pitch</Text>
            </View>
            <Text style={styles.tagline}>Organise your game.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>{isSignUp ? 'Create account' : 'Welcome back'}</Text>

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
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.85}
              style={[styles.btnWrap, loading && styles.btnDisabled]}
            >
              <LinearGradient colors={C.gradGreen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
                <Text style={styles.btnText}>
                  {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
                </Text>
              </LinearGradient>
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
  root: { flex: 1, backgroundColor: C.bg },
  floodlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 420,
  },
  kav: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 28 },

  logoSection: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 8 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: C.greenSoft,
    ...C.glow,
  },
  appName: {
    fontSize: 52, color: C.ink, letterSpacing: -2,
    fontFamily: C.fontDisplay,
  },
  tagline: { fontSize: 16, color: C.muted, marginTop: 10 },

  form: { paddingBottom: 24 },
  formTitle: {
    fontSize: 24, color: C.ink, letterSpacing: -0.4, marginBottom: 20,
    fontFamily: C.fontDisplay,
  },

  inputWrap: { marginBottom: 12 },
  input: {
    backgroundColor: C.glass,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: C.rMd,
    paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 16, color: C.ink,
  },
  inputFocused: { borderColor: C.greenSoft, backgroundColor: 'rgba(255,255,255,0.07)' },

  btnWrap: { borderRadius: C.rMd, marginTop: 6, marginBottom: 6, ...C.glow },
  btn: { borderRadius: C.rMd, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.1 },

  toggle: { marginTop: 18, alignItems: 'center' },
  toggleText: { fontSize: 14, color: C.muted },
  toggleLink: { color: C.greenSoft, fontWeight: '700' },
});
