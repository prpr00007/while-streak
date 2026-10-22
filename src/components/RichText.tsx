import { Text, TextStyle } from 'react-native';
import { fonts, Palette } from '../theme';

// Renders `backtick` segments as inline code.
export default function RichText({ text, theme, style }: { text: string; theme: Palette; style?: TextStyle }) {
  return (
    <Text style={style}>
      {text.split('`').map((seg, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={{ fontFamily: fonts.mono, fontSize: (style?.fontSize ?? 16) * 0.88, color: theme.fn }}>
            {seg}
          </Text>
        ) : (
          <Text key={i}>{seg}</Text>
        ),
      )}
    </Text>
  );
}
