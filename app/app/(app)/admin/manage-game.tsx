import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import { Game, Registration, Profile } from '../../../src/lib/types';
import { C } from '../../../src/lib/theme';

type RegWithProfile = Registration & { profile: Profile };

export default function ManageGameScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const { profile: adminProfile, isAdmin } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [confirmed, setConfirmed] = useState<RegWithProfile[]>([]);
  const [waitlist, setWaitlist] = useState<RegWithProfile[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchGame = useCallback(async () => {
    const [{ data: gameData }, { data: regs }] = await Promise.all([
      supabase.from('games').select('*').eq('id', gameId).single(),
      supabase
        .from('registrations')
        .select('*, profile:profiles!registrations_profile_id_fkey(id, name)')
        .eq('game_id', gameId)
        .order('position', { ascending: true }),
    ]);
    setGame(gameData ?? null);
    const all = (regs ?? []) as RegWithProfile[];
    setConfirmed(all.filter(r => r.status === 'confirmed'));
    setWaitlist(all.filter(r => r.status === 'waitlist'));
    setLoading(false);
  }, [gameId]);

  useEffect(() => { fetchGame(); }, [fetchGame]);

  async function searchPlayers(query: string) {
    setSearch(query);
    if (query.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('profiles_public')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(10);
    const allIds = [...confirmed, ...waitlist].map(r => r.profile_id);
    setSearchResults((data ?? []).filter(p => !allIds.includes(p.id)));
  }

  async function addPlayer(p: Profile) {
    if (!game) return;
    setAddingId(p.id);
    setSearch('');
    setSearchResults([]);
    const total = confirmed.length + waitlist.length;
    const status = confirmed.length < game.max_players ? 'confirmed' : 'waitlist';
    const { error } = await supabase.from('registrations').insert({
      game_id: gameId,
      profile_id: p.id,
      status,
      position: total + 1,
      added_by: adminProfile!.id,
    });
    if (error) Alert.alert('Error', error.message);
    await fetchGame();
    setAddingId(null);
  }

  async function removePlayer(reg: RegWithProfile) {
    Alert.alert(
      `Remove ${reg.profile.name}?`,
      reg.status === 'confirmed' ? 'The next waitlisted player will be promoted.' : 'They will be removed from the waitlist.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive', onPress: async () => {
            setRemovingId(reg.id);
            if (reg.status === 'confirmed') {
              const { error } = await supabase.rpc('leave_game', { p_registration_id: reg.id });
              if (error) Alert.alert('Error', error.message);
            } else {
              await supabase.from('registrations').delete().eq('id', reg.id);
            }
            await fetchGame();
            setRemovingId(null);
          },
        },
      ]
    );
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={C.greenSoft} />;
  if (!game || !isAdmin) return null;

  const registrationRow = (reg: RegWithProfile, isWait = false) => (
    <View key={reg.id} style={[styles.playerRow, isWait && styles.playerRowWait]}>
      <Text style={styles.playerName}>{reg.profile.name}</Text>
      <TouchableOpacity
        style={[styles.removeBtn, removingId === reg.id && styles.removeBtnDisabled]}
        onPress={() => removePlayer(reg)}
        disabled={removingId === reg.id}
      >
        <Text style={styles.removeBtnText}>{removingId === reg.id ? '...' : 'Remove'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{game.title}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBadge}>
          <Text style={styles.statValue}>{confirmed.length}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        <View style={styles.statBadge}>
          <Text style={styles.statValue}>{game.max_players}</Text>
          <Text style={styles.statLabel}>Max</Text>
        </View>
        <View style={styles.statBadge}>
          <Text style={styles.statValue}>{waitlist.length}</Text>
          <Text style={styles.statLabel}>Waitlist</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add player</Text>
        <TextInput
          style={styles.input}
          placeholder="Search by name..."
          placeholderTextColor={C.subtle}
          value={search}
          onChangeText={searchPlayers}
        />
        {searchResults.map(p => (
          <TouchableOpacity
            key={p.id}
            style={styles.searchResult}
            onPress={() => addPlayer(p)}
            disabled={addingId === p.id}
          >
            <Text style={styles.searchResultText}>{p.name}</Text>
            <Text style={styles.addText}>{addingId === p.id ? '...' : '+ Add'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Confirmed ({confirmed.length}/{game.max_players})</Text>
        {confirmed.length === 0 && <Text style={styles.empty}>No confirmed players.</Text>}
        {confirmed.map(r => registrationRow(r, false))}
      </View>

      {waitlist.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Waitlist ({waitlist.length})</Text>
          {waitlist.map(r => registrationRow(r, true))}
        </View>
      )}
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.separator, gap: 12 },
  back: { fontSize: 16, color: C.greenSoft },
  title: { fontSize: 18, fontWeight: '800', color: C.ink, flex: 1 },
  statsRow: { flexDirection: 'row', gap: 12, padding: 16, justifyContent: 'center' },
  statBadge: { flex: 1, backgroundColor: C.surface, borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statValue: { fontSize: 22, fontWeight: '800', color: C.ink },
  statLabel: { fontSize: 12, color: C.muted, marginTop: 2 },
  section: { padding: 16, paddingTop: 0 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.inkSoft, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, fontSize: 15, color: C.ink },
  searchResult: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.surface, padding: 12, borderBottomWidth: 1, borderColor: C.separator },
  searchResultText: { fontSize: 15, color: C.ink },
  addText: { fontSize: 14, color: C.greenSoft, fontWeight: '700' },
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 10, padding: 12, marginBottom: 4 },
  playerRowWait: { backgroundColor: C.amberLight },
  playerName: { flex: 1, fontSize: 15, color: C.ink },
  removeBtn: { backgroundColor: C.redLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  removeBtnDisabled: { opacity: 0.5 },
  removeBtnText: { fontSize: 13, fontWeight: '600', color: C.red },
  empty: { fontSize: 14, color: C.subtle, fontStyle: 'italic' },
});
