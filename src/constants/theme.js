// src/constants/theme.js

export const Colors = {
  primaryPurple: '#6C63FF',
  darkPurple:    '#3D3494',
  incomeGreen:   '#4ADE80',
  outcomeRed:    '#F87171',
  warningOrange: '#F97316',
  white:         '#FFFFFF',
  black:         '#000000',
  background:    '#F5F5F5',
  cardBg:        '#FFFFFF',
  textPrimary:   '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted:     '#9CA3AF',
  border:        '#E5E7EB',
  divider:       '#F3F4F6',
  success:       '#22C55E',
  error:         '#EF4444',
};

export const Typography = {
  appName:      { fontSize: 36, fontWeight: 'bold' },
  balanceHero:  { fontSize: 34, fontWeight: 'bold' },
  amountLarge:  { fontSize: 38, fontWeight: 'bold' },
  amountList:   { fontSize: 15, fontWeight: 'bold' },
  amountInput:  { fontSize: 28, fontWeight: 'bold' },
  sectionTitle: { fontSize: 15, fontWeight: '500' },
  body:         { fontSize: 15 },
  caption:      { fontSize: 12 },
  caption2:     { fontSize: 10 },
};

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40,
};

export const Radius = {
  chip:     10,
  button:   14,
  card:     16,
  heroCard: 24,
  full:     9999,
};

export const Currencies = [
  { code: 'VND', symbol: '₫',  displayName: 'Vietnamese Dong',   flag: '🇻🇳', suffix: true,  decimals: 0 },
  { code: 'USD', symbol: '$',  displayName: 'US Dollar',          flag: '🇺🇸', suffix: false, decimals: 2 },
  { code: 'EUR', symbol: '€',  displayName: 'Euro',               flag: '🇪🇺', suffix: false, decimals: 2 },
  { code: 'JPY', symbol: '¥',  displayName: 'Japanese Yen',       flag: '🇯🇵', suffix: false, decimals: 0 },
  { code: 'SGD', symbol: 'S$', displayName: 'Singapore Dollar',   flag: '🇸🇬', suffix: false, decimals: 2 },
  { code: 'GBP', symbol: '£',  displayName: 'British Pound',      flag: '🇬🇧', suffix: false, decimals: 2 },
  { code: 'KRW', symbol: '₩',  displayName: 'Korean Won',         flag: '🇰🇷', suffix: false, decimals: 0 },
  { code: 'CNY', symbol: '¥',  displayName: 'Chinese Yuan',       flag: '🇨🇳', suffix: false, decimals: 2 },
  { code: 'THB', symbol: '฿',  displayName: 'Thai Baht',          flag: '🇹🇭', suffix: false, decimals: 2 },
  { code: 'AUD', symbol: 'A$', displayName: 'Australian Dollar',  flag: '🇦🇺', suffix: false, decimals: 2 },
];

export const DefaultCategories = [
  { id: 'cat_food',       name: 'Food & Dining',    type: 'outcome', icon: 'restaurant',            colorHex: '#FF6B6B', isDefault: true },
  { id: 'cat_transport',  name: 'Transport',         type: 'outcome', icon: 'directions-car',        colorHex: '#4ECDC4', isDefault: true },
  { id: 'cat_shopping',   name: 'Shopping',          type: 'outcome', icon: 'shopping-bag',          colorHex: '#45B7D1', isDefault: true },
  { id: 'cat_health',     name: 'Health',            type: 'outcome', icon: 'local-hospital',        colorHex: '#96CEB4', isDefault: true },
  { id: 'cat_entertain',  name: 'Entertainment',     type: 'outcome', icon: 'movie',                 colorHex: '#FFEAA7', isDefault: true },
  { id: 'cat_bills',      name: 'Bills & Utilities', type: 'outcome', icon: 'receipt',               colorHex: '#DDA0DD', isDefault: true },
  { id: 'cat_education',  name: 'Education',         type: 'outcome', icon: 'school',                colorHex: '#98D8C8', isDefault: true },
  { id: 'cat_salary',     name: 'Salary',            type: 'income',  icon: 'account-balance-wallet',colorHex: '#6C63FF', isDefault: true },
  { id: 'cat_freelance',  name: 'Freelance',         type: 'income',  icon: 'laptop',                colorHex: '#4ADE80', isDefault: true },
  { id: 'cat_investment', name: 'Investment',        type: 'income',  icon: 'trending-up',           colorHex: '#F59E0B', isDefault: true },
  { id: 'cat_gift',       name: 'Gift',              type: 'both',    icon: 'card-giftcard',         colorHex: '#EC4899', isDefault: true },
  { id: 'cat_other',      name: 'Other',             type: 'both',    icon: 'more-horiz',            colorHex: '#9CA3AF', isDefault: true },
];

export const IconOptions = [
  'restaurant','directions-car','shopping-bag','local-hospital','movie',
  'receipt','school','account-balance-wallet','laptop','trending-up',
  'card-giftcard','more-horiz','home','flight','fitness-center',
  'pets','music-note','sports-esports','spa','child-care',
  'local-grocery-store','local-gas-station','phone','wifi','build',
  'attach-money','savings','credit-card','local-atm','business',
];

export const ColorOptions = [
  '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7',
  '#DDA0DD','#98D8C8','#6C63FF','#4ADE80','#F59E0B',
  '#EC4899','#9CA3AF','#F97316','#06B6D4','#8B5CF6',
];
