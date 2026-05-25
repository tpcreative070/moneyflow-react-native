/**
 * MoneyFlow — Root Component
 */

import React from 'react';
import { AppRegistry } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LocalizationProvider } from './src/utils/localization';
import AppNavigator from './src/navigation/AppNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <LocalizationProvider>
        <AppNavigator />
      </LocalizationProvider>
    </SafeAreaProvider>
  );
}

AppRegistry.registerComponent('moneyflow', () => App);

export default App;
