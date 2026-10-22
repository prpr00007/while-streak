import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { fonts, Palette, useTheme } from '../src/theme';
import { Button, Label, Loading, TextLink } from '../src/components/ui';
import { supabase } from '../src/lib/supabase';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function Account() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [username, setUsername] = useState('');
  const [savedName, setSavedName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session) return;
    supabase.from('profiles').select('username').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.username) { setSavedName(data.username); setUsername(data.username); }
      });
  }, [session]);

  if (!supabase) {
    return (
      <View style={s.screen}>
        <Label theme={theme} style={{ marginBottom: 10 }}>Offline mode</Label>
        <Text style={s.title}>Accounts aren’t set up yet</Text>
        <Text style={s.body}>Your streak and stats are saved on this phone. Add Supabase keys to enable sign-in and leaderboards.</Text>
      </View>
    );
  }
  if (!ready) return <Loading theme={theme} />;

  const sendCode = async () => {
    setBusy(true); setMessage(null);
    const { error } = await supabase!.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setMessage({ text: error.message, bad: true });
    else { setCodeSent(true); setMessage({ text: `We sent a 6-digit code to ${email.trim()}.` }); }
  };

  const verify = async () => {
    setBusy(true); setMessage(null);
    const { error } = await supabase!.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setMessage({ text: 'That code didn’t work. Check it and try again.', bad: true });
    else setMessage(null);
  };

  const saveName = async () => {
    const name = username.trim().toLowerCase();
    if (!USERNAME_RE.test(name)) {
      setMessage({ text: 'Use 3 to 20 lowercase letters, numbers, or underscores.', bad: true });
      return;
    }
    setBusy(true); setMessage(null);
    const { error } = await supabase!.from('profiles').upsert({ id: session!.user.id, username: name });
    setBusy(false);
    if (error) setMessage({ text: error.code === '23505' ? 'That username is taken.' : error.message, bad: true });
    else { setSavedName(name); setMessage({ text: 'Username saved. You’re on the leaderboard.' }); }
  };

  const signOut = async () => {
    await supabase!.auth.signOut();
    setSavedName(null); setUsername(''); setCode(''); setCodeSent(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.screenScroll} keyboardShouldPersistTaps="handled">
        {!session ? (
          <>
            <Text style={s.title}>Sign in for leaderboards</Text>
            <Text style={s.body}>Optional. Your streak works without an account; signing in puts your daily score on the board.</Text>
            <Label theme={theme} style={s.label}>Email</Label>
            <TextInput
              style={s.input} value={email} onChangeText={setEmail} placeholder="you@example.com"
              placeholderTextColor={theme.muted} autoCapitalize="none" autoComplete="email" keyboardType="email-address"
              editable={!codeSent}
            />
            {codeSent && (
              <>
                <Label theme={theme} style={s.label}>Code</Label>
                <TextInput
                  style={[s.input, { fontFamily: fonts.mono, letterSpacing: 4 }]} value={code} onChangeText={setCode}
                  placeholder="123456" placeholderTextColor={theme.muted} keyboardType="number-pad"
                  autoComplete="one-time-code" maxLength={6}
                />
              </>
            )}
            <Button
              label={codeSent ? 'Verify code' : 'Send code'} variant="primary" theme={theme} style={{ marginTop: 4 }}
              disabled={busy || !email.includes('@') || (codeSent && code.length < 6)} onPress={codeSent ? verify : sendCode}
            />
            {codeSent && (
              <View style={s.link}>
                <TextLink label="Use a different email" onPress={() => { setCodeSent(false); setCode(''); setMessage(null); }} theme={theme} />
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={s.title}>{savedName ? `@${savedName}` : 'Pick a username'}</Text>
            <Text style={s.body}>Signed in as {session.user.email}. This is the name other players see on the leaderboard.</Text>
            <Label theme={theme} style={s.label}>Username</Label>
            <TextInput
              style={[s.input, { fontFamily: fonts.mono }]} value={username} onChangeText={setUsername}
              placeholder="off_by_one" placeholderTextColor={theme.muted} autoCapitalize="none" autoCorrect={false} maxLength={20}
            />
            <Button label="Save username" variant="primary" theme={theme} style={{ marginTop: 4 }} disabled={busy} onPress={saveName} />
            <View style={s.link}>
              <TextLink label="Back to today’s puzzle" onPress={() => router.back()} theme={theme} />
            </View>
            <View style={s.link}>
              <TextLink label="Sign out" onPress={signOut} theme={theme} color={theme.bad} />
            </View>
          </>
        )}
        {message && <Text style={[s.message, message.bad && { color: theme.bad }]}>{message.text}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg, padding: 24, justifyContent: 'center' },
    screenScroll: { padding: 24, paddingTop: 32 },
    title: { fontFamily: fonts.display, fontSize: 38, lineHeight: 38, color: t.ink, marginBottom: 10 },
    body: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 20, color: t.muted, marginBottom: 24 },
    label: { marginBottom: 6, marginTop: 4 },
    input: {
      backgroundColor: t.surface, borderColor: t.ink, borderWidth: 2,
      paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.mono, fontSize: 15, color: t.ink, marginBottom: 16,
    },
    link: { paddingVertical: 14, alignItems: 'center' },
    message: { fontFamily: fonts.mono, marginTop: 14, color: t.ok, fontSize: 13, lineHeight: 20 },
  });
