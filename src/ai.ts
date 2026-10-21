// Computer opponents: they shop with the same rules as the player.
// Follows the Computer opponents section of SPEC.md.

import { GEAR_BY_ID, GOON_BY_ID, GOON_COST, MAX_COPIES, type GoonDef } from "./data.ts";
import { buyCoach, buyGear, buyGoon, goonStats, roll, sell, type OwnedGoon, type RunState } from "./shop.ts";

const tierRank = (def: GoonDef) => def.tier;
const START_KINDS = new Set(["weakenEnemyFront", "damageEnemyFront", "mutualDamageFront", "damageAllEnemies", "buffBehindPunch", "buffFrontToughness", "snipeWeakest", "toughnessPerTeammateBehind", "hookBackToFront", "lassoTopPuncher"]);
const GEAR_PREFERENCE = ["drink", "tape", "ice", "peptalk", "mouthguard"];

// Weakest goon in the lineup: lowest tier, then lowest total stats.
function weakestSlot(state: RunState): number {
  let best = -1;
  let bestScore = Infinity;
  state.lineup.forEach((g, i) => {
    if (!g) return;
    const s = goonStats(g);
    const score = tierRank(GOON_BY_ID[g.id]) * 100 + g.copies * 10 + s.punch + s.toughness;
    if (score < bestScore) { bestScore = score; best = i; }
  });
  return best;
}

// One shop phase for a computer team.
export function aiShop(state: RunState): void {
  let rolls = 0;

  // A coach as soon as one can be bought.
  if (state.coachOffered) buyCoach(state);

  for (let guard = 0; guard < 30 && state.pucks > 0; guard++) {
    let acted = false;

    if (state.pucks >= GOON_COST && state.goonOffers.length) {
      // 1. Copies of goons it already owns.
      const stackIndex = state.goonOffers.findIndex((o) => state.lineup.some((g) => g && g.id === o.id && g.copies < MAX_COPIES));
      if (stackIndex >= 0) {
        acted = buyGoon(state, stackIndex + 1).ok;
      } else {
        // 2. Otherwise the highest-tier goon on offer.
        const ranked = state.goonOffers
          .map((o, i) => ({ i, def: GOON_BY_ID[o.id] }))
          .sort((a, b) => tierRank(b.def) - tierRank(a.def) || (b.def.punch + b.def.toughness) - (a.def.punch + a.def.toughness));
        const pick = ranked[0];
        const empty = state.lineup.findIndex((g) => g === null);
        if (empty >= 0) {
          acted = buyGoon(state, pick.i + 1, empty + 1).ok;
        } else {
          // 3. Lineup full: swap out the weakest goon if the offer is a higher tier.
          const weak = weakestSlot(state);
          const weakGoon = state.lineup[weak]!;
          if (tierRank(pick.def) > tierRank(GOON_BY_ID[weakGoon.id]) && weakGoon.copies === 1) {
            sell(state, weak + 1);
            acted = buyGoon(state, pick.i + 1, weak + 1).ok;
          }
        }
      }
    }

    // 4. Leftover pucks go to gear, on the front goon.
    if (!acted && state.pucks >= 3 && state.gearOffers.length) {
      const order = state.gearOffers
        .map((o, i) => ({ i, rank: GEAR_PREFERENCE.indexOf(o.id) }))
        .sort((a, b) => a.rank - b.rank);
      const front = state.lineup.findIndex((g) => g !== null);
      if (front >= 0) {
        const choice = order[0];
        const target = GEAR_BY_ID[state.gearOffers[choice.i].id].target === "goon" ? front + 1 : undefined;
        acted = buyGear(state, choice.i + 1, target).ok;
      }
    }

    // 5. Nothing worth buying: reroll, up to twice a round.
    if (!acted) {
      if (rolls < 2 && state.pucks >= 4) { roll(state); rolls++; acted = true; }
      else break;
    }
  }

  arrangeLineup(state);
}

// Toughest goon in slot 1, start-of-fight goons right behind him, then the rest by punch.
export function arrangeLineup(state: RunState): void {
  const goons = state.lineup.filter((g): g is OwnedGoon => g !== null);
  if (!goons.length) return;
  const toughest = goons.reduce((a, b) => (goonStats(b).toughness > goonStats(a).toughness ? b : a));
  const rest = goons.filter((g) => g !== toughest).sort((a, b) => {
    const sa = START_KINDS.has(GOON_BY_ID[a.id].ability.kind) ? 1 : 0;
    const sb = START_KINDS.has(GOON_BY_ID[b.id].ability.kind) ? 1 : 0;
    return sb - sa || goonStats(b).punch - goonStats(a).punch;
  });
  const ordered = [toughest, ...rest];
  state.lineup = state.lineup.map((_, i) => ordered[i] ?? null);
}
