// The shop and run loop: pucks, offers, buying, stacking, selling, gear, coaches, wins and losses.
// Follows the Run structure, Shop and pucks, Lineup, Leveling and gear, and Coaches sections of SPEC.md.

import {
  COACH_COST, COACH_FROM_ROUND, GEAR, GEAR_BY_ID, GEAR_COST, GOON_BY_ID, GOON_COST, GOONS, LINEUP_SLOTS,
  LOSSES_TO_END, MAX_COACHES, MAX_COPIES, ROLL_COST, STARTING_PUCKS, WINS_TO_CHAMPIONSHIP, shopSize,
} from "./data.ts";
import { levelForCopies, runFight, type FightResult, type TeamInput, type UnitInput } from "./engine.ts";
import { makeRng, type Rng } from "./rng.ts";

export type OwnedGoon = {
  id: string;
  copies: number;
  bonusPunch: number; // permanent buffs from gear and abilities
  bonusToughness: number;
  mouthguard: boolean; // lasts for the next fight only
};

export type Offer = { id: string; frozen: boolean };

export type RunState = {
  name: string;
  rng: Rng;
  round: number;
  pucks: number;
  wins: number;
  losses: number;
  lineup: (OwnedGoon | null)[]; // 5 slots, index 0 = slot 1
  coaches: number;
  goonOffers: Offer[];
  gearOffers: Offer[];
  coachOffered: boolean;
  pepTalk: boolean; // +1 punch to the whole lineup for the next fight
  championship: boolean; // true when the next fight is the championship
  over: boolean;
  champion: boolean;
  payday?: number; // extra pucks this shop phase started with (Greedy Glen)
};

export type ActionResult = { ok: boolean; message: string };
const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });

// ---------- Stats ----------

export function goonStats(g: OwnedGoon): { punch: number; toughness: number; level: number } {
  const def = GOON_BY_ID[g.id];
  const extra = g.copies - 1;
  return { punch: def.punch + extra + g.bonusPunch, toughness: def.toughness + extra + g.bonusToughness, level: levelForCopies(g.copies) };
}

export function describeGoon(g: OwnedGoon): string {
  const s = goonStats(g);
  const name = GOON_BY_ID[g.id].name;
  return `${name} ${s.punch}/${s.toughness} L${s.level}${g.copies > 1 ? ` (${g.copies} copies)` : ""}${g.mouthguard ? " [mouthguard]" : ""}`;
}

// ---------- Run setup and offers ----------

export function newRun(name: string, seed: number): RunState {
  const state: RunState = {
    name, rng: makeRng(seed), round: 1, pucks: STARTING_PUCKS, wins: 0, losses: 0,
    lineup: Array(LINEUP_SLOTS).fill(null), coaches: 0,
    goonOffers: [], gearOffers: [], coachOffered: false, pepTalk: false,
    championship: false, over: false, champion: false,
  };
  refreshOffers(state);
  return state;
}

// Replace every unfrozen offer. Frozen offers stay put.
export function refreshOffers(state: RunState): void {
  const size = shopSize(state.round);
  // Every unlocked tier is equally likely, however many goons it holds; then a goon from that tier.
  const byTier = size.tiers.map((t) => GOONS.filter((g) => g.tier === t)).filter((list) => list.length);
  const rollGoon = () => state.rng.pick(state.rng.pick(byTier)).id;
  const frozenGoons = state.goonOffers.filter((o) => o.frozen).slice(0, size.goons);
  const frozenGear = state.gearOffers.filter((o) => o.frozen).slice(0, size.gear);
  state.goonOffers = [...frozenGoons];
  while (state.goonOffers.length < size.goons) state.goonOffers.push({ id: rollGoon(), frozen: false });
  state.gearOffers = [...frozenGear];
  while (state.gearOffers.length < size.gear) state.gearOffers.push({ id: state.rng.pick(GEAR).id, frozen: false });
  state.coachOffered = state.round >= COACH_FROM_ROUND && state.coaches < MAX_COACHES;
}

// ---------- Shop actions ----------

