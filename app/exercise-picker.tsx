import { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EXERCISES } from '../src/data/exercises';
import { colors, spacing, radius, typography } from '../src/theme';
import type { MuscleGroup } from '../src/types';

const MUSCLES: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'core',
];

const MUSCLE_LABEL: Record<string, string> = {
  chest: 'Chest', back: 'Back', lats: 'Lats', shoulders: 'Shoulders',
  delts: 'Delts', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves',
  core: 'Core', traps: 'Traps',
};

export default function ExercisePicker() {
  const router = useRouter();
  const [search,   setSearch]   = useState('');
  const [muscle,   setMuscle]   = useState<MuscleGroup | null>(null);
  const [category, setCategory] = useState<'all' | 'compound' | 'isolation'>('all');

  const filtered = useMemo(() => {
    return EXERCISES.filter(ex => {
      if (muscle && !ex.muscleGroups.primary.includes(muscle)) return false;
      if (category !== 'all' && ex.category !== category) return false;
      if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, muscle, category]);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          <Text style={s.backText}>Workout</Text>
        </TouchableOpacity>
        <Text style={s.title}>Exercise Library</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search" size={16} color={colors.text.muted} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises…"
          placeholderTextColor={colors.text.muted}
          autoCorrect={false}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color={colors.text.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category filter */}
      <View style={s.filterRow}>
        {(['all', 'compound', 'isolation'] as const).map(c => (
          <TouchableOpacity
            key={c}
            style={[s.filterChip, category === c && s.filterChipActive]}
            onPress={() => setCategory(c)}
            activeOpacity={0.7}
          >
            <Text style={[s.filterText, category === c && s.filterTextActive]}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Muscle group scroll */}
      <View>
        <FlatList
          horizontal
          data={[null, ...MUSCLES]}
          keyExtractor={m => m ?? 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.muscleScroll}
          renderItem={({ item: m }) => (
            <TouchableOpacity
              style={[s.muscleChip, muscle === m && s.muscleChipActive]}
              onPress={() => setMuscle(m)}
              activeOpacity={0.7}
            >
              <Text style={[s.muscleText, muscle === m && s.muscleTextActive]}>
                {m ? (MUSCLE_LABEL[m] ?? m) : 'All'}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Exercise count */}
      <Text style={s.countText}>{filtered.length} exercises</Text>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={ex => ex.exerciseId}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item: ex }) => (
          <View style={s.exCard}>
            <View style={s.exLeft}>
              <Text style={s.exName}>{ex.name}</Text>
              <View style={s.exMetaRow}>
                <View style={[s.badge, s.badgeCat]}>
                  <Text style={s.badgeText}>{ex.category}</Text>
                </View>
                {ex.muscleGroups.primary.slice(0, 2).map(m => (
                  <View key={m} style={s.badge}>
                    <Text style={s.badgeText}>{MUSCLE_LABEL[m] ?? m}</Text>
                  </View>
                ))}
                <View style={[s.badge, s.badgeDiff]}>
                  <Text style={s.badgeText}>{ex.difficulty}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg }} />
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:  { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 70 },
  backText: { ...typography.body, color: colors.text.primary },
  title:    { ...typography.h4 },

  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.md, backgroundColor: colors.bg.input, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, height: 44 },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: 15 },

  filterRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  filterChip: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  filterChipActive: { borderColor: colors.accent.primary, backgroundColor: `${colors.accent.primary}15` },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.text.muted },
  filterTextActive: { color: colors.accent.primary },

  muscleScroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs, flexDirection: 'row' },
  muscleChip:       { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
  muscleChipActive: { borderColor: colors.accent.primary, backgroundColor: `${colors.accent.primary}15` },
  muscleText:       { fontSize: 12, fontWeight: '600', color: colors.text.muted },
  muscleTextActive: { color: colors.accent.primary },

  countText: { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: colors.text.muted, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },

  exCard:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  exLeft:    { flex: 1 },
  exName:    { fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 6 },
  exMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  badge:     { backgroundColor: colors.bg.elevated, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeCat:  { backgroundColor: `${colors.accent.primary}15` },
  badgeDiff: { backgroundColor: colors.bg.elevated },
  badgeText: { fontSize: 10, fontWeight: '600', color: colors.text.secondary, textTransform: 'capitalize' },
});
