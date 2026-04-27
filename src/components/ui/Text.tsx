import React from 'react';
import { Text as RNText, StyleSheet, TextStyle } from 'react-native';
import { typography } from '../../theme';

type Variant = keyof typeof typography;

interface TextProps {
  variant?:      Variant;
  children:      React.ReactNode;
  style?:        TextStyle;
  color?:        string;
  center?:       boolean;
  numberOfLines?: number;
}

export function Text({
  variant = 'body',
  children,
  style,
  color,
  center,
  numberOfLines,
}: TextProps) {
  return (
    <RNText
      style={[
        typography[variant],
        center && styles.center,
        color ? { color } : null,
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