const slotOk = (slot: number) => Number.isInteger(slot) && slot >= 1 && slot <= LINEUP_SLOTS;

// Put a goon into slot `index` (0-based). If that slot is taken, the goons there slide toward the
// nearest empty slot: back toward slot 5 if there's room behind, otherwise forward. False if the lineup is full.
function insertAt(state: RunState, index: number, goon: OwnedGoon): boolean {
  if (!state.lineup[index]) { state.lineup[index] = goon; return true; }
  let empty = -1;
  for (let i = index + 1; i < LINEUP_SLOTS; i++) if (!state.lineup[i]) { empty = i; break; }
  if (empty >= 0) {
    for (let i = empty; i > index; i--) state.lineup[i] = state.lineup[i - 1];
  } else {
    for (let i = index - 1; i >= 0; i--) if (!state.lineup[i]) { empty = i; break; }
    if (empty < 0) return false;
    for (let i = empty; i < index; i++) state.lineup[i] = state.lineup[i + 1];
  }
  state.lineup[index] = goon;
  return true;
}

// Buy goon offer N (1-based). With no slot: stacks onto a matching goon if you have one, else takes the first empty slot.
export function buyGoon(state: RunState, offerNumber: number, slot?: number): ActionResult {
  const offer = state.goonOffers[offerNumber - 1];
  if (!offer) return fail(`There's no goon offer ${offerNumber}.`);
  if (state.pucks < GOON_COST) return fail(`Not enough pucks: a goon costs ${GOON_COST}.`);
  const name = GOON_BY_ID[offer.id].name;

  let index: number;
  if (slot === undefined) {
    const match = state.lineup.findIndex((g) => g && g.id === offer.id && g.copies < MAX_COPIES);
    index = match >= 0 ? match : state.lineup.findIndex((g) => g === null);
    if (index < 0) return fail("Your lineup is full. Sell a goon first, or stack onto a matching one.");
  } else {
    if (!slotOk(slot)) return fail(`Slots go from 1 to ${LINEUP_SLOTS}.`);
    index = slot - 1;
  }

  const current = state.lineup[index];
  if (current && current.id !== offer.id) {
    // A different goon is there: slide the lineup to make room.
    const fresh: OwnedGoon = { id: offer.id, copies: 1, bonusPunch: 0, bonusToughness: 0, mouthguard: false };
    if (!insertAt(state, index, fresh)) return fail("Your lineup is full. Sell a goon first, or stack onto a matching one.");
    state.pucks -= GOON_COST;
    state.goonOffers.splice(offerNumber - 1, 1);
    return ok(`Signed ${name} into slot ${index + 1}. The lineup slid over to make room.`);
  }
  if (current && current.copies >= MAX_COPIES) return fail(`${name} is already maxed out at ${MAX_COPIES} copies.`);

  state.pucks -= GOON_COST;
  state.goonOffers.splice(offerNumber - 1, 1);
  if (current) {
    const before = levelForCopies(current.copies);
    current.copies++;
    const after = levelForCopies(current.copies);
    return ok(`Stacked ${name} in slot ${index + 1}: ${describeGoon(current)}${after > before ? ` — level ${after}!` : ""}`);
  }
  state.lineup[index] = { id: offer.id, copies: 1, bonusPunch: 0, bonusToughness: 0, mouthguard: false };
  return ok(`Signed ${name} into slot ${index + 1}.`);
}

export function buyGear(state: RunState, offerNumber: number, slot?: number): ActionResult {
  const offer = state.gearOffers[offerNumber - 1];
  if (!offer) return fail(`There's no gear offer ${offerNumber}.`);
  if (state.pucks < GEAR_COST) return fail(`Not enough pucks: gear costs ${GEAR_COST}.`);
  const gear = GEAR_BY_ID[offer.id];
  let target: OwnedGoon | null = null;
  if (gear.target === "goon") {
    if (slot === undefined || !slotOk(slot)) return fail(`Say which slot gets the ${gear.name}, e.g. "gear ${offerNumber} 1".`);
    target = state.lineup[slot - 1];
    if (!target) return fail(`Slot ${slot} is empty.`);
  }
  state.pucks -= GEAR_COST;
  state.gearOffers.splice(offerNumber - 1, 1);
  if (gear.id === "tape") target!.bonusPunch += 1;
  if (gear.id === "ice") target!.bonusToughness += 1;
  if (gear.id === "drink") { target!.bonusPunch += 1; target!.bonusToughness += 1; }
  if (gear.id === "mouthguard") target!.mouthguard = true;
  if (gear.id === "peptalk") state.pepTalk = true;
  return ok(target ? `${gear.name} on ${describeGoon(target)}.` : `${gear.name}: the whole lineup gets +1 punch next fight.`);
}

