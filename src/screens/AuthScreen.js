// src/screens/AuthScreen.js
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, StatusBar, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Colors, Radius } from '../constants/theme';
import { useLocalization } from '../utils/localization';
import { useAuthStore } from '../context/store';

GoogleSignin.configure({
  webClientId: '382775998205-0apkrdavr3oe2ia50j3vfhebt8adbh2k.apps.googleusercontent.com',
});

export default function AuthScreen() {
  const { str } = useLocalization();
  const { setGuest, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // ── Google Sign-In ────────────────────────────────────────
  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const { data } = await GoogleSignin.signIn();
      const googleCredential = auth.GoogleAuthProvider.credential(data.idToken);
      const result = await auth().signInWithCredential(googleCredential);
      setUser({
        uid:         result.user.uid,
        displayName: result.user.displayName ?? 'User',
        email:       result.user.email ?? '',
        photoURL:    result.user.photoURL ?? null,
      });
    } catch (e) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled — do nothing
      } else if (e.code === statusCodes.IN_PROGRESS) {
        setError('Sign-in already in progress');
      } else if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available');
      } else {
        setError(e.message ?? 'Google Sign-In failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Apple Sign-In (iOS only) ──────────────────────────────
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
  container:    { flex: 1 },
  scroll:       { flexGrow: 1, alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  logoWrap:     { alignItems: 'center', marginBottom: 36 },
  logoCircle:   { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  appName:      { fontSize: 36, fontWeight: 'bold', color: Colors.white, marginBottom: 4 },
  subtitle:     { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  features:     { width: '100%', marginBottom: 36 },
  featureRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  featureIcon:  { marginRight: 12 },
  featureText:  { color: Colors.white, fontSize: 15 },
  btnGroup:     { width: '100%', gap: 12 },
  appleBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, height: BTN_H, borderRadius: Radius.button, gap: 10 },
  appleBtnText: { fontSize: 16, fontWeight: '600', color: Colors.black },
  googleBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, height: BTN_H, borderRadius: Radius.button, gap: 10 },
  googleG:      { fontSize: 20, fontWeight: 'bold', color: Colors.primaryPurple },
  googleBtnText:{ fontSize: 16, fontWeight: '600', color: Colors.primaryPurple },
  dividerRow:   { flexDirection: 'row', alignItems: 'center' },
  divLine:      { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  divText:      { color: 'rgba(255,255,255,0.7)', marginHorizontal: 12, fontSize: 14 },
  guestBtn:     { height: BTN_H, borderRadius: Radius.button, borderWidth: 1.5, borderColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  guestBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  error:        { color: '#FFB3B3', marginTop: 12, textAlign: 'center', fontSize: 14 },
});