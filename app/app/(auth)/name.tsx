import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, StatusBar, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { C } from '../../src/lib/theme';

export default function NameScreen() {
  const { session, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [inviteFocused, setInviteFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  async function saveName() {
    if (!name.trim()) return;
    setLoading(true);

    // Save name
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', session!.user.id);

    if (error) {
      setLoading(false);
      Alert.alert('Error', error.message);
      return;
    }

    // Try to redeem invite code if provided
    if (inviteCode.trim()) {
      const { data: redeemed, error: redeemError } = await supabase
        .rpc('redeem_admin_invite', { p_code: inviteCode.trim().toUpperCase() });

      if (redeemError || !redeemed) {
        setLoading(false);
        Alert.alert(
          'Invalid invite code',
          'That code doesn\'t exist or has already been used. You\'ve been signed up as a player — ask an admin to grant access.',
          [{ text: 'OK', onPress: async () => { await refreshProfile(); router.replace('/'); } }]
        );
        return;
      }
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
              returnKeyType="next"
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />

            {/* Invite code toggle */}
            {!showInvite ? (
              <TouchableOpacity style={styles.inviteToggle} onPress={() => setShowInvite(true)} activeOpacity={0.7}>
                <Text style={styles.inviteToggleText}>Have an admin invite code? →</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.inviteBox}>
                <Text style={styles.inviteLabel}>Admin Invite Code</Text>
                <TextInput
                  style={[styles.input, styles.inviteInput, inviteFocused && styles.inputFocused]}
                  placeholder="e.g. AB3X7KQR"
                  placeholderTextColor={C.subtle}
                  value={inviteCode}
                  onChangeText={t => setInviteCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                  onFocus={() => setInviteFocused(true)}
                  onBlur={() => setInviteFocused(false)}
                />
                <Text style={styles.inviteHint}>Optional — leave blank to sign up as a player.</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, disabled && styles.btnDisabled]}
              onPress={saveName}
              disabled={disabled}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>{loading ? 'Saving…' : "Let's go →"}</Text>
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

  inviteToggle: { alignSelf: 'flex-start', marginBottom: 16, marginTop: -6 },
  inviteToggleText: { fontSize: 13, color: C.green, fontWeight: '600' },

  inviteBox: {
    backgroundColor: C.greenUltra, borderRadius: C.rMd,
    padding: 14, marginBottom: 14,
  },
  inviteLabel: { fontSize: 13, fontWeight: '700', color: C.green, marginBottom: 8 },
  inviteInput: { marginBottom: 0, backgroundColor: C.surface },
  inviteHint: { fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 16 },

  btn: {
    backgroundColor: C.green, borderRadius: C.rMd, paddingVertical: 16,
    alignItems: 'center', ...C.shadowMd,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
