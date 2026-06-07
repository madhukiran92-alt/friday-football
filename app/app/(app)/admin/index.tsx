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

const SIDEBAR_WIDTH = 260;

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

  const openCount = games.filter(g => g.status === 'open' && g.scheduled_at >= now).length;
  const upcomingCount = games.filter(g => g.scheduled_at >= now).length;
  const totalGames = games.length;

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

      {/* ── Sidebar ── */}
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
                {selectedGame?.id === g.id && <Text style={styles.activeCheck}>✓</Text>}
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

      {/* ── Main area ── */}
      <View style={styles.main}>

        {/* White top bar — matches home screen */}
        <SafeAreaView style={styles.headerSafe}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={toggleSidebar} style={styles.menuBtn} activeOpacity={0.7}>
                <View style={styles.hLine} />
                <View style={[styles.hLine, { width: 14 }]} />
                <View style={styles.hLine} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {selectedGame ? selectedGame.title : 'Admin'}
              </Text>
            </View>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/(app)/admin/manage-admins')} activeOpacity={0.75}>
              <Text style={styles.headerBtnText}>Admins</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {!selectedGame ? (
            <>
              {/* ── Stat strip ── */}
              <View style={styles.statRow}>
                <StatCard value={openCount} label="Open" color={C.green} bg={C.greenUltra} />
                <StatCard value={upcomingCount} label="Upcoming" color={C.indigo} bg={C.indigoLight} />
                <StatCard value={totalGames} label="Total" color={C.amber} bg={C.amberLight} />
              </View>

              {/* ── Empty / pick state ── */}
              <View style={styles.heroCard}>
                <View style={styles.heroIconWrap}>
                  <Text style={styles.heroIcon}>⚽</Text>
                </View>
                <Text style={styles.heroTitle}>Pick a game</Text>
                <Text style={styles.heroSub}>Open the sidebar to select a game, or create a brand new one.</Text>
                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={() => router.push('/(app)/admin/create-game')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.createBtnText}>+ Create New Game</Text>
                </TouchableOpacity>
              </View>

              {/* ── Recent games quick-access ── */}
              {games.filter(g => g.scheduled_at >= now).length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Upcoming Games</Text>
                  {games
                    .filter(g => g.scheduled_at >= now)
                    .slice(0, 3)
                    .map(g => (
                      <TouchableOpacity
                        key={g.id}
                        style={styles.quickCard}
                        onPress={() => setSelectedGame(g)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.quickDot, { backgroundColor: statusDot(g.status) }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.quickTitle}>{g.title}</Text>
                          <Text style={styles.quickDate}>
                            {new Date(g.scheduled_at).toLocaleString('en-AU', {
                              weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                            })}
                          </Text>
                        </View>
                        <Text style={styles.quickCount}>{g.confirmed}/{g.max_players}</Text>
                        <Text style={styles.quickChevron}>›</Text>
                      </TouchableOpacity>
                    ))}
                </>
              )}
            </>
          ) : (
            <GameDetail game={selectedGame} onRefresh={fetchGames} onDeselect={() => setSelectedGame(null)} />
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function StatCard({ value, label, color, bg }: { value: number; label: string; color: string; bg: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
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
        .select('*, profile:profiles!registrations_profile_id_fkey(id, name)')
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
    open:      { bg: C.openBg,    text: C.openText,      label: 'Open' },
    closed:    { bg: C.closedBg,  text: C.closedText,    label: 'Closed' },
    completed: { bg: C.completedBg, text: C.completedText, label: 'Completed' },
    cancelled: { bg: C.cancelledBg, text: C.cancelledText, label: 'Cancelled' },
  };
  const sm = statusMeta[game.status] ?? { bg: C.bg, text: C.muted, label: game.status };
  const fillPct = Math.min(game.confirmed / game.max_players, 1);
  const isFull = game.confirmed >= game.max_players;

  return (
    <View>
      <TouchableOpacity onPress={onDeselect} style={styles.breadcrumb} activeOpacity={0.6}>
        <Text style={styles.breadcrumbText}>← All games</Text>
      </TouchableOpacity>

      {/* Overview card */}
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

        {/* Capacity */}
        <View style={styles.capacityRow}>
          <View style={styles.capTrack}>
            <View style={[styles.capFill, { width: `${fillPct * 100}%` as any }, isFull && styles.capFillFull]} />
          </View>
          <Text style={[styles.capLabel, isFull && { color: C.red }]}>{game.confirmed} / {game.max_players}</Text>
          {game.waitlist > 0 && (
            <View style={styles.waitPill}><Text style={styles.waitPillText}>+{game.waitlist}</Text></View>
          )}
        </View>
      </View>

      {/* Action grid */}
      <Text style={styles.sectionLabel}>Actions</Text>
      <View style={styles.actionGrid}>
        {game.status !== 'cancelled' && (
          <>
            <ActionCard emoji="👥" label="Players" color="#3b82f6" bg="#eff6ff"
              onPress={() => router.push({ pathname: '/(app)/admin/manage-game', params: { gameId: game.id } })} />
            <ActionCard emoji="✏️" label="Edit" color="#8b5cf6" bg="#f5f3ff"
              onPress={() => router.push({ pathname: '/(app)/admin/edit-game', params: { gameId: game.id } })} />
          </>
        )}
        {(game.status === 'open' || game.status === 'closed') && (
          <ActionCard emoji="🎲" label="Teams" color="#f59e0b" bg="#fffbeb"
            onPress={() => router.push({ pathname: '/(app)/admin/generate-teams', params: { gameId: game.id } })} />
        )}
        {game.status === 'cancelled' && (
          <ActionCard emoji="🔄" label="Reopen" color={C.green} bg={C.greenUltra} onPress={async () => {
            const { error } = await supabase.from('games').update({ status: 'open' }).eq('id', game.id);
            if (!error) onRefresh();
          }} />
        )}
      </View>

      {/* Player list */}
      {fetching ? (
        <ActivityIndicator color={C.green} style={{ marginTop: 20 }} />
      ) : (
        <>
          <Text style={styles.sectionLabel}>Confirmed ({confirmed.length})</Text>
          {confirmed.length === 0
            ? <Text style={styles.listEmpty}>No confirmed players yet.</Text>
            : confirmed.map((r, i) => <PlayerRow key={r.id} name={r.profile?.name ?? '?'} num={i + 1} />)
          }
          {waitlist.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Waitlist ({waitlist.length})</Text>
              {waitlist.map((r, i) => <PlayerRow key={r.id} name={r.profile?.name ?? '?'} num={i + 1} wait />)}
            </>
          )}
        </>
      )}
    </View>
  );
}

