import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import StyleSummaryCard from './src/components/StyleSummaryCard';
import CameraScreen from './src/screens/CameraScreen';
import HomeScreen from './src/screens/HomeScreen';
import ReferencePhotosScreen from './src/screens/ReferencePhotosScreen';
import RatingScreen from './src/screens/RatingScreen';

// TODO: replace with real profile creation UI once that's built.
// Hardcoded to the single profile row that exists for now.
const PROFILE_ID = '03b30593-5e35-4ec8-b834-1dfd2b7997ab';

type Screen = 'home' | 'referencePhotos' | 'rating' | 'camera';

const NEXT_SCREEN: Record<Screen, Screen> = {
  home: 'referencePhotos',
  referencePhotos: 'rating',
  rating: 'camera',
  camera: 'home',
};

const TOGGLE_LABEL: Record<Screen, string> = {
  home: 'Reference Photos',
  referencePhotos: 'Rate Photos',
  rating: 'Camera',
  camera: 'Home',
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.toggle}
          onPress={() => setScreen(NEXT_SCREEN[screen])}
        >
          <Text style={styles.toggleText}>{TOGGLE_LABEL[screen]}</Text>
        </TouchableOpacity>

        {screen === 'home' && (
          <>
            <View style={styles.summaryCardWrapper}>
              <StyleSummaryCard profileId={PROFILE_ID} />
            </View>
            <HomeScreen profileId={PROFILE_ID} />
          </>
        )}
        {screen === 'referencePhotos' && <ReferencePhotosScreen />}
        {screen === 'rating' && <RatingScreen profileId={PROFILE_ID} />}
        {screen === 'camera' && <CameraScreen profileId={PROFILE_ID} />}
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
