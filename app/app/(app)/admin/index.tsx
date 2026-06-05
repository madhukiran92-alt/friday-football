import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { Redirect } from 'expo-router';

export default function AdminIndexScreen() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Redirect href="/(app)/home" />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Panel</Text>
      </View>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/(app)/admin/create-game')}>
        <Text style={styles.cardTitle}>Create Game</Text>
        <Text style={styles.cardDesc}>Schedule a new game and pre-add players</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/(app)/admin/manage-admins')}>
        <Text style={styles.cardTitle}>Manage Admins</Text>
        <Text style={styles.cardDesc}>Add or remove admin access for players</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/(app)/admin/generate-teams')}>
        <Text style={styles.cardTitle}>Generate Teams</Text>
        <Text style={styles.cardDesc}>Randomly split confirmed players into equal teams</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', gap: 12 },
  back: { fontSize: 16, color: '#16a34a' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  card: { margin: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#6b7280' },
});
