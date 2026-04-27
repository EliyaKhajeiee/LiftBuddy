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
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, radius, typography } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loading, error, clearError } = useAuthStore();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [busy,     setBusy]     = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) return;
    setBusy(true);
    try {
      await login(email.trim(), password);
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
        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.wordmark}>LIFT<Text style={styles.wordmarkAccent}>BUDDY</Text></Text>
          <Text style={styles.tagline}>Train. Track. Grow.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {error ? (
            <TouchableOpacity style={styles.errorBanner} onPress={clearError} activeOpacity={0.8}>
              <Text style={styles.errorText}>{error}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(v) => { setEmail(v); clearError(); }}
              placeholder="you@example.com"
              placeholderTextColor={colors.text.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <View style={styles.passwordHeader}>
              <Text style={styles.label}>PASSWORD</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} activeOpacity={0.7}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(v) => { setPassword(v); clearError(); }}
              placeholder="••••••••"
              placeholderTextColor={colors.text.muted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[styles.cta, (busy || !email || !password) && styles.ctaDisabled]}
            onPress={handleLogin}
            disabled={busy || !email.trim() || !password.trim()}
            activeOpacity={0.8}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')} activeOpacity={0.7}>
            <Text style={styles.footerLink}> Sign up</Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  wordmark: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 4,
    color: colors.text.primary,
  },
  wordmarkAccent: {
    color: colors.accent.primary,
  },
  tagline: {
    ...typography.bodySmall,
    letterSpacing: 2,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  form: {
    gap: spacing.md,
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
    textAlign: 'center',
  },
  field: {
    gap: spacing.xs,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotLink: {
    ...typography.caption,
    color: colors.accent.primary,
    fontWeight: '500',
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
    marginTop: spacing.sm,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    ...typography.bodySmall,
  },
  footerLink: {
    ...typography.bodySmall,
    color: colors.accent.primary,
    fontWeight: '600',
  },
});
