import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors, fontSize, fontWeight } from './src/constants/theme';
import CameraScreen from './src/screens/CameraScreen';
import HomeScreen from './src/screens/HomeScreen';
import ReferencePhotosScreen from './src/screens/ReferencePhotosScreen';
import RatingScreen from './src/screens/RatingScreen';

// TODO: replace with real profile creation UI once that's built.
// Hardcoded to the single profile row that exists for now.
const PROFILE_ID = '03b30593-5e35-4ec8-b834-1dfd2b7997ab';

const Tab = createBottomTabNavigator();

function HomeTab() {
  return <HomeScreen profileId={PROFILE_ID} />;
}

function ReferencePhotosTab() {
  return <ReferencePhotosScreen profileId={PROFILE_ID} />;
}

function RatingTab() {
  return <RatingScreen profileId={PROFILE_ID} />;
}

function CameraTab() {
  return <CameraScreen profileId={PROFILE_ID} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarStyle: {
              backgroundColor: colors.background,
              borderTopColor: colors.surface,
            },
            tabBarLabelStyle: {
              fontSize: fontSize.label,
              fontWeight: fontWeight.medium,
            },
          }}
        >
          <Tab.Screen name="Home" component={HomeTab} />
          <Tab.Screen
            name="ReferencePhotos"
            component={ReferencePhotosTab}
            options={{ tabBarLabel: 'Reference Photos' }}
          />
          <Tab.Screen
            name="RatePhotos"
            component={RatingTab}
            options={{ tabBarLabel: 'Rate Photos' }}
          />
          <Tab.Screen name="Camera" component={CameraTab} />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
