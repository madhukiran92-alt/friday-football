import { Slot } from 'expo-router';
import { View } from 'react-native';
import { useFonts, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { AuthProvider } from '../src/context/AuthContext';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { C } from '../src/lib/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  // Hold on the dark background until the display font is ready —
  // avoids a flash of fallback type on first frame.
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <ErrorBoundary>
            <Slot />
          </ErrorBoundary>
        </View>
      </AuthProvider>
    </ErrorBoundary>
  );
}
