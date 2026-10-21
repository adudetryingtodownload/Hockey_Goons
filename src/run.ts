// A full run: the player's team against a different computer team every round.
// Each opponent is built by a computer player that has shopped through every round so far,
// so it is always the right strength for the round, and every round brings a new matchup.

import { GOON_BY_ID, STARTING_PUCKS } from "./data.ts";
import { makeRng } from "./rng.ts";
import { aiShop } from "./ai.ts";
import { endShopPhase, fightRound, newRun, refreshOffers, toTeam, type RoundOutcome, type RunState } from "./shop.ts";

export type Run = { player: RunState; seed: number };

export function startRun(seed: number, playerName = "You"): Run {
  return { player: newRun(playerName, seed), seed };
}

// A computer team that has shopped for `rounds` rounds.
export function buildOpponent(seed: number, rounds: number, name: string): RunState {
  const opp = newRun(name, seed);
  for (let r = 1; r <= rounds; r++) {
    if (r > 1) {
      opp.round = r;
      opp.pucks = STARTING_PUCKS;
      refreshOffers(opp);
      for (const g of opp.lineup) if (g) g.mouthguard = false;
      opp.pepTalk = false;
    }
    aiShop(opp);
    endShopPhase(opp);
  }
  return opp;
}

// Ends the player's shop phase, builds this round's opponent, then fights.
// The championship opponent gets 2 extra rounds of shopping.
export function playRound(run: Run, verbose: boolean): RoundOutcome & { notes: string[]; opponent: RunState } {
  const notes = endShopPhase(run.player);
  const p = run.player;
  const opponentSeed = (run.seed * 31 + p.round * 7919 + 17) >>> 0;
  const opponent = p.championship
    ? buildOpponent(opponentSeed, p.round + 2, "Champions")
    : buildOpponent(opponentSeed, p.round, "Rivals");
  const outcome = fightRound(p, toTeam(opponent), verbose);
  return { ...outcome, notes, opponent };
}

// ---------- Saving ----------
// A run is plain data except the random number generator, which is saved as its internal state.
export function saveRun(run: Run): string {
  const { rng, ...rest } = run.player;
  return JSON.stringify({ v: 1, seed: run.seed, rngState: rng.state(), player: rest });
}

// Returns null when the save is missing, from an older format, or names a goon that no longer exists.
export function loadRun(text: string | null): Run | null {
  if (!text) return null;
  try {
    const data = JSON.parse(text);
    if (data?.v !== 1 || !data.player) return null;
    const player = { ...data.player, rng: makeRng(data.rngState >>> 0) } as RunState;
    const ids = [...player.lineup.filter(Boolean).map((g) => g!.id), ...player.goonOffers.map((o) => o.id)];
    if (ids.some((id) => !GOON_BY_ID[id])) return null;
    if (player.over) return null;
    return { player, seed: data.seed >>> 0 };
  } catch {
    return null;
  }
}
