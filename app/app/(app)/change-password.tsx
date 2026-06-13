import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { C } from '../../src/lib/theme';

export default function ChangePasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  async function changePassword() {
    if (newPassword.length < 8) {
      Alert.alert('Weak password', 'Your password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirm) {
      Alert.alert('Passwords don\'t match', 'Please make sure both fields match.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    Alert.alert('Password changed', 'Your password has been updated.', [
      { text: 'Done', onPress: () => router.back() },
    ]);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Change Password</Text>
          <View style={{ width: 50 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.form}>
          <Text style={styles.label}>New password</Text>
          <TextInput
            style={[styles.input, focused === 'pw' && styles.inputFocused]}
            placeholder="At least 8 characters"
            placeholderTextColor={C.subtle}
            secureTextEntry
            autoComplete="new-password"
            value={newPassword}
            onChangeText={setNewPassword}
            autoFocus
            onFocus={() => setFocused('pw')}
            onBlur={() => setFocused(null)}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Confirm new password</Text>
          <TextInput
            style={[styles.input, focused === 'confirm' && styles.inputFocused]}
            placeholder="Re-enter your new password"
            placeholderTextColor={C.subtle}
            secureTextEntry
            autoComplete="new-password"
            value={confirm}
            onChangeText={setConfirm}
            returnKeyType="done"
            onSubmitEditing={changePassword}
            onFocus={() => setFocused('confirm')}
            onBlur={() => setFocused(null)}
          />

          <TouchableOpacity onPress={changePassword} disabled={loading} activeOpacity={0.85} style={[styles.btnWrap, loading && styles.btnDisabled]}>
            <LinearGradient colors={C.gradGreen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
              <Text style={styles.btnText}>{loading ? 'Updating…' : 'Update Password'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  headerSafe: { backgroundColor: C.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  back: { fontSize: 15, color: C.green, fontWeight: '600', width: 50 },
  title: { fontSize: 18, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },

  form: { padding: 20 },
  label: { fontSize: 13, fontWeight: '700', color: C.inkSoft, marginBottom: 7 },
  input: {
    backgroundColor: C.glass, borderWidth: 1.5, borderColor: C.border,
    borderRadius: C.rMd, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: C.ink,
  },
  inputFocused: { borderColor: C.green, backgroundColor: '#FFFFFF' },

  btnWrap: { borderRadius: C.rMd, marginTop: 26, ...C.glow },
  btn: { borderRadius: C.rMd, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
