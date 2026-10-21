// Run one fight and print the play-by-play.
//
//   npm run fight
//   npm run fight -- --a larry,tommy,moose --b mcgraw,gus,stan --seed 42
//   npm run fight -- --a "larry*3,sal" --b hammer --coachA 1 --coachB 2
//
// --a / --b  goon ids in slot order (slot 1 first). "larry*3" = 3 copies stacked.
//            Leave one out for a random lineup from the round 7 pool.
// --seed     replay the exact same fight.

import { GOONS } from "./data.ts";
import { runFight } from "./engine.ts";
import { POOLS, randomTeam, teamFromList } from "./lineups.ts";
import { makeRng } from "./rng.ts";

const args = process.argv.slice(2);
const arg = (key: string) => {
  const i = args.indexOf(`--${key}`);
  return i >= 0 ? args[i + 1] : undefined;
};

if (args.includes("--help")) {
  console.log("Goon ids: " + GOONS.map((g) => g.id).join(", "));
  process.exit(0);
}

const seed = arg("seed") ? Number(arg("seed")) : Math.floor(Math.random() * 1e9);
const rng = makeRng(seed + 1);
const coachA = Number(arg("coachA") ?? 0);
const coachB = Number(arg("coachB") ?? 0);
const teamA = arg("a") ? teamFromList("Home", arg("a")!, coachA) : randomTeam("Home", POOLS.r7.goons, rng, 5, coachA);
const teamB = arg("b") ? teamFromList("Away", arg("b")!, coachB) : randomTeam("Away", POOLS.r7.goons, rng, 5, coachB);

const result = runFight(teamA, teamB, seed, true);
console.log(result.log.join("\n"));
console.log(`\nSeed ${seed} · ${result.exchanges} exchanges · ` +
  (result.winner === null ? "tie" : `${result.winner === 0 ? "Home" : "Away"} wins` + (result.decidedBy === "coach" ? " on the coach tiebreaker" : result.decidedBy === "damage" ? " on total damage" : "")));
