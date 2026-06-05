import { Redirect } from 'expo-router';

// OTP flow replaced by email auth — redirect to login
export default function OtpScreen() {
  return <Redirect href="/(auth)/phone" />;
}
