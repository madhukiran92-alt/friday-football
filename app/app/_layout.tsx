import { Slot } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ErrorBoundary>
          <Slot />
        </ErrorBoundary>
      </AuthProvider>
    </ErrorBoundary>
  );
}
