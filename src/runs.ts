// Simulate full runs with a computer player against computer opponents.
//
//   npm run runs
//   npm run runs -- --runs 5000 --seed 3
//
// Since both sides shop the same way, this mostly checks that the run loop works end to end
// and shows how long runs last, how often fights tie, and which goons championship teams end up with.

import { GOON_BY_ID } from "./data.ts";
import { aiShop } from "./ai.ts";
import { playRound, startRun } from "./run.ts";

const args = process.argv.slice(2);
const arg = (key: string) => {
  const i = args.indexOf(`--${key}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const RUNS = Number(arg("runs") ?? 2000);
const SEED = Number(arg("seed") ?? 1);

let reachedChampionship = 0;
let champions = 0;
let totalRounds = 0;
let fights = 0;
let ties = 0;
let coachDecided = 0;
const winsHistogram: Record<number, number> = {};
const championGoons: Record<string, number> = {};

for (let i = 0; i < RUNS; i++) {
  const run = startRun(SEED * 100000 + i);
  while (!run.player.over) {
    aiShop(run.player);
    const r = playRound(run, false);
    fights++;
    if (r.result.winner === null) ties++;
    if (r.result.decidedBy === "coach") coachDecided++;
    if (r.wasChampionship) reachedChampionship++;
    if (run.player.round > 200) throw new Error("Run did not end: check the loop");
  }
  totalRounds += run.player.round;
  winsHistogram[run.player.wins] = (winsHistogram[run.player.wins] ?? 0) + 1;
  if (run.player.champion) {
    champions++;
    for (const g of run.player.lineup) if (g) championGoons[g.id] = (championGoons[g.id] ?? 0) + 1;
  }
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
console.log(`${RUNS.toLocaleString()} simulated runs (computer player vs computer opponents)`);
console.log(`  Average run length: ${(totalRounds / RUNS).toFixed(1)} rounds`);
console.log(`  Reached the championship: ${pct(reachedChampionship / RUNS)}`);
console.log(`  Won the championship: ${pct(champions / RUNS)} of runs, ${pct(champions / Math.max(1, reachedChampionship))} of finals`);
console.log(`  Fights ending in a tie with no coach: ${pct(ties / fights)} · decided by coaches: ${pct(coachDecided / fights)}`);
console.log("\nWins per run:");
for (const [w, count] of Object.entries(winsHistogram).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  console.log(`  ${w.padStart(2)} wins  ${pct(count / RUNS).padStart(6)}  ${"#".repeat(Math.round((count / RUNS) * 60))}`);
}
console.log("\nGoons on championship-winning teams:");
for (const [id, count] of Object.entries(championGoons).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${GOON_BY_ID[id].name.padEnd(18)} ${count}`);
}
