import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { C } from '../../src/lib/theme';

type Stage = 'email' | 'reset';

export default function ForgotPasswordScreen() {
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  async function sendCode() {
    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    setLoading(false);
    // Always advance — we don't reveal whether an email is registered.
    if (error && !/rate limit/i.test(error.message)) {
      // Only surface genuine send failures (e.g. rate limit) — otherwise proceed.
    }
    setStage('reset');
  }

  async function resetPassword() {
    if (code.trim().length < 6) {
      Alert.alert('Enter the code', 'Please enter the 6-digit code from your email.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Weak password', 'Your new password must be at least 8 characters.');
      return;
    }
    setLoading(true);

    // 1. Verify the recovery code — this signs the user in temporarily.
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'recovery',
    });
    if (verifyError) {
      setLoading(false);
      Alert.alert('Invalid code', 'That code is incorrect or has expired. Please try again.');
      return;
    }

    // 2. Set the new password on the now-authenticated session.
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateError) {
      Alert.alert('Error', updateError.message);
      return;
    }

    Alert.alert('Password updated', 'You\'re all set — you\'re now signed in.', [
      { text: 'Continue', onPress: () => router.replace('/') },
    ]);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={['#D9F8EA', '#F1FBF6', 'rgba(247,248,250,0)']} style={styles.floodlight} />

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.safe}>

          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.6}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.form}>
            {stage === 'email' ? (
              <>
                <Text style={styles.title}>Reset password</Text>
                <Text style={styles.sub}>Enter your email and we'll send you a 6-digit reset code.</Text>

                <TextInput
                  style={[styles.input, focused === 'email' && styles.inputFocused]}
                  placeholder="Email address"
                  placeholderTextColor={C.subtle}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  autoFocus
                  returnKeyType="send"
                  onSubmitEditing={sendCode}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                />

                <PrimaryButton label={loading ? 'Sending…' : 'Send reset code'} onPress={sendCode} disabled={loading} />
              </>
            ) : (
              <>
                <Text style={styles.title}>Check your email</Text>
                <Text style={styles.sub}>
                  Enter the 6-digit code we sent to {email.trim().toLowerCase()} and choose a new password.
                </Text>

                <TextInput
                  style={[styles.input, styles.codeInput, focused === 'code' && styles.inputFocused]}
                  placeholder="123456"
                  placeholderTextColor={C.subtle}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={setCode}
                  autoFocus
                  onFocus={() => setFocused('code')}
                  onBlur={() => setFocused(null)}
                />

                <TextInput
                  style={[styles.input, focused === 'pw' && styles.inputFocused]}
                  placeholder="New password (min 8 characters)"
                  placeholderTextColor={C.subtle}
                  secureTextEntry
                  autoComplete="new-password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  returnKeyType="done"
                  onSubmitEditing={resetPassword}
                  onFocus={() => setFocused('pw')}
                  onBlur={() => setFocused(null)}
                />

                <PrimaryButton label={loading ? 'Updating…' : 'Reset password'} onPress={resetPassword} disabled={loading} />

                <TouchableOpacity onPress={sendCode} style={styles.resend} activeOpacity={0.6} disabled={loading}>
                  <Text style={styles.resendText}>Didn't get it?  <Text style={styles.resendLink}>Resend code</Text></Text>
                </TouchableOpacity>
              </>
            )}
          </View>

        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85} style={[styles.btnWrap, disabled && styles.btnDisabled]}>
      <LinearGradient colors={C.gradGreen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
        <Text style={styles.btnText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  floodlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
  kav: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 28 },

  backBtn: { paddingVertical: 12, marginTop: 8 },
  backText: { fontSize: 15, color: C.greenSoft, fontWeight: '600' },

  form: { flex: 1, justifyContent: 'center', paddingBottom: 40 },
  title: { fontSize: 27, color: C.ink, letterSpacing: -0.5, marginBottom: 8, fontFamily: C.fontDisplay },
  sub: { fontSize: 15, color: C.muted, marginBottom: 26, lineHeight: 22 },

  input: {
    backgroundColor: C.glass, borderWidth: 1.5, borderColor: C.border,
    borderRadius: C.rMd, paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 16, color: C.ink, marginBottom: 12,
  },
  codeInput: { fontSize: 24, letterSpacing: 8, textAlign: 'center', fontWeight: '700' },
  inputFocused: { borderColor: C.green, backgroundColor: '#FFFFFF' },

  btnWrap: { borderRadius: C.rMd, marginTop: 8, ...C.glow },
  btn: { borderRadius: C.rMd, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  resend: { marginTop: 18, alignItems: 'center' },
  resendText: { fontSize: 14, color: C.muted },
  resendLink: { color: C.greenSoft, fontWeight: '700' },
});
