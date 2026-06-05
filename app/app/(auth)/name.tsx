import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';

export default function NameScreen() {
  const { session, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function saveName() {
    if (!name.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', session!.user.id);
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await refreshProfile();
      router.replace('/');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>What's your name?</Text>
      <Text style={styles.subtitle}>This is how you'll appear on the team list</Text>
      <TextInput
        style={styles.input}
        placeholder="Your name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoFocus
      />
      <TouchableOpacity style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]} onPress={saveName} disabled={!name.trim() || loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving...' : "Let's go!"}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6b7280', marginBottom: 40, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 16, fontSize: 18, marginBottom: 16 },
  button: { backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
