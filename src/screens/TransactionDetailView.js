// src/screens/TransactionDetailView.js
import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Radius } from '../constants/theme';
import { useLocalization } from '../utils/localization';
import { useCurrencyStore } from '../context/store';
import { formatAmount } from '../utils/currency';

export default function TransactionDetailView({ visible, transaction: tx, onClose, onEdit, onDelete }) {
  const { str } = useLocalization();
  const { code } = useCurrencyStore();
  if (!tx) return null;

  const isIncome = tx.type === 'income';
  const gradients = isIncome ? ['#4ADE80', '#22C55E'] : ['#F87171', '#EF4444'];

  const rows = [
    { icon: 'calendar-today', label: str('date'),       value: new Date(tx.date).toLocaleDateString(undefined, { dateStyle: 'full' }) },
    { icon: 'category',       label: str('category'),   value: tx.categoryName },
    tx.note && { icon: 'notes', label: str('note'), value: tx.note },
    { icon: 'cloud-done',     label: str('syncStatus'), value: tx.synced ? str('synced') : str('pending') },
    { icon: 'access-time',    label: str('createdAt'),  value: new Date(tx.createdAt).toLocaleString() },
  ].filter(Boolean);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Icon name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView>
          {/* Hero */}
          <LinearGradient colors={gradients} style={styles.hero}>
            <View style={styles.heroIconWrap}>
              <Icon name={isIncome ? 'arrow-downward' : 'arrow-upward'} size={32} color={Colors.white} />
            </View>
            <Text style={styles.heroCat}>{tx.categoryName}</Text>
            <Text style={styles.heroAmt}>
              {isIncome ? '+' : '−'}{formatAmount(tx.amount, code)}
            </Text>
            <View style={styles.typeBadge}>
              <Text style={[styles.typeTxt, { color: isIncome ? Colors.incomeGreen : Colors.outcomeRed }]}>
                {isIncome ? str('income') : str('expense')}
              </Text>
            </View>
          </LinearGradient>

          {/* Detail rows */}
          <View style={styles.detailCard}>
            {rows.map((row, i) => (
              <View key={i} style={[styles.detailRow, i > 0 && styles.rowBorder]}>
                <View style={styles.detailIcon}>
                  <Icon name={row.icon} size={18} color={Colors.primaryPurple} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Receipt */}
          {!!tx.attachmentBase64 && (
            <View style={styles.receiptCard}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${tx.attachmentBase64}` }}
                style={styles.receiptImg}
                resizeMode="cover"
              />
            </View>
          )}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(tx)}>
            <Icon name="edit" size={18} color={Colors.primaryPurple} />
            <Text style={styles.editTxt}>{str('editTransaction')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(tx)}>
            <Icon name="delete" size={18} color={Colors.error} />
            <Text style={styles.deleteTxt}>{str('deleteTransaction')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  topBar:       { flexDirection: 'row', justifyContent: 'flex-end', padding: 16 },
  closeBtn:     { padding: 4 },
  hero:         { marginHorizontal: 16, borderRadius: Radius.heroCard, padding: 24, alignItems: 'center', marginBottom: 16 },
  heroIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  heroCat:      { color: 'rgba(255,255,255,0.9)', fontSize: 15, marginBottom: 4 },
  heroAmt:      { color: Colors.white, fontSize: 38, fontWeight: 'bold', marginBottom: 12 },
  typeBadge:    { paddingHorizontal: 16, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: Colors.white },
  typeTxt:      { fontSize: 13, fontWeight: '600' },
  detailCard:   { marginHorizontal: 16, backgroundColor: Colors.white, borderRadius: Radius.card, marginBottom: 16, overflow: 'hidden' },
  detailRow:    { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowBorder:    { borderTopWidth: 1, borderTopColor: Colors.divider },
  detailIcon:   { width: 34, height: 34, borderRadius: 8, backgroundColor: `${Colors.primaryPurple}15`, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  detailContent:{ flex: 1 },
  detailLabel:  { fontSize: 12, color: Colors.textSecondary },
  detailValue:  { fontSize: 15, color: Colors.textPrimary, marginTop: 1 },
  receiptCard:  { marginHorizontal: 16, marginBottom: 16, borderRadius: Radius.card, overflow: 'hidden' },
  receiptImg:   { width: '100%', height: 200 },
  actions:      { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: Colors.divider },
  editBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: Radius.button, backgroundColor: `${Colors.primaryPurple}15` },
  editTxt:      { color: Colors.primaryPurple, fontWeight: '600', fontSize: 15 },
  deleteBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: Radius.button, backgroundColor: `${Colors.error}10` },
  deleteTxt:    { color: Colors.error, fontWeight: '600', fontSize: 15 },
});
