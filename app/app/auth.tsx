import React, { useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import { AuthScaffold, FormField, FormError, PrimaryButton, styles } from '@/components/auth/AuthUI';
import { useAuth } from '@/contexts/AuthContext';
import { authErrorMessage } from '@/services/auth/error-message';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    if (creating && name.trim().length < 2) return setError('Enter your full name (at least 2 characters).');
    if (creating && password.length < 8) return setError('Use a password with at least 8 characters.');
    if (creating && password !== confirmation) return setError('Your passwords do not match.');
    Keyboard.dismiss();
    setError(''); setBusy(true);
    try {
      if (creating) await register({ fullName: name.trim(), email: email.trim(), password, languagePreference: 'en' });
      else await login({ email: email.trim(), password });
    } catch (failure) { setError(authErrorMessage(failure)); }
    finally { setBusy(false); }
  };
  return <AuthScaffold>
    <Text style={styles.title}>{creating ? 'Create your account' : 'Welcome back'}</Text>
    <Text style={styles.subtitle}>{creating ? 'Choose a dam to follow and keep its updates in one place.' : 'Sign in to see the dam you follow and your saved preferences.'}</Text>
    <View style={styles.card}>
      {creating && <FormField label="Full name" value={name} onChangeText={setName} editable={!busy} maxLength={100} autoComplete="name" />}
      <FormField label="Email address" value={email} onChangeText={setEmail} editable={!busy} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} />
      <FormField label="Password" value={password} onChangeText={setPassword} editable={!busy} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete={creating ? 'new-password' : 'current-password'} maxLength={100} />
      {creating && <FormField label="Confirm password" value={confirmation} onChangeText={setConfirmation} editable={!busy} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" maxLength={100} />}
      <Pressable accessibilityRole="button" onPress={() => setShowPassword(value => !value)} style={{ alignSelf: 'flex-end', paddingVertical: 8, marginBottom: 12 }}><Text style={styles.link}>{showPassword ? 'Hide password' : 'Show password'}</Text></Pressable>
      <FormError message={error} />
      <PrimaryButton title={creating ? 'Create account' : 'Log in'} onPress={() => void submit()} busy={busy} />
    </View>
    <View style={{ alignItems: 'center', gap: 12, marginTop: 28 }}>
      <Text style={{ color: '#64748B' }}>{creating ? 'Already have an account?' : 'New to FloodWatch?'}</Text>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setCreating(value => !value); setError(''); setPassword(''); setConfirmation(''); }}><Text style={styles.link}>{creating ? 'Log in instead' : 'Create an account'}</Text></Pressable>
    </View>
  </AuthScaffold>;
}
