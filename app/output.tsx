import ChoiceGameScreen from '../src/components/ChoiceGameScreen';
import { getTodaysOutputPuzzle } from '../src/lib/puzzles';

export default function OutputScreen() {
  return <ChoiceGameScreen format="output" formatLabel="OUTPUT" load={getTodaysOutputPuzzle} />;
}
