// src/screens/SettingsView.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Radius, Currencies } from '../constants/theme';
import { useLocalization } from '../utils/localization';
import {
  useAuthStore, useCurrencyStore,
  useBudgetStore, useCategoryStore, useTransactionStore,
} from '../context/store';
import CategoryManagementView from './CategoryManagementView';

const APP_VERSION = '1.0.0';

export default function SettingsView() {
  const { str, language, setLanguage } = useLocalization();
  const { user, isGuest, signOut }     = useAuthStore();
  const { code, setCode }              = useCurrencyStore();
  const { budget, save: saveBudget }   = useBudgetStore();
  const { categories }                 = useCategoryStore();
  const { transactions, pendingUpload }= useTransactionStore();

  const [catVisible, setCatVisible] = useState(false);
  const [monthly,    setMonthly]    = useState(String(budget.monthlyLimit));
  const [yearly,     setYearly]     = useState(String(budget.yearlyLimit));

  // Budget usage
  const now = new Date();
  const monthSpend = transactions
    .filter(t => t.type === 'outcome' && new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear())
    .reduce((s, t) => s + t.amount, 0);
  const yearSpend  = transactions
    .filter(t => t.type === 'outcome' && new Date(t.date).getFullYear() === now.getFullYear())
    .reduce((s, t) => s + t.amount, 0);

  const mProgress = budget.monthlyLimit > 0 ? Math.min(monthSpend / budget.monthlyLimit, 1) : 0;
  const yProgress = budget.yearlyLimit  > 0 ? Math.min(yearSpend  / budget.yearlyLimit,  1) : 0;
  const budgetColor = (p) => p >= 1 ? Colors.error : p >= budget.notifyAt ? Colors.warningOrange : Colors.incomeGreen;

  const flush = () => saveBudget({
    monthlyLimit: parseFloat(monthly) || 0,
    yearlyLimit:  parseFloat(yearly)  || 0,
    notifyAt: budget.notifyAt,
  });

  const handleSignOut = () => {
    Alert.alert(str('signOutConfirm'), str('signOutWarn'), [
      { text: str('cancel'), style: 'cancel' },
      { text: isGuest ? str('exitGuestMode') : str('signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Icon name="person" size={32} color={Colors.primaryPurple} />
        </View>
        <View>
          <Text style={styles.displayName}>{user?.displayName ?? str('guestMode')}</Text>
          {!!user?.email && <Text style={styles.email}>{user.email}</Text>}
        </View>
      </View>

      {/* Language */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{str('language')}</Text>
        <View style={styles.seg}>
          {[['vi','Tiếng Việt'],['en','English']].map(([l, lbl]) => (
            <TouchableOpacity key={l} style={[styles.segBtn, language === l && styles.segBtnOn]} onPress={() => setLanguage(l)}>
              <Text style={[styles.segTxt, language === l && styles.segTxtOn]}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Currency */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{str('currency')}</Text>
        <View style={styles.currencyGrid}>
          {Currencies.map(c => (
            <TouchableOpacity key={c.code}
              style={[styles.currencyOption, code === c.code && styles.currencyOptionOn]}
              onPress={() => setCode(c.code)}>
              <Text style={styles.flag}>{c.flag}</Text>
              <Text style={styles.cCode}>{c.code}</Text>
              <Text style={styles.cSym}>{c.symbol}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Budget */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{str('budget')}</Text>

        <Text style={styles.subLabel}>{str('monthlyLimit')}</Text>
        <TextInput style={styles.limitInput} value={monthly} onChangeText={setMonthly}
          keyboardType="numeric" placeholder={str('noLimit')} placeholderTextColor={Colors.textMuted} onBlur={flush} />
        {budget.monthlyLimit > 0 && (
          <>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${mProgress * 100}%`, backgroundColor: budgetColor(mProgress) }]} />
            </View>
            {mProgress >= budget.notifyAt && (
              <View style={styles.warnRow}>
                <Icon name={mProgress >= 1 ? 'error' : 'warning'} size={15} color={budgetColor(mProgress)} />
                <Text style={[styles.warnTxt, { color: budgetColor(mProgress) }]}>
                  {mProgress >= 1 ? str('budgetExceeded') : str('budgetWarning')} — {Math.round(mProgress * 100)}%
                </Text>
              </View>
            )}
          </>
        )}

        <Text style={[styles.subLabel, { marginTop: 14 }]}>{str('yearlyLimit')}</Text>
        <TextInput style={styles.limitInput} value={yearly} onChangeText={setYearly}
          keyboardType="numeric" placeholder={str('noLimit')} placeholderTextColor={Colors.textMuted} onBlur={flush} />
        {budget.yearlyLimit > 0 && (
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${yProgress * 100}%`, backgroundColor: budgetColor(yProgress) }]} />
          </View>
        )}
      </View>

      {/* Categories nav */}
      <TouchableOpacity style={styles.menuRow} onPress={() => setCatVisible(true)}>
        <Icon name="category" size={22} color={Colors.primaryPurple} />
        <Text style={styles.menuRowTxt}>{str('categories')}</Text>
        <View style={styles.badge}><Text style={styles.badgeTxt}>{categories.length}</Text></View>
        <Icon name="chevron-right" size={20} color={Colors.textMuted} />
      </TouchableOpacity>

      {/* App info */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{str('appInfo')}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{str('version')}</Text>
          <Text style={styles.infoValue}>{APP_VERSION}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{str('cloudSync')}</Text>
          {pendingUpload.size === 0
            ? <View style={styles.syncRow}><Icon name="check-circle" size={15} color={Colors.incomeGreen} /><Text style={[styles.infoValue, { color: Colors.incomeGreen }]}>{str('allSynced')}</Text></View>
            : <View style={styles.syncRow}><Icon name="sync" size={15} color={Colors.warningOrange} /><Text style={[styles.infoValue, { color: Colors.warningOrange }]}>{pendingUpload.size} {str('pendingSync')}</Text></View>
          }
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Icon name="logout" size={20} color={Colors.error} />
        <Text style={styles.signOutTxt}>{isGuest ? str('exitGuestMode') : str('signOut')}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
      <CategoryManagementView visible={catVisible} onClose={() => setCatVisible(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  profileCard:    { flexDirection: 'row', alignItems: 'center', gap: 14, margin: 16, padding: 16, backgroundColor: Colors.white, borderRadius: Radius.card, elevation: 1 },
  avatar:         { width: 52, height: 52, borderRadius: 26, backgroundColor: `${Colors.primaryPurple}20`, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.primaryPurple },
  displayName:    { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  email:          { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  card:           { margin: 16, marginTop: 0, backgroundColor: Colors.white, borderRadius: Radius.card, padding: 16, elevation: 1, marginBottom: 12 },
  cardLabel:      { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  seg:            { flexDirection: 'row', backgroundColor: Colors.divider, borderRadius: Radius.chip, overflow: 'hidden' },
  segBtn:         { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segBtnOn:       { backgroundColor: Colors.primaryPurple },
  segTxt:         { color: Colors.textSecondary, fontSize: 14 },
  segTxtOn:       { color: Colors.white, fontWeight: '600' },
  currencyGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  currencyOption: { alignItems: 'center', padding: 10, borderRadius: Radius.chip, borderWidth: 1, borderColor: Colors.border, minWidth: 68 },
  currencyOptionOn: { borderColor: Colors.primaryPurple, backgroundColor: `${Colors.primaryPurple}10` },
  flag:           { fontSize: 20 },
  cCode:          { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, marginTop: 2 },
  cSym:           { fontSize: 11, color: Colors.textSecondary },
  subLabel:       { fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  limitInput:     { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.chip, padding: 10, color: Colors.textPrimary, fontSize: 16, marginBottom: 8 },
  progressBg:     { height: 6, backgroundColor: Colors.divider, borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: 3 },
  warnRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: Radius.chip, backgroundColor: `${Colors.warningOrange}15`, marginTop: 4 },
  warnTxt:        { fontSize: 13, fontWeight: '500' },
  menuRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, padding: 16, backgroundColor: Colors.white, borderRadius: Radius.card, marginBottom: 12, elevation: 1 },
  menuRowTxt:     { flex: 1, fontSize: 15, color: Colors.textPrimary },
  badge:          { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full, backgroundColor: `${Colors.primaryPurple}15` },
  badgeTxt:       { fontSize: 12, color: Colors.primaryPurple, fontWeight: '600' },
  infoRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  infoLabel:      { fontSize: 14, color: Colors.textSecondary },
  infoValue:      { fontSize: 14, color: Colors.textPrimary },
  syncRow:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  signOutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, padding: 16, backgroundColor: `${Colors.error}10`, borderRadius: Radius.card, marginBottom: 12 },
  signOutTxt:     { color: Colors.error, fontSize: 15, fontWeight: '600' },
});
