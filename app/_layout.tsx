import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/store/authStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { user, loading, initialize } = useAuthStore();
  const segments = useSegments();
  const router   = useRouter();

  // Start the Firebase auth listener once
  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, []);

  // Route guard — runs every time auth state or location changes
  useEffect(() => {
    if (loading) return;

    SplashScreen.hideAsync();

    const inAuth        = segments[0] === '(auth)';
    const inOnboarding  = segments[0] === '(onboarding)';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && !user.onboardingComplete && !inOnboarding) {
      router.replace('/(onboarding)/questionnaire');
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
      </Stack>
    </>
  );
}
