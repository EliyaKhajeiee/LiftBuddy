import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../src/theme';

// Phase 8: today's workout card, streak, daily quote, friend activity preview
export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>LIFT<Text style={styles.accent}>BUDDY</Text></Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>PHASE 8</Text>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>
          Today's workout · Streak · Daily quote{'\n'}Friend activity · Strength trends
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.text.primary,
  },
  accent: {
    color: colors.accent.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.accent.primary,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
    lineHeight: 22,
  },
});
