import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C } from '../lib/theme';

type Props = {
  onRetry: () => void;
  message?: string;
};

export function NetworkError({ onRetry, message }: Props) {
  return (
    <View style={s.wrap}>
      <Text style={s.icon}>📡</Text>
      <Text style={s.title}>Can't connect</Text>
      <Text style={s.sub}>
        {message ?? 'Check your internet connection and try again.'}
      </Text>
      <TouchableOpacity style={s.btn} onPress={onRetry} activeOpacity={0.8}>
        <Text style={s.btnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 40,
  },
  icon: { fontSize: 52, marginBottom: 18 },
  title: {
    fontSize: 22, fontWeight: '800', color: C.ink,
    marginBottom: 8, textAlign: 'center',
  },
  sub: {
    fontSize: 15, color: C.muted, textAlign: 'center',
    lineHeight: 22, marginBottom: 28,
  },
  btn: {
    backgroundColor: C.green, borderRadius: C.rFull,
    paddingHorizontal: 36, paddingVertical: 13,
    ...C.shadow,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
