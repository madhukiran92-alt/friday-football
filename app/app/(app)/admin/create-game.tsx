import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
  StatusBar, SafeAreaView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import { Profile } from '../../../src/lib/types';
import { C } from '../../../src/lib/theme';
import { notifyGameEvent } from '../../../src/lib/notifications';
import { buildRegistrationRows } from '../../../src/lib/gameLogic';

const SPORTS = [
  { key: 'football',    emoji: '⚽', label: 'Football'   },
  { key: 'basketball',  emoji: '🏀', label: 'Basketball' },
  { key: 'cricket',     emoji: '🏏', label: 'Cricket'    },
  { key: 'tennis',      emoji: '🎾', label: 'Tennis'     },
  { key: 'rugby',       emoji: '🏉', label: 'Rugby'      },
  { key: 'volleyball',  emoji: '🏐', label: 'Volleyball' },
  { key: 'other',       emoji: '🏟', label: 'Other'      },
];

export default function CreateGameScreen() {
  const { profile } = useAuth();
  const [sport, setSport] = useState('football');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(18, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState('14');
  const [playerSearch, setPlayerSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  async function searchPlayers(query: string) {
    setPlayerSearch(query);
    if (query.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('profiles_public')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(10);
    setSearchResults((data ?? []).filter(p =>
      !selectedPlayers.find(s => s.id === p.id) && p.id !== profile!.id
    ));
  }

  function addPlayer(p: Profile) {
    setSelectedPlayers(prev => [...prev, p]);
    setSearchResults([]);
    setPlayerSearch('');
  }

  function removePlayer(id: string) {
    setSelectedPlayers(prev => prev.filter(p => p.id !== id));
  }

  async function createGame() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a game title.');
      return;
    }
    if (scheduledAt < new Date()) {
      Alert.alert('Invalid date', 'Please pick a future date and time.');
      return;
    }
    const max = parseInt(maxPlayers) || 14;
    if (max < 2) {
      Alert.alert('Invalid', 'Max players must be at least 2.');
      return;
    }
    setLoading(true);

    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .insert({
        title: title.trim(),
        location: location.trim() || null,
        scheduled_at: scheduledAt.toISOString(),
        max_players: max,
        created_by: profile!.id,
        sport,
      })
      .select()
      .single();

    if (gameError || !gameData) {
      Alert.alert('Error', gameError?.message ?? 'Could not create game');
      setLoading(false);
      return;
    }

    const regs = buildRegistrationRows(profile!, selectedPlayers, gameData.id, max);
    const otherPlayers = regs.slice(1);

    const { error: regError } = await supabase.from('registrations').insert(regs);
    if (regError) {
      Alert.alert('Warning', `Game created but could not add players: ${regError.message}`);
    }

    // Notify pre-added players (everyone except the admin who created it)
    const notifyIds = otherPlayers.map(r => r.profile_id);
    if (notifyIds.length) {
      notifyGameEvent('added_to_game', gameData.id, notifyIds);
    }

    setLoading(false);
    Alert.alert('Game created! 🎉', `"${title.trim()}" has been scheduled.`, [
      { text: 'OK', onPress: () => router.replace('/(app)/home') },
    ]);
  }

  const formatDate = (d: Date) => d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (d: Date) => d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  const selectedSport = SPORTS.find(s => s.key === sport)!;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={s.headerSafe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>New Game</Text>
          <View style={{ width: 60 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Sport selector */}
          <Text style={s.sectionLabel}>Sport</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.sportRow} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
            {SPORTS.map(sp => (
              <TouchableOpacity
                key={sp.key}
                style={[s.sportChip, sport === sp.key && s.sportChipActive]}
                onPress={() => setSport(sp.key)}
                activeOpacity={0.7}
              >
                <Text style={s.sportEmoji}>{sp.emoji}</Text>
                <Text style={[s.sportLabel, sport === sp.key && s.sportLabelActive]}>{sp.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Title */}
          <Text style={s.label}>Title *</Text>
          <TextInput
            style={s.input}
            placeholder={`e.g. Saturday ${selectedSport.label}`}
            placeholderTextColor={C.subtle}
            value={title}
            onChangeText={setTitle}
          />

          {/* Location */}
          <Text style={s.label}>Location</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Victoria Park"
            placeholderTextColor={C.subtle}
            value={location}
            onChangeText={setLocation}
          />

          {/* Date */}
          <Text style={s.label}>Date *</Text>
          <TouchableOpacity style={s.pickerBtn} onPress={() => { setShowDatePicker(v => !v); setShowTimePicker(false); }} activeOpacity={0.7}>
            <Text style={s.pickerBtnText}>📅  {formatDate(scheduledAt)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <>
              <DateTimePicker value={scheduledAt} mode="date" display="spinner" minimumDate={new Date()} style={s.picker}
                onChange={(_, date) => {
                  if (date) {
                    const u = new Date(scheduledAt);
                    u.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                    setScheduledAt(u);
                  }
                }}
              />
              <TouchableOpacity style={s.doneBtn} onPress={() => setShowDatePicker(false)}>
                <Text style={s.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Time */}
          <Text style={s.label}>Time *</Text>
          <TouchableOpacity style={s.pickerBtn} onPress={() => { setShowTimePicker(v => !v); setShowDatePicker(false); }} activeOpacity={0.7}>
            <Text style={s.pickerBtnText}>🕐  {formatTime(scheduledAt)}</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <>
              <DateTimePicker value={scheduledAt} mode="time" display="spinner" style={s.picker}
                onChange={(_, date) => {
                  if (date) {
                    const u = new Date(scheduledAt);
                    u.setHours(date.getHours(), date.getMinutes());
                    setScheduledAt(u);
                  }
                }}
              />
              <TouchableOpacity style={s.doneBtn} onPress={() => setShowTimePicker(false)}>
                <Text style={s.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Max players */}
          <Text style={s.label}>Max players</Text>
          <TextInput
            style={s.input}
            keyboardType="number-pad"
            value={maxPlayers}
            onChangeText={setMaxPlayers}
            placeholderTextColor={C.subtle}
          />

          {/* Pre-add players */}
          <Text style={s.label}>Pre-add players</Text>
          <TextInput
            style={s.input}
            placeholder="Search by name…"
            placeholderTextColor={C.subtle}
            value={playerSearch}
            onChangeText={searchPlayers}
          />
          {searchResults.map(p => (
            <TouchableOpacity key={p.id} style={s.searchResult} onPress={() => addPlayer(p)} activeOpacity={0.7}>
              <Text style={s.searchResultText}>{p.name}</Text>
              <Text style={s.searchResultAdd}>+ Add</Text>
            </TouchableOpacity>
          ))}

          {selectedPlayers.length > 0 && (
            <View style={s.selectedList}>
              {selectedPlayers.map((p, i) => (
                <View key={p.id} style={s.selectedPlayer}>
                  <Text style={s.selectedIndex}>{i + 2}.</Text>
                  <Text style={s.selectedName}>{p.name}</Text>
                  {i + 1 >= parseInt(maxPlayers) && (
                    <View style={s.waitTag}><Text style={s.waitTagText}>Waitlist</Text></View>
                  )}
                  <TouchableOpacity onPress={() => removePlayer(p.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={s.removeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={s.adminNote}>
            <Text style={s.adminNoteText}>✓ You'll be added as player #1 automatically</Text>
          </View>

          <TouchableOpacity
            style={[s.createBtn, loading && s.createBtnDisabled]}
            onPress={createGame}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={s.createBtnText}>{loading ? 'Creating…' : `Create ${selectedSport.emoji} Game`}</Text>
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  headerSafe: { backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { minWidth: 60 },
  backText: { fontSize: 15, color: C.green, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },

  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: C.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  sportRow: { marginBottom: 20 },
  sportChip: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: C.rMd, borderWidth: 1.5, borderColor: C.separator,
    backgroundColor: C.surface, minWidth: 76,
  },
  sportChipActive: { borderColor: C.green, backgroundColor: C.greenUltra },
  sportEmoji: { fontSize: 22, marginBottom: 4 },
  sportLabel: { fontSize: 12, fontWeight: '600', color: C.muted },
  sportLabelActive: { color: C.greenDeep },

  label: { fontSize: 13, fontWeight: '600', color: C.inkSoft, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.separator,
    borderRadius: C.rMd, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: C.ink,
  },
  pickerBtn: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.separator,
    borderRadius: C.rMd, paddingHorizontal: 14, paddingVertical: 14,
  },
  pickerBtnText: { fontSize: 15, color: C.ink },
  picker: { width: '100%', height: 200, backgroundColor: C.surface, marginTop: 4 },
  doneBtn: { alignItems: 'flex-end', paddingVertical: 8 },
  doneBtnText: { color: C.green, fontWeight: '700', fontSize: 15 },

  searchResult: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: C.surface, padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.separator,
  },
  searchResultText: { fontSize: 15, color: C.ink },
  searchResultAdd: { fontSize: 14, color: C.green, fontWeight: '700' },

  selectedList: { marginTop: 10, backgroundColor: C.surface, borderRadius: C.rMd, overflow: 'hidden', borderWidth: 1, borderColor: C.separator },
  selectedPlayer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.separator },
  selectedIndex: { width: 28, color: C.subtle, fontWeight: '600' },
  selectedName: { flex: 1, fontSize: 15, color: C.ink },
  waitTag: { backgroundColor: C.amberLight, borderRadius: C.rFull, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
  waitTagText: { fontSize: 11, color: C.amber, fontWeight: '700' },
  removeBtn: { fontSize: 16, color: C.red, paddingHorizontal: 4 },

  adminNote: { marginTop: 14, backgroundColor: C.greenUltra, borderRadius: C.rMd, padding: 12 },
  adminNoteText: { color: C.greenDeep, fontSize: 13, fontWeight: '600' },

  createBtn: { backgroundColor: C.green, borderRadius: C.rMd, paddingVertical: 16, alignItems: 'center', marginTop: 24, ...C.shadowMd },
  createBtnDisabled: { opacity: 0.55 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.1 },
});
