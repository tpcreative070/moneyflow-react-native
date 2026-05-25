// src/screens/CategoryManagementView.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  FlatList, TextInput, ScrollView, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Radius, IconOptions, ColorOptions } from '../constants/theme';
import { useLocalization } from '../utils/localization';
import { useCategoryStore, genId } from '../context/store';
import { countTransactionsByCategory } from '../utils/database';

// ── Category Form ─────────────────────────────────────────────
function CategoryForm({ visible, onClose, editCat }) {
  const { str } = useLocalization();
  const { add, update } = useCategoryStore();
  const [name,  setName]  = useState(editCat?.name     ?? '');
  const [type,  setType]  = useState(editCat?.type     ?? 'outcome');
  const [icon,  setIcon]  = useState(editCat?.icon     ?? IconOptions[0]);
  const [color, setColor] = useState(editCat?.colorHex ?? ColorOptions[0]);

  const handleSave = async () => {
    if (!name.trim()) return;
    const cat = {
      id: editCat?.id ?? genId(),
      name: name.trim(), type, icon, colorHex: color,
      isDefault: editCat?.isDefault ?? false,
      createdAt: editCat?.createdAt ?? new Date().toISOString(),
    };
    editCat ? await update(cat) : await add(cat);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}><Text style={styles.cancelBtn}>{str('cancel')}</Text></TouchableOpacity>
        <Text style={styles.title}>{editCat ? str('edit') : str('newCategory')}</Text>
        <TouchableOpacity onPress={handleSave}><Text style={styles.saveBtn}>{str('save')}</Text></TouchableOpacity>
      </View>
      <ScrollView>
        {/* Preview */}
        <View style={styles.preview}>
          <View style={[styles.previewIcon, { backgroundColor: color + '30' }]}>
            <Icon name={icon} size={28} color={color} />
          </View>
          <Text style={styles.previewName}>{name || str('preview')}</Text>
        </View>

        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.label}>{str('categoryName')}</Text>
          <TextInput style={styles.nameInput} value={name} onChangeText={setName}
            placeholder={str('categoryName')} placeholderTextColor={Colors.textMuted} />
        </View>

        {/* Type */}
        <View style={styles.section}>
          <Text style={styles.label}>{str('categoryType')}</Text>
          <View style={styles.seg}>
            {['outcome','income','both'].map(t => (
              <TouchableOpacity key={t} style={[styles.segBtn, type === t && styles.segBtnOn]} onPress={() => setType(t)}>
                <Text style={[styles.segTxt, type === t && styles.segTxtOn]}>
                  {t === 'outcome' ? str('expense') : t === 'income' ? str('income') : str('both')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Icons */}
        <View style={styles.section}>
          <Text style={styles.label}>{str('iconPicker')}</Text>
          <View style={styles.iconGrid}>
            {IconOptions.map(ic => (
              <TouchableOpacity key={ic}
                style={[styles.iconOption, icon === ic && { backgroundColor: color + '30', borderColor: color, borderWidth: 2 }]}
                onPress={() => setIcon(ic)}>
                <Icon name={ic} size={22} color={icon === ic ? color : Colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Colors */}
        <View style={styles.section}>
          <Text style={styles.label}>{str('colorPicker')}</Text>
          <View style={styles.colorGrid}>
            {ColorOptions.map(c => (
              <TouchableOpacity key={c}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotOn]}
                onPress={() => setColor(c)} />
            ))}
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}

// ── Management List ───────────────────────────────────────────
export default function CategoryManagementView({ visible, onClose }) {
  const { str } = useLocalization();
  const { categories, remove } = useCategoryStore();
  const [filter,      setFilter]      = useState('all');
  const [formVisible, setFormVisible] = useState(false);
  const [editCat,     setEditCat]     = useState(null);

  const shown = categories.filter(c =>
    filter === 'all' || c.type === filter || (filter !== 'both' && c.type === 'both')
  );

  const handleDelete = async (cat) => {
    if (cat.isDefault) { Alert.alert('', str('cannotDeleteDefault')); return; }
    const count = await countTransactionsByCategory(cat.id);
    Alert.alert(str('confirmDelete'), `${count} ${str('affectedTx')}`, [
      { text: str('cancel'), style: 'cancel' },
      { text: str('delete'), style: 'destructive', onPress: () => remove(cat.id) },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}><Text style={styles.cancelBtn}>{str('cancel')}</Text></TouchableOpacity>
        <Text style={styles.title}>{str('categoryManagement')}</Text>
        <TouchableOpacity onPress={() => { setEditCat(null); setFormVisible(true); }}>
          <Icon name="add" size={24} color={Colors.primaryPurple} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {['all','income','outcome'].map(f => (
          <TouchableOpacity key={f}
            style={[styles.filterChip, filter === f && styles.filterChipOn]}
            onPress={() => setFilter(f)}>
            <Text style={[styles.filterTxt, filter === f && styles.filterTxtOn]}>{str(f)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={shown}
        keyExtractor={c => c.id}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.divider, marginHorizontal: 16 }} />}
        renderItem={({ item: cat }) => (
          <View style={styles.catRow}>
            <View style={[styles.catIcon, { backgroundColor: cat.colorHex + '30' }]}>
              <Icon name={cat.icon} size={20} color={cat.colorHex} />
            </View>
            <View style={styles.catInfo}>
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catType}>{cat.type}</Text>
            </View>
            {cat.isDefault && (
              <View style={styles.defBadge}><Text style={styles.defBadgeTxt}>{str('defaultBadge')}</Text></View>
            )}
            <TouchableOpacity onPress={() => { setEditCat(cat); setFormVisible(true); }} style={styles.iconBtn}>
              <Icon name="edit" size={18} color={Colors.primaryPurple} />
            </TouchableOpacity>
            {!cat.isDefault && (
              <TouchableOpacity onPress={() => handleDelete(cat)} style={styles.iconBtn}>
                <Icon name="delete" size={18} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <CategoryForm visible={formVisible} onClose={() => setFormVisible(false)} editCat={editCat} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cancelBtn:    { color: Colors.textSecondary, fontSize: 16 },
  title:        { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  saveBtn:      { color: Colors.primaryPurple, fontSize: 16, fontWeight: '600' },
  filterRow:    { flexDirection: 'row', padding: 12, gap: 8 },
  filterChip:   { paddingHorizontal: 16, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  filterChipOn: { backgroundColor: Colors.primaryPurple, borderColor: Colors.primaryPurple },
  filterTxt:    { color: Colors.textSecondary, fontSize: 13 },
  filterTxtOn:  { color: Colors.white },
  catRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  catIcon:      { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  catInfo:      { flex: 1 },
  catName:      { fontSize: 15, color: Colors.textPrimary },
  catType:      { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  defBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, backgroundColor: `${Colors.primaryPurple}20`, marginRight: 8 },
  defBadgeTxt:  { fontSize: 11, color: Colors.primaryPurple },
  iconBtn:      { padding: 6 },
  // Form
  preview:      { alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  previewIcon:  { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  previewName:  { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  section:      { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  label:        { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  nameInput:    { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.chip, padding: 10, color: Colors.textPrimary },
  seg:          { flexDirection: 'row', backgroundColor: Colors.divider, borderRadius: Radius.chip, overflow: 'hidden' },
  segBtn:       { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segBtnOn:     { backgroundColor: Colors.primaryPurple },
  segTxt:       { color: Colors.textSecondary, fontSize: 14 },
  segTxtOn:     { color: Colors.white, fontWeight: '600' },
  iconGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconOption:   { width: 46, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  colorGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot:     { width: 38, height: 38, borderRadius: 19 },
  colorDotOn:   { borderWidth: 3, borderColor: Colors.textPrimary },
});
