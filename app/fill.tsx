import ChoiceGameScreen from '../src/components/ChoiceGameScreen';
import { getTodaysFillPuzzle } from '../src/lib/puzzles';

export default function FillScreen() {
  return <ChoiceGameScreen format="fill" formatLabel="FILL" load={getTodaysFillPuzzle} />;
}
