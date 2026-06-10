import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import { Game, Registration } from '../../../src/lib/types';
import { splitIntoTeams } from '../../../src/lib/teamLogic';

export default function GenerateTeamsScreen() {
  const { gameId: preselectedGameId } = useLocalSearchParams<{ gameId?: string }>();
  const { profile } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [confirmed, setConfirmed] = useState<Registration[]>([]);
  const [teams, setTeams] = useState<string[][]>([]); // array of name arrays for preview
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function fetchGames() {
      const { data } = await supabase
        .from('games')
        .select('*')
        .in('status', ['open', 'closed'])
        .order('scheduled_at', { ascending: false });
      const list = data ?? [];
      setGames(list);
      // Pre-select if gameId was passed in params
      if (preselectedGameId) {
        const preselected = list.find(g => g.id === preselectedGameId);
        if (preselected) selectGame(preselected);
      }
      setLoading(false);
    }
    fetchGames();
  }, []);

  async function selectGame(game: Game) {
    setSelectedGame(game);
    setTeams([]);
    const { data } = await supabase
      .from('registrations')
      .select('*, profile:profiles!registrations_profile_id_fkey(id, name)')
      .eq('game_id', game.id)
      .eq('status', 'confirmed')
      .order('position', { ascending: true });
    setConfirmed(data ?? []);
  }

  function previewTeams() {
    if (confirmed.length < 2) {
      Alert.alert('Not enough players', 'Need at least 2 confirmed players.');
      return;
    }
    const [t1, t2] = splitIntoTeams(confirmed);
    setTeams([
      t1.map(r => (r.profile as any)?.name ?? '?'),
      t2.map(r => (r.profile as any)?.name ?? '?'),
    ]);
  }

  async function saveTeams() {
    if (!selectedGame || teams.length === 0) return;
    setGenerating(true);

    // Delete existing teams for this game
    await supabase.from('teams').delete().eq('game_id', selectedGame.id);

    const teamNames = ['Team A', 'Team B', 'Team C', 'Team D'];
    const profilesByName = Object.fromEntries(confirmed.map(r => [(r.profile as any)?.name, r.profile_id]));

    for (let i = 0; i < teams.length; i++) {
      const { data: teamData } = await supabase
        .from('teams')
        .insert({ game_id: selectedGame.id, name: teamNames[i] })
        .select()
        .single();
      if (teamData) {
        const members = teams[i].map(name => ({
          team_id: teamData.id,
          profile_id: profilesByName[name],
        })).filter(m => m.profile_id);
        await supabase.from('team_members').insert(members);
      }
    }

    // Mark game as completed
    await supabase.from('games').update({ status: 'completed' }).eq('id', selectedGame.id);

    setGenerating(false);
    Alert.alert('Teams saved!', 'Players can now see the teams on the home screen.', [
      { text: 'OK', onPress: () => router.replace('/(app)/home') },
    ]);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#16a34a" />;

  const teamColors = ['#dcfce7', '#dbeafe'];
  const teamTextColors = ['#16a34a', '#2563eb'];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Generate Teams</Text>
      </View>

      <Text style={styles.sectionTitle}>Select a game</Text>
      {games.map(g => (
        <TouchableOpacity
          key={g.id}
          style={[styles.gameRow, selectedGame?.id === g.id && styles.gameRowSelected]}
          onPress={() => selectGame(g)}
        >
          <Text style={styles.gameName}>{g.title}</Text>
          <Text style={styles.gameMeta}>{new Date(g.scheduled_at).toLocaleDateString()}</Text>
        </TouchableOpacity>
      ))}

      {selectedGame && (
        <>
          <Text style={styles.sectionTitle}>
            {confirmed.length} confirmed player{confirmed.length !== 1 ? 's' : ''}
          </Text>

          <TouchableOpacity style={styles.button} onPress={previewTeams}>
            <Text style={styles.buttonText}>Shuffle Teams</Text>
          </TouchableOpacity>

          {teams.length > 0 && (
            <>
              {teams.map((team, i) => (
                <View key={i} style={[styles.teamCard, { backgroundColor: teamColors[i % teamColors.length] }]}>
                  <Text style={[styles.teamName, { color: teamTextColors[i % teamTextColors.length] }]}>
                    {['Team A', 'Team B'][i]}
                  </Text>
                  {team.map((name, j) => (
                    <Text key={j} style={styles.memberName}>{j + 1}. {name}</Text>
                  ))}
                </View>
              ))}

              <TouchableOpacity
                style={[styles.button, styles.buttonSave, generating && styles.buttonDisabled]}
                onPress={saveTeams}
                disabled={generating}
              >
                <Text style={styles.buttonText}>{generating ? 'Saving...' : 'Save & Publish Teams'}</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', gap: 12 },
  back: { fontSize: 16, color: '#16a34a' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  gameRow: { marginHorizontal: 16, marginBottom: 6, backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1.5, borderColor: 'transparent' },
  gameRowSelected: { borderColor: '#16a34a' },
  gameName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  gameMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  button: { margin: 16, backgroundColor: '#6b7280', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonSave: { backgroundColor: '#16a34a' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  teamCard: { margin: 16, marginBottom: 8, borderRadius: 16, padding: 20 },
  teamName: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  memberName: { fontSize: 15, color: '#111827', marginBottom: 4 },
});
