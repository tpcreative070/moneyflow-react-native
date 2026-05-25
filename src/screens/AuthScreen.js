// src/screens/AuthScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, StatusBar, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

// ✅ Modular imports — fixes all 3 deprecation warnings
import auth, { GoogleAuthProvider, signInWithCredential } from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

import { Colors, Radius } from '../constants/theme';
import { useLocalization } from '../utils/localization';
import { useAuthStore } from '../context/store';

// ── NOTE ─────────────────────────────────────────────────────
//  webClientId  →  must be the "Web client (auto created by Google Service)"
//                  from Google Cloud Console → APIs & Services → Credentials
//                  NOT the Android OAuth client ID.
//
//  DEVELOPER_ERROR checklist:
//    1. SHA-1 + SHA-256 added in Firebase Console → Project Settings → Your app
//    2. Downloaded fresh google-services.json after adding fingerprints
//    3. webClientId below matches the Web client OAuth ID (not Android client)
//    4. Package name in Firebase matches applicationId in android/app/build.gradle
//    5. Google Sign-In enabled in Firebase Console → Authentication → Sign-in method
// ─────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const { str } = useLocalization();
  const { setGuest, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Configure inside useEffect so it runs after native modules are ready
  useEffect(() => {
    GoogleSignin.configure({
      // ⚠️ Replace with your Web client ID from Google Cloud Console
      // Cloud Console → APIs & Services → Credentials → Web client (auto created by Google Service)
      webClientId: '382775998205-0apkrdavr3oe2ia50j3vfhebt8adbh2k.apps.googleusercontent.com',
      offlineAccess: true,   // required to get idToken for Firebase credential
      forceCodeForRefreshToken: true,
    });
  }, []);

  // ── Google Sign-In ─────────────────────────────────────────
  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign out first to always show the account picker
      await GoogleSignin.signOut().catch(() => {});

      const signInResult = await GoogleSignin.signIn();

      // Support both v10+ ({ data }) and older ({ idToken }) response shapes
      const idToken =
        signInResult?.data?.idToken ??
        signInResult?.idToken ??
        signInResult?.user?.idToken;

      if (!idToken) {
        throw new Error('No idToken returned from Google Sign-In.');
      }

      // ✅ Modular API — replaces deprecated auth.GoogleAuthProvider.credential()
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // ✅ Modular API — replaces deprecated auth().signInWithCredential()
      const result = await signInWithCredential(auth(), googleCredential);

      setUser({
        uid:         result.user.uid,
        displayName: result.user.displayName ?? 'User',
        email:       result.user.email ?? '',
        photoURL:    result.user.photoURL ?? null,
      });

    } catch (e) {
      const code = e.code ?? '';

      if (code === statusCodes.SIGN_IN_CANCELLED) {
        // User dismissed — do nothing
      } else if (code === statusCodes.IN_PROGRESS) {
        setError('Sign-in already in progress. Please wait.');
      } else if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available or outdated.');
      } else if (code === statusCodes.SIGN_IN_REQUIRED) {
        setError('Please sign in to continue.');
      } else {
        // Show code + message so you can debug unknown errors (e.g. DEVELOPER_ERROR = code 10)
        const displayCode = code ? ` [code: ${code}]` : '';
        setError((e.message ?? 'Google Sign-In failed') + displayCode);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Apple Sign-In (iOS only) ───────────────────────────────
  const handleApple = () => {
    setError('');
    if (Platform.OS !== 'ios') {
      setError('Apple Sign-In is only available on iOS.');
      return;
    }
    setError('Apple Sign-In requires Apple Developer account setup.');
  };

  const handleGuest = () => setGuest();

  const features = [
    { icon: 'bar-chart',     text: 'Daily income / expense tracking' },
    { icon: 'notifications', text: 'Budget exceeded alerts' },
    { icon: 'cloud',         text: 'Cloud data sync' },
    { icon: 'wifi-off',      text: 'Offline support' },
  ];

  return (
    <LinearGradient
      colors={[Colors.primaryPurple, Colors.darkPurple]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Icon name="account-balance-wallet" size={56} color={Colors.primaryPurple} />
          </View>
          <Text style={styles.appName}>{str('appName')}</Text>
          <Text style={styles.subtitle}>{str('appSubtitle')}</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Icon name={f.icon} size={22} color={Colors.white} style={styles.featureIcon} />
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        {loading ? (
          <ActivityIndicator size="large" color={Colors.white} style={{ marginVertical: 32 }} />
        ) : (
          <View style={styles.btnGroup}>

            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.appleBtn} onPress={handleApple}>
                <Icon name="phone-iphone" size={22} color={Colors.black} />
                <Text style={styles.appleBtnText}>{str('signInApple')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.googleBtn} onPress={handleGoogle}>
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.googleBtnText}>{str('signInGoogle')}</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.divLine} />
              <Text style={styles.divText}>{str('orLabel')}</Text>
              <View style={styles.divLine} />
            </View>

            <TouchableOpacity style={styles.guestBtn} onPress={handleGuest}>
              <Text style={styles.guestBtnText}>{str('continueGuest')}</Text>
            </TouchableOpacity>

          </View>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

      </ScrollView>
    </LinearGradient>
  );
}

const BTN_H = 54;
const styles = StyleSheet.create({
  container:     { flex: 1 },
  scroll:        { flexGrow: 1, alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  logoWrap:      { alignItems: 'center', marginBottom: 36 },
  logoCircle:    { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  appName:       { fontSize: 36, fontWeight: 'bold', color: Colors.white, marginBottom: 4 },
  subtitle:      { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  features:      { width: '100%', marginBottom: 36 },
  featureRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  featureIcon:   { marginRight: 12 },
  featureText:   { color: Colors.white, fontSize: 15 },
  btnGroup:      { width: '100%', gap: 12 },
  appleBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, height: BTN_H, borderRadius: Radius.button, gap: 10 },
  appleBtnText:  { fontSize: 16, fontWeight: '600', color: Colors.black },
  googleBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, height: BTN_H, borderRadius: Radius.button, gap: 10 },
  googleG:       { fontSize: 20, fontWeight: 'bold', color: Colors.primaryPurple },
  googleBtnText: { fontSize: 16, fontWeight: '600', color: Colors.primaryPurple },
  dividerRow:    { flexDirection: 'row', alignItems: 'center' },
  divLine:       { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  divText:       { color: 'rgba(255,255,255,0.7)', marginHorizontal: 12, fontSize: 14 },
  guestBtn:      { height: BTN_H, borderRadius: Radius.button, borderWidth: 1.5, borderColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  guestBtnText:  { color: Colors.white, fontSize: 16, fontWeight: '600' },
  error:         { color: '#FFB3B3', marginTop: 12, textAlign: 'center', fontSize: 14 },
});