import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { C } from '../../src/lib/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[s.iconWrap, focused && s.iconWrapActive]}>
      <Text style={s.iconEmoji}>{emoji}</Text>
    </View>
  );
}

export default function AppLayout() {
  const { session, profile, loading, isAdmin } = useAuth();

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color={C.green} />
    </View>
  );
  if (!session) return <Redirect href="/(auth)/phone" />;
  if (!profile?.name) return <Redirect href="/(auth)/name" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: s.tabBar,
        tabBarActiveTintColor: C.greenDeep,
        tabBarInactiveTintColor: C.subtle,
        tabBarLabelStyle: s.tabLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Games',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏟" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏟" focused={focused} />,
        }}
      />
      {/* Stack-only screens — hidden from tab bar */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="teams" options={{ href: null }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    height: 80,
    paddingBottom: 18,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: C.greenUltra },
  iconEmoji: { fontSize: 20 },
});
