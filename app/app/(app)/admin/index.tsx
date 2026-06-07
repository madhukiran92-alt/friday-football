import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated, StatusBar, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { Redirect } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { Game } from '../../../src/lib/types';
import { C } from '../../../src/lib/theme';

const SIDEBAR_WIDTH = 240;

type GameWithCount = Game & { confirmed: number; waitlist: number };
type Tab = 'future' | 'past';

export default function AdminIndexScreen() {
  const { isAdmin, loading } = useAuth();
  const sidebarAnim = useRef(new Animated.Value(0)).current;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('future');
  const [games, setGames] = useState<GameWithCount[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameWithCount | null>(null);
  const [gamesLoading, setGamesLoading] = useState(true);

  const toggleSidebar = () => {
    const toValue = sidebarOpen ? 0 : 1;
    Animated.spring(sidebarAnim, { toValue, useNativeDriver: false, friction: 8, tension: 80 }).start();
    setSidebarOpen(!sidebarOpen);
  };

  const fetchGames = useCallback(async () => {
    setGamesLoading(true);
    const { data } = await supabase
      .from('games').select('*, registrations(status)').order('scheduled_at', { ascending: false });
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

  const sidebarX = sidebarAnim.interpolate({ inputRange: [0, 1], outputRange: [-SIDEBAR_WIDTH, 0] });

  const now = new Date().toISOString();
  const filteredGames = games.filter(g =>
    tab === 'future' ? g.scheduled_at >= now : g.scheduled_at < now
  );

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={C.green} />;
  if (!isAdmin) return <Redirect href="/(app)/home" />;

  const statusDot = (s: string) => {
    if (s === 'open') return C.green;
    if (s === 'closed') return C.amber;
    if (s === 'completed') return C.indigo;
    if (s === 'cancelled') return C.red;
    return C.subtle;
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarX }] }]}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.sidebarHead}>
            <Text style={styles.sidebarTitle}>Games</Text>
            <TouchableOpacity onPress={toggleSidebar} style={styles.sidebarClose} activeOpacity={0.7}>
              <Text style={styles.sidebarCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            {(['future', 'past'] as Tab[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => setTab(t)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'future' ? 'Upcoming' : 'Past'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.gameList} showsVerticalScrollIndicator={false}>
            {gamesLoading && <ActivityIndicator style={{ marginTop: 20 }} color={C.green} />}
            {!gamesLoading && filteredGames.length === 0 && (
              <Text style={styles.emptyList}>No {tab === 'future' ? 'upcoming' : 'past'} games.</Text>
            )}
            {filteredGames.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[styles.gameRow, selectedGame?.id === g.id && styles.gameRowActive]}
                onPress={() => { setSelectedGame(g); toggleSidebar(); }}
                activeOpacity={0.7}
              >
                <View style={[styles.dot, { backgroundColor: statusDot(g.status) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.gameRowTitle} numberOfLines={1}>{g.title}</Text>
                  <Text style={styles.gameRowDate}>
                    {new Date(g.scheduled_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.sidebarFooter}>
            <TouchableOpacity
              style={styles.newBtn}
              onPress={() => { toggleSidebar(); router.push('/(app)/admin/create-game'); }}
              activeOpacity={0.8}
            >
              <Text style={styles.newBtnText}>+ New Game</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>

      {sidebarOpen && (
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={toggleSidebar} />
      )}

      {/* Main */}
      <View style={styles.main}>
        <SafeAreaView style={styles.headerSafe}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={toggleSidebar} style={styles.menuBtn} activeOpacity={0.7}>
                <View style={styles.hLine} />
                <View style={[styles.hLine, { width: 14 }]} />
                <View style={styles.hLine} />
              </TouchableOpacity>
              <View>
                <Text style={styles.headerSup}>Admin</Text>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {selectedGame ? selectedGame.title : 'Dashboard'}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/(app)/admin/manage-admins')} activeOpacity={0.75}>
                <Text style={styles.headerBtnText}>Admins</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                <Text style={styles.headerBack}>← Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {!selectedGame ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Text style={{ fontSize: 36 }}>⚽</Text>
              </View>
              <Text style={styles.emptyTitle}>Pick a game</Text>
              <Text style={styles.emptySub}>Open the sidebar to select a game, or create a new one.</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/(app)/admin/create-game')} activeOpacity={0.8}>
                <Text style={styles.createBtnText}>+ Create New Game</Text>
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
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    async function fetchPlayers() {
      setFetching(true);
      const { data } = await supabase
        .from('registrations')
        .select('*, profile:profiles(id, name)')
        .eq('game_id', game.id)
        .order('position', { ascending: true });
      const all = data ?? [];
      setConfirmed(all.filter(r => r.status === 'confirmed'));
      setWaitlist(all.filter(r => r.status === 'waitlist'));
      setFetching(false);
    }
    fetchPlayers();
  }, [game.id]);

  const statusMeta: Record<string, { bg: string; text: string; label: string }> = {
    open:      { bg: C.greenLight, text: C.green, label: 'Open' },
    closed:    { bg: C.amberLight, text: C.amber, label: 'Closed' },
    completed: { bg: C.indigoLight, text: C.indigo, label: 'Completed' },
    cancelled: { bg: C.redLight,   text: C.red,   label: 'Cancelled' },
  };
  const sm = statusMeta[game.status] ?? { bg: C.bg, text: C.muted, label: game.status };
  const fillPct = Math.min(game.confirmed / game.max_players, 1);

  return (
    <View>
      <TouchableOpacity onPress={onDeselect} style={styles.breadcrumb} activeOpacity={0.6}>
        <Text style={styles.breadcrumbText}>← All games</Text>
      </TouchableOpacity>

      {/* Overview */}
      <View style={styles.detailCard}>
        <View style={styles.detailTitleRow}>
          <Text style={styles.detailTitle}>{game.title}</Text>
          <View style={[styles.statusPill, { backgroundColor: sm.bg }]}>
            <Text style={[styles.statusPillText, { color: sm.text }]}>{sm.label}</Text>
          </View>
        </View>
        {game.location && <Text style={styles.detailMeta}>📍 {game.location}</Text>}
        <Text style={styles.detailMeta}>
          🗓 {new Date(game.scheduled_at).toLocaleString('en-AU', {
            weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </Text>
        <View style={styles.capacityRow}>
          <View style={styles.capTrack}>
            <View style={[styles.capFill, { width: `${fillPct * 100}%` as any }]} />
          </View>
          <Text style={styles.capLabel}>{game.confirmed} / {game.max_players}</Text>
          {game.waitlist > 0 && (
            <View style={styles.waitPill}>
              <Text style={styles.waitPillText}>+{game.waitlist}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Actions */}
      <Text style={styles.listHeader}>Actions</Text>
      <View style={styles.actionGrid}>
        {game.status !== 'cancelled' && (
          <>
            <ActionCard emoji="👤" label="Manage Players"
              onPress={() => router.push({ pathname: '/(app)/admin/manage-game', params: { gameId: game.id } })} />
            <ActionCard emoji="✏️" label="Edit Game"
              onPress={() => router.push({ pathname: '/(app)/admin/edit-game', params: { gameId: game.id } })} />
          </>
        )}
        {(game.status === 'open' || game.status === 'closed') && (
          <ActionCard emoji="🎲" label="Generate Teams"
            onPress={() => router.push({ pathname: '/(app)/admin/generate-teams', params: { gameId: game.id } })} />
        )}
        {game.status === 'cancelled' && (
          <ActionCard emoji="🔄" label="Reopen Game" onPress={async () => {
            const { error } = await supabase.from('games').update({ status: 'open' }).eq('id', game.id);
            if (!error) onRefresh();
          }} />
        )}
      </View>

      {/* Players */}
      {fetching ? (
        <ActivityIndicator color={C.green} style={{ marginTop: 20 }} />
      ) : (
        <>
          <Text style={styles.listHeader}>Confirmed ({confirmed.length})</Text>
          {confirmed.length === 0
            ? <Text style={styles.listEmpty}>No confirmed players yet.</Text>
            : confirmed.map((r, i) => <PlayerRow key={r.id} name={r.profile?.name ?? '?'} num={i + 1} />)
          }
          {waitlist.length > 0 && (
            <>
              <Text style={[styles.listHeader, { marginTop: 20 }]}>Waitlist ({waitlist.length})</Text>
              {waitlist.map((r, i) => <PlayerRow key={r.id} name={r.profile?.name ?? '?'} num={i + 1} wait />)}
            </>
          )}
        </>
      )}
    </View>
  );
}

function ActionCard({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.actionCardEmoji}>{emoji}</Text>
      <Text style={styles.actionCardLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function PlayerRow({ name, num, wait }: { name: string; num: number; wait?: boolean }) {
  return (
    <View style={[styles.playerRow, wait && styles.playerRowWait]}>
      <View style={[styles.playerInit, wait && styles.playerInitWait]}>
        <Text style={[styles.playerInitText, wait && styles.playerInitTextWait]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.playerName}>{name}</Text>
      <Text style={styles.playerNum}>{num}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Sidebar
  sidebar: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    width: SIDEBAR_WIDTH, backgroundColor: C.surface,
    zIndex: 100, ...C.shadowMd,
    borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.separator,
  },
  sidebarHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator,
  },
  sidebarTitle: { fontSize: 20, fontWeight: '800', color: C.inkSoft },
  sidebarClose: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  sidebarCloseText: { fontSize: 12, color: C.muted, fontWeight: '700' },

  tabs: { flexDirection: 'row', padding: 10, gap: 6 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: C.rSm, alignItems: 'center', backgroundColor: C.bg },
  tabActive: { backgroundColor: C.green },
  tabText: { fontSize: 13, fontWeight: '600', color: C.muted },
  tabTextActive: { color: '#fff' },

  gameList: { flex: 1 },
  emptyList: { fontSize: 13, color: C.subtle, textAlign: 'center', marginTop: 20, paddingHorizontal: 16 },
  gameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator,
  },
  gameRowActive: { backgroundColor: C.greenUltra },
  dot: { width: 8, height: 8, borderRadius: 4 },
  gameRowTitle: { fontSize: 14, fontWeight: '600', color: C.inkSoft, marginBottom: 2 },
  gameRowDate: { fontSize: 11, color: C.muted },

  sidebarFooter: {
    padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.separator,
  },
  newBtn: { backgroundColor: C.green, borderRadius: C.rMd, paddingVertical: 12, alignItems: 'center' },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 99,
  },

  // Main
  main: { flex: 1 },
  headerSafe: { backgroundColor: C.greenDeep },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: C.greenDeep,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn: {
    width: 36, height: 36, borderRadius: C.rSm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  hLine: { width: 18, height: 2, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 2 },
  headerSup: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5, textTransform: 'uppercase' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#ffffff', maxWidth: 160 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: C.rFull, paddingHorizontal: 12, paddingVertical: 7,
  },
  headerBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  headerBack: { fontSize: 13, color: C.greenLight, fontWeight: '600' },

  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 48 },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyIcon: {
    width: 76, height: 76, borderRadius: 20, backgroundColor: C.greenUltra,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: C.inkSoft, marginBottom: 8, letterSpacing: -0.3 },
  emptySub: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  createBtn: { backgroundColor: C.green, borderRadius: C.rFull, paddingHorizontal: 24, paddingVertical: 12 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  breadcrumb: { marginBottom: 14 },
  breadcrumbText: { color: C.green, fontSize: 14, fontWeight: '600' },

  detailCard: { backgroundColor: C.surface, borderRadius: C.rLg, padding: 16, marginBottom: 18, ...C.shadow },
  detailTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  detailTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: C.inkSoft, letterSpacing: -0.3 },
  statusPill: { borderRadius: C.rFull, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  detailMeta: { fontSize: 13, color: C.muted, marginBottom: 4 },
  capacityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  capTrack: { flex: 1, height: 6, backgroundColor: C.bg, borderRadius: C.rFull, overflow: 'hidden' },
  capFill: { height: '100%', backgroundColor: C.green, borderRadius: C.rFull },
  capLabel: { fontSize: 12, fontWeight: '700', color: C.muted },
  waitPill: { backgroundColor: C.amberLight, borderRadius: C.rFull, paddingHorizontal: 8, paddingVertical: 3 },
  waitPillText: { fontSize: 11, fontWeight: '700', color: C.amber },

  listHeader: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  listEmpty: { fontSize: 13, color: C.subtle, fontStyle: 'italic', marginBottom: 8 },

  actionGrid: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  actionCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: C.rLg, padding: 16,
    alignItems: 'center', ...C.shadow,
  },
  actionCardEmoji: { fontSize: 28, marginBottom: 8 },
  actionCardLabel: { fontSize: 12, fontWeight: '700', color: C.inkSoft, textAlign: 'center' },

  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface, borderRadius: C.rSm,
    paddingVertical: 9, paddingHorizontal: 12, marginBottom: 4,
    ...C.shadow,
  },
  playerRowWait: { backgroundColor: C.amberLight },
  playerInit: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.greenLight, alignItems: 'center', justifyContent: 'center' },
  playerInitWait: { backgroundColor: C.amberBorder },
  playerInitText: { fontSize: 13, fontWeight: '700', color: C.green },
  playerInitTextWait: { color: C.amber },
  playerName: { flex: 1, fontSize: 14, color: C.inkSoft },
  playerNum: { fontSize: 12, color: C.subtle, fontWeight: '600' },
});
