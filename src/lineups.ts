// Helpers for building lineups by hand or at random.

import { GOONS, LINEUP_SLOTS, type GoonDef } from "./data.ts";
import { makeUnit, type TeamInput } from "./engine.ts";
import type { Rng } from "./rng.ts";

// Goon pools that match the shop unlocks by round.
export const POOLS: Record<string, { label: string; goons: GoonDef[] }> = {
  r1: { label: "Rounds 1-2 (tier 1)", goons: GOONS.filter((g) => g.tier === 1) },
  r3: { label: "Rounds 3-4 (tiers 1-2)", goons: GOONS.filter((g) => g.tier === 1 || g.tier === 2) },
  r5: { label: "Rounds 5-6 (tiers 1-3)", goons: GOONS.filter((g) => g.tier !== "goalie") },
  r7: { label: "Round 7+ (all goons)", goons: GOONS },
};

// Parse "larry,tommy,moose" into a team. "larry*3" means three copies stacked (level 2).
export function teamFromList(name: string, list: string, coaches = 0): TeamInput {
  const goons = list.split(",").map((s) => s.trim()).filter(Boolean).map((entry) => {
    const [id, copies] = entry.split("*");
    return makeUnit(id.toLowerCase(), copies ? Number(copies) : 1);
  });
  if (goons.length > LINEUP_SLOTS) throw new Error(`A lineup has at most ${LINEUP_SLOTS} goons`);
  return { name, goons, coaches };
}

export function randomTeam(name: string, pool: GoonDef[], rng: Rng, size = LINEUP_SLOTS, coaches = 0): TeamInput {
  const goons = Array.from({ length: size }, () => makeUnit(rng.pick(pool).id));
  return { name, goons, coaches };
}
