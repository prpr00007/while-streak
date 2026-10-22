import { Text } from 'react-native';
import { fonts, Palette } from '../theme';

const KEYWORDS = new Set(['def', 'for', 'in', 'if', 'elif', 'else', 'while', 'return', 'not', 'and', 'or', 'None', 'True', 'False']);
const BUILTINS = new Set(['len', 'max', 'min', 'range', 'enumerate', 'str', 'int', 'sorted', 'print']);

// `blank` replaces a `___` token with a highlighted value (Fill the Blank).
type Blank = { text: string; color: string; bg: string };
type Props = { text: string; indent: number; guides?: boolean; theme: Palette; size?: number; blank?: Blank };

export default function CodeLine({ text, indent, guides, theme, size = 13, blank }: Props) {
  const parts = text.split(/(\b[A-Za-z_]\w*\b|\b\d+\b)/);
  let afterDef = false;
  return (
    <Text style={{ fontFamily: fonts.mono, fontSize: size, lineHeight: size * 1.6, color: theme.ink }}>
      <Text style={{ color: guides ? theme.line : 'transparent' }}>{(guides ? '·   ' : '    ').repeat(indent)}</Text>
      {parts.map((part, i) => {
        if (!part) return null;
        if (blank && part === '___') {
          return (
            <Text key={i} style={{ color: blank.color, backgroundColor: blank.bg, fontFamily: fonts.monoBold }}>
              {` ${blank.text} `}
            </Text>
          );
        }
        let style: object | undefined;
        if (KEYWORDS.has(part)) style = { color: theme.kw, fontFamily: fonts.monoBold };
        else if (afterDef || BUILTINS.has(part)) style = { color: theme.fn };
        else if (/^\d+$/.test(part)) style = { color: theme.num };
        if (/\w/.test(part)) afterDef = part === 'def';
        return <Text key={i} style={style}>{part}</Text>;
      })}
    </Text>
  );
}
