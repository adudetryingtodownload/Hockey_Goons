// Play a full run as text.
//
//   npm run play
//   npm run play -- --seed 42      replay the same shop rolls and fights
//
// Type "help" in the game for the commands.

import * as readline from "node:readline";
import { COACH_COST, GEAR_BY_ID, GEAR_COST, GOON_BY_ID, GOON_COST, LOSSES_TO_END, ROLL_COST, WINS_TO_CHAMPIONSHIP } from "./data.ts";
import { playRound, startRun } from "./run.ts";
import { buyCoach, buyGear, buyGoon, describeGoon, freeze, move, roll, sell, type RunState } from "./shop.ts";

const args = process.argv.slice(2);
const seedArg = args.indexOf("--seed");
const seed = seedArg >= 0 ? Number(args[seedArg + 1]) : Math.floor(Math.random() * 1e9);
const run = startRun(seed);
const p = run.player;

const HELP = `
Commands (numbers are the ones shown in brackets):
  buy N [slot]     buy goon offer N (${GOON_COST} pucks). No slot: stacks onto a match, or takes the first empty slot
  gear N [slot]    buy gear offer N (${GEAR_COST} pucks) and put it on the goon in that slot
  coach            hire a coach (${COACH_COST} pucks, from round 8)
  sell SLOT        sell the goon in that slot
  move A B         move a goon to another slot; matching goons stack
  freeze N | gN    freeze or unfreeze a goon offer (N) or gear offer (gN)
  roll             reroll the shop (${ROLL_COST} puck)
  fight            end the shop phase and fight
  quiet / loud     hide or show the full play-by-play (shown by default)
  quit             give up the run
`;

function showShop(s: RunState): void {
  const champ = s.championship ? "  ** CHAMPIONSHIP NEXT **" : "";
  console.log(`\n=== Round ${s.round} · Wins ${s.wins}/${WINS_TO_CHAMPIONSHIP} · Losses ${s.losses}/${LOSSES_TO_END} · Pucks ${s.pucks}${champ} ===`);
  console.log("Lineup:");
  s.lineup.forEach((g, i) => console.log(`  ${i + 1}. ${g ? describeGoon(g) : "(empty)"}`));
  console.log(`  Coaches: ${s.coaches}${s.pepTalk ? "   Pep Talk ready: +1 punch next fight" : ""}`);
  console.log("Shop:");
  s.goonOffers.forEach((o, i) => {
    const d = GOON_BY_ID[o.id];
    console.log(`  [${i + 1}] ${d.name} ${d.punch}/${d.toughness} (tier ${d.tier})${o.frozen ? " FROZEN" : ""} — ${d.abilityText}`);
  });
  s.gearOffers.forEach((o, i) => {
    const d = GEAR_BY_ID[o.id];
    console.log(`  [g${i + 1}] ${d.name}${o.frozen ? " FROZEN" : ""} — ${d.text}`);
  });
  if (s.coachOffered) console.log(`  [coach] Coach (${COACH_COST} pucks) — breaks ties against teams without one`);
}

let verbose = true;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });

console.log(`Hockey Goons · seed ${seed}. Type "help" for commands.`);
showShop(p);
process.stdout.write("> ");

rl.on("line", (raw) => {
  const [cmd, a, b] = raw.trim().toLowerCase().split(/\s+/);
  const n = (x?: string) => (x === undefined ? undefined : Number(x));
  let result: { ok: boolean; message: string } | null = null;

  switch (cmd) {
    case "": break;
    case "help": console.log(HELP); break;
    case "buy": result = buyGoon(p, Number(a), n(b)); break;
    case "gear": result = buyGear(p, Number(a), n(b)); break;
    case "coach": result = buyCoach(p); break;
    case "sell": result = sell(p, Number(a)); break;
    case "move": result = move(p, Number(a), Number(b)); break;
    case "freeze": result = freeze(p, a ?? ""); break;
    case "roll": result = roll(p); break;
    case "quiet": verbose = false; console.log("Play-by-play hidden."); break;
    case "loud": verbose = true; console.log("Play-by-play shown."); break;
    case "quit": console.log("You hang up the skates."); rl.close(); return;
    case "fight": {
      if (!p.lineup.some(Boolean)) { console.log("You need at least one goon to fight."); break; }
      const r = playRound(run, verbose);
      for (const note of r.notes) console.log(note);
      const oppLine = r.opponent.lineup.filter(Boolean).map((g) => describeGoon(g!)).join(", ");
      console.log(`\nvs ${r.opponent.name}: ${oppLine}${r.opponent.coaches ? ` · ${r.opponent.coaches} coach(es)` : ""}`);
      if (verbose) console.log("\n" + r.result.log.join("\n"));
      const how = r.result.decidedBy === "coach" ? " on the coach tiebreaker" : "";
      const label = r.outcome === "win" ? `WIN${how}` : r.outcome === "loss" ? `LOSS${how}` : "TIE: no coach to break it";
      console.log(`\n${r.wasChampionship ? "CHAMPIONSHIP " : ""}${label} · Wins ${p.wins} · Losses ${p.losses}`);
      if (p.over) {
        console.log(p.champion
          ? `\nCHAMPIONS! You won the title in ${p.round} rounds.`
          : `\nRun over after ${p.round} rounds: ${p.wins} wins, ${p.losses} losses.`);
        rl.close();
        return;
      }
      showShop(p);
      break;
    }
    default: console.log(`Unknown command "${cmd}". Type "help".`);
  }
  if (result) console.log(result.message);
  process.stdout.write("> ");
});
