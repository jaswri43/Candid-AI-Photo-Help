import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import ReferencePhotosScreen from './src/screens/ReferencePhotosScreen';

export default function App() {
  const [screen, setScreen] = useState<'home' | 'referencePhotos'>('home');

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setScreen(screen === 'home' ? 'referencePhotos' : 'home')}
      >
        <Text style={styles.toggleText}>
          {screen === 'home' ? 'Reference Photos' : 'Home'}
        </Text>
      </TouchableOpacity>

      {screen === 'home' ? <HomeScreen /> : <ReferencePhotosScreen />}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  toggle: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  toggleText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
});
