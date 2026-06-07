import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, RefreshControl,
  StatusBar, SafeAreaView, Modal, Animated, Pressable,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Game, Registration } from '../../src/lib/types';
import { C } from '../../src/lib/theme';

type GameWithRegs = Game & {
  confirmed: Registration[];
  waitlist: Registration[];
  myReg: Registration | null;
};

export default function HomeScreen() {
  const { profile, isAdmin } = useAuth();
  const profileIdRef = useRef<string | undefined>(undefined);
  const [games, setGames] = useState<GameWithRegs[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(280)).current;

  useEffect(() => { profileIdRef.current = profile?.id; }, [profile?.id]);

  const fetchGames = useCallback(async () => {
    const profileId = profileIdRef.current;
    const { data: gamesData } = await supabase
      .from('games').select('*')
      .in('status', ['open', 'closed', 'completed', 'cancelled'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });

    if (!gamesData) return;

    const enriched = await Promise.all(gamesData.map(async (game) => {
      const { data: regs } = await supabase
        .from('registrations')
        .select('*, profile:profiles!registrations_profile_id_fkey(id, name)')
        .eq('game_id', game.id)
        .order('position', { ascending: true });
      const all = regs ?? [];
      return {
        ...game,
        confirmed: all.filter(r => r.status === 'confirmed'),
        waitlist: all.filter(r => r.status === 'waitlist'),
        myReg: profileId ? (all.find(r => r.profile_id === profileId) ?? null) : null,
      };
    }));
    setGames(enriched);
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

  function openSidebar() {
    setSidebarOpen(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 180 }).start();
  }

  function closeSidebar() {
    Animated.timing(slideAnim, { toValue: 280, useNativeDriver: true, duration: 220 }).start(() => setSidebarOpen(false));
  }

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
        const { error } = await supabase.rpc('leave_game', { p_registration_id: game.myReg!.id });
        if (error) Alert.alert('Error', error.message);
        await fetchGames();
      }},
    ]);
  }

  async function cancelGame(game: GameWithRegs) {
    Alert.alert('Cancel game?', `This will cancel "${game.title}".`, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel Game', style: 'destructive', onPress: async () => {
        await supabase.from('games').update({ status: 'cancelled' }).eq('id', game.id);
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

  if (loading) return (
    <View style={styles.loadingWrap}>
      <StatusBar barStyle="dark-content" />
      <ActivityIndicator size="large" color={C.green} />
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── Minimal white top bar ── */}
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚽  Friday Football</Text>
          <TouchableOpacity style={styles.avatarBtn} onPress={openSidebar} activeOpacity={0.75}>
            <Text style={styles.avatarBtnText}>{profile?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Game list ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.green} />}
      >
        {games.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>⚽</Text>
            <Text style={styles.emptyTitle}>No games scheduled</Text>
            <Text style={styles.emptySub}>Games will appear here when they're created.</Text>
            {isAdmin && (
              <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/(app)/admin')} activeOpacity={0.8}>
                <Text style={styles.createBtnText}>Create a Game</Text>
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
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Sidebar drawer ── */}
      {sidebarOpen && (
        <Modal transparent animationType="none" onRequestClose={closeSidebar}>
          {/* Dim overlay */}
          <Pressable style={styles.overlay} onPress={closeSidebar} />

          {/* Drawer panel slides in from right */}
          <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
            <SafeAreaView style={{ flex: 1 }}>
              {/* Avatar + name */}
              <View style={styles.drawerProfile}>
                <View style={styles.drawerAvatar}>
                  <Text style={styles.drawerAvatarText}>{profile?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
                </View>
                <Text style={styles.drawerName}>{profile?.name ?? 'Player'}</Text>
                <Text style={styles.drawerPhone}>{profile?.phone ?? ''}</Text>
              </View>

              <View style={styles.drawerDivider} />

              {/* Nav items */}
              {isAdmin && (
                <DrawerItem
                  icon="🏟"
                  label="Admin Portal"
                  onPress={() => { closeSidebar(); setTimeout(() => router.push('/(app)/admin'), 250); }}
                />
              )}
              <DrawerItem
                icon="👤"
                label="My Profile"
                onPress={() => { closeSidebar(); setTimeout(() => router.push('/(app)/profile'), 250); }}
              />
            </SafeAreaView>
          </Animated.View>
        </Modal>
      )}
    </View>
  );
}

function DrawerItem({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.drawerItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.drawerItemIcon}>{icon}</Text>
      <Text style={styles.drawerItemLabel}>{label}</Text>
      <Text style={styles.drawerItemChevron}>›</Text>
    </TouchableOpacity>
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

  const badge = STATUS_BADGE[game.status as keyof typeof STATUS_BADGE]
    ?? { bg: C.bg, text: C.muted };

  const statusLabel = game.status.charAt(0).toUpperCase() + game.status.slice(1);

  const dateStr = new Date(game.scheduled_at).toLocaleString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={[styles.card, isCancelled && styles.cardCancelled]}>

      {/* Title + badge */}
      <View style={styles.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{game.title}</Text>
          <Text style={styles.cardMeta}>
            {game.location ? `📍 ${game.location}  ·  ` : ''}🗓 {dateStr}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusBadgeText, { color: badge.text }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Capacity bar */}
      <View style={styles.capRow}>
        <View style={styles.capTrack}>
          <View style={[
            styles.capFill,
            { width: `${fillPct * 100}%` as any },
            isFull && { backgroundColor: C.red },
          ]} />
        </View>
        <Text style={[styles.capLabel, isFull && { color: C.red }]}>
          {game.confirmed.length} / {game.max_players}
        </Text>
        {game.waitlist.length > 0 && (
          <View style={styles.waitBadge}>
            <Text style={styles.waitBadgeText}>+{game.waitlist.length} waiting</Text>
          </View>
        )}
      </View>

      {/* Waitlist position */}
      {game.myReg?.status === 'waitlist' && (
        <View style={styles.waitBanner}>
          <Text style={styles.waitBannerText}>
            ⏳  You're #{game.waitlist.findIndex(r => r.id === game.myReg!.id) + 1} on the waitlist
          </Text>
        </View>
      )}

      {/* Join / Leave */}
      {game.status === 'open' && (
        <TouchableOpacity
          style={[styles.actionBtn, game.myReg ? styles.actionLeave : styles.actionJoin, isJoining && styles.actionDisabled]}
          onPress={() => game.myReg ? onLeave(game) : onJoin(game)}
          disabled={isJoining}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionText, game.myReg && styles.actionTextLeave]}>
            {isJoining ? '…' : game.myReg
              ? (game.myReg.status === 'waitlist' ? 'Leave Waitlist' : 'Leave Game')
              : (isFull ? 'Join Waitlist' : 'Join Game')}
          </Text>
        </TouchableOpacity>
      )}

      {game.status === 'completed' && (
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionJoin]}
          onPress={() => router.push({ pathname: '/(app)/teams', params: { gameId: game.id } })}
          activeOpacity={0.8}
        >
          <Text style={styles.actionText}>View Teams</Text>
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

  // ── Minimal header ──
  headerSafe: { backgroundColor: '#ffffff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  avatarBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.greenDeep, alignItems: 'center', justifyContent: 'center',
  },
  avatarBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingHorizontal: 16 },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: C.ink, marginBottom: 8 },
  emptySub: { fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  createBtn: { backgroundColor: C.green, borderRadius: C.rFull, paddingHorizontal: 28, paddingVertical: 13, ...C.shadow },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // ── Sidebar ──
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  drawer: {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: 280, backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: -4, height: 0 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 16,
  },
  drawerProfile: {
    alignItems: 'center', paddingTop: 40, paddingBottom: 24, paddingHorizontal: 24,
  },
  drawerAvatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.greenDeep, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  drawerAvatarText: { fontSize: 26, fontWeight: '800', color: '#fff' },
  drawerName: { fontSize: 18, fontWeight: '800', color: C.ink, marginBottom: 2 },
  drawerPhone: { fontSize: 13, color: C.muted },
  drawerDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.separator, marginHorizontal: 20, marginBottom: 8 },

  drawerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 24, paddingVertical: 16,
  },
  drawerItemIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  drawerItemLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: C.ink },
  drawerItemChevron: { fontSize: 22, color: C.subtle, fontWeight: '300' },

  // ── Card ──
  card: { backgroundColor: C.surface, borderRadius: C.rLg, marginBottom: 14, overflow: 'hidden', ...C.shadow },
  cardCancelled: { opacity: 0.55 },

  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 16, paddingBottom: 10 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: C.ink, letterSpacing: -0.3, marginBottom: 4 },
  cardMeta: { fontSize: 13, color: C.muted, lineHeight: 18 },

  statusBadge: { borderRadius: C.rFull, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.1 },

  capRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  capTrack: { flex: 1, height: 6, backgroundColor: C.bg, borderRadius: C.rFull, overflow: 'hidden' },
  capFill: { height: '100%', backgroundColor: C.green, borderRadius: C.rFull },
  capLabel: { fontSize: 13, fontWeight: '700', color: C.muted, minWidth: 44, textAlign: 'right' },
  waitBadge: { backgroundColor: C.amberLight, borderRadius: C.rFull, paddingHorizontal: 8, paddingVertical: 3 },
  waitBadgeText: { fontSize: 11, fontWeight: '700', color: C.amber },

  waitBanner: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.amberLight, borderRadius: C.rSm,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  waitBannerText: { fontSize: 13, fontWeight: '600', color: C.amber },

  actionBtn: { marginHorizontal: 16, marginBottom: 12, borderRadius: C.rMd, paddingVertical: 14, alignItems: 'center' },
  actionJoin: { backgroundColor: C.green },
  actionLeave: { backgroundColor: C.redLight, borderWidth: 1.5, borderColor: C.redBorder },
  actionDisabled: { opacity: 0.5 },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  actionTextLeave: { color: C.red },

  playerSection: { paddingHorizontal: 16, paddingBottom: 12 },
  playerLabel: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  playerCount: { fontWeight: '500', color: C.subtle },
  playerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  playerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.bg, borderRadius: C.rFull, paddingHorizontal: 10, paddingVertical: 5,
  },
  playerChipWait: { backgroundColor: C.amberLight },
  playerChipMe: { backgroundColor: C.greenUltra, borderWidth: 1.5, borderColor: C.greenLight },
  playerInit: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.07)', alignItems: 'center', justifyContent: 'center' },
  playerInitWait: { backgroundColor: C.amberBorder },
  playerInitMe: { backgroundColor: C.green },
  playerInitTxt: { fontSize: 11, fontWeight: '700', color: C.muted },
  playerInitTxtMe: { color: '#fff' },
  playerName: { fontSize: 13, color: C.inkSoft, maxWidth: 90 },
  playerNameMe: { fontWeight: '700', color: C.green },

  adminRow: {
    flexDirection: 'row', gap: 6, flexWrap: 'wrap',
    paddingHorizontal: 16, paddingBottom: 14, paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.separator,
  },
  adminChip: {
    borderRadius: C.rFull, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.separator,
  },
  adminChipDanger: { backgroundColor: C.redLight, borderColor: C.redBorder },
  adminChipText: { fontSize: 13, fontWeight: '600', color: C.inkSoft },
  adminChipTextDanger: { color: C.red },
});
