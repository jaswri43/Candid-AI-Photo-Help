import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import StyleSummaryCard from './src/components/StyleSummaryCard';
import HomeScreen from './src/screens/HomeScreen';
import ReferencePhotosScreen from './src/screens/ReferencePhotosScreen';

// TODO: replace with real profile creation UI once that's built.
// Hardcoded to the single profile row that exists for now.
const PROFILE_ID = '03b30593-5e35-4ec8-b834-1dfd2b7997ab';

export default function App() {
  const [screen, setScreen] = useState<'home' | 'referencePhotos'>('home');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.toggle}
          onPress={() => setScreen(screen === 'home' ? 'referencePhotos' : 'home')}
        >
          <Text style={styles.toggleText}>
            {screen === 'home' ? 'Reference Photos' : 'Home'}
          </Text>
        </TouchableOpacity>

        {screen === 'home' ? (
          <>
            <View style={styles.summaryCardWrapper}>
              <StyleSummaryCard profileId={PROFILE_ID} />
            </View>
            <HomeScreen profileId={PROFILE_ID} />
          </>
        ) : (
          <ReferencePhotosScreen />
        )}
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
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
  summaryCardWrapper: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
});
