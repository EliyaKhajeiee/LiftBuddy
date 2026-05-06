import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, radius } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress:    () => void;
  children:   React.ReactNode;
  variant?:   Variant;
  size?:      Size;
  loading?:   boolean;
  disabled?:  boolean;
  fullWidth?: boolean;
  style?:     ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  onPress,
  children,
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  disabled  = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        styles[variant] as ViewStyle,
        styles[`size_${size}` as keyof typeof styles] as ViewStyle,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ] as ViewStyle[]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.accent.primary}
        />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}` as keyof typeof styles], styles[`textSize_${size}` as keyof typeof styles], textStyle]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  // variants
  primary:   { backgroundColor: colors.accent.primary },
  secondary: { backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border },
  ghost:     { backgroundColor: 'transparent' },
  danger:    { backgroundColor: colors.accent.danger },
  // sizes
  size_sm:   { paddingHorizontal: spacing.md, height: 36 },
  size_md:   { paddingHorizontal: spacing.lg, height: 48 },
  size_lg:   { paddingHorizontal: spacing.xl, height: 56 },
  // text base
  text: { fontWeight: '600', letterSpacing: 0.2 },
  text_primary:   { color: '#FFFFFF' },
  text_secondary: { color: colors.text.primary },
  text_ghost:     { color: colors.accent.primary },
  text_danger:    { color: '#FFFFFF' },
  // text sizes
  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 15 },
  textSize_lg: { fontSize: 17 },
  // utils
  fullWidth: { width: '100%' },
  disabled:  { opacity: 0.45 },
});
