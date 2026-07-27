import { getPersonaForElo } from '../lib/coachPersona';
import { movePhase } from '../lib/gameAnalysis';
import { getPositionAwareTip } from '../lib/liveTips';

/**
 * A small persistent "coach thought bubble" shown above the board during coached
 * play - not a reaction to any specific move, just an ongoing thinking-process
 * tip that updates every couple of moves and as the game moves between phases.
 * Prefers something actually relevant to the current position (check, a piece
 * hanging) over the generic phase-based bank when there's something to flag.
 */
export function LiveCoachTip({ playerElo, plyCount, fen, studentColor }) {
  const persona = getPersonaForElo(playerElo);
  const moveNumber = Math.floor(plyCount / 2) + 1;
  const phase = movePhase(moveNumber);
  const seed = Math.floor(plyCount / 4);
  const tip = getPositionAwareTip({ fen, studentColor, tier: persona.id, phase, seed });

  return (
    <div className="mb-2 flex w-full max-w-[560px] items-start gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 shadow-lg">
      <span className="text-xl leading-none">{persona.avatar}</span>
      <div>
        <p className="text-xs font-bold text-slate-500">{persona.name} חושב:</p>
        <p className="text-sm text-slate-200">{tip}</p>
      </div>
    </div>
  );
}
