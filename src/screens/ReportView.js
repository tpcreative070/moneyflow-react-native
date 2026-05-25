// src/screens/ReportView.js
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  VictoryBar, VictoryChart, VictoryLine, VictoryPie,
  VictoryAxis, VictoryTheme,
} from 'victory-native';
import { Colors, Radius } from '../constants/theme';
import { useLocalization } from '../utils/localization';
import { useTransactionStore, useCurrencyStore } from '../context/store';
import { formatCompact } from '../utils/currency';

const W = Dimensions.get('window').width - 32;
const PERIODS     = ['week', 'month', 'year'];
const CHART_TYPES = ['bar', 'line', 'pie'];
const CHART_ICONS = { bar: 'bar-chart', line: 'show-chart', pie: 'pie-chart' };
const PIE_COLORS  = ['#6C63FF','#4ADE80','#F87171','#F59E0B','#06B6D4','#EC4899'];

export default function ReportView() {
  const { str } = useLocalization();
  const { transactions } = useTransactionStore();
  const { code } = useCurrencyStore();

  const [period,    setPeriod]    = useState('month');
  const [chartType, setChartType] = useState('bar');

  const now = new Date();

  const filtered = useMemo(() => transactions.filter(tx => {
    const d = new Date(tx.date);
    if (period === 'week')  { const s = new Date(now); s.setDate(now.getDate() - 7); return d >= s; }
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'year')  return d.getFullYear() === now.getFullYear();
    return true;
  }), [transactions, period]);

  const totalIncome  = useMemo(() => filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [filtered]);
  const totalOutcome = useMemo(() => filtered.filter(t => t.type === 'outcome').reduce((s, t) => s + t.amount, 0), [filtered]);
  const netBalance   = totalIncome - totalOutcome;
  const days         = period === 'week' ? 7 : period === 'month' ? 30 : 365;
  const avgDaily     = totalOutcome / (days || 1);

  const barData = useMemo(() => {
    const g = {};
    filtered.forEach(tx => {
      const d   = new Date(tx.date);
      const key = period === 'year'
        ? d.toLocaleString('default', { month: 'short' })
        : String(d.getDate());
      g[key] = g[key] ?? { income: 0, outcome: 0 };
      g[key][tx.type] += tx.amount;
    });
    return Object.entries(g).map(([x, v]) => ({ x, income: v.income, outcome: v.outcome }));
  }, [filtered, period]);

  const pieData = useMemo(() => {
    const g = {};
    filtered.filter(t => t.type === 'outcome').forEach(tx => {
      g[tx.categoryName] = (g[tx.categoryName] ?? 0) + tx.amount;
    });
    return Object.entries(g).map(([x, y]) => ({ x, y }));
  }, [filtered]);

  const catBreakdown = useMemo(() => {
    const g = {};
    filtered.forEach(tx => {
      g[tx.categoryId] = g[tx.categoryId] ?? { name: tx.categoryName, total: 0, count: 0 };
      g[tx.categoryId].total += tx.amount;
      g[tx.categoryId].count++;
    });
    return Object.values(g).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const tiles = [
    { label: str('netBalance'), value: netBalance,   color: netBalance >= 0 ? Colors.incomeGreen : Colors.outcomeRed },
    { label: str('income'),     value: totalIncome,  color: Colors.incomeGreen },
    { label: str('outcome'),    value: totalOutcome, color: Colors.outcomeRed },
    { label: str('avgDaily'),   value: avgDaily,     color: Colors.textSecondary },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Period tabs */}
      <View style={styles.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p} style={[styles.periodBtn, period === p && styles.periodBtnOn]} onPress={() => setPeriod(p)}>
            <Text style={[styles.periodTxt, period === p && styles.periodTxtOn]}>{str(p)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart type */}
      <View style={styles.chartTypeRow}>
        {CHART_TYPES.map(c => (
          <TouchableOpacity key={c} style={[styles.chartTypeBtn, chartType === c && styles.chartTypeBtnOn]} onPress={() => setChartType(c)}>
            <Icon name={CHART_ICONS[c]} size={20} color={chartType === c ? Colors.white : Colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary tiles */}
      <View style={styles.tilesGrid}>
        {tiles.map((t, i) => (
          <View key={i} style={styles.tile}>
            <Text style={styles.tileLabel}>{t.label}</Text>
            <Text style={[styles.tileValue, { color: t.color }]}>{formatCompact(t.value, code)}</Text>
          </View>
        ))}
      </View>

      {/* Chart */}
      <View style={styles.chartCard}>
        {chartType === 'bar' && barData.length > 0 && (
          <VictoryChart width={W} theme={VictoryTheme.material} domainPadding={10}>
            <VictoryAxis />
            <VictoryAxis dependentAxis />
            <VictoryBar data={barData.map(d => ({ x: d.x, y: d.income }))}  style={{ data: { fill: Colors.incomeGreen } }} />
            <VictoryBar data={barData.map(d => ({ x: d.x, y: d.outcome }))} style={{ data: { fill: Colors.outcomeRed } }} />
          </VictoryChart>
        )}
        {chartType === 'line' && barData.length > 0 && (
          <VictoryChart width={W} theme={VictoryTheme.material}>
            <VictoryAxis />
            <VictoryAxis dependentAxis />
            <VictoryLine data={barData.map(d => ({ x: d.x, y: d.income }))}  style={{ data: { stroke: Colors.incomeGreen } }} />
            <VictoryLine data={barData.map(d => ({ x: d.x, y: d.outcome }))} style={{ data: { stroke: Colors.outcomeRed } }} />
          </VictoryChart>
        )}
        {chartType === 'pie' && pieData.length > 0 && (
          <VictoryPie data={pieData} width={W} colorScale={PIE_COLORS}
            style={{ labels: { fontSize: 11 } }} />
        )}
        {barData.length === 0 && pieData.length === 0 && (
          <View style={styles.noData}><Text style={styles.noDataTxt}>No data for this period</Text></View>
        )}
      </View>

      {/* Category breakdown */}
      <Text style={styles.breakdownTitle}>{str('categoryBreakdown')}</Text>
      <View style={styles.breakdownCard}>
        {catBreakdown.length === 0 && <Text style={styles.noDataTxt}>No data</Text>}
        {catBreakdown.map((c, i) => (
          <View key={i} style={[styles.breakRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.divider }]}>
            <Text style={styles.breakName}>{c.name}</Text>
            <Text style={styles.breakCount}>{c.count} txns</Text>
            <Text style={styles.breakAmt}>{formatCompact(c.total, code)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  periodRow:      { flexDirection: 'row', margin: 16, backgroundColor: Colors.white, borderRadius: Radius.chip, overflow: 'hidden', elevation: 1 },
  periodBtn:      { flex: 1, paddingVertical: 10, alignItems: 'center' },
  periodBtnOn:    { backgroundColor: Colors.primaryPurple },
  periodTxt:      { color: Colors.textSecondary, fontSize: 14 },
  periodTxtOn:    { color: Colors.white, fontWeight: '600' },
  chartTypeRow:   { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  chartTypeBtn:   { padding: 10, borderRadius: Radius.chip, borderWidth: 1, borderColor: Colors.border },
  chartTypeBtnOn: { backgroundColor: Colors.primaryPurple, borderColor: Colors.primaryPurple },
  tilesGrid:      { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 10, marginBottom: 12 },
  tile:           { flex: 1, minWidth: '45%', backgroundColor: Colors.white, borderRadius: Radius.card, padding: 14, elevation: 1 },
  tileLabel:      { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  tileValue:      { fontSize: 18, fontWeight: '700' },
  chartCard:      { marginHorizontal: 16, backgroundColor: Colors.white, borderRadius: Radius.card, padding: 8, marginBottom: 16, elevation: 1, alignItems: 'center' },
  noData:         { height: 200, alignItems: 'center', justifyContent: 'center' },
  noDataTxt:      { color: Colors.textMuted },
  breakdownTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginHorizontal: 16, marginBottom: 8 },
  breakdownCard:  { marginHorizontal: 16, backgroundColor: Colors.white, borderRadius: Radius.card, marginBottom: 32, overflow: 'hidden', elevation: 1 },
  breakRow:       { flexDirection: 'row', alignItems: 'center', padding: 14 },
  breakName:      { flex: 1, fontSize: 14, color: Colors.textPrimary },
  breakCount:     { fontSize: 12, color: Colors.textSecondary, marginRight: 12 },
  breakAmt:       { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
});
