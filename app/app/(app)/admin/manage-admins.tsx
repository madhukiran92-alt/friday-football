import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator, Clipboard,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import { Admin, Profile } from '../../../src/lib/types';
import { C } from '../../../src/lib/theme';

type Invite = { id: string; code: string; created_at: string; used_at: string | null; used_by: string | null };

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function ManageAdminsScreen() {
  const { profile } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  async function fetchData() {
    const [{ data: adminsData }, { data: invitesData }] = await Promise.all([
      supabase
        .from('admins')
        .select('*, profile:profiles!admins_profile_id_fkey(id, name, phone)')
        .order('created_at', { ascending: true }),
      supabase
        .from('admin_invites')
        .select('id, code, created_at, used_at, used_by')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    setAdmins(adminsData ?? []);
    setInvites(invitesData ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function searchPlayers(query: string) {
    setSearch(query);
    if (query.length < 2) { setResults([]); return; }
    const { data } = await supabase.from('profiles_public').select('*').ilike('name', `%${query}%`).limit(10);
    const adminIds = admins.map(a => a.profile_id);
    setResults((data ?? []).filter(p => !adminIds.includes(p.id)));
  }

  async function addAdmin(p: Profile) {
    const { error } = await supabase.from('admins').insert({ profile_id: p.id, added_by: profile!.id });
    if (error) Alert.alert('Error', error.message);
    else { setSearch(''); setResults([]); await fetchData(); }
  }

  async function removeAdmin(adminId: string, name: string) {
    Alert.alert(`Remove ${name}?`, 'They will lose admin access immediately.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('admins').delete().eq('id', adminId);
        await fetchData();
      }},
    ]);
  }

  async function generateInvite() {
    setGeneratingInvite(true);
    const code = randomCode();
    const { error } = await supabase.from('admin_invites').insert({ code, created_by: profile!.id });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await fetchData();
      // Auto-copy to clipboard
      Clipboard.setString(code);
      Alert.alert('Invite created!', `Code: ${code}\n\nCopied to clipboard. Share it with the person you want to make an admin — they'll enter it when they sign up.`);
    }
    setGeneratingInvite(false);
  }

  async function copyCode(code: string) {
    Clipboard.setString(code);
    Alert.alert('Copied!', `Invite code "${code}" copied to clipboard.`);
  }

  async function revokeInvite(id: string) {
    Alert.alert('Revoke invite?', 'This code will no longer work.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: async () => {
        await supabase.from('admin_invites').delete().eq('id', id);
        await fetchData();
      }},
    ]);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={C.green} />;

  const unusedInvites = invites.filter(i => !i.used_by);
  const usedInvites = invites.filter(i => i.used_by);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Manage Admins</Text>
      </View>

      {/* ── Invite codes ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin Invite Codes</Text>
        <Text style={styles.sectionSub}>
          Generate a one-time code and share it with someone. They'll enter it during signup to get admin access automatically.
        </Text>

        <TouchableOpacity
          style={[styles.generateBtn, generatingInvite && styles.generateBtnDisabled]}
          onPress={generateInvite}
          disabled={generatingInvite}
          activeOpacity={0.8}
        >
          <Text style={styles.generateBtnText}>{generatingInvite ? 'Generating…' : '+ Generate Invite Code'}</Text>
        </TouchableOpacity>

        {unusedInvites.length > 0 && (
          <View style={styles.inviteList}>
            <Text style={styles.inviteListLabel}>Active codes</Text>
            {unusedInvites.map(inv => (
              <View key={inv.id} style={styles.inviteRow}>
                <Text style={styles.inviteCode}>{inv.code}</Text>
                <Text style={styles.inviteDate}>
                  {new Date(inv.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </Text>
                <TouchableOpacity style={styles.copyBtn} onPress={() => copyCode(inv.code)} activeOpacity={0.7}>
                  <Text style={styles.copyBtnText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.revokeBtn} onPress={() => revokeInvite(inv.id)} activeOpacity={0.7}>
                  <Text style={styles.revokeBtnText}>Revoke</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {usedInvites.length > 0 && (
          <View style={[styles.inviteList, { marginTop: 8 }]}>
            <Text style={styles.inviteListLabel}>Used</Text>
            {usedInvites.map(inv => (
              <View key={inv.id} style={[styles.inviteRow, styles.inviteRowUsed]}>
                <Text style={[styles.inviteCode, styles.inviteCodeUsed]}>{inv.code}</Text>
                <Text style={styles.inviteDate}>Used {new Date(inv.used_at!).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.divider} />

      {/* ── Promote existing player ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Promote Existing Player</Text>
        <Text style={styles.sectionSub}>Search for someone who already has an account.</Text>
        <TextInput
          style={styles.input}
          placeholder="Search by name…"
          value={search}
          onChangeText={searchPlayers}
        />
        {results.map(p => (
          <TouchableOpacity key={p.id} style={styles.searchResult} onPress={() => addAdmin(p)} activeOpacity={0.75}>
            <View style={styles.playerInit}>
              <Text style={styles.playerInitText}>{p.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.searchResultText}>{p.name}</Text>
            <Text style={styles.addText}>Make Admin</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.divider} />

      {/* ── Current admins ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Admins ({admins.length})</Text>
        {admins.map(a => (
          <View key={a.id} style={styles.adminRow}>
            <View style={styles.playerInit}>
              <Text style={styles.playerInitText}>{(a.profile as any)?.name?.charAt(0)?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminName}>{(a.profile as any)?.name}</Text>
              <Text style={styles.adminPhone}>{(a.profile as any)?.phone}</Text>
            </View>
            {a.profile_id === profile?.id
              ? <View style={styles.youTag}><Text style={styles.youTagText}>You</Text></View>
              : (
                <TouchableOpacity onPress={() => removeAdmin(a.id, (a.profile as any)?.name)} activeOpacity={0.7}>
                  <Text style={styles.removeBtn}>Remove</Text>
                </TouchableOpacity>
              )
            }
          </View>
        ))}
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 20, paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator,
  },
  back: { fontSize: 16, color: C.green, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: C.ink },

  section: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.ink, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: C.muted, lineHeight: 18, marginBottom: 14 },
  divider: { height: 8, backgroundColor: C.bg },

  // Invite
  generateBtn: {
    backgroundColor: C.greenDeep, borderRadius: C.rMd,
    paddingVertical: 13, alignItems: 'center', marginBottom: 16,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  inviteList: { borderRadius: C.rMd, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  inviteListLabel: {
    fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.5,
    textTransform: 'uppercase', paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: C.bg,
  },
  inviteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.separator,
  },
  inviteRowUsed: { backgroundColor: C.bg },
  inviteCode: {
    fontFamily: 'Courier New', fontSize: 16, fontWeight: '700',
    color: C.ink, letterSpacing: 1, flex: 1,
  },
  inviteCodeUsed: { color: C.subtle, textDecorationLine: 'line-through' },
  inviteDate: { fontSize: 11, color: C.muted },
  copyBtn: {
    backgroundColor: C.greenUltra, borderRadius: C.rSm,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: C.green },
  revokeBtn: {
    backgroundColor: C.redLight, borderRadius: C.rSm,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  revokeBtnText: { fontSize: 12, fontWeight: '700', color: C.red },

  // Search / promote
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: C.border,
    borderRadius: C.rMd, padding: 13, fontSize: 15,
  },
  searchResult: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator,
  },
  searchResultText: { flex: 1, fontSize: 15, color: C.ink },
  addText: {
    fontSize: 13, color: C.green, fontWeight: '700',
    backgroundColor: C.greenUltra, paddingHorizontal: 10, paddingVertical: 5, borderRadius: C.rSm,
  },

  // Admin rows
  adminRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: C.rMd,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 4,
    ...C.shadow,
  },
  adminName: { fontSize: 15, fontWeight: '700', color: C.ink },
  adminPhone: { fontSize: 12, color: C.muted, marginTop: 1 },
  removeBtn: { fontSize: 13, color: C.red, fontWeight: '700' },
  youTag: {
    backgroundColor: C.greenUltra, borderRadius: C.rFull,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  youTagText: { fontSize: 12, color: C.green, fontWeight: '700' },

  playerInit: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.greenDeep, alignItems: 'center', justifyContent: 'center',
  },
  playerInitText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
