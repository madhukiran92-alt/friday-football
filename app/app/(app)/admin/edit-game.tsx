import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/context/AuthContext';
import { Game } from '../../../src/lib/types';
import { C } from '../../../src/lib/theme';

export default function EditGameScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const { isAdmin } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date>(new Date());
  const [maxPlayers, setMaxPlayers] = useState('14');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('games').select('*').eq('id', gameId).single();
      if (data) {
        setGame(data);
        setTitle(data.title);
        setLocation(data.location ?? '');
        setScheduledAt(new Date(data.scheduled_at));
        setMaxPlayers(String(data.max_players));
      }
      setLoading(false);
    }
    fetch();
  }, [gameId]);

  async function save() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a game title.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('games')
      .update({
        title: title.trim(),
        location: location.trim() || null,
        scheduled_at: scheduledAt.toISOString(),
        max_players: parseInt(maxPlayers) || 14,
      })
      .eq('id', gameId);
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Saved', 'Game updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }

  const formatDate = (d: Date) => d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (d: Date) => d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={C.greenSoft} />;
  if (!game || !isAdmin) return null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Game</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Title *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Friday Kickabout" placeholderTextColor={C.subtle} />

          <Text style={styles.label}>Location</Text>
          <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. Victoria Park" placeholderTextColor={C.subtle} />

          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => { setShowDatePicker(v => !v); setShowTimePicker(false); }}>
            <Text style={styles.pickerBtnText}>{formatDate(scheduledAt)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <>
              <DateTimePicker
                value={scheduledAt}
                mode="date"
                display="spinner"
                style={styles.picker}
                onChange={(_, date) => {
                  if (date) {
                    const updated = new Date(scheduledAt);
                    updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                    setScheduledAt(updated);
                  }
                }}
              />
              <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.label}>Time *</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => { setShowTimePicker(v => !v); setShowDatePicker(false); }}>
            <Text style={styles.pickerBtnText}>{formatTime(scheduledAt)}</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <>
              <DateTimePicker
                value={scheduledAt}
                mode="time"
                display="spinner"
                style={styles.picker}
                onChange={(_, date) => {
                  if (date) {
                    const updated = new Date(scheduledAt);
                    updated.setHours(date.getHours(), date.getMinutes());
                    setScheduledAt(updated);
                  }
                }}
              />
              <TouchableOpacity style={styles.doneBtn} onPress={() => setShowTimePicker(false)}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.label}>Max players</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={maxPlayers}
            onChangeText={setMaxPlayers}
          />

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={save}
            disabled={saving}
          >
            <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.separator, gap: 12 },
  back: { fontSize: 16, color: C.greenSoft },
  title: { fontSize: 20, fontWeight: '800', color: C.ink },
  form: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: C.inkSoft, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, fontSize: 15, color: C.ink },
  pickerBtn: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14 },
  pickerBtnText: { fontSize: 15, color: C.ink },
  picker: { width: '100%', height: 200, backgroundColor: C.surface, marginTop: 4 },
  doneBtn: { alignItems: 'flex-end', paddingVertical: 8, paddingHorizontal: 4 },
  doneBtnText: { color: C.greenSoft, fontWeight: '700', fontSize: 16 },
  button: { backgroundColor: C.green, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
