import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import { Admin, Profile } from '../../../src/lib/types';

export default function ManageAdminsScreen() {
  const { profile } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAdmins() {
    const { data } = await supabase
      .from('admins')
      .select('*, profile:profiles!admins_profile_id_fkey(id, name, phone)')
      .order('created_at', { ascending: true });
    setAdmins(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchAdmins(); }, []);

  async function searchPlayers(query: string) {
    setSearch(query);
    if (query.length < 2) { setResults([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(10);
    const adminIds = admins.map(a => a.profile_id);
    setResults((data ?? []).filter(p => !adminIds.includes(p.id)));
  }

  async function addAdmin(p: Profile) {
    const { error } = await supabase.from('admins').insert({ profile_id: p.id, added_by: profile!.id });
    if (error) Alert.alert('Error', error.message);
    else { setSearch(''); setResults([]); await fetchAdmins(); }
  }

  async function removeAdmin(adminId: string, name: string) {
    Alert.alert(`Remove ${name}?`, 'They will lose admin access.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          await supabase.from('admins').delete().eq('id', adminId);
          await fetchAdmins();
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#16a34a" />;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Manage Admins</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Add admin by name</Text>
        <TextInput style={styles.input} placeholder="Search player..." value={search} onChangeText={searchPlayers} />
        {results.map(p => (
          <TouchableOpacity key={p.id} style={styles.searchResult} onPress={() => addAdmin(p)}>
            <Text style={styles.searchResultText}>{p.name}</Text>
            <Text style={styles.addText}>+ Make Admin</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Current Admins ({admins.length})</Text>
      {admins.map(a => (
        <View key={a.id} style={styles.adminRow}>
          <Text style={styles.adminName}>{(a.profile as any)?.name}</Text>
          {a.profile_id !== profile?.id && (
            <TouchableOpacity onPress={() => removeAdmin(a.id, (a.profile as any)?.name)}>
              <Text style={styles.removeBtn}>Remove</Text>
            </TouchableOpacity>
          )}
          {a.profile_id === profile?.id && <Text style={styles.youTag}>You</Text>}
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', gap: 12 },
  back: { fontSize: 16, color: '#16a34a' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  section: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, fontSize: 15 },
  searchResult: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  searchResultText: { fontSize: 15, color: '#111827' },
  addText: { fontSize: 14, color: '#16a34a', fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginHorizontal: 16, marginBottom: 8 },
  adminRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 4, borderRadius: 10, padding: 14 },
  adminName: { flex: 1, fontSize: 15, color: '#111827' },
  removeBtn: { fontSize: 14, color: '#ef4444', fontWeight: '600' },
  youTag: { fontSize: 12, color: '#16a34a', fontWeight: '700', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});
