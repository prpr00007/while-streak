import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts, IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_700Bold } from '@expo-google-fonts/ibm-plex-mono';
import { VT323_400Regular } from '@expo-google-fonts/vt323';
import { fonts, useIsDark, useTheme } from '../src/theme';

// Hold the native splash (plain paper color) until fonts are ready, so the boot screen never renders unstyled.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const theme = useTheme();
  const dark = useIsDark();
  const [loaded, error] = useFonts({ IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_700Bold, VT323_400Regular });
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);
  if (!loaded && !error) return null;

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.ink,
          headerTitleStyle: { fontFamily: fonts.display, fontSize: 26 },
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="order" options={{ title: 'ORDER' }} />
        <Stack.Screen name="bug" options={{ title: 'BUG HUNT' }} />
        <Stack.Screen name="output" options={{ title: 'OUTPUT' }} />
        <Stack.Screen name="fill" options={{ title: 'FILL THE BLANK' }} />
        <Stack.Screen name="leaderboard" options={{ title: 'LEADERBOARD' }} />
        <Stack.Screen name="account" options={{ title: 'ACCOUNT', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
