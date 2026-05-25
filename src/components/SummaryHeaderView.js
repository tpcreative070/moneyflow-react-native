// src/components/SummaryHeaderView.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../constants/theme';
import { formatCompact } from '../utils/currency';
import { useLocalization } from '../utils/localization';
import { useCurrencyStore } from '../context/store';

export default function SummaryHeaderView({ balance, totalIncome, totalOutcome }) {
  const { str } = useLocalization();
  const { code } = useCurrencyStore();

  return (
    <LinearGradient
      colors={[Colors.primaryPurple, Colors.darkPurple]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.label}>{str('balance')}</Text>
      <Text style={styles.balance} adjustsFontSizeToFit numberOfLines={1}>
        {formatCompact(balance, code)}
      </Text>
      <View style={styles.pillRow}>
        <View style={styles.pill}>
          <Icon name="arrow-downward" size={16} color={Colors.incomeGreen} />
          <Text style={styles.pillLabel}>{str('income')}</Text>
          <Text style={[styles.pillAmt, { color: Colors.incomeGreen }]}>
            {formatCompact(totalIncome, code)}
          </Text>
        </View>
        <View style={styles.pillDivider} />
        <View style={styles.pill}>
          <Icon name="arrow-upward" size={16} color={Colors.outcomeRed} />
          <Text style={styles.pillLabel}>{str('outcome')}</Text>
          <Text style={[styles.pillAmt, { color: Colors.outcomeRed }]}>
            {formatCompact(totalOutcome, code)}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { height: 170, paddingHorizontal: 16, paddingTop: 20, alignItems: 'center' },
  label:   { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 4 },
  balance: { color: '#fff', fontSize: 34, fontWeight: 'bold', marginBottom: 12 },
  pillRow: { flexDirection: 'row', width: '100%' },
  pill: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 8, gap: 4,
  },
  pillDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },
  pillLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  pillAmt:   { fontSize: 14, fontWeight: '700' },
});
