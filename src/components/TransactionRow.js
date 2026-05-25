// src/components/TransactionRow.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SwipeRow } from 'react-native-swipe-list-view';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors, BorderRadius } from '../constants/theme';
import { formatAmount } from '../utils/currency';
import { useCurrencyStore } from '../context/store';

export default function TransactionRow({ item, onEdit, onDelete, onPress }) {
  const { currencyCode } = useCurrencyStore();
  const isIncome = item.type === 'income';

  return (
    <SwipeRow
      leftOpenValue={75}
      rightOpenValue={-75}
      disableLeftSwipe={false}
      disableRightSwipe={false}
    >
      {/* Hidden actions */}
      <View style={styles.rowBack}>
        <TouchableOpacity style={styles.editAction} onPress={() => onEdit(item)}>
          <MaterialIcons name="edit" size={22} color="#fff" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteAction} onPress={() => onDelete(item)}>
          <MaterialIcons name="delete" size={22} color="#fff" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Front row */}
      <TouchableOpacity style={styles.rowFront} onPress={() => onPress(item)} activeOpacity={0.85}>
        <View style={[styles.iconBox, { backgroundColor: isIncome ? '#DCFCE7' : '#FEE2E2' }]}>
          <MaterialIcons
            name={isIncome ? 'arrow-downward' : 'arrow-upward'}
            size={22}
            color={isIncome ? Colors.incomeGreen : Colors.outcomeRed}
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.categoryName} numberOfLines={1}>{item.categoryName}</Text>
          {!!item.note && <Text style={styles.note} numberOfLines={1}>{item.note}</Text>}
          <Text style={styles.time}>
            {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: isIncome ? Colors.incomeGreen : Colors.outcomeRed }]}>
            {isIncome ? '+' : '−'}{formatAmount(item.amount, currencyCode)}
          </Text>
          {!item.synced && (
            <MaterialIcons name="cloud-off" size={13} color={Colors.warningOrange} style={styles.cloudIcon} />
          )}
        </View>
      </TouchableOpacity>
    </SwipeRow>
  );
}

const styles = StyleSheet.create({
  rowBack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    borderRadius: BorderRadius.card,
    marginHorizontal: 16,
    marginVertical: 3,
    overflow: 'hidden',
  },
  editAction: {
    width: 75, height: '100%',
    backgroundColor: Colors.primaryPurple,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteAction: {
    width: 75, height: '100%',
    backgroundColor: Colors.error,
    alignItems: 'center', justifyContent: 'center',
  },
  actionText: { color: '#fff', fontSize: 11, marginTop: 2 },
  rowFront: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16, paddingVertical: 12,
    marginHorizontal: 16, marginVertical: 3,
    borderRadius: BorderRadius.card,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  iconBox: {
    width: 44, height: 44,
    borderRadius: BorderRadius.chip,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  categoryName: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  note: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  time: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 15, fontWeight: '700' },
  cloudIcon: { marginTop: 3 },
});
