import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

export function Skeleton({ width, height, borderRadius = 8, style }: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  const w = width ?? '100%';
  return (
    <Animated.View
      style={[
        { width: w as any, height, borderRadius, backgroundColor: colors.bg.elevated, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[sc.card, style]}>{children}</View>;
}

const sc = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
});
