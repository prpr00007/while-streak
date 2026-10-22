import { useColorScheme } from 'react-native';

// Light is printed-manual paper; dark is an amber terminal.
const light = {
  bg: '#EFE8D8', surface: '#F8F3E7', slot: '#E6DDC9', ink: '#1C1A17', muted: '#6F6658',
  line: '#B9AE99', shadow: '#1C1A17', accent: '#D4561E', accentInk: '#FFF8EC',
  ok: '#3B7448', okBg: '#D5E2C6', bad: '#B0392C', badBg: '#F1D3C7',
  kw: '#2C4C9E', fn: '#9C4318', num: '#74398A',
};
const dark: typeof light = {
  bg: '#15130F', surface: '#1D1A15', slot: '#25211A', ink: '#EEE3C9', muted: '#9C907A',
  line: '#4B4436', shadow: '#6B4A22', accent: '#F08A3C', accentInk: '#15130F',
  ok: '#86B884', okBg: '#213120', bad: '#E3705C', badBg: '#3A1F19',
  kw: '#93ABE6', fn: '#E8A562', num: '#C89CD5',
};

export type Palette = typeof light;

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}

export const fonts = {
  display: 'VT323_400Regular',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_700Bold',
};

// Hard offset shadow, no blur, like a print misregistration.
export const hardShadow = (t: Palette, d = 3) => ({ boxShadow: `${d}px ${d}px 0px ${t.shadow}` });
