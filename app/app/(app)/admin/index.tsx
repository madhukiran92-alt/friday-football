import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated, useWindowDimensions, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { Redirect } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { Game, Registration } from '../../../src/lib/types';

const SIDEBAR_WIDTH = 220;

type GameWithCount = Game & { confirmed: number; waitlist: number };
type Tab = 'future' | 'past';

export default function AdminIndexScreen() {
  const { isAdmin, loading, profile } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const sidebarAnim = useRef(new Animated.Value(0)).current;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('future');
  const [games, setGames] = useState<GameWithCount[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameWithCount | null>(null);
  const [gamesLoading, setGamesLoading] = useState(true);

  const toggleSidebar = () => {
    const toValue = sidebarOpen ? 0 : 1;
    Animated.spring(sidebarAnim, { toValue, useNativeDriver: false, friction: 8 }).start();
    setSidebarOpen(!sidebarOpen);
  };

  const fetchGames = useCallback(async () => {
    setGamesLoading(true);
    const { data } = await supabase
      .from('games')
      .select('*, registrations(status)')
      .order('scheduled_at', { ascending: false });

    const enriched = (data ?? []).map(g => ({
      ...g,
      confirmed: (g.registrations as any[]).filter((r: any) => r.status === 'confirmed').length,
      waitlist: (g.registrations as any[]).filter((r: any) => r.status === 'waitlist').length,
      registrations: undefined,
    })) as GameWithCount[];

    setGames(enriched);
    setGamesLoading(false);
  }, []);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  const sidebarX = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SIDEBAR_WIDTH, 0],
  });

  const now = new Date().toISOString();
  const filteredGames = games.filter(g =>
    tab === 'future' ? g.scheduled_at >= now : g.scheduled_at < now
  );

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#16a34a" />;
  if (!isAdmin) return <Redirect href="/(app)/home" />;

  const statusColor = (s: string) => {
    if (s === 'open') return '#16a34a';
    if (s === 'closed') return '#d97706';
    if (s === 'completed') return '#2563eb';
    if (s === 'cancelled') return '#ef4444';
    return '#6b7280';
  };

  return (
    <View style={styles.root}>
      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarX }] }]}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Games</Text>
          <TouchableOpacity onPress={toggleSidebar} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'future' && styles.tabActive]}
            onPress={() => setTab('future')}
          >
            <Text style={[styles.tabText, tab === 'future' && styles.tabTextActive]}>Upcoming</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'past' && styles.tabActive]}
            onPress={() => setTab('past')}
          >
            <Text style={[styles.tabText, tab === 'past' && styles.tabTextActive]}>Past</Text>
          </TouchableOpacity>
        </View>

        {/* Game list */}
        <ScrollView style={styles.gameList} showsVerticalScrollIndicator={false}>
          {gamesLoading && <ActivityIndicator style={{ marginTop: 20 }} color="#16a34a" />}
          {!gamesLoading && filteredGames.length === 0 && (
            <Text style={styles.emptyList}>No {tab === 'future' ? 'upcoming' : 'past'} games.</Text>
          )}
          {filteredGames.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[styles.gameRow, selectedGame?.id === g.id && styles.gameRowActive]}
              onPress={() => { setSelectedGame(g); toggleSidebar(); }}
            >
              <Text style={styles.gameRowTitle} numberOfLines={1}>{g.title}</Text>
              <Text style={styles.gameRowDate}>
                {new Date(g.scheduled_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
              </Text>
              <View style={[styles.statusDot, { backgroundColor: statusColor(g.status) }]} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Overlay when sidebar open */}
      {sidebarOpen && (
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={toggleSidebar} />
      )}

      {/* Main content */}
      <View style={styles.main}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={toggleSidebar} style={styles.menuBtn}>
              <Text style={styles.menuBtnText}>☰</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Admin</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/(app)/admin/create-game')}>
              <Text style={styles.headerBtnText}>+ Game</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/(app)/admin/manage-admins')}>
              <Text style={styles.headerBtnText}>Admins</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backText}>← Home</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Body */}
        <ScrollView style={styles.body} contentContainerStyle={{ padding: 16 }}>
          {!selectedGame ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>⚽</Text>
              <Text style={styles.emptyStateTitle}>Select a game</Text>
              <Text style={styles.emptyStateDesc}>Tap ☰ to open the sidebar and pick a game to manage.</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/(app)/admin/create-game')}>
                <Text style={styles.createBtnText}>Create New Game</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <GameDetail game={selectedGame} onRefresh={fetchGames} onDeselect={() => setSelectedGame(null)} />
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function GameDetail({ game, onRefresh, onDeselect }: { game: GameWithCount; onRefresh: () => void; onDeselect: () => void }) {
  const [confirmed, setConfirmed] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data } = await supabase
        .from('registrations')
        .select('*, profile:profiles(id, name)')
        .eq('game_id', game.id)
        .order('position', { ascending: true });
      const all = data ?? [];
      setConfirmed(all.filter(r => r.status === 'confirmed'));
      setWaitlist(all.filter(r => r.status === 'waitlist'));
      setLoading(false);
    }
    fetch();
  }, [game.id]);

  const statusLabel: Record<string, string> = {
    open: 'Open', closed: 'Closed', completed: 'Completed', cancelled: 'Cancelled',
  };
  const statusBg: Record<string, string> = {
    open: '#dcfce7', closed: '#fef9c3', completed: '#dbeafe', cancelled: '#fee2e2',
  };
  const statusFg: Record<string, string> = {
    open: '#16a34a', closed: '#d97706', completed: '#2563eb', cancelled: '#ef4444',
  };

  return (
    <View>
      {/* Game header */}
      <TouchableOpacity onPress={onDeselect} style={styles.deselectBtn}>
        <Text style={styles.deselectText}>← All games</Text>
      </TouchableOpacity>

      <View style={styles.gameDetailCard}>
        <View style={styles.gameDetailTitleRow}>
          <Text style={styles.gameDetailTitle}>{game.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusBg[game.status] ?? '#f3f4f6' }]}>
            <Text style={[styles.statusBadgeText, { color: statusFg[game.status] ?? '#374151' }]}>
              {statusLabel[game.status] ?? game.status}
            </Text>
          </View>
        </View>
        {game.location && <Text style={styles.gameDetailMeta}>📍 {game.location}</Text>}
        <Text style={styles.gameDetailMeta}>
          🗓 {new Date(game.scheduled_at).toLocaleString('en-AU', {
            weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </Text>
        <Text style={styles.gameDetailMeta}>
          👥 {confirmed.length} / {game.max_players} confirmed{waitlist.length > 0 ? ` · ${waitlist.length} waitlisted` : ''}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push({ pathname: '/(app)/admin/manage-game', params: { gameId: game.id } })}
        >
          <Text style={styles.actionCardIcon}>👤</Text>
          <Text style={styles.actionCardLabel}>Manage Players</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push({ pathname: '/(app)/admin/edit-game', params: { gameId: game.id } })}
        >
          <Text style={styles.actionCardIcon}>✏️</Text>
          <Text style={styles.actionCardLabel}>Edit Game</Text>
        </TouchableOpacity>

        {(game.status === 'open' || game.status === 'closed') && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push({ pathname: '/(app)/admin/generate-teams', params: { gameId: game.id } })}
          >
            <Text style={styles.actionCardIcon}>🎲</Text>
            <Text style={styles.actionCardLabel}>Generate Teams</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Player lists */}
      {loading ? <ActivityIndicator color="#16a34a" style={{ marginTop: 20 }} /> : (
        <>
          <Text style={styles.listTitle}>Confirmed ({confirmed.length})</Text>
          {confirmed.length === 0 && <Text style={styles.listEmpty}>No confirmed players yet.</Text>}
          {confirmed.map((r, i) => (
            <View key={r.id} style={styles.playerRow}>
              <Text style={styles.playerNum}>{i + 1}</Text>
              <Text style={styles.playerName}>{r.profile?.name ?? '?'}</Text>
            </View>
          ))}

          {waitlist.length > 0 && (
            <>
              <Text style={[styles.listTitle, { marginTop: 16 }]}>Waitlist ({waitlist.length})</Text>
              {waitlist.map((r, i) => (
                <View key={r.id} style={[styles.playerRow, styles.playerRowWait]}>
                  <Text style={styles.playerNum}>{i + 1}</Text>
                  <Text style={styles.playerName}>{r.profile?.name ?? '?'}</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#f9fafb' },

  // Sidebar
  sidebar: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    width: SIDEBAR_WIDTH, backgroundColor: '#1f2937',
    zIndex: 100, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, elevation: 10,
  },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#374151' },
  sidebarTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  closeBtn: { padding: 4 },
  closeBtnText: { color: '#9ca3af', fontSize: 18 },
  tabs: { flexDirection: 'row', padding: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#374151' },
  tabActive: { backgroundColor: '#16a34a' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#fff' },
  gameList: { flex: 1 },
  emptyList: { color: '#6b7280', fontSize: 13, textAlign: 'center', marginTop: 24, paddingHorizontal: 16 },
  gameRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#374151', flexDirection: 'row', alignItems: 'center', gap: 8 },
  gameRowActive: { backgroundColor: '#374151' },
  gameRowTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#f9fafb' },
  gameRowDate: { fontSize: 12, color: '#9ca3af' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  // Overlay
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 99 },

  // Main
  main: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn: { padding: 6 },
  menuBtnText: { fontSize: 20, color: '#374151' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  headerBtnText: { color: '#16a34a', fontWeight: '700', fontSize: 12 },
  backText: { color: '#6b7280', fontSize: 13 },
  body: { flex: 1 },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyStateIcon: { fontSize: 48, marginBottom: 16 },
  emptyStateTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptyStateDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  createBtn: { backgroundColor: '#16a34a', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Game detail
  deselectBtn: { marginBottom: 12 },
  deselectText: { color: '#16a34a', fontSize: 14, fontWeight: '600' },
  gameDetailCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  gameDetailTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  gameDetailTitle: { fontSize: 20, fontWeight: '800', color: '#111827', flex: 1 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  gameDetailMeta: { fontSize: 14, color: '#6b7280', marginTop: 4 },

  // Action grid
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  actionCard: { flex: 1, minWidth: 90, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  actionCardIcon: { fontSize: 28, marginBottom: 8 },
  actionCardLabel: { fontSize: 12, fontWeight: '700', color: '#374151', textAlign: 'center' },

  // Player lists
  listTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  listEmpty: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic', marginBottom: 8 },
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 3 },
  playerRowWait: { backgroundColor: '#fef9c3' },
  playerNum: { width: 24, fontSize: 13, color: '#9ca3af', fontWeight: '600' },
  playerName: { flex: 1, fontSize: 14, color: '#111827' },
});
