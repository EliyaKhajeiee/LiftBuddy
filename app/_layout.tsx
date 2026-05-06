import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/store/authStore';
import { useUserStore } from '../src/store/userStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { user, loading, initialize } = useAuthStore();
  const { subscribe, clear }          = useUserStore();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, []);

  // Keep Firestore profile in sync with auth state
  useEffect(() => {
    if (!user) { clear(); return; }
    const unsub = subscribe(user.uid);
    return unsub;
  }, [user?.uid]);

  // Route guard
  useEffect(() => {
    if (loading) return;

    SplashScreen.hideAsync();

    const inAuth       = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && !user.onboardingComplete && !inOnboarding) {
      router.replace('/(onboarding)/welcome');
    } else if (user && user.onboardingComplete && (inAuth || inOnboarding)) {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, loading, segments]);

  return (
    <>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="edit-profile"      options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="workout-session"   options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="exercise-picker"   options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="schedule"          options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="custom-workout"    options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="friends"           options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="checkin"             options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="import-plan"        options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="history"            options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}
