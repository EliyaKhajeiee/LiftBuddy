import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, radius, shadows } from '../../theme';

interface CardProps {
  children:  React.ReactNode;
  style?:    ViewStyle;
  elevated?: boolean;
  padded?:   boolean;
  shadow?:   boolean;
}

export function Card({
  children,
  style,
  elevated = false,
  padded   = true,
  shadow   = false,
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        padded   && styles.padded,
        shadow   && shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  elevated: {
    backgroundColor: colors.bg.elevated,
    borderColor:     colors.borderLight,
  },
  padded: {
    padding: spacing.md,
  },
});
