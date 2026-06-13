import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { C } from '../../src/lib/theme';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={[s.iconWrap, focused && s.iconWrapActive]}>
      <Text style={[s.iconEmoji, !focused && s.iconEmojiDim]}>{emoji}</Text>
      <Text style={[s.iconLabel, focused && s.iconLabelActive]}>{label}</Text>
    </View>
  );
}

export default function AppLayout() {
  const { session, profile, loading, isAdmin } = useAuth();
  usePushNotifications(profile?.id);

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
      <ActivityIndicator size="large" color={C.greenSoft} />
    </View>
  );
  if (!session) return <Redirect href="/(auth)/phone" />;
  if (!profile?.name) return <Redirect href="/(auth)/name" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: s.tabBar,
        tabBarShowLabel: false,
        tabBarItemStyle: s.tabItem,
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Games',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏟" label="Games" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" label="Admin" focused={focused} />,
        }}
      />
      {/* Stack-only screens — hidden from tab bar */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="teams" options={{ href: null }} />
      <Tabs.Screen name="legal" options={{ href: null }} />
      <Tabs.Screen name="change-password" options={{ href: null }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  // Floating pill tab bar
  tabBar: {
    position: 'absolute',
    left: 70,
    right: 70,
    bottom: Platform.OS === 'ios' ? 30 : 20,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
    paddingTop: 6,
  },
  tabItem: { paddingTop: 4 },
  iconWrap: {
    alignItems: 'center', justifyContent: 'center',
    width: 92, height: 48, borderRadius: 24,
  },
  iconWrapActive: {
    backgroundColor: C.greenUltra,
  },
  iconEmoji: { fontSize: 19, lineHeight: 22 },
  iconEmojiDim: { opacity: 0.4 },
  iconLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.3,
    color: C.subtle, marginTop: 1,
  },
  iconLabelActive: { color: C.greenSoft },
});
