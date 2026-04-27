import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

interface ScreenProps {
  children:         React.ReactNode;
  style?:           ViewStyle;
  contentStyle?:    ViewStyle;
  scrollable?:      boolean;
  padded?:          boolean;
  safeArea?:        boolean;
  keyboardAvoiding?: boolean;
}

export function Screen({
  children,
  style,
  contentStyle,
  scrollable       = false,
  padded           = true,
  safeArea         = true,
  keyboardAvoiding = false,
}: ScreenProps) {
  const Wrapper = safeArea ? SafeAreaView : View;

  const inner = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[padded && styles.scrollContent, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.inner, padded && styles.padded, contentStyle]}>
      {children}
    </View>
  );

  const content = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {inner}
    </KeyboardAvoidingView>
  ) : inner;

  return (
    <Wrapper style={[styles.container, style]}>
      {content}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  kav: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
