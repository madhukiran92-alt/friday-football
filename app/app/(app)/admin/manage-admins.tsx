import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import { Admin } from '../../../src/lib/types';
import { C } from '../../../src/lib/theme';

export default function ManageAdminsScreen() {
  const { profile } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    const { data } = await supabase
      .from('admins')
      .select('*, profile:profiles!admins_profile_id_fkey(id, name)')
      .order('created_at', { ascending: true });
    setAdmins(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function removeAdmin(adminId: string, name: string) {
    Alert.alert(`Remove ${name}?`, 'They will lose admin access immediately.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('admins').delete().eq('id', adminId);
        await fetchData();
      }},
    ]);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={C.green} />;

  return (
    <ScrollView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admins</Text>
      </View>

      {/* ── How new organisers join ── */}
      <View style={styles.section}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Adding a new organiser?</Text>
          <Text style={styles.infoText}>
            Organiser accounts are created on the Pitch website. Once they've signed up
            there, they sign in to this app with the same details and appear in the list below.
          </Text>
        </View>
      </View>

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

  section: { padding: 16, paddingBottom: 0 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.ink, marginBottom: 10 },

  infoCard: {
    backgroundColor: C.greenUltra, borderRadius: C.rMd, padding: 16,
  },
  infoTitle: { fontSize: 14, fontWeight: '800', color: C.greenDeep, marginBottom: 4 },
  infoText: { fontSize: 13, color: C.greenDeep, lineHeight: 19, opacity: 0.85 },

  // Admin rows
  adminRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: C.rMd,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 4,
    ...C.shadow,
  },
  adminName: { fontSize: 15, fontWeight: '700', color: C.ink },
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