export function buyCoach(state: RunState): ActionResult {
  if (!state.coachOffered) {
    return fail(state.round < COACH_FROM_ROUND ? `Coaches show up from round ${COACH_FROM_ROUND}.` : "No coach on offer right now.");
  }
  if (state.coaches >= MAX_COACHES) return fail(`You already have the maximum of ${MAX_COACHES} coaches.`);
  if (state.pucks < COACH_COST) return fail(`Not enough pucks: a coach costs ${COACH_COST}.`);
  state.pucks -= COACH_COST;
  state.coaches++;
  state.coachOffered = false;
  return ok(`Hired a coach. Coaches stacked: ${state.coaches}.`);
}

export function sell(state: RunState, slot: number): ActionResult {
  if (!slotOk(slot)) return fail(`Slots go from 1 to ${LINEUP_SLOTS}.`);
  const g = state.lineup[slot - 1];
  if (!g) return fail(`Slot ${slot} is empty.`);
  const refund = 1 + (levelForCopies(g.copies) - 1);
  state.pucks += refund;
  state.lineup[slot - 1] = null;
  return ok(`Sold ${GOON_BY_ID[g.id].name} for ${refund} puck${refund > 1 ? "s" : ""}.`);
}

// Move a goon to another slot. Onto an empty slot it moves; onto a different goon it takes that slot
// and the others slide over (like reordering a list); onto a matching goon they stack into one.
export function move(state: RunState, from: number, to: number): ActionResult {
  if (!slotOk(from) || !slotOk(to)) return fail(`Slots go from 1 to ${LINEUP_SLOTS}.`);
  if (from === to) return fail("That's the same slot.");
  const a = state.lineup[from - 1];
  const b = state.lineup[to - 1];
  if (!a) return fail(`Slot ${from} is empty.`);
  if (b && b.id === a.id) return merge(state, from, to);
  state.lineup[from - 1] = null;
  insertAt(state, to - 1, a); // always fits: the goon's old slot just opened up
  return ok(`Moved ${GOON_BY_ID[a.id].name} to slot ${to}.`);
}

export function merge(state: RunState, from: number, to: number): ActionResult {
  const a = state.lineup[from - 1];
  const b = state.lineup[to - 1];
  if (!a || !b || a.id !== b.id) return fail("Only matching goons can stack.");
  const name = GOON_BY_ID[a.id].name;
  if (a.copies + b.copies > MAX_COPIES) return fail(`Too many copies: ${name} maxes out at ${MAX_COPIES}.`);
  const before = levelForCopies(b.copies);
  b.copies += a.copies;
  b.bonusPunch += a.bonusPunch;
  b.bonusToughness += a.bonusToughness;
  b.mouthguard = b.mouthguard || a.mouthguard;
  state.lineup[from - 1] = null;
  const after = levelForCopies(b.copies);
  return ok(`Stacked ${name} into slot ${to}: ${describeGoon(b)}${after > before ? ` — level ${after}!` : ""}`);
}

export function roll(state: RunState): ActionResult {
  if (state.pucks < ROLL_COST) return fail(`Not enough pucks: a reroll costs ${ROLL_COST}.`);
  state.pucks -= ROLL_COST;
  refreshOffers(state);
  return ok("Rerolled the shop.");
}

