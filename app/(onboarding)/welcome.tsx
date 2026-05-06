import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const bodyOpacity    = useRef(new Animated.Value(0)).current;
  const bodyScale      = useRef(new Animated.Value(0.88)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(bodyOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(bodyScale,   { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(1000),
      Animated.timing(bodyOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start(() => router.replace('/(onboarding)/questionnaire'));
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: bodyOpacity, transform: [{ scale: bodyScale }] }]}>
        <Text style={styles.wordmark}>
          LIFT<Text style={styles.accent}>BUDDY</Text>
        </Text>
        <View style={styles.divider} />
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Let's build your program.
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  wordmark: {
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: 5,
    color: '#FFFFFF',
  },
  accent: {
    color: '#FF4500',
  },
  divider: {
    width: 48,
    height: 2,
    backgroundColor: '#FF4500',
    borderRadius: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#A1A1A1',
    letterSpacing: 0.5,
  },
});
