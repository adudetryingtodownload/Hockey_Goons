// Balance report: run thousands of fights between random lineups and print each goon's win rate.
//
//   npm run sim                      10,000 fights per round bracket
//   npm run sim -- --fights 50000 --seed 7
//
// Win rate = share of fights won by teams that included that goon (ties count as half).
// A healthy goon sits near 50%. Far above or below means it needs a tweak in src/data.ts.
// "Duels" pits every goon against every other one on one, as a quick read on raw strength.

import { GOONS } from "./data.ts";
import { makeUnit, runFight } from "./engine.ts";
import { POOLS, randomTeam } from "./lineups.ts";
import { makeRng } from "./rng.ts";

const args = process.argv.slice(2);
const arg = (key: string) => {
  const i = args.indexOf(`--${key}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const FIGHTS = Number(arg("fights") ?? 10000);
const SEED = Number(arg("seed") ?? 1);

const pct = (x: number) => `${(x * 100).toFixed(1)}%`.padStart(6);
const bar = (x: number) => "#".repeat(Math.round(x * 30));

for (const [key, pool] of Object.entries(POOLS)) {
  const rng = makeRng(SEED * 1000 + key.length);
  const games: Record<string, number> = {};
  const wins: Record<string, number> = {};
  let ties = 0;
  let exchanges = 0;

  for (let i = 0; i < FIGHTS; i++) {
    const a = randomTeam("A", pool.goons, rng);
    const b = randomTeam("B", pool.goons, rng);
    const r = runFight(a, b, rng.int(1e9));
    exchanges += r.exchanges;
    if (r.winner === null) ties++;
    for (const [side, team] of [[0, a], [1, b]] as const) {
      const ids = new Set(team.goons.map((g) => g.id)); // count each goon once per team
      for (const id of ids) {
        games[id] = (games[id] ?? 0) + 1;
        wins[id] = (wins[id] ?? 0) + (r.winner === null ? 0.5 : r.winner === side ? 1 : 0);
      }
    }
  }

  console.log(`\n=== ${pool.label} · ${FIGHTS.toLocaleString()} fights · ${pct(ties / FIGHTS).trim()} ties · ${(exchanges / FIGHTS).toFixed(1)} exchanges per fight ===`);
  const rows = pool.goons
    .map((g) => ({ g, rate: (wins[g.id] ?? 0) / Math.max(1, games[g.id] ?? 0) }))
    .sort((x, y) => y.rate - x.rate);
  for (const { g, rate } of rows) {
    const flag = rate > 0.6 ? "  <- too strong?" : rate < 0.4 ? "  <- too weak?" : "";
    console.log(`${g.name.padEnd(18)} ${String(g.tier).padEnd(7)} ${pct(rate)}  ${bar(rate)}${flag}`);
  }
}

// One-on-one duels, level 1, both orders to cancel out any side advantage.
console.log("\n=== Duels: share of one-on-one fights won against every other goon ===");
const duelRows = GOONS.map((g) => {
  let score = 0;
  let n = 0;
  for (const other of GOONS) {
    if (other.id === g.id) continue;
    for (let s = 0; s < 2; s++) {
      const r = runFight({ name: "A", goons: [makeUnit(g.id)], coaches: 0 }, { name: "B", goons: [makeUnit(other.id)], coaches: 0 }, SEED + s);
      score += r.winner === 0 ? 1 : r.winner === null ? 0.5 : 0;
      n++;
    }
  }
  return { g, rate: score / n };
}).sort((x, y) => y.rate - x.rate);
for (const { g, rate } of duelRows) {
  console.log(`${g.name.padEnd(18)} ${String(g.tier).padEnd(7)} ${pct(rate)}  ${bar(rate)}`);
}