// Toggle freeze on a goon offer ("3") or a gear offer ("g1").
export function freeze(state: RunState, ref: string): ActionResult {
  const isGear = ref.toLowerCase().startsWith("g");
  const n = Number(isGear ? ref.slice(1) : ref);
  const offer = (isGear ? state.gearOffers : state.goonOffers)[n - 1];
  if (!offer) return fail(`There's no offer ${ref}.`);
  offer.frozen = !offer.frozen;
  const name = isGear ? GEAR_BY_ID[offer.id].name : GOON_BY_ID[offer.id].name;
  return ok(`${offer.frozen ? "Froze" : "Unfroze"} ${name}.`);
}

// ---------- Fighting ----------

// End of shop phase: shop-phase abilities trigger, then the lineup is locked in for the fight.
export function endShopPhase(state: RunState): string[] {
  const notes: string[] = [];
  state.lineup.forEach((g, i) => {
    if (!g) return;
    const ab = GOON_BY_ID[g.id].ability;
    if (ab.kind === "endOfShopBuffFrontPunch") {
      const ahead = state.lineup.slice(0, i).filter((x): x is OwnedGoon => x !== null).pop();
      if (ahead) {
        const n = ab.amount * levelForCopies(g.copies);
        ahead.bonusPunch += n;
        notes.push(`${GOON_BY_ID[g.id].name} studies the tape with ${GOON_BY_ID[ahead.id].name}: +${n} punch.`);
      }
    }
    if (ab.kind === "endOfShopGainToughness") {
      const n = ab.amount * levelForCopies(g.copies);
      g.bonusToughness += n;
      notes.push(`${GOON_BY_ID[g.id].name} grows up: +${n} toughness.`);
    }
  });
  return notes;
}

export function toTeam(state: RunState): TeamInput {
  const goons: UnitInput[] = state.lineup.filter((g): g is OwnedGoon => g !== null).map((g) => {
    const s = goonStats(g);
    return { id: g.id, level: s.level, punch: s.punch + (state.pepTalk ? 1 : 0), toughness: s.toughness, mouthguard: g.mouthguard };
  });
  return { name: state.name, goons, coaches: state.coaches };
}

export type RoundOutcome = { result: FightResult; outcome: "win" | "loss" | "tie"; wasChampionship: boolean };

// Fight this round's opponent, record the result and set up the next round.
export function fightRound(state: RunState, opponent: TeamInput, verbose: boolean): RoundOutcome {
  const result = runFight(toTeam(state), opponent, state.rng.int(1e9), verbose);
  const wasChampionship = state.championship;
  const outcome = result.winner === 0 ? "win" : result.winner === 1 ? "loss" : "tie";

  // Permanent gains earned in the fight (Mad Max Mahoney) go back onto the owned goons.
  const fought = state.lineup.filter((g): g is OwnedGoon => g !== null);
  for (const gain of result.growth) {
    if (gain.team !== 0) continue;
    const g = fought[gain.index];
    if (g) { g.bonusPunch += gain.punch; g.bonusToughness += gain.toughness; }
  }

  // One-fight gear is used up.
  for (const g of state.lineup) if (g) g.mouthguard = false;
  state.pepTalk = false;

  if (wasChampionship) {
    // Win or lose, no retry. A tie that no coach can break counts as a loss.
    state.over = true;
    state.champion = outcome === "win";
    if (state.champion) state.wins++; else state.losses++;
  } else {
    if (outcome === "win") state.wins++;
    if (outcome === "loss") state.losses++;
    if (state.losses >= LOSSES_TO_END) state.over = true;
    else if (state.wins >= WINS_TO_CHAMPIONSHIP) state.championship = true;
  }

  if (!state.over) {
    state.round++;
    state.payday = paydayPucks(state);
    state.pucks = STARTING_PUCKS + state.payday;
    refreshOffers(state);
  }
  return { result, outcome, wasChampionship };
}

// Extra pucks at the start of a shop phase from goons like Greedy Glen (counted after the fight).
export function paydayPucks(state: RunState): number {
  let bonus = 0;
  for (const g of state.lineup) {
    if (!g) continue;
    const ab = GOON_BY_ID[g.id].ability;
    if (ab.kind === "bonusPucks") bonus += ab.amount * levelForCopies(g.copies);
  }
  return bonus;
}
