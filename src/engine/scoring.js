/* HEXploit — scoring.js
 * score_mob = base + objective_bonus + turn_bonus + hp_bonus
 * final     = soma(score_mob) × multiplicador da run (objetivos concluídos)
 */
(function (G) {
  'use strict';
  const HEX = (G.HEX = G.HEX || {});
  const S = HEX.CONFIG.SCORE;
  const clamp = HEX.util.clamp;

  const Scoring = {
    /** result = state.result de uma batalha vencida; mob = definição do inimigo. */
    scoreBattle(result, mob) {
      const base = S.base;
      const objectiveBonus = result.objectiveDone ? S.objective : 0;
      const turnBonus = clamp(S.turnMax - S.turnPenalty * Math.max(0, result.turns - mob.par), 0, S.turnMax);
      const hpBonus = Math.round(S.hpMax * clamp(result.hpRatio, 0, 1));
      return {
        mobId: mob.id, name: mob.name, turns: result.turns, par: mob.par,
        objectiveDone: !!result.objectiveDone,
        base, objectiveBonus, turnBonus, hpBonus,
        total: base + objectiveBonus + turnBonus + hpBonus,
      };
    },
    multiplier(objectivesDone) {
      return S.multipliers[clamp(objectivesDone, 0, S.multipliers.length - 1)];
    },
    finalScore(entries) {
      const sum = entries.reduce((s, e) => s + e.total, 0);
      const done = entries.filter((e) => e.objectiveDone).length;
      const mult = Scoring.multiplier(done);
      return { sum, objectivesDone: done, multiplier: mult, final: Math.round(sum * mult) };
    },
  };

  HEX.Scoring = Scoring;
})(typeof globalThis !== 'undefined' ? globalThis : window);
