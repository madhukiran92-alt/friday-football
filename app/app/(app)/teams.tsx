import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Team } from '../../src/lib/types';

export default function TeamsScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeams() {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('game_id', gameId);

      if (!teamsData) { setLoading(false); return; }

      const enriched = await Promise.all(teamsData.map(async (team) => {
        const { data: members } = await supabase
          .from('team_members')
          .select('profile:profiles(id, name)')
          .eq('team_id', team.id);
        return { ...team, members: members?.map(m => (m.profile as any)) ?? [] };
      }));
      setTeams(enriched);
      setLoading(false);
    }
    fetchTeams();
  }, [gameId]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#16a34a" />;

  const colors = ['#dcfce7', '#dbeafe', '#fef9c3', '#fce7f3'];
  const textColors = ['#16a34a', '#2563eb', '#d97706', '#9333ea'];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Teams</Text>
      </View>
      {teams.map((team, i) => (
        <View key={team.id} style={[styles.teamCard, { backgroundColor: colors[i % colors.length] }]}>
          <Text style={[styles.teamName, { color: textColors[i % textColors.length] }]}>{team.name}</Text>
          {(team.members ?? []).map((m: any, j: number) => (
            <View key={m.id} style={styles.memberRow}>
              <Text style={styles.memberIndex}>{j + 1}.</Text>
              <Text style={styles.memberName}>{m.name}</Text>
            </View>
          ))}
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', gap: 12 },
  back: {},
  backText: { fontSize: 16, color: '#16a34a' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  teamCard: { margin: 16, marginBottom: 8, borderRadius: 16, padding: 20 },
  teamName: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  memberRow: { flexDirection: 'row', marginBottom: 6 },
  memberIndex: { width: 24, color: '#6b7280', fontWeight: '600' },
  memberName: { fontSize: 15, color: '#111827' },
});
