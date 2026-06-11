import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

// Expo Go has no push-notification native module (removed in SDK 53+),
// and stale dev-client builds may lack expo-device/expo-notifications
// entirely. Nothing here may be imported at module level — a missing
// native module would take the whole route layout down with it.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

export function usePushNotifications(profileId: string | undefined) {
  useEffect(() => {
    if (!profileId || isExpoGo) return;
    registerAndSaveToken(profileId);
  }, [profileId]);
}

async function registerAndSaveToken(profileId: string) {
  try {
    const Device = await import('expo-device');
    if (!Device.isDevice) return; // simulators can't receive push tokens

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
