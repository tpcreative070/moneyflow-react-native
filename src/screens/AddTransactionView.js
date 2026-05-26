// src/screens/AddTransactionView.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ScrollView, Alert, Image, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Colors, Radius } from '../constants/theme';
import { useLocalization } from '../utils/localization';
import { useTransactionStore, useCategoryStore, useNetworkStore, genId } from '../context/store';

export default function AddTransactionView({ visible, onClose, editTx }) {
  const { str } = useLocalization();
  const { add, update, syncPending } = useTransactionStore();
  const { categories }               = useCategoryStore();
  const { isConnected }              = useNetworkStore();

  const [type,       setType]       = useState('outcome');
  const [amount,     setAmount]     = useState('');
  const [selCat,     setSelCat]     = useState(null);
  const [note,       setNote]       = useState('');
  const [date,       setDate]       = useState(new Date());
  const [attachment, setAttachment] = useState(null);
  const [error,      setError]      = useState('');
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editTx) {
      setType(editTx.type);
      setAmount(String(editTx.amount));
      setSelCat(categories.find(c => c.id === editTx.categoryId) ?? null);
      setNote(editTx.note ?? '');
      setDate(new Date(editTx.date));
      setAttachment(editTx.attachmentBase64 ? { b64: editTx.attachmentBase64 } : null);
    } else {
      setType('outcome'); setAmount(''); setSelCat(null);
      setNote(''); setDate(new Date()); setAttachment(null);
    }
    setError('');
  }, [visible, editTx]);

  const filteredCats = categories.filter(c => c.type === type || c.type === 'both');

  const pickImage = async (src) => {
    const opts = { mediaType: 'photo', includeBase64: true, quality: 0.72, maxWidth: 1024, maxHeight: 1024 };
    const res = src === 'camera' ? await launchCamera(opts) : await launchImageLibrary(opts);
    if (!res.didCancel && res.assets?.[0]) {
      setAttachment({ b64: res.assets[0].base64, uri: res.assets[0].uri });
    }
  };

  const handleReceipt = () => {
    Alert.alert(str('receipt'), '', [
      { text: str('camera'),      onPress: () => pickImage('camera') },
      { text: str('photoLibrary'),onPress: () => pickImage('library') },
      { text: str('cancel'), style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) { setError(str('errAmount'));   return; }
    if (!selCat)                             { setError(str('errCategory')); return; }
    setError(''); setSaving(true);
    try {
      const now = new Date().toISOString();
      const base = {
        type, amount: parseFloat(amount),
        categoryId: selCat.id, categoryName: selCat.name,
        note, date: date.toISOString(),
        attachmentBase64: attachment?.b64 ?? null,
        synced: false,   // always start as unsynced; syncPending will flip it
        updatedAt: now,
      };

      if (editTx) await update({ ...editTx, ...base });
      else        await add({ ...base, id: genId(), walletId: 'default', createdAt: now });

      // Attempt immediate sync when online; failures are silently queued
      if (isConnected) {
        syncPending().catch(err => console.warn('[AddTransaction] syncPending error:', err));
      }

      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelBtn}>{str('cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{editTx ? str('editTransaction') : str('addTransaction')}</Text>
          {saving
            ? <ActivityIndicator size="small" color={Colors.primaryPurple} />
            : <TouchableOpacity onPress={handleSave}><Text style={styles.saveBtn}>{str('save')}</Text></TouchableOpacity>
          }
        </View>

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          {/* Type */}
          <View style={styles.section}>
            <View style={styles.seg}>
              {['outcome', 'income'].map(t => (
                <TouchableOpacity key={t} style={[styles.segBtn, type === t && styles.segBtnOn]} onPress={() => setType(t)}>
                  <Text style={[styles.segTxt, type === t && styles.segTxtOn]}>
                    {t === 'outcome' ? str('expense') : str('income')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Amount */}
          <View style={styles.section}>
            <Text style={styles.label}>{str('amount')}</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.sym, { color: type === 'income' ? Colors.incomeGreen : Colors.outcomeRed }]}>₫</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>{str('category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {filteredCats.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, selCat?.id === cat.id && { borderColor: cat.colorHex, borderWidth: 2 }]}
                  onPress={() => setSelCat(cat)}
                >
                  <View style={[styles.catIcon, { backgroundColor: cat.colorHex + '30' }]}>
                    <Icon name={cat.icon} size={18} color={cat.colorHex} />
                  </View>
                  <Text style={styles.catName}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Note */}
          <View style={styles.section}>
            <Text style={styles.label}>{str('note')}</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              multiline
              placeholder={str('note')}
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Date */}
          <View style={styles.section}>
            <Text style={styles.label}>{str('date')}</Text>
            <View style={styles.dateRow}>
              <Icon name="calendar-today" size={18} color={Colors.primaryPurple} />
              <Text style={styles.dateTxt}>{date.toLocaleDateString()}</Text>
            </View>
          </View>

          {/* Receipt */}
          <View style={styles.section}>
            <Text style={styles.label}>{str('receipt')}</Text>
            {attachment ? (
              <View style={styles.attachRow}>
                <Image
                  source={{ uri: attachment.uri ?? `data:image/jpeg;base64,${attachment.b64}` }}
                  style={styles.thumb}
                />
                <TouchableOpacity style={styles.removeBtn} onPress={() => setAttachment(null)}>
                  <Text style={styles.removeTxt}>{str('removeReceipt')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.attachEmpty} onPress={handleReceipt}>
                <Icon name="attach-file" size={20} color={Colors.textSecondary} />
                <Text style={styles.attachTxt}>Add receipt photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cancelBtn:   { color: Colors.textSecondary, fontSize: 16 },
  title:       { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  saveBtn:     { color: Colors.primaryPurple, fontSize: 16, fontWeight: '600' },
  form:        { flex: 1 },
  section:     { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  label:       { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  seg:         { flexDirection: 'row', backgroundColor: Colors.divider, borderRadius: Radius.chip, overflow: 'hidden' },
  segBtn:      { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segBtnOn:    { backgroundColor: Colors.primaryPurple, borderRadius: Radius.chip },
  segTxt:      { color: Colors.textSecondary, fontSize: 15 },
  segTxtOn:    { color: Colors.white, fontWeight: '600' },
  amountRow:   { flexDirection: 'row', alignItems: 'center' },
  sym:         { fontSize: 28, fontWeight: 'bold', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: 'bold', color: Colors.textPrimary },
  catChip:     { alignItems: 'center', marginRight: 12, paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.chip, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  catIcon:     { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  catName:     { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  noteInput:   { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.chip, padding: 10, minHeight: 80, textAlignVertical: 'top', color: Colors.textPrimary },
  dateRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateTxt:     { fontSize: 15, color: Colors.textPrimary },
  attachEmpty: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  attachTxt:   { color: Colors.textSecondary, fontSize: 15 },
  attachRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb:       { width: 72, height: 72, borderRadius: 10 },
  removeBtn:   { paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.chip, borderWidth: 1, borderColor: Colors.error },
  removeTxt:   { color: Colors.error, fontSize: 13 },
  error:       { color: Colors.error, paddingHorizontal: 16, paddingBottom: 16, fontSize: 14 },
});