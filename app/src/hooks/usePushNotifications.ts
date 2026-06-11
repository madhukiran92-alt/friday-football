import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { supabase } from '../lib/supabase';

// Expo Go has no push-notification native module (removed in SDK 53+),
// so expo-notifications must never be imported at module level — it
// throws and takes the whole route layout down with it. We load it
// lazily, and only in real builds on physical devices.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

export function usePushNotifications(profileId: string | undefined) {
  useEffect(() => {
    if (!profileId || isExpoGo || !Device.isDevice) return;
    registerAndSaveToken(profileId);
  }, [profileId]);
}

async function registerAndSaveToken(profileId: string) {
  try {
    const Notifications = await import('expo-notifications');

    // Show notifications as banners even when the app is in the foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Pitch',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    // Upsert — safe to call on every launch
    await supabase
      .from('push_tokens')
      .upsert({ profile_id: profileId, token, platform }, { onConflict: 'profile_id,token' });
  } catch {
    // Push notifications unavailable in this environment — never fatal
  }
}
