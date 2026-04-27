import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../src/theme';

// Phase 9: strength charts, PRs, bodyweight tracker
// Weekly check-ins (photo library, weight log, comparison) — Phase 9
export default function ProgressScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>PHASE 9</Text>
        <Text style={styles.heading}>Your Progress</Text>
        <Text style={styles.subtitle}>
          Strength charts · All-time PRs{'\n'}
          Bodyweight tracker{'\n'}
          Weekly check-ins · Photo library{'\n'}
          Week-by-week photo comparison
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
  title: {
    ...typography.h3,
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
  heading: {
    ...typography.h1,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
    lineHeight: 22,
  },
});
