import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useEffect } from 'react';
import { useWorkoutStore } from '../store/workoutStore';
import { colors, spacing, radius } from '../theme';

function fmtTimer(s: number) {
  const m  = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

interface Props {
  onPress: () => void;
}

export default function ActiveWorkoutBar({ onPress }: Props) {
  const { dayName, exercises, elapsed, currentExIdx, restActive, restRemaining, restTotal } = useWorkoutStore();

  const done   = exercises.reduce((n, ex) => n + ex.sets.filter(s => s.completed).length, 0);
  const total  = exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const currEx = exercises[currentExIdx];
  const nextSet = currEx?.sets.findIndex(s => !s.completed);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const restPct   = restTotal > 0 ? restRemaining / restTotal : 0;

  // Pulse the dot when resting
  useEffect(() => {
    if (restActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [restActive]);

  const dotColor = restActive ? colors.accent.warning : colors.accent.primary;

  return (
    <TouchableOpacity style={s.bar} onPress={onPress} activeOpacity={0.9}>
      {/* Progress fill background */}
      <View style={[s.fill, { width: `${(done / Math.max(total, 1)) * 100}%` as any }]} />

      {/* Rest overlay — dims as rest runs out */}
      {restActive && (
        <View style={[s.restFill, { width: `${(1 - restPct) * 100}%` as any }]} />
      )}

      {/* Left: workout name + current set */}
      <View style={s.left}>
        <Animated.View style={[s.dot, { backgroundColor: dotColor, transform: [{ scale: pulseAnim }] }]} />
        <View style={s.textWrap}>
          {restActive ? (
            <>
              <Text style={s.restLabel}>REST</Text>
              <Text style={s.restCountdown}>{fmtTimer(restRemaining)}</Text>
            </>
          ) : (
            <>
              <Text style={s.name} numberOfLines={1}>{dayName}</Text>
              <Text style={s.sub} numberOfLines={1}>
                {nextSet !== -1 && nextSet !== undefined
                  ? `Set ${nextSet + 1} · ${currEx?.exerciseName}`
                  : currEx?.exerciseName ?? ''
                }
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Right: elapsed + sets badge + chevron */}
      <View style={s.right}>
        <Text style={s.timer}>{fmtTimer(elapsed)}</Text>
        <View style={[s.badge, restActive && s.badgeRest]}>
          <Text style={[s.badgeText, restActive && s.badgeTextRest]}>{done}/{total}</Text>
        </View>
        <Ionicons name="chevron-up" size={16} color={colors.text.secondary} />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  bar: {
    position:         'absolute',
    bottom:           96,
    left:             spacing.md,
    right:            spacing.md,
    height:           58,
    backgroundColor:  colors.bg.card,
    borderRadius:     radius.lg,
    borderWidth:      1,
    borderColor:      colors.borderLight,
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: spacing.md,
    overflow:         'hidden',
    shadowColor:      colors.accent.primary,
    shadowOffset:     { width: 0, height: 0 },
    shadowOpacity:    0.25,
    shadowRadius:     10,
    elevation:        8,
  },
  fill: {
    position:         'absolute',
    top:              0, left: 0, bottom: 0,
    backgroundColor:  `${colors.accent.primary}12`,
    borderRadius:     radius.lg,
  },
  restFill: {
    position:         'absolute',
    top:              0, left: 0, bottom: 0,
    backgroundColor:  `${colors.accent.warning}08`,
    borderRadius:     radius.lg,
  },
  left:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  dot:     { width: 8, height: 8, borderRadius: 4 },
  textWrap:{ flex: 1, minWidth: 0 },
  name:    { fontSize: 13, fontWeight: '700', color: colors.text.primary },
  sub:     { fontSize: 11, color: colors.text.muted, marginTop: 1 },
  restLabel:    { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.accent.warning },
  restCountdown:{ fontSize: 16, fontWeight: '800', color: colors.text.primary, fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timer: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, fontVariant: ['tabular-nums'] },
  badge: {
    backgroundColor:  `${colors.accent.primary}20`,
    borderRadius:     radius.full,
    paddingHorizontal: 8,
    paddingVertical:   2,
  },
  badgeRest:     { backgroundColor: `${colors.accent.warning}20` },
  badgeText:     { fontSize: 11, fontWeight: '700', color: colors.accent.primary },
  badgeTextRest: { color: colors.accent.warning },
});
