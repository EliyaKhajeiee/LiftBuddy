import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput as TI,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, radius, typography } from '../../src/theme';

export default function SignupScreen() {
  const router  = useRouter();
  const { signup, error, clearError } = useAuthStore();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [busy,     setBusy]     = useState(false);
  const [localErr, setLocalErr] = useState('');

  const emailRef    = useRef<TI>(null);
  const passwordRef = useRef<TI>(null);
  const confirmRef  = useRef<TI>(null);

  async function handleSignup() {
    setLocalErr('');
    clearError();

    if (!name.trim())             { setLocalErr('Please enter your name.');        return; }
    if (!email.trim())            { setLocalErr('Please enter your email.');        return; }
    if (password.length < 6)      { setLocalErr('Password must be 6+ characters.'); return; }
    if (password !== confirm)     { setLocalErr('Passwords do not match.');         return; }

    setBusy(true);
    try {
      await signup(email.trim(), password, name.trim());
    } finally {
      setBusy(false);
    }
  }

  const displayError = localErr || error;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.wordmark}>LIFT<Text style={styles.wordmarkAccent}>BUDDY</Text></Text>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {displayError ? (
            <TouchableOpacity
              style={styles.errorBanner}
              onPress={() => { setLocalErr(''); clearError(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.errorText}>{displayError}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.text.muted}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.text.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.text.muted}
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <TextInput
              ref={confirmRef}
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              placeholderTextColor={colors.text.muted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignup}
            />
          </View>

          <TouchableOpacity
            style={[styles.cta, busy && styles.ctaDisabled]}
            onPress={handleSignup}
            disabled={busy}
            activeOpacity={0.8}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7}>
            <Text style={styles.footerLink}> Log in</Text>
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
    marginBottom: spacing.xl,
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
    letterSpacing: 1,
    marginTop: spacing.xs,
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
