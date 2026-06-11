import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, StatusBar, SafeAreaView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Team } from '../../src/lib/types';
import { C } from '../../src/lib/theme';

const PALETTES = [
  { accent: C.green,   bg: C.greenUltra,   initial: C.greenLight,  initText: C.green },
  { accent: C.indigo,  bg: C.indigoLight,  initial: C.indigoBorder, initText: C.indigo },
  { accent: '#c4b5fd', bg: 'rgba(139,92,246,0.12)', initial: 'rgba(139,92,246,0.35)', initText: '#c4b5fd' },
  { accent: C.amber,   bg: C.amberLight,   initial: C.amberBorder,  initText: C.amber },
];

export default function TeamsScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeams() {
      const { data: teamsData } = await supabase.from('teams').select('*').eq('game_id', gameId);
      if (!teamsData) { setLoading(false); return; }
      const enriched = await Promise.all(teamsData.map(async (team) => {
        const { data: members } = await supabase
          .from('team_members').select('profile:profiles(id, name)').eq('team_id', team.id);
        return { ...team, members: members?.map(m => (m.profile as any)) ?? [] };
      }));
      setTeams(enriched);
      setLoading(false);
    }
    fetchTeams();
  }, [gameId]);

  if (loading) return (
    <View style={styles.loading}><ActivityIndicator size="large" color={C.green} /></View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6}>
            <Text style={styles.navBack}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Teams</Text>
          <View style={{ width: 50 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content}>
        {teams.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎲</Text>
            <Text style={styles.emptyText}>No teams generated yet.</Text>
          </View>
        ) : (
          teams.map((team, i) => {
            const p = PALETTES[i % PALETTES.length];
            const members: any[] = (team as any).members ?? [];
            return (
              <View key={team.id} style={[styles.teamCard, { backgroundColor: p.bg }]}>
                <View style={styles.teamCardHead}>
                  <View style={[styles.teamNum, { backgroundColor: p.accent }]}>
                    <Text style={styles.teamNumText}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.teamName, { color: p.accent }]}>{team.name}</Text>
                  <View style={[styles.teamCountBadge, { backgroundColor: p.initial }]}>
                    <Text style={[styles.teamCountText, { color: p.initText }]}>{members.length} players</Text>
                  </View>
                </View>
                <View style={styles.memberList}>
                  {members.map((m: any) => (
                    <View key={m.id} style={styles.memberRow}>
                      <View style={[styles.memberInit, { backgroundColor: p.initial }]}>
                        <Text style={[styles.memberInitText, { color: p.initText }]}>
                          {m.name?.charAt(0).toUpperCase() ?? '?'}
                        </Text>
                      </View>
                      <Text style={styles.memberName}>{m.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safe: { backgroundColor: C.greenDeep },
  loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },

  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: C.greenDeep,
  },
  navBack: { fontSize: 15, color: C.greenLight, fontWeight: '600', width: 50 },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#ffffff' },

  content: { padding: 16 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: C.muted },

  teamCard: { borderRadius: C.rLg, marginBottom: 14, overflow: 'hidden', ...C.shadow },
  teamCardHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16, paddingBottom: 12,
  },
  teamNum: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  teamNumText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  teamName: { flex: 1, fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  teamCountBadge: { borderRadius: C.rFull, paddingHorizontal: 10, paddingVertical: 4 },
  teamCountText: { fontSize: 12, fontWeight: '700' },

  memberList: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberInit: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  memberInitText: { fontSize: 14, fontWeight: '700' },
  memberName: { fontSize: 15, color: C.inkSoft, fontWeight: '500' },
});
