import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Game, Registration } from '../../src/lib/types';

type GameWithRegs = Game & {
  confirmed: Registration[];
  waitlist: Registration[];
  myReg: Registration | null;
};

export default function HomeScreen() {
  const { profile, isAdmin } = useAuth();
  const [games, setGames] = useState<GameWithRegs[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  async function fetchGames() {
    const { data: gamesData } = await supabase
      .from('games')
      .select('*')
      .in('status', ['open', 'closed'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });

    if (!gamesData) return;

    const enriched = await Promise.all(gamesData.map(async (game) => {
      const { data: regs } = await supabase
        .from('registrations')
        .select('*, profile:profiles(id, name)')
        .eq('game_id', game.id)
        .order('position', { ascending: true });

      const all = regs ?? [];
      return {
        ...game,
        confirmed: all.filter(r => r.status === 'confirmed'),
        waitlist: all.filter(r => r.status === 'waitlist'),
        myReg: all.find(r => r.profile_id === profile?.id) ?? null,
      };
    }));

    setGames(enriched);
  }

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    await fetchGames();
    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel('all-registrations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, () => {
        fetchGames();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function joinGame(game: GameWithRegs) {
    if (!profile) return;
    setJoiningId(game.id);
    const nextPosition = (game.confirmed.length + game.waitlist.length) + 1;
    const status = nextPosition <= game.max_players ? 'confirmed' : 'waitlist';
    const { error } = await supabase.from('registrations').insert({
      game_id: game.id,
      profile_id: profile.id,
      status,
      position: nextPosition,
    });
    if (error) Alert.alert('Error', error.message);
    await fetchGames();
    setJoiningId(null);
  }

  async function leaveGame(game: GameWithRegs) {
    if (!game.myReg) return;
    Alert.alert('Leave game?', 'Your spot will go to the next person on the waitlist.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          await supabase.from('registrations').delete().eq('id', game.myReg!.id);
          await promoteFromWaitlist(game.id, game.myReg!.position, game.max_players);
          await fetchGames();
        },
      },
    ]);
  }

  async function promoteFromWaitlist(gameId: string, vacatedPosition: number, maxPlayers: number) {
    const { data } = await supabase
      .from('registrations')
      .select('*')
      .eq('game_id', gameId)
      .eq('status', 'waitlist')
      .order('position', { ascending: true })
      .limit(1);

    if (!data?.length) return;
    await supabase.from('registrations')
      .update({ status: 'confirmed', position: vacatedPosition })
      .eq('id', data[0].id);
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
        {isAdmin && (
          <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/(app)/admin')}>
            <Text style={styles.adminBtnText}>Admin</Text>
          </TouchableOpacity>
        )}
      </View>

      {games.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No games scheduled yet.</Text>
          {isAdmin && (
            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/(app)/admin')}>
              <Text style={styles.createBtnText}>Create a Game</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        games.map(game => (
          <View key={game.id} style={styles.gameCard}>
            {/* Game info */}
            <Text style={styles.gameTitle}>{game.title}</Text>
            {game.location && <Text style={styles.gameMeta}>📍 {game.location}</Text>}
            <Text style={styles.gameMeta}>🗓 {new Date(game.scheduled_at).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>

            <View style={styles.spotsRow}>
              <View style={[styles.spotsBadge, game.confirmed.length >= game.max_players && styles.spotsFull]}>
                <Text style={[styles.spotsText, game.confirmed.length >= game.max_players && styles.spotsTextFull]}>
                  {game.confirmed.length} / {game.max_players} players
                </Text>
              </View>
              {game.waitlist.length > 0 && (
                <View style={styles.waitlistBadge}>
                  <Text style={styles.waitlistBadgeText}>{game.waitlist.length} on waitlist</Text>
                </View>
              )}
            </View>

            {/* Join / Leave button */}
            {game.status === 'open' && (
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  game.myReg ? styles.actionBtnLeave : styles.actionBtnJoin,
                  joiningId === game.id && styles.actionBtnDisabled,
                ]}
                onPress={() => game.myReg ? leaveGame(game) : joinGame(game)}
                disabled={joiningId === game.id}
              >
                <Text style={styles.actionBtnText}>
                  {joiningId === game.id ? '...' : game.myReg
                    ? game.myReg.status === 'waitlist' ? 'Leave Waitlist' : 'Leave Game'
                    : game.confirmed.length >= game.max_players ? 'Join Waitlist' : 'Join Game'}
                </Text>
              </TouchableOpacity>
            )}

            {game.myReg?.status === 'waitlist' && (
              <Text style={styles.waitlistPos}>
                You're #{game.waitlist.findIndex(r => r.id === game.myReg!.id) + 1} on the waitlist
              </Text>
            )}

            {/* Confirmed list */}
            <Text style={styles.sectionTitle}>Confirmed ({game.confirmed.length})</Text>
            {game.confirmed.map((r, i) => (
              <View key={r.id} style={[styles.playerRow, r.profile_id === profile?.id && styles.playerRowMe]}>
                <Text style={styles.playerIndex}>{i + 1}</Text>
                <Text style={styles.playerName}>{(r.profile as any)?.name ?? 'Unknown'}</Text>
                {r.profile_id === profile?.id && <Text style={styles.youBadge}>You</Text>}
              </View>
            ))}

            {/* Waitlist */}
            {game.waitlist.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Waitlist ({game.waitlist.length})</Text>
                {game.waitlist.map((r, i) => (
                  <View key={r.id} style={[styles.playerRow, styles.playerRowWait, r.profile_id === profile?.id && styles.playerRowMe]}>
                    <Text style={styles.playerIndex}>{i + 1}</Text>
                    <Text style={styles.playerName}>{(r.profile as any)?.name ?? 'Unknown'}</Text>
                    {r.profile_id === profile?.id && <Text style={styles.youBadge}>You</Text>}
                  </View>
                ))}
              </>
            )}

            {/* Teams button for completed games */}
            {game.status === 'completed' && (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnJoin, { marginTop: 12 }]} onPress={() => router.push({ pathname: '/(app)/teams', params: { gameId: game.id } })}>
                <Text style={styles.actionBtnText}>View Teams</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#16a34a' },
  adminBtn: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  adminBtnText: { color: '#16a34a', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', padding: 60 },
  emptyText: { fontSize: 18, color: '#6b7280', marginBottom: 20 },
  createBtn: { backgroundColor: '#16a34a', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  gameCard: { margin: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  gameTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  gameMeta: { fontSize: 14, color: '#6b7280', marginBottom: 2 },
  spotsRow: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 12, flexWrap: 'wrap' },
  spotsBadge: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  spotsFull: { backgroundColor: '#fee2e2' },
  spotsText: { color: '#16a34a', fontWeight: '700', fontSize: 13 },
  spotsTextFull: { color: '#ef4444' },
  waitlistBadge: { backgroundColor: '#fef9c3', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  waitlistBadgeText: { color: '#d97706', fontWeight: '700', fontSize: 13 },
  actionBtn: { borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
  actionBtnJoin: { backgroundColor: '#16a34a' },
  actionBtnLeave: { backgroundColor: '#ef4444' },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  waitlistPos: { textAlign: 'center', color: '#f59e0b', fontWeight: '600', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 12, marginBottom: 6 },
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, marginBottom: 3 },
  playerRowWait: { backgroundColor: '#fef9c3' },
  playerRowMe: { borderWidth: 1.5, borderColor: '#16a34a' },
  playerIndex: { width: 24, fontSize: 13, color: '#9ca3af', fontWeight: '600' },
  playerName: { flex: 1, fontSize: 14, color: '#111827' },
  youBadge: { fontSize: 11, fontWeight: '700', color: '#16a34a', backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
});
