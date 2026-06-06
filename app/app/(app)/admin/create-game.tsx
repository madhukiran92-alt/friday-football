import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import { Profile } from '../../../src/lib/types';

export default function CreateGameScreen() {
  const { profile } = useAuth();
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
      .from('profiles')
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
    setLoading(true);

    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .insert({
        title: title.trim(),
        location: location.trim() || null,
        scheduled_at: scheduledAt.toISOString(),
        max_players: max,
        created_by: profile!.id,
      })
      .select()
      .single();

    if (gameError || !gameData) {
      Alert.alert('Error', gameError?.message ?? 'Could not create game');
      setLoading(false);
      return;
    }

    // Admin is always first, then any pre-added players
    const otherPlayers = selectedPlayers.filter(p => p.id !== profile!.id);
    const allPlayers = [profile!, ...otherPlayers];

    const regs = allPlayers.map((p, i) => ({
      game_id: gameData.id,
      profile_id: p.id,
      status: (i < max ? 'confirmed' : 'waitlist') as 'confirmed' | 'waitlist',
      position: i + 1,
      added_by: profile!.id,
    }));

    const { error: regError } = await supabase.from('registrations').insert(regs);
    if (regError) {
      Alert.alert('Warning', `Game created but could not add players: ${regError.message}`);
    }

    setLoading(false);
    Alert.alert('Game created! 🎉', `"${title.trim()}" has been scheduled.`, [
      { text: 'OK', onPress: () => router.replace('/(app)/home') },
    ]);
  }

  const formatDate = (d: Date) => d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (d: Date) => d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create Game</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Title *</Text>
          <TextInput style={styles.input} placeholder="e.g. Friday Kickabout" value={title} onChangeText={setTitle} />

          <Text style={styles.label}>Location</Text>
          <TextInput style={styles.input} placeholder="e.g. Victoria Park" value={location} onChangeText={setLocation} />

          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.pickerBtnText}>{formatDate(scheduledAt)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={scheduledAt}
              mode="date"
              minimumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) {
                  const updated = new Date(scheduledAt);
                  updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                  setScheduledAt(updated);
                }
              }}
            />
          )}

          <Text style={styles.label}>Time *</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.pickerBtnText}>{formatTime(scheduledAt)}</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={scheduledAt}
              mode="time"
              onChange={(_, date) => {
                setShowTimePicker(false);
                if (date) {
                  const updated = new Date(scheduledAt);
                  updated.setHours(date.getHours(), date.getMinutes());
                  setScheduledAt(updated);
                }
              }}
            />
          )}

          <Text style={styles.label}>Max players</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={maxPlayers} onChangeText={setMaxPlayers} />

          <Text style={styles.label}>Pre-add players</Text>
          <TextInput
            style={styles.input}
            placeholder="Search by name..."
            value={playerSearch}
            onChangeText={searchPlayers}
          />
          {searchResults.map(p => (
            <TouchableOpacity key={p.id} style={styles.searchResult} onPress={() => addPlayer(p)}>
              <Text style={styles.searchResultText}>{p.name}</Text>
              <Text style={styles.searchResultAdd}>+ Add</Text>
            </TouchableOpacity>
          ))}

          {selectedPlayers.length > 0 && (
            <View style={styles.selectedList}>
              {selectedPlayers.map((p, i) => (
                <View key={p.id} style={styles.selectedPlayer}>
                  <Text style={styles.selectedIndex}>{i + 2}.</Text>
                  <Text style={styles.selectedName}>{p.name}</Text>
                  {i + 1 >= parseInt(maxPlayers) && <Text style={styles.waitlistTag}>Waitlist</Text>}
                  <TouchableOpacity onPress={() => removePlayer(p.id)}>
                    <Text style={styles.removeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.adminNote}>
            <Text style={styles.adminNoteText}>You'll be added as player #1 automatically</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={createGame}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create Game'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', gap: 12 },
  back: { fontSize: 16, color: '#16a34a' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  form: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, fontSize: 15 },
  pickerBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14 },
  pickerBtnText: { fontSize: 15, color: '#111827' },
  searchResult: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  searchResultText: { fontSize: 15, color: '#111827' },
  searchResultAdd: { fontSize: 14, color: '#16a34a', fontWeight: '700' },
  selectedList: { marginTop: 12, backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  selectedPlayer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  selectedIndex: { width: 28, color: '#9ca3af', fontWeight: '600' },
  selectedName: { flex: 1, fontSize: 15, color: '#111827' },
  waitlistTag: { fontSize: 11, color: '#d97706', fontWeight: '700', backgroundColor: '#fef9c3', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  removeBtn: { fontSize: 16, color: '#ef4444', paddingHorizontal: 4 },
  adminNote: { marginTop: 12, backgroundColor: '#dcfce7', borderRadius: 8, padding: 10 },
  adminNoteText: { color: '#16a34a', fontSize: 13, fontWeight: '600' },
  button: { backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
