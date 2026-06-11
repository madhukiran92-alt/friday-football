import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, RefreshControl,
  StatusBar, SafeAreaView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Registration } from '../../src/lib/types';
import { C } from '../../src/lib/theme';
import { NetworkError } from '../../src/components/NetworkError';
import { notifyGameEvent } from '../../src/lib/notifications';
import { enrichGames, waitlistPosition, GameWithRegs } from '../../src/lib/gameLogic';

export default function HomeScreen() {
  const { profile, isAdmin } = useAuth();
  const profileIdRef = useRef<string | undefined>(undefined);
  const [games, setGames] = useState<GameWithRegs[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => { profileIdRef.current = profile?.id; }, [profile?.id]);

  const fetchGames = useCallback(async () => {
    const profileId = profileIdRef.current;
    const { data: gamesData, error: gamesError } = await supabase
      .from('games').select('*')
      .in('status', ['open', 'closed', 'completed', 'cancelled'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });

    if (gamesError || !gamesData) {
      setFetchError(true);
      return;
    }

    // Single query for all registrations across the visible games (no N+1)
    const { data: regs, error: regsError } = await supabase
      .from('registrations')
      .select('*, profile:profiles!registrations_profile_id_fkey(id, name)')
      .in('game_id', gamesData.map(g => g.id))
      .order('position', { ascending: true });

    if (regsError) {
      setFetchError(true);
      return;
    }

    setFetchError(false);
    setGames(enrichGames(gamesData, (regs ?? []) as Registration[], profileId));
  }, []);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    await fetchGames();
    if (isRefresh) setRefreshing(false); else setLoading(false);
  }

  useEffect(() => {
    if (profile?.id) { profileIdRef.current = profile.id; load(); }
  }, [profile?.id]);

  useFocusEffect(useCallback(() => {
    if (profileIdRef.current) fetchGames();
  }, [fetchGames]));

  useEffect(() => {
    const channel = supabase
      .channel(`registrations-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, () => fetchGames())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchGames]);

  async function joinGame(game: GameWithRegs) {
    if (!profile) return;
    setJoiningId(game.id);
    const { error } = await supabase.rpc('join_game', { p_game_id: game.id });
    if (error) Alert.alert('Error', error.message);
    await fetchGames();
    setJoiningId(null);
  }

  async function leaveGame(game: GameWithRegs) {
    if (!game.myReg) return;
    Alert.alert('Leave game?', 'Your spot will go to the next person on the waitlist.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => {
        const { data: promotedId, error } = await supabase.rpc('leave_game', { p_registration_id: game.myReg!.id });
        if (error) { Alert.alert('Error', error.message); return; }
        // Notify the newly-promoted player (if any)
        if (promotedId) {
          notifyGameEvent('waitlist_promoted', game.id, [promotedId]);
        }
        await fetchGames();
      }},
    ]);
  }

  async function cancelGame(game: GameWithRegs) {
    Alert.alert('Cancel game?', `This will cancel "${game.title}".`, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel Game', style: 'destructive', onPress: async () => {
        await supabase.from('games').update({ status: 'cancelled' }).eq('id', game.id);
        // Edge function notifies all registered players (recipients resolved server-side)
        notifyGameEvent('game_cancelled', game.id);
        await fetchGames();
      }},
    ]);
  }

  async function reopenGame(game: GameWithRegs) {
    Alert.alert('Reopen game?', `This will reopen "${game.title}" and allow players to sign up again.`, [
      { text: 'Nevermind', style: 'cancel' },
      { text: 'Reopen', onPress: async () => {
        const { error } = await supabase.from('games').update({ status: 'open' }).eq('id', game.id);
        if (error) Alert.alert('Error', error.message);
        await fetchGames();
      }},
    ]);
  }

  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  const openCount = games.filter(g => g.status === 'open').length;

  if (loading) return (
    <View style={styles.loadingWrap}>
      <StatusBar barStyle="dark-content" />
      <ActivityIndicator size="large" color={C.greenSoft} />
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── Hero header ── */}
      <SafeAreaView>
        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <PulseDot />
              <Text style={styles.headerTitle}>Pitch</Text>
            </View>
            <Text style={styles.headerSub}>
              {today}{openCount > 0 ? `  ·  ${openCount} game${openCount === 1 ? '' : 's'} open` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(app)/profile')} activeOpacity={0.75}>
            <LinearGradient colors={C.gradGreen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarBtn}>
              <Text style={styles.avatarBtnText}>{profile?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Network error ── */}
      {fetchError && (
        <NetworkError onRetry={() => load()} />
      )}

      {/* ── Game list ── */}
      {!fetchError && <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.greenSoft} />}
      >
        {games.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyEmoji}>🏟</Text>
            </View>
            <Text style={styles.emptyTitle}>No games scheduled</Text>
            <Text style={styles.emptySub}>Games will appear here when they're created.</Text>
            {isAdmin && (
              <TouchableOpacity onPress={() => router.push('/(app)/admin')} activeOpacity={0.85}>
                <LinearGradient colors={C.gradGreen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.createBtn}>
                  <Text style={styles.createBtnText}>Create a Game</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          games.map(game => (
            <GameCard
              key={game.id}
              game={game}
              profileId={profile?.id}
              isAdmin={isAdmin}
              joiningId={joiningId}
              onJoin={joinGame}
              onLeave={leaveGame}
              onCancel={cancelGame}
              onReopen={reopenGame}
            />
          ))
        )}
        <View style={{ height: 130 }} />
      </ScrollView>}

    </View>
  );
}

/** The glowing live dot from the website, in app form. */
function PulseDot() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.dotWrap}>
      <Animated.View style={[styles.dotHalo, {
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.55] }),
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
      }]} />
      <View style={styles.dot} />
    </View>
  );
}

/** Capacity bar that springs to its fill level when it appears. */
function CapacityBar({ pct, full }: { pct: number; full: boolean }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(width, { toValue: pct, friction: 8, tension: 28, useNativeDriver: false }).start();
  }, [pct, width]);

  return (
    <View style={styles.capTrack}>
      <Animated.View style={{
        width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        height: '100%',
      }}>
        <LinearGradient
          colors={full ? ['#fb7185', '#e11d48'] : ['#22c55e', '#a3e635']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.capFill}
        />
      </Animated.View>
    </View>
  );
}

type CardProps = {
  game: GameWithRegs;
  profileId?: string;
  isAdmin: boolean;
  joiningId: string | null;
  onJoin: (g: GameWithRegs) => void;
  onLeave: (g: GameWithRegs) => void;
  onCancel: (g: GameWithRegs) => void;
  onReopen: (g: GameWithRegs) => void;
};

const SPORT_EMOJI: Record<string, string> = {
  football: '⚽', basketball: '🏀', cricket: '🏏',
  tennis: '🎾', rugby: '🏉', volleyball: '🏐', other: '🏟',
};

const STATUS_BADGE = {
  open:      { bg: C.openBg,      text: C.openText      },
  closed:    { bg: C.closedBg,    text: C.closedText    },
  completed: { bg: C.completedBg, text: C.completedText },
  cancelled: { bg: C.cancelledBg, text: C.cancelledText },
} as const;

function GameCard({ game, profileId, isAdmin, joiningId, onJoin, onLeave, onCancel, onReopen }: CardProps) {
  const isCancelled = game.status === 'cancelled';
  const isFull = game.confirmed.length >= game.max_players;
  const fillPct = Math.min(game.confirmed.length / game.max_players, 1);
  const isJoining = joiningId === game.id;
  const imIn = game.myReg?.status === 'confirmed';

  const badge = STATUS_BADGE[game.status as keyof typeof STATUS_BADGE]
    ?? { bg: C.surface2, text: C.muted };

  const statusLabel = game.status.charAt(0).toUpperCase() + game.status.slice(1);

  const dateStr = new Date(game.scheduled_at).toLocaleString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={[styles.card, isCancelled && styles.cardCancelled]}>

      {/* Title row: glowing sport tile + name + badge */}
      <View style={styles.cardHead}>
        <View style={styles.sportTile}>
          <Text style={styles.sportTileEmoji}>{SPORT_EMOJI[game.sport] ?? '🏟'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{game.title}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {game.location ? `${game.location}  ·  ` : ''}{dateStr}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusBadgeText, { color: badge.text }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Capacity */}
      <View style={styles.capRow}>
        <CapacityBar pct={fillPct} full={isFull} />
        <Text style={[styles.capLabel, isFull && { color: C.red }]}>
          {game.confirmed.length}/{game.max_players}
        </Text>
        {game.waitlist.length > 0 && (
          <View style={styles.waitBadge}>
            <Text style={styles.waitBadgeText}>+{game.waitlist.length} waiting</Text>
          </View>
        )}
      </View>

      {/* My status */}
      {imIn && !isCancelled && (
        <View style={styles.inBanner}>
          <Text style={styles.inBannerText}>✓  You're in</Text>
        </View>
      )}
      {game.myReg?.status === 'waitlist' && (
        <View style={styles.waitBanner}>
          <Text style={styles.waitBannerText}>
            ⏳  #{waitlistPosition(game.waitlist, game.myReg.id)} on the waitlist
          </Text>
        </View>
      )}

      {/* Join / Leave */}
      {game.status === 'open' && (
        game.myReg ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionLeave, isJoining && styles.actionDisabled]}
            onPress={() => onLeave(game)}
            disabled={isJoining}
            activeOpacity={0.8}
          >
            <Text style={styles.actionTextLeave}>
              {game.myReg.status === 'waitlist' ? 'Leave Waitlist' : 'Leave Game'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => onJoin(game)}
            disabled={isJoining}
            activeOpacity={0.85}
            style={[styles.actionWrap, isJoining && styles.actionDisabled]}
          >
            <LinearGradient colors={C.gradGreen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtnGrad}>
              <Text style={styles.actionText}>
                {isJoining ? '…' : (isFull ? 'Join Waitlist' : 'Join Game')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )
      )}

      {game.status === 'completed' && (
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/(app)/teams', params: { gameId: game.id } })}
          activeOpacity={0.85}
          style={styles.actionWrap}
        >
          <LinearGradient colors={C.gradGreen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtnGrad}>
            <Text style={styles.actionText}>View Teams</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Player chips */}
      <PlayerList title="Confirmed" players={game.confirmed} myId={profileId} variant="confirmed" />
      {game.waitlist.length > 0 && (
        <PlayerList title="Waitlist" players={game.waitlist} myId={profileId} variant="waitlist" />
      )}

      {/* Admin actions */}
      {isAdmin && (
        <View style={styles.adminRow}>
          {!isCancelled && (
            <>
              <AdminChip label="Manage Players" onPress={() => router.push({ pathname: '/(app)/admin/manage-game', params: { gameId: game.id } })} />
              <AdminChip label="Edit" onPress={() => router.push({ pathname: '/(app)/admin/edit-game', params: { gameId: game.id } })} />
              {game.status === 'open' && <AdminChip label="Cancel" danger onPress={() => onCancel(game)} />}
            </>
          )}
          {isCancelled && (
            <AdminChip label="Reopen Game" onPress={() => onReopen(game)} />
          )}
        </View>
      )}
    </View>
  );
}

function PlayerList({ title, players, myId, variant }: {
  title: string; players: any[]; myId?: string; variant: 'confirmed' | 'waitlist';
}) {
  if (players.length === 0) return null;
  return (
    <View style={styles.playerSection}>
      <Text style={styles.playerLabel}>{title} <Text style={styles.playerCount}>{players.length}</Text></Text>
      <View style={styles.playerGrid}>
        {players.map(r => {
          const name = (r.profile as any)?.name ?? '?';
          const isMe = r.profile_id === myId;
          const isWait = variant === 'waitlist';
          return (
            <View key={r.id} style={[
              styles.playerChip,
              isWait && styles.playerChipWait,
              isMe && styles.playerChipMe,
            ]}>
              <View style={[styles.playerInit, isWait && styles.playerInitWait, isMe && styles.playerInitMe]}>
                <Text style={[styles.playerInitTxt, isMe && styles.playerInitTxtMe]}>
                  {name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.playerName, isMe && styles.playerNameMe]} numberOfLines={1}>{name}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function AdminChip({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={[styles.adminChip, danger && styles.adminChipDanger]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.adminChipText, danger && styles.adminChipTextDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingWrap: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },

  // ── Hero header ──
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingTop: 14, paddingBottom: 16,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  headerTitle: {
    fontSize: 30, color: C.ink, letterSpacing: -0.8,
    fontFamily: C.fontDisplay,
  },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 1 },
  dotWrap: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  dotHalo: {
    position: 'absolute', width: 12, height: 12, borderRadius: 6,
    backgroundColor: C.greenSoft,
  },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.greenSoft },
  avatarBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    ...C.glowSoft,
  },
  avatarBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 4, paddingHorizontal: 16 },

  empty: { alignItems: 'center', paddingTop: 90, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 30,
    backgroundColor: C.greenUltra,
    borderWidth: 1, borderColor: C.greenLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 22,
    ...C.glowSoft,
  },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 23, color: C.ink, marginBottom: 8, fontFamily: C.fontDisplay, letterSpacing: -0.4 },
  emptySub: { fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  createBtn: { borderRadius: C.rFull, paddingHorizontal: 30, paddingVertical: 14, ...C.glow },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // ── Card ──
  card: {
    backgroundColor: C.surface,
    borderRadius: C.rLg,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    ...C.shadow,
  },
  cardCancelled: { opacity: 0.5 },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 12 },
  sportTile: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: C.greenUltra,
    borderWidth: 1, borderColor: C.greenLight,
    alignItems: 'center', justifyContent: 'center',
    ...C.glowSoft,
  },
  sportTileEmoji: { fontSize: 22 },
  cardTitle: { fontSize: 18, color: C.ink, letterSpacing: -0.3, fontFamily: C.fontDisplay },
  cardMeta: { fontSize: 12.5, color: C.muted, marginTop: 2 },

  statusBadge: { borderRadius: C.rFull, paddingHorizontal: 11, paddingVertical: 5, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.2 },

  capRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, paddingBottom: 14 },
  capTrack: { flex: 1, height: 7, backgroundColor: '#EAEEF2', borderRadius: C.rFull, overflow: 'hidden' },
  capFill: { flex: 1, borderRadius: C.rFull },
  capLabel: { fontSize: 13, fontWeight: '700', color: C.muted, minWidth: 38, textAlign: 'right' },
  waitBadge: { backgroundColor: C.amberLight, borderRadius: C.rFull, paddingHorizontal: 9, paddingVertical: 3 },
  waitBadgeText: { fontSize: 11, fontWeight: '700', color: C.amber },

  inBanner: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.greenLight, borderRadius: C.rSm,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    paddingHorizontal: 12, paddingVertical: 9,
  },
  inBannerText: { fontSize: 13, fontWeight: '700', color: C.greenSoft },

  waitBanner: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.amberLight, borderRadius: C.rSm,
    borderWidth: 1, borderColor: C.amberBorder,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  waitBannerText: { fontSize: 13, fontWeight: '600', color: C.amber },

  actionWrap: { marginHorizontal: 16, marginBottom: 12, borderRadius: C.rMd, ...C.glowSoft },
  actionBtnGrad: { borderRadius: C.rMd, paddingVertical: 15, alignItems: 'center' },
  actionBtn: { marginHorizontal: 16, marginBottom: 12, borderRadius: C.rMd, paddingVertical: 15, alignItems: 'center' },
  actionLeave: { backgroundColor: C.redLight, borderWidth: 1, borderColor: C.redBorder },
  actionDisabled: { opacity: 0.5 },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  actionTextLeave: { color: C.red, fontSize: 15, fontWeight: '700' },

  playerSection: { paddingHorizontal: 16, paddingBottom: 12 },
  playerLabel: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  playerCount: { fontWeight: '500', color: C.subtle },
  playerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  playerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.glass, borderRadius: C.rFull, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.separator,
  },
  playerChipWait: { backgroundColor: C.amberLight, borderColor: 'transparent' },
  playerChipMe: { backgroundColor: C.greenLight, borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)' },
  playerInit: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  playerInitWait: { backgroundColor: 'rgba(245,158,11,0.35)' },
  playerInitMe: { backgroundColor: C.green },
  playerInitTxt: { fontSize: 11, fontWeight: '700', color: C.inkSoft },
  playerInitTxtMe: { color: '#fff' },
  playerName: { fontSize: 13, color: C.inkSoft, maxWidth: 90 },
  playerNameMe: { fontWeight: '700', color: C.greenSoft },

  adminRow: {
    flexDirection: 'row', gap: 6, flexWrap: 'wrap',
    paddingHorizontal: 16, paddingBottom: 14, paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.separator,
  },
  adminChip: {
    borderRadius: C.rFull, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: C.glass, borderWidth: 1, borderColor: C.border,
  },
  adminChipDanger: { backgroundColor: C.redLight, borderColor: C.redBorder },
  adminChipText: { fontSize: 13, fontWeight: '600', color: C.inkSoft },
  adminChipTextDanger: { color: C.red },
});
