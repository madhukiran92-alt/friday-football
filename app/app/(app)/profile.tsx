import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
  StatusBar, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { C } from '../../src/lib/theme';

export default function ProfileScreen() {
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [focused, setFocused] = useState(false);

  async function save() {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter your name.'); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ name: name.trim() }).eq('id', profile!.id);
    if (error) Alert.alert('Error', error.message);
    else { await refreshProfile(); Alert.alert('Saved ✓', 'Your profile has been updated.'); }
    setSaving(false);
  }

  async function signOut() {
    Alert.alert('Sign out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await supabase.auth.signOut(); } },
    ]);
  }

  async function deleteAccount() {
    // Two-step confirmation — this is permanent and irreversible.
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and removes you from all games. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ],
    );
  }

  function confirmDelete() {
    Alert.alert(
      'Are you absolutely sure?',
      'Your account and all your data will be erased immediately.',
      [
        { text: 'Keep my account', style: 'cancel' },
        { text: 'Delete forever', style: 'destructive', onPress: async () => {
          setDeleting(true);
          const { error } = await supabase.rpc('delete_my_account');
          if (error) {
            setDeleting(false);
            Alert.alert('Error', 'Could not delete your account. Please try again or email hello@pitchapp.net.');
            return;
          }
          // Account is gone — clear the local session, which returns to the login screen.
          await supabase.auth.signOut();
        }},
      ],
    );
  }

  if (!profile) return (
    <View style={styles.loading}><ActivityIndicator size="large" color={C.green} /></View>
  );

  const initials = profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Nav */}
          <SafeAreaView>
            <View style={styles.nav}>
              <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6}>
                <Text style={styles.navBack}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.navTitle}>Profile</Text>
              <View style={{ width: 50 }} />
            </View>
          </SafeAreaView>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>
            <Text style={styles.avatarName}>{profile.name}</Text>
            {profile.phone && <Text style={styles.avatarSub}>{profile.phone}</Text>}
          </View>

          {/* Form */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Display Name</Text>
            <TextInput
              style={[styles.input, focused && styles.inputFocused]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={C.subtle}
              autoCapitalize="words"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />

            {profile.phone && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Phone</Text>
                <View style={styles.readOnly}>
                  <Text style={styles.readOnlyText}>{profile.phone}</Text>
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={save}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.75}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          {/* Delete account */}
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && styles.btnDisabled]}
            onPress={deleteAccount}
            disabled={deleting}
            activeOpacity={0.6}
          >
            <Text style={styles.deleteText}>{deleting ? 'Deleting…' : 'Delete Account'}</Text>
          </TouchableOpacity>

          {/* Legal links */}
          <View style={styles.legalRow}>
            <TouchableOpacity onPress={() => router.push('/(app)/legal')} activeOpacity={0.6}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>·</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/legal')} activeOpacity={0.6}>
              <Text style={styles.legalLink}>Terms of Service</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>Pitch v1.0.0</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },

  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: C.greenDeep,
  },
  navBack: { fontSize: 15, color: C.greenLight, fontWeight: '600', width: 50 },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#ffffff' },

  avatarSection: {
    alignItems: 'center',
    backgroundColor: C.greenDeep,
    paddingVertical: 28,
    paddingBottom: 36,
    marginBottom: 20,
  },
  avatarOuter: {
    padding: 4,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 14,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  avatarName: { fontSize: 20, fontWeight: '800', color: '#ffffff', letterSpacing: -0.2, marginBottom: 4 },
  avatarSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },

  section: {
    backgroundColor: C.surface, borderRadius: C.rLg,
    marginHorizontal: 16, padding: 18,
    marginBottom: 14,
    ...C.shadow,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
  input: {
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: 'transparent',
    borderRadius: C.rSm, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: C.inkSoft,
  },
  inputFocused: { borderColor: C.green, backgroundColor: C.surface },
  readOnly: { backgroundColor: C.bg, borderRadius: C.rSm, paddingHorizontal: 14, paddingVertical: 13 },
  readOnlyText: { fontSize: 15, color: C.muted },

  saveBtn: {
    backgroundColor: C.green, borderRadius: C.rMd, paddingVertical: 14,
    alignItems: 'center', marginTop: 20,
  },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  signOutBtn: {
    marginHorizontal: 16, borderRadius: C.rMd, paddingVertical: 14,
    alignItems: 'center', backgroundColor: C.redLight,
    borderWidth: 1, borderColor: C.redBorder,
  },
  signOutText: { color: C.red, fontSize: 15, fontWeight: '700' },

  deleteBtn: {
    marginHorizontal: 16, marginTop: 10, paddingVertical: 12,
    alignItems: 'center',
  },
  deleteText: { color: C.subtle, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },

  legalRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, marginTop: 24,
  },
  legalLink: { fontSize: 13, color: C.muted, textDecorationLine: 'underline' },
  legalDot: { fontSize: 13, color: C.subtle },
  versionText: { textAlign: 'center', fontSize: 12, color: C.subtle, marginTop: 8 },
});
