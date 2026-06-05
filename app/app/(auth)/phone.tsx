import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    const cleaned = phone.replace(/\s/g, '');
    if (!cleaned.startsWith('+') || cleaned.length < 10) {
      Alert.alert('Invalid number', 'Enter your number with country code, e.g. +61412345678');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: cleaned });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.push({ pathname: '/(auth)/otp', params: { phone: cleaned } });
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Friday Football</Text>
      <Text style={styles.subtitle}>Enter your phone number to get started</Text>
      <TextInput
        style={styles.input}
        placeholder="+61 412 345 678"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        autoFocus
      />
      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={sendOtp} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Code'}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: '800', color: '#16a34a', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 40, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 16, fontSize: 18, marginBottom: 16 },
  button: { backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
