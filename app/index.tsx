import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../src/theme';

// Shown briefly while auth state is being resolved in _layout.tsx
export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
