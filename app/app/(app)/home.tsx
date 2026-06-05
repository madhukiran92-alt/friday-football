import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Game, Registration } from '../../src/lib/types';

export default function HomeScreen() {
  const { profile, isAdmin } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [confirmed, setConfirmed] = useState<Registration[]>([]);
  const [waitlist, setWaitlist] = useState<Registration[]>([]);
  const [myReg, setMyReg] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);

  async function fetchGame() {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('status', 'open')
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .single();
    setGame(data ?? null);
    return data;
  }

  async function fetchRegistrations(gameId: string) {
    const { data } = await supabase
      .from('registrations')
      .select('*, profile:profiles(id, name, phone)')
      .eq('game_id', gameId)
      .order('position', { ascending: true });

    const all = data ?? [];
    setConfirmed(all.filter(r => r.status === 'confirmed'));
    setWaitlist(all.filter(r => r.status === 'waitlist'));
    setMyReg(all.find(r => r.profile_id === profile?.id) ?? null);
  }

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const g = await fetchGame();
    if (g) await fetchRegistrations(g.id);
    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }

  useEffect(() => {
    load();

    // real-time subscription
    const channel = supabase
      .channel('registrations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, () => {
        if (game) fetchRegistrations(game.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [game?.id]);

  async function joinGame() {
    if (!game || !profile) return;
    setJoining(true);
    const nextPosition = (confirmed.length + waitlist.length) + 1;
    const status = nextPosition <= game.max_players ? 'confirmed' : 'waitlist';
    const { error } = await supabase.from('registrations').insert({
      game_id: game.id,
      profile_id: profile.id,
      status,
      position: nextPosition,
    });
    if (error) Alert.alert('Error', error.message);
    else await fetchRegistrations(game.id);
    setJoining(false);
  }

  async function leaveGame() {
    if (!myReg || !game) return;
    Alert.alert('Leave game?', 'Your spot will go to the next person on the waitlist.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          await supabase.from('registrations').delete().eq('id', myReg.id);
          await promoteFromWaitlist(game.id, myReg.position, game.max_players);
          await fetchRegistrations(game.id);
        },
      },
    ]);
  }

  async function promoteFromWaitlist(gameId: string, vacatedPosition: number, maxPlayers: number) {
    const { data: waitlisters } = await supabase
      .from('registrations')
      .select('*')
      .eq('game_id', gameId)
      .eq('status', 'waitlist')
      .order('position', { ascending: true })
      .limit(1);

    if (!waitlisters?.length) return;
    const first = waitlisters[0];
    await supabase.from('registrations').update({ status: 'confirmed', position: vacatedPosition }).eq('id', first.id);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#16a34a" />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#16a34a" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friday Football</Text>
        <View style={styles.headerRight}>
          {isAdmin && (
            <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/(app)/admin/index')}>
              <Text style={styles.adminBtnText}>Admin</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!game ? (
        <View style={styles.noGame}>
          <Text style={styles.noGameText}>No game scheduled yet.</Text>
          {isAdmin && (
            <TouchableOpacity style={styles.button} onPress={() => router.push('/(app)/admin/index')}>
              <Text style={styles.buttonText}>Create a Game</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          {/* Game card */}
          <View style={styles.gameCard}>
            <Text style={styles.gameTitle}>{game.title}</Text>
            {game.location && <Text style={styles.gameMeta}>{game.location}</Text>}
            <Text style={styles.gameMeta}>{new Date(game.scheduled_at).toLocaleString()}</Text>
            <View style={styles.spotsBadge}>
              <Text style={styles.spotsText}>{confirmed.length} / {game.max_players} players</Text>
            </View>
          </View>

          {/* Join / Leave button */}
          {game.status === 'open' && (
            <TouchableOpacity
              style={[styles.button, myReg ? styles.buttonLeave : styles.buttonJoin, joining && styles.buttonDisabled]}
              onPress={myReg ? leaveGame : joinGame}
              disabled={joining}
            >
              <Text style={styles.buttonText}>
                {joining ? '...' : myReg
                  ? myReg.status === 'waitlist' ? 'Leave Waitlist' : 'Leave Game'
                  : confirmed.length >= game.max_players ? 'Join Waitlist' : 'Join Game'}
              </Text>
            </TouchableOpacity>
          )}

          {myReg?.status === 'waitlist' && (
            <Text style={styles.waitlistPosition}>
              You're #{waitlist.findIndex(r => r.id === myReg.id) + 1} on the waitlist
            </Text>
          )}

          {/* Confirmed list */}
          <Text style={styles.sectionTitle}>Confirmed ({confirmed.length})</Text>
          {confirmed.map((r, i) => (
            <View key={r.id} style={[styles.playerRow, r.profile_id === profile?.id && styles.playerRowMe]}>
              <Text style={styles.playerIndex}>{i + 1}</Text>
              <Text style={styles.playerName}>{(r.profile as any)?.name ?? 'Unknown'}</Text>
              {r.profile_id === profile?.id && <Text style={styles.youBadge}>You</Text>}
            </View>
          ))}

          {/* Waitlist */}
          {waitlist.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Waitlist ({waitlist.length})</Text>
              {waitlist.map((r, i) => (
                <View key={r.id} style={[styles.playerRow, styles.playerRowWait, r.profile_id === profile?.id && styles.playerRowMe]}>
                  <Text style={styles.playerIndex}>{i + 1}</Text>
                  <Text style={styles.playerName}>{(r.profile as any)?.name ?? 'Unknown'}</Text>
                  {r.profile_id === profile?.id && <Text style={styles.youBadge}>You</Text>}
                </View>
              ))}
            </>
          )}

          {/* Teams */}
          {game.status === 'completed' && (
            <TouchableOpacity style={[styles.button, { marginTop: 16 }]} onPress={() => router.push({ pathname: '/(app)/teams', params: { gameId: game.id } })}>
              <Text style={styles.buttonText}>View Teams</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#16a34a' },
  headerRight: { flexDirection: 'row', gap: 8 },
  adminBtn: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  adminBtnText: { color: '#16a34a', fontWeight: '700', fontSize: 13 },
  noGame: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  noGameText: { fontSize: 18, color: '#6b7280', marginBottom: 20 },
  gameCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  gameTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  gameMeta: { fontSize: 14, color: '#6b7280', marginBottom: 2 },
  spotsBadge: { marginTop: 12, backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  spotsText: { color: '#16a34a', fontWeight: '700', fontSize: 13 },
  button: { marginHorizontal: 16, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
  buttonJoin: { backgroundColor: '#16a34a' },
  buttonLeave: { backgroundColor: '#ef4444' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  waitlistPosition: { textAlign: 'center', color: '#f59e0b', fontWeight: '600', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 4, borderRadius: 10, padding: 12 },
  playerRowWait: { backgroundColor: '#fef9c3' },
  playerRowMe: { borderWidth: 1.5, borderColor: '#16a34a' },
  playerIndex: { width: 24, fontSize: 14, color: '#9ca3af', fontWeight: '600' },
  playerName: { flex: 1, fontSize: 15, color: '#111827' },
  youBadge: { fontSize: 11, fontWeight: '700', color: '#16a34a', backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
});
