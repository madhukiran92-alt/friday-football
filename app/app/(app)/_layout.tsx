import { Stack } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Redirect } from 'expo-router';

export default function AppLayout() {
  const { session, profile } = useAuth();
  if (!session) return <Redirect href="/(auth)/phone" />;
  if (!profile?.name) return <Redirect href="/(auth)/name" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
