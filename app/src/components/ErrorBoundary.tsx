import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { C } from '../lib/theme';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production you'd send this to Sentry / Bugsnag
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <SafeAreaView style={s.root}>
        <View style={s.content}>
          <Text style={s.emoji}>⚽</Text>
          <Text style={s.title}>Something went wrong</Text>
          <Text style={s.sub}>
            The app hit an unexpected error. Your data is safe — tap below to try again.
          </Text>
          {__DEV__ && this.state.error && (
            <View style={s.devBox}>
              <Text style={s.devText} numberOfLines={6}>
                {this.state.error.message}
              </Text>
            </View>
          )}
          <TouchableOpacity style={s.btn} onPress={this.reset} activeOpacity={0.8}>
            <Text style={s.btnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emoji: { fontSize: 56, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: C.ink, marginBottom: 10, textAlign: 'center' },
  sub: { fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  devBox: {
    backgroundColor: C.redLight, borderRadius: 10, padding: 12,
    marginBottom: 24, width: '100%',
  },
  devText: { fontSize: 12, color: C.red, fontFamily: 'Courier New' },
  btn: {
    backgroundColor: C.green, borderRadius: C.rFull,
    paddingHorizontal: 36, paddingVertical: 14,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
