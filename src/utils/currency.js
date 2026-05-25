// src/utils/currency.js
import { Currencies } from '../constants/theme';

export const getCurrency = (code) => Currencies.find(c => c.code === code) ?? Currencies[0];

export function formatAmount(amount, code) {
  const cur = getCurrency(code);
  const val = Math.abs(amount);
  const formatted = val.toLocaleString(undefined, {
    minimumFractionDigits: cur.decimals,
    maximumFractionDigits: cur.decimals,
  });
  return cur.suffix ? `${formatted} ${cur.symbol}` : `${cur.symbol}${formatted}`;
}

export function formatCompact(amount, code) {
  const cur = getCurrency(code);
  const val = Math.abs(amount);
  let compact;
  if (val >= 1_000_000_000) compact = `${(val / 1_000_000_000).toFixed(1)}B`;
  else if (val >= 1_000_000)  compact = `${(val / 1_000_000).toFixed(1)}M`;
  else if (val >= 1_000)      compact = `${(val / 1_000).toFixed(1)}K`;
  else                         compact = String(Math.round(val));
  return cur.suffix ? `${compact}${cur.symbol}` : `${cur.symbol}${compact}`;
}