function ActionCard({ emoji, label, color, bg, onPress }: {
  emoji: string; label: string; color: string; bg: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.actionCard, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.actionCardEmoji}>{emoji}</Text>
      <Text style={[styles.actionCardLabel, { color }]}>{label}</Text>
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
      <Text style={[styles.playerNum, wait && { color: C.amber }]}>#{num}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // ── Sidebar ──
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
  sidebarTitle: { fontSize: 18, fontWeight: '800', color: C.ink },
  sidebarClose: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  sidebarCloseText: { fontSize: 12, color: C.muted, fontWeight: '700' },

  tabs: { flexDirection: 'row', padding: 10, gap: 6 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: C.rSm, alignItems: 'center', backgroundColor: C.bg },
  tabActive: { backgroundColor: C.greenDeep },
  tabText: { fontSize: 13, fontWeight: '600', color: C.muted },
  tabTextActive: { color: '#fff' },

  gameList: { flex: 1 },
  emptyList: { fontSize: 13, color: C.subtle, textAlign: 'center', marginTop: 20, paddingHorizontal: 16 },
  gameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator,
  },
  gameRowActive: { backgroundColor: C.greenUltra },
  dot: { width: 8, height: 8, borderRadius: 4 },
  gameRowTitle: { fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 2 },
  gameRowDate: { fontSize: 11, color: C.muted },
  activeCheck: { fontSize: 14, color: C.green, fontWeight: '700' },

  sidebarFooter: {
    padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.separator,
  },
  newBtn: { backgroundColor: C.green, borderRadius: C.rMd, paddingVertical: 12, alignItems: 'center' },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 99,
  },

  // ── Header — matches home screen white bar ──
  main: { flex: 1 },
  headerSafe: {
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn: {
    width: 36, height: 36, borderRadius: C.rSm,
    backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  hLine: { width: 18, height: 2, backgroundColor: C.ink, borderRadius: 2 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.ink, maxWidth: 180, letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: {
    backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.border,
    borderRadius: C.rFull, paddingHorizontal: 12, paddingVertical: 7,
  },
  headerBtnText: { color: C.inkSoft, fontWeight: '600', fontSize: 13 },
  headerBack: { fontSize: 13, color: C.green, fontWeight: '600' },

  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 48 },

  // ── Stat strip ──
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: {
    flex: 1, borderRadius: C.rMd, paddingVertical: 14, alignItems: 'center',
  },
  statValue: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  statLabel: { fontSize: 11, fontWeight: '700', marginTop: 2, opacity: 0.8 },

  // ── Hero / pick-game card ──
  heroCard: {
    backgroundColor: C.surface, borderRadius: C.rXl,
    padding: 28, alignItems: 'center', marginBottom: 22, ...C.shadow,
  },
  heroIconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: C.greenUltra, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  heroIcon: { fontSize: 36 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: C.ink, marginBottom: 8, letterSpacing: -0.3 },
  heroSub: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  createBtn: { backgroundColor: C.green, borderRadius: C.rFull, paddingHorizontal: 28, paddingVertical: 13, ...C.shadow },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // ── Quick access ──
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.muted,
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8,
  },
  quickCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: C.rMd, padding: 14, marginBottom: 8, ...C.shadow,
  },
  quickDot: { width: 10, height: 10, borderRadius: 5 },
  quickTitle: { fontSize: 15, fontWeight: '700', color: C.ink, marginBottom: 2 },
  quickDate: { fontSize: 12, color: C.muted },
  quickCount: { fontSize: 13, fontWeight: '700', color: C.muted },
  quickChevron: { fontSize: 22, color: C.subtle, fontWeight: '300', marginLeft: 4 },

  // ── Game detail ──
  breadcrumb: { marginBottom: 14 },
  breadcrumbText: { color: C.green, fontSize: 14, fontWeight: '600' },

  detailCard: { backgroundColor: C.surface, borderRadius: C.rLg, padding: 16, marginBottom: 18, ...C.shadow },
  detailTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  detailTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  statusPill: { borderRadius: C.rFull, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  detailMeta: { fontSize: 13, color: C.muted, marginBottom: 4 },
  capacityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  capTrack: { flex: 1, height: 6, backgroundColor: C.bg, borderRadius: C.rFull, overflow: 'hidden' },
  capFill: { height: '100%', backgroundColor: C.green, borderRadius: C.rFull },
  capFillFull: { backgroundColor: C.red },
  capLabel: { fontSize: 12, fontWeight: '700', color: C.muted },
  waitPill: { backgroundColor: C.amberLight, borderRadius: C.rFull, paddingHorizontal: 8, paddingVertical: 3 },
  waitPillText: { fontSize: 11, fontWeight: '700', color: C.amber },

  listEmpty: { fontSize: 13, color: C.subtle, fontStyle: 'italic', marginBottom: 8 },

  actionGrid: { flexDirection: 'row', gap: 10, marginBottom: 22, flexWrap: 'wrap' },
  actionCard: {
    flex: 1, minWidth: 80, borderRadius: C.rLg, paddingVertical: 16,
    alignItems: 'center',
  },
  actionCardEmoji: { fontSize: 28, marginBottom: 6 },
  actionCardLabel: { fontSize: 12, fontWeight: '800' },

  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface, borderRadius: C.rSm,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 4, ...C.shadow,
  },
  playerRowWait: { backgroundColor: C.amberLight },
  playerInit: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.greenDeep, alignItems: 'center', justifyContent: 'center',
  },
  playerInitWait: { backgroundColor: C.amber },
  playerInitText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  playerInitTextWait: { color: '#fff' },
  playerName: { flex: 1, fontSize: 14, fontWeight: '600', color: C.ink },
  playerNum: { fontSize: 12, color: C.subtle, fontWeight: '700' },
});
