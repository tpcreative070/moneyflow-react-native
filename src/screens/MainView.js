// src/screens/MainView.js
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  TextInput, ScrollView, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SummaryHeaderView from '../components/SummaryHeaderView';
import { Colors, Radius } from '../constants/theme';
import { useLocalization } from '../utils/localization';
import { useTransactionStore } from '../context/store';
import AddTransactionView from './AddTransactionView';
import TransactionDetailView from './TransactionDetailView';

const DATE_FILTERS = ['today', 'thisWeek', 'thisMonth', 'thisYear'];

function inPeriod(tx, filter) {
  const now = new Date();
  const d   = new Date(tx.date);
  if (filter === 'today')     { return d.toDateString() === now.toDateString(); }
  if (filter === 'thisWeek')  { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); return d >= s; }
  if (filter === 'thisMonth') { return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }
  if (filter === 'thisYear')  { return d.getFullYear() === now.getFullYear(); }
  return true;
}

function toSections(list) {
  const groups = {};
  list.forEach(tx => {
    const key = new Date(tx.date).toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    (groups[key] = groups[key] ?? []).push(tx);
  });
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

export default function MainView() {
  const { str } = useLocalization();
  const { transactions, remove } = useTransactionStore();

  const [datePeriod, setDatePeriod] = useState('thisMonth');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search,     setSearch]     = useState('');
  const [addVisible, setAddVisible] = useState(false);
  const [editTx,     setEditTx]     = useState(null);
  const [detailTx,   setDetailTx]   = useState(null);

  const filtered = useMemo(() => transactions
    .filter(tx => inPeriod(tx, datePeriod))
    .filter(tx => typeFilter === 'all' || tx.type === typeFilter)
    .filter(tx => !search ||
      tx.categoryName.toLowerCase().includes(search.toLowerCase()) ||
      tx.note?.toLowerCase().includes(search.toLowerCase())),
    [transactions, datePeriod, typeFilter, search]);

  const totalIncome  = useMemo(() => filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [filtered]);
  const totalOutcome = useMemo(() => filtered.filter(t => t.type === 'outcome').reduce((s, t) => s + t.amount, 0), [filtered]);
  const sections     = useMemo(() => toSections(filtered), [filtered]);

  const openAdd  = ()   => { setEditTx(null); setAddVisible(true); };
  const openEdit = (tx) => { setEditTx(tx);   setAddVisible(true); };

  const confirmDelete = useCallback((tx) => {
    Alert.alert(str('confirmDelete'), str('cannotUndo'), [
      { text: str('cancel'), style: 'cancel' },
      { text: str('delete'), style: 'destructive', onPress: () => remove(tx.id) },
    ]);
  }, [remove, str]);

  const renderTx = ({ item: tx }) => {
    const isIncome = tx.type === 'income';
    return (
      <View style={styles.row}>
        <TouchableOpacity style={styles.rowMain} onPress={() => setDetailTx(tx)} activeOpacity={0.85}>
          <View style={[styles.rowIcon, { backgroundColor: isIncome ? '#DCFCE7' : '#FEE2E2' }]}>
            <Icon name={isIncome ? 'arrow-downward' : 'arrow-upward'} size={22}
              color={isIncome ? Colors.incomeGreen : Colors.outcomeRed} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowCat}>{tx.categoryName}</Text>
            {!!tx.note && <Text style={styles.rowNote} numberOfLines={1}>{tx.note}</Text>}
            <Text style={styles.rowTime}>
              {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={[styles.rowAmt, { color: isIncome ? Colors.incomeGreen : Colors.outcomeRed }]}>
              {isIncome ? '+' : '−'}{tx.amount.toLocaleString()}
            </Text>
            {!tx.synced && <Icon name="cloud-off" size={12} color={Colors.warningOrange} />}
          </View>
        </TouchableOpacity>
        <View style={styles.rowActions}>
          <TouchableOpacity onPress={() => openEdit(tx)} style={styles.actionBtn}>
            <Icon name="edit" size={18} color={Colors.primaryPurple} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(tx)} style={styles.actionBtn}>
            <Icon name="delete" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SummaryHeaderView balance={totalIncome - totalOutcome} totalIncome={totalIncome} totalOutcome={totalOutcome} />

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={str('search')}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {DATE_FILTERS.map(f => (
            <TouchableOpacity key={f}
              style={[styles.chip, datePeriod === f && styles.chipOn]}
              onPress={() => setDatePeriod(f)}>
              <Text style={[styles.chipTxt, datePeriod === f && styles.chipTxtOn]}>{str(f)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.typeRow}>
          {['all', 'income', 'outcome'].map(t => (
            <TouchableOpacity key={t}
              style={[styles.chip, typeFilter === t && styles.chipOn]}
              onPress={() => setTypeFilter(t)}>
              <Text style={[styles.chipTxt, typeFilter === t && styles.chipTxtOn]}>{str(t)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      {sections.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="inbox" size={52} color={`${Colors.primaryPurple}40`} />
          <Text style={styles.emptyTitle}>{str('noTransactions')}</Text>
          <Text style={styles.emptyHint}>{str('addFirst')}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={renderTx}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Icon name="add-circle" size={58} color={Colors.primaryPurple} />
      </TouchableOpacity>

      {/* Modals */}
      <AddTransactionView
        visible={addVisible}
        onClose={() => { setAddVisible(false); setEditTx(null); }}
        editTx={editTx}
      />
      {detailTx && (
        <TransactionDetailView
          visible={!!detailTx}
          transaction={detailTx}
          onClose={() => setDetailTx(null)}
          onEdit={tx => { setDetailTx(null); setTimeout(() => { setEditTx(tx); setAddVisible(true); }, 300); }}
          onDelete={tx => { setDetailTx(null); confirmDelete(tx); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  filterBar:    { backgroundColor: Colors.white, paddingBottom: 8, elevation: 2 },
  searchBox:    { flexDirection: 'row', alignItems: 'center', margin: 10, marginBottom: 6, backgroundColor: Colors.divider, borderRadius: Radius.chip, paddingHorizontal: 10 },
  searchInput:  { flex: 1, height: 38, color: Colors.textPrimary, fontSize: 14 },
  chipScroll:   { paddingLeft: 10, marginBottom: 4 },
  chip:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, marginRight: 8, backgroundColor: Colors.white },
  chipOn:       { backgroundColor: Colors.primaryPurple, borderColor: Colors.primaryPurple },
  chipTxt:      { fontSize: 13, color: Colors.textSecondary },
  chipTxtOn:    { color: Colors.white, fontWeight: '600' },
  typeRow:      { flexDirection: 'row', paddingHorizontal: 10, gap: 8, marginTop: 2 },
  sectionHeader:{ fontSize: 13, fontWeight: '600', color: Colors.textSecondary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, backgroundColor: Colors.background },
  row:          { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: 16, marginVertical: 3, borderRadius: Radius.card, paddingRight: 4, elevation: 1 },
  rowMain:      { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  rowIcon:      { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowInfo:      { flex: 1 },
  rowCat:       { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  rowNote:      { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  rowTime:      { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  rowRight:     { alignItems: 'flex-end', marginRight: 6 },
  rowAmt:       { fontSize: 15, fontWeight: '700' },
  rowActions:   { flexDirection: 'row' },
  actionBtn:    { padding: 8 },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyTitle:   { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginTop: 12 },
  emptyHint:    { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  fab:          { position: 'absolute', bottom: 20, right: 20, elevation: 6 },
});
