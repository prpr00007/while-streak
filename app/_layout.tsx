import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_700Bold } from '@expo-google-fonts/ibm-plex-mono';
import { VT323_400Regular } from '@expo-google-fonts/vt323';
import { fonts, useIsDark, useTheme } from '../src/theme';

export default function RootLayout() {
  const theme = useTheme();
  const dark = useIsDark();
  const [loaded] = useFonts({ IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_700Bold, VT323_400Regular });
  if (!loaded) return null;

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
        <Stack.Screen name="leaderboard" options={{ title: 'LEADERBOARD' }} />
        <Stack.Screen name="account" options={{ title: 'ACCOUNT', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
