import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, radius, typography } from '../../src/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { forgotPassword, clearError } = useAuthStore();

  const [email,   setEmail]   = useState('');
  const [busy,    setBusy]    = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit() {
    if (!email.trim()) return;
    setBusy(true);
    setError('');
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError('Could not send reset email. Check the address and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Back button */}
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        {sent ? (
          // ── Success state ────────────────────────────────────────────────
          <View style={styles.successContainer}>
            <View style={styles.iconWrap}>
              <Ionicons name="mail-outline" size={48} color={colors.accent.success} />
            </View>
            <Text style={styles.title}>Check your inbox</Text>
            <Text style={styles.body}>
              We sent a password reset link to{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>
            <Text style={styles.hint}>Didn't receive it? Check your spam folder.</Text>
            <TouchableOpacity
              style={styles.cta}
              onPress={() => router.replace('/(auth)/login')}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaText}>Back to Log In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // ── Form state ───────────────────────────────────────────────────
          <View style={styles.formContainer}>
            <Text style={styles.title}>Forgot password?</Text>
            <Text style={styles.body}>
              Enter the email address on your account and we'll send a reset link.
            </Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(''); clearError(); }}
                placeholder="you@example.com"
                placeholderTextColor={colors.text.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.cta, (busy || !email.trim()) && styles.ctaDisabled]}
              onPress={handleSubmit}
              disabled={busy || !email.trim()}
              activeOpacity={0.8}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  kav: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  back: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  // ── Form ────────────────────────────────────────────────────────────────
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: -spacing.xxl,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  body: {
    ...typography.bodySmall,
    lineHeight: 22,
  },
  errorBanner: {
    backgroundColor: `${colors.accent.danger}22`,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent.danger,
    padding: spacing.sm + 2,
  },
  errorText: {
    color: colors.accent.danger,
    fontSize: 14,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
  },
  input: {
    backgroundColor: colors.bg.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 52,
    color: colors.text.primary,
    fontSize: 16,
  },
  cta: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // ── Success ─────────────────────────────────────────────────────────────
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: -spacing.xxl,
    paddingHorizontal: spacing.sm,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${colors.accent.success}18`,
    borderWidth: 1,
    borderColor: `${colors.accent.success}40`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emailHighlight: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  hint: {
    ...typography.caption,
    textAlign: 'center',
  },
});
