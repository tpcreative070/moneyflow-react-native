// src/components/OfflineBanner.js
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../constants/theme';
import { useLocalization } from '../utils/localization';
import { useNetworkStore } from '../context/store';

export default function OfflineBanner() {
  const { str } = useLocalization();
  const { isConnected, setConnected } = useNetworkStore();
  const slide = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => setConnected(!!state.isConnected));
    return unsub;
  }, []);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: isConnected ? -60 : 8,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isConnected]);

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slide }] }]}>
      <Icon name="wifi-off" size={15} color={Colors.white} />
      <Text style={styles.text}>{str('workingOffline')}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', top: 0, left: 24, right: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.warningOrange,
    paddingVertical: 8, paddingHorizontal: 20,
    borderRadius: 999, zIndex: 9999, elevation: 10,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8,
  },
  text: { color: Colors.white, fontWeight: '600', fontSize: 13 },
});
