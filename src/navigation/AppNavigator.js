// src/navigation/AppNavigator.js
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../constants/theme';
import { useLocalization } from '../utils/localization';
import {
  useAuthStore, useCurrencyStore, useTransactionStore,
  useCategoryStore, useBudgetStore,
} from '../context/store';

import AuthScreen     from '../screens/AuthScreen';
import MainView       from '../screens/MainView';
import ReportView     from '../screens/ReportView';
import SettingsView   from '../screens/SettingsView';
import OfflineBanner  from '../components/OfflineBanner';

const Tab = createBottomTabNavigator();

function MainTabs() {
  const { str } = useLocalization();
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor:   Colors.primaryPurple,
          tabBarInactiveTintColor: Colors.textMuted,
          headerStyle:      { backgroundColor: Colors.white },
          headerTitleStyle: { color: Colors.darkPurple, fontWeight: '700' },
        }}
      >
        <Tab.Screen name="Main" component={MainView}
          options={{ title: 'MoneyFlow', tabBarLabel: str('income'),
            tabBarIcon: ({ color, size }) => <Icon name="list-alt" size={size} color={color} /> }} />
        <Tab.Screen name="Reports" component={ReportView}
          options={{ title: str('reports'), tabBarLabel: str('reports'),
            tabBarIcon: ({ color, size }) => <Icon name="bar-chart" size={size} color={color} /> }} />
        <Tab.Screen name="Settings" component={SettingsView}
          options={{ title: str('settings'), tabBarLabel: str('settings'),
            tabBarIcon: ({ color, size }) => <Icon name="settings" size={size} color={color} /> }} />
      </Tab.Navigator>
      <OfflineBanner />
    </View>
  );
}

export default function AppNavigator() {
  const { user, loading }        = useAuthStore();
  const { init: initCurrency }   = useCurrencyStore();
  const { load: loadTx }         = useTransactionStore();
  const { load: loadCats }       = useCategoryStore();
  const { load: loadBudget }     = useBudgetStore();

  useEffect(() => { initCurrency(); }, []);
  useEffect(() => {
    if (user) { loadTx(); loadCats(); loadBudget(); }
  }, [user]);

  if (loading) return null;
  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <AuthScreen />}
    </NavigationContainer>
  );
}
