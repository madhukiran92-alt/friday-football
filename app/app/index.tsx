import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/phone" />;
  if (!profile?.name) return <Redirect href="/(auth)/name" />;
  return <Redirect href="/(app)/home" />;
}
