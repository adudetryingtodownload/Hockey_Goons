// Rule checks: small hand-built fights with known answers. Run with: npm test

import { makeUnit, runFight, type TeamInput } from "./engine.ts";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures++;
};
const team = (name: string, ids: string[], coaches = 0): TeamInput => ({ name, goons: ids.map((id) => makeUnit(id)), coaches });
const fight = (a: TeamInput, b: TeamInput, seed = 1) => runFight(a, b, seed, true);

// Simultaneous hits: Tommy 2/3 vs Dusty 2/2. Tommy's chirp drops Dusty to 1 punch.
// Exchange 1: Tommy takes 1 (2 left), Dusty takes 2 (out). Home wins.
{
  const r = fight(team("Home", ["tommy"]), team("Away", ["dusty"]));
  check("Chirp lowers punch and simultaneous hits resolve", r.winner === 0 && r.exchanges === 1, r.log.join("\n      "));
}

// Mirror match with identical goons: both go down together, no coaches -> tie.
{
  const r = fight(team("Home", ["mcgraw"]), team("Away", ["mcgraw"]));
  check("Identical goons trade down to a tie", r.winner === null && r.decidedBy === "tie", r.log.join("\n      "));
}

// Double knockout with unequal damage: the team that dealt more damage wins.
// Eddie's cheap shot (1) plus his punch (2) is 3 damage; Tommy only dealt 2.
{
  const r = fight(team("Home", ["eddie"]), team("Away", ["tommy"]));
  check("A double knockout goes to the team that dealt more damage", r.winner === 0 && r.decidedBy === "damage", r.log.join("\n      "));
}

// McGraw's mullet toss hurts both front goons.
{
  const r = fight(team("Home", ["mcgraw"]), team("Away", ["moose"]));
  check("Mullet McGraw's toss deals 2 to both front goons", r.log.some((l) => l.includes("crashes into Big Moose: 2 damage each")), r.log.join("\n      "));
}

// Tie with one coach: that team wins.
{
  const r = fight(team("Home", ["mcgraw"], 1), team("Away", ["mcgraw"]));
  check("A team with a coach wins a tie against a team without one", r.winner === 0 && r.decidedBy === "coach", r.log.join("\n      "));
}

// Tie with coaches on both sides: bigger stack wins when totals are equal.
{
  const r = fight(team("Home", ["mcgraw"], 1), team("Away", ["mcgraw"], 3));
  check("Coach stack bonus decides a coach fight", r.winner === 1 && r.decidedBy === "coach", r.log.join("\n      "));
}

// Larry's first punch is doubled: 4 x 2 = 8 knocks out Moose? Moose has 8 toughness -> yes in one hit.
{
  const r = fight(team("Home", ["larry"]), team("Away", ["moose"]));
  const log = r.log.join("\n");
  check("Uppercut doubles Larry's first punch", log.includes("Uppercut Larry hits for 8"), r.log.join("\n      "));
}

// Stan gets back up once.
{
  const r = fight(team("Home", ["stan"]), team("Away", ["hammer"]));
  check("Stitches Stan gets back up once", r.log.some((l) => l.includes("gets back up")), r.log.join("\n      "));
}

// Walsh saves a teammate the first time.
{
  const r = fight(team("Home", ["eddie", "walsh"]), team("Away", ["hammer"]));
  check("Wall Walsh saves a teammate once", r.log.some((l) => l.includes("saves Elbows Eddie")), r.log.join("\n      "));
}

// Step up: when the front goon goes down, the next one steps up.
{
  const r = fight(team("Home", ["eddie", "moose"]), team("Away", ["hammer"]));
  check("Next goon steps up after a knockout", r.log.some((l) => l.includes("Big Moose") && l.startsWith("Exchange")), r.log.join("\n      "));
}

// Pete's slap shot hits the enemy goon with the lowest toughness, not the front one.
{
  const r = fight(team("Home", ["pete"]), team("Away", ["moose", "eddie", "tommy"]));
  check("Slap shot targets the lowest-toughness enemy", r.log.some((l) => l.includes("slap shot at Elbows Eddie for 2")) && r.log.some((l) => l.includes("Elbows Eddie is knocked out")), r.log.join("\n      "));
}

// Ike gains toughness for each teammate behind him.
{
  const r = fight(team("Home", ["ike", "tommy", "eddie"]), team("Away", ["randy"]));
  check("Ike gains +1 toughness per teammate behind him", r.log.some((l) => l.includes("anchors the line: +2 toughness (4/8)")), r.log.join("\n      "));
}

// Bobby Brawler: whoever knocks him out breaks his knuckles.
{
  const r = fight(team("Home", ["craig"]), team("Away", ["hammer"]));
  check("Craig's knockout takes punch off whoever did it", r.log.some((l) => l.includes("The Hammer breaks his knuckles on Bobby Brawler: -1 punch")), r.log.join("\n      "));
}

// Richard fires when a teammate goes down.
{
  const r = fight(team("Home", ["eddie", "richard"]), team("Away", ["moose"]));
  check("Richard fires a rocket when a teammate is knocked out", r.log.some((l) => l.includes("fires a rocket at Big Moose for 2")), r.log.join("\n      "));
}

// Otto takes 1 less damage from each hit, never below 1.
{
  const r = fight(team("Home", ["otto"]), team("Away", ["hammer"]));
  check("Old Man Otto shrugs off 1 damage per hit", r.log.some((l) => l.includes("shrugs it off: -1 damage")), r.log.join("\n      "));
}

// Sid's stick also hits the second enemy goon.
{
  const r = fight(team("Home", ["sid"]), team("Away", ["moose", "eddie"]));
  check("Cross-Check Chris's stick hits the goon behind the front", r.log.some((l) => l.includes("stick catches Elbows Eddie for 1")), r.log.join("\n      "));
}

// Willie hits for +1 and his backswing clips the teammate behind him, firing that goon's ability.
{
  const r = fight(team("Home", ["willie", "moose"]), team("Away", ["brick"]));
  check("Whipping Willie hits for +1 and clips the goon behind him", r.log.some((l) => l.includes("Whipping Willie hits for 4")) && r.log.some((l) => l.includes("backswing clips Big Moose for 1")) && r.log.some((l) => l.includes("Big Moose gets angrier")), r.log.join("\n      "));
}
{
  const r = fight(team("Home", ["willie", "sal"]), team("Away", ["brick"]));
  check("A backswing never makes a teammate hit back at Willie", !r.log.some((l) => l.includes("Your Sucker Punch Sal sucker punches back")), r.log.join("\n      "));
}

// Henry drags the enemy's back goon to the front before the other start-of-fight abilities.
{
  const r = fight(team("Home", ["henry", "eddie"]), team("Away", ["moose", "tommy", "walsh"]));
  const hookAt = r.log.findIndex((l) => l.includes("hooks Wall Walsh and drags him to the front"));
  check("Hooking Henry drags the back goon to the front, then Eddie hits him", hookAt >= 0 && r.log.some((l, i) => i > hookAt && l.includes("Elbows Eddie hits Wall Walsh")) && r.log.some((l) => l.startsWith("Exchange 1:") && l.includes("vs Wall Walsh")), r.log.join("\n      "));
}

// Frankie throws a glove at a random enemy every time he is hit; a level 3 Frankie hits 3 different goons.
{
  const r = fight(team("Home", ["frankie"]), team("Away", ["moose", "tommy", "eddie"]));
  check("Short Fuse Frankie throws a glove when hit", r.log.some((l) => l.includes("throws a glove at")), r.log.join("\n      "));
  const big: TeamInput = { name: "Home", goons: [makeUnit("frankie", 6)], coaches: 0 };
  const r3 = fight(big, team("Away", ["eddie", "moose", "walsh"]));
  const firstHit = r3.log.findIndex((l) => l.includes("throws a glove"));
  const throws = r3.log.slice(firstHit, firstHit + 3).filter((l) => l.includes("throws a glove"));
  const names = new Set(throws.map((l) => l.split(" at ")[1].split(" for ")[0]));
  check("A level 3 Frankie throws at 3 different goons", throws.length === 3 && names.size === 3, r3.log.join("\n      "));
}

// Ted ropes the hardest puncher, who misses his next punch (Larry's uppercut is wasted).
{
  const r = fight(team("Home", ["ted"]), team("Away", ["moose", "larry"]));
  check("Texas Ted lassos the enemy with the most punch", r.log.some((l) => l.includes("lassos Uppercut Larry")), r.log.join("\n      "));
  const r2 = fight(team("Home", ["ted", "moose"]), team("Away", ["hammer"]));
  check("A lassoed goon misses his next punch, then punches normally", r2.log.some((l) => l.includes("The Hammer hits for 0")) && r2.log.some((l) => l.includes("The Hammer hits for 6")), r2.log.join("\n      "));
}

// Sébastien zaps the teammate ahead of him after every exchange, and it stacks.
{
  const r = fight(team("Home", ["ike", "sebastien"]), team("Away", ["moose", "randy"]));
  const sparks = r.log.filter((l) => l.includes("sparks Iron Ike: +1/+1"));
  check("Sébastien Spark gives the goon ahead +1/+1 every exchange", sparks.length >= 2, r.log.join("\n      "));
}

// Doc heals the front goon after each exchange, but never above his best toughness.
{
  const r = fight(team("Home", ["moose", "doc"]), team("Away", ["mcgraw", "tommy"]));
  check("Doc patches up the front goon after an exchange", r.log.some((l) => l.includes("patches up Big Moose: +2 toughness")), r.log.join("\n      "));
  const r2 = fight(team("Home", ["walsh", "doc"]), team("Away", ["randy"]));
  check("Doc never heals a goon above his best toughness", r2.log.every((l) => !/patches up Wall Walsh: \+\d+ toughness \(\d+\/(9|1\d)\)/.test(l)), r2.log.join("\n      "));
}

// Zamboni Zeke: overkill damage carries into the next enemy.
{
  const r = fight(team("Home", ["zeke"]), team("Away", ["eddie", "tommy"]));
  check("Zamboni Zeke's leftover damage carries into the next goon", r.log.some((l) => l.includes("plows straight through into Toothless Tommy for 4")), r.log.join("\n      "));
}

// Big Bertrand takes half of each punch aimed at the goon in front of him.
{
  const r = fight(team("Home", ["moose", "bertrand"]), team("Away", ["hammer"]));
  check("Big Bertrand takes half of a punch for the front goon", r.log.some((l) => l.includes("steps in and takes 3 for Big Moose")), r.log.join("\n      "));
}

// Iron Jaw Igor: no single hit deals him more than 3.
{
  const r = fight(team("Home", ["igor"]), team("Away", ["hammer"]));
  check("Iron Jaw Igor caps a big punch at 3", r.log.some((l) => l.includes("iron jaw holds: 6 damage becomes 3")), r.log.join("\n      "));
}

// The Camo Twins: when he goes down, his twin tags in at his spot, scaled by level, and keeps fighting.
{
  const r = fight(team("Home", ["twins"]), team("Away", ["hammer"]));
  check("A knocked-out Camo Twin is replaced by his brother", r.log.some((l) => l.includes("twin tags in: Camo Twin 2/2")) && r.log.some((l) => l.startsWith("Exchange") && l.includes("Camo Twin 2/2 vs The Hammer")), r.log.join("\n      "));
  const big: TeamInput = { name: "Home", goons: [makeUnit("twins", 6), makeUnit("tommy")], coaches: 0 };
  const r3 = fight(big, team("Away", ["hammer", "moose", "brick"]));
  check("A level 3 twin tags in as a 6/6, ahead of the goons behind him", r3.log.some((l) => l.includes("twin tags in: Camo Twin 6/6")), r3.log.join("\n      "));
}

// Same seed, same fight.
{
  const a = team("Home", ["gus", "sal", "knuckles", "tommy", "brick"]);
  const b = team("Away", ["mcgraw", "dusty", "hammer", "eddie", "sam"]);
  const x = runFight(a, b, 99, true).log.join("\n");
  const y = runFight(a, b, 99, true).log.join("\n");
  check("Same seed replays the exact same fight", x === y);
}

// ---------- Shop and run loop ----------
{
  const { newRun, buyGoon, sell, roll, freeze, buyCoach, buyGear, goonStats, endShopPhase, fightRound, refreshOffers } = await import("./shop.ts");
  const { GOON_BY_ID } = await import("./data.ts");

  // Only tier 1 in rounds 1-2, 3 goon offers and 1 gear.
  const s = newRun("Test", 5);
  check("Round 1 shop: 3 tier 1 goons and 1 gear", s.goonOffers.length === 3 && s.gearOffers.length === 1 && s.goonOffers.every((o) => GOON_BY_ID[o.id].tier === 1));

  // Buying costs 3 and stacking 3 copies makes level 2 with +2/+2.
  s.goonOffers = [{ id: "tommy", frozen: false }, { id: "tommy", frozen: false }, { id: "tommy", frozen: false }];
  s.pucks = 10;
  buyGoon(s, 1); buyGoon(s, 1); buyGoon(s, 1);
  const t = s.lineup[0]!;
  const st = goonStats(t);
  check("Three copies stack into a level 2 goon with +2/+2", s.pucks === 1 && t.copies === 3 && st.level === 2 && st.punch === 4 && st.toughness === 5);
  check("Can't buy with 1 puck left", !buyGoon(s, 1).ok);

  // Selling a level 2 goon refunds 2 pucks.
  const before = s.pucks;
  sell(s, 1);
  check("Selling a level 2 goon refunds 2 pucks", s.pucks === before + 2 && s.lineup[0] === null);

  // Two matching goons in the lineup stack into one.
  const { move } = await import("./shop.ts");
  const m = newRun("Test", 11);
  m.lineup[0] = { id: "larry", copies: 2, bonusPunch: 1, bonusToughness: 0, mouthguard: false };
  m.lineup[3] = { id: "larry", copies: 1, bonusPunch: 0, bonusToughness: 1, mouthguard: true };
  const merged = move(m, 4, 1);
  const ms = goonStats(m.lineup[0]!);
  check("Matching lineup goons stack into one, keeping gear", merged.ok && m.lineup[3] === null && m.lineup[0]!.copies === 3 && ms.level === 2 && ms.punch === 7 && ms.toughness === 7 && m.lineup[0]!.mouthguard);
  m.lineup[1] = { id: "larry", copies: 4, bonusPunch: 0, bonusToughness: 0, mouthguard: false };
  check("Stacking past 6 copies is refused", !move(m, 2, 1).ok && m.lineup[1]!.copies === 4);
  // Lineup now: 1 Larry, 2 Larry. Reordering slides the others over like a list.
  const ids = (st: typeof m) => st.lineup.map((g) => g?.id ?? "-").join(",");
  const o = newRun("Test", 12);
  const put = (i: number, id: string) => (o.lineup[i] = { id, copies: 1, bonusPunch: 0, bonusToughness: 0, mouthguard: false });
  put(0, "tommy"); put(1, "eddie"); put(2, "dusty");
  move(o, 3, 1);
  check("Moving a goon onto a different one slides the lineup back", ids(o) === "dusty,tommy,eddie,-,-", ids(o));
  // Buying onto a taken slot bumps the goons there back toward the open slots.
  o.goonOffers = [{ id: "sal", frozen: false }];
  o.pucks = 10;
  const bumped = buyGoon(o, 1, 2);
  check("A new goon dropped on a taken slot bumps the others back", bumped.ok && ids(o) === "dusty,sal,tommy,eddie,-", ids(o));
  put(4, "randy");
  o.goonOffers = [{ id: "larry", frozen: false }];
  check("A full lineup can't take a new goon of a different type", !buyGoon(o, 1, 1).ok && ids(o) === "dusty,sal,tommy,eddie,randy");
  // With no room behind, the goons in front slide forward instead.
  const f = newRun("Test", 13);
  const putF = (i: number, id: string) => (f.lineup[i] = { id, copies: 1, bonusPunch: 0, bonusToughness: 0, mouthguard: false });
  putF(1, "tommy"); putF(2, "eddie"); putF(3, "dusty"); putF(4, "randy");
  f.goonOffers = [{ id: "sal", frozen: false }];
  buyGoon(f, 1, 5);
  check("With no room behind, the goons in front slide forward", ids(f) === "tommy,eddie,dusty,randy,sal", ids(f));

  // Shop odds: each unlocked tier is equally likely, however many goons it has.
  {
    const { GOONS } = await import("./data.ts");
    const odds = newRun("Test", 77);
    odds.round = 7;
    const count: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) {
      refreshOffers(odds);
      for (const o of odds.goonOffers) { const t = String(GOON_BY_ID[o.id].tier); count[t] = (count[t] ?? 0) + 1; }
    }
    const total = Object.values(count).reduce((a, b) => a + b, 0);
    const shares = ["1", "2", "3", "4"].map((t) => (count[t] ?? 0) / total);
    check("Each unlocked tier shows up about equally often in the shop", shares.every((x) => x > 0.22 && x < 0.28), JSON.stringify(shares));
    void GOONS;
  }

  // Frozen offers survive a reroll.
  const r = newRun("Test", 9);
  const frozenId = r.goonOffers[0].id;
  freeze(r, "1");
  roll(r);
  check("A frozen offer survives a reroll, which costs 1 puck", r.goonOffers[0].id === frozenId && r.goonOffers[0].frozen && r.pucks === 9);

  // Coaches only from round 8, max 3.
  const c = newRun("Test", 3);
  check("No coach before round 8", !buyCoach(c).ok);
  c.round = 8; refreshOffers(c);
  c.pucks = 10; buyCoach(c);
  check("A coach can be hired in round 8", c.coaches === 1);
  c.coaches = 3; refreshOffers(c);
  check("The shop stops offering coaches at 3", !c.coachOffered);

  // Gear: Energy Drink is +1/+1 permanent.
  const g = newRun("Test", 4);
  g.lineup[0] = { id: "eddie", copies: 1, bonusPunch: 0, bonusToughness: 0, mouthguard: false };
  g.gearOffers = [{ id: "drink", frozen: false }];
  buyGear(g, 1, 1);
  check("Energy Drink gives +1/+1", goonStats(g.lineup[0]!).punch === 4 && goonStats(g.lineup[0]!).toughness === 2);

  // Rookie Randy grows at the end of each shop phase.
  const rr = newRun("Test", 2);
  rr.lineup[0] = { id: "randy", copies: 1, bonusPunch: 0, bonusToughness: 0, mouthguard: false };
  endShopPhase(rr); endShopPhase(rr);
  check("Rookie Randy gains +1 toughness each shop phase", goonStats(rr.lineup[0]!).toughness === 5);

  // Kowalski gives the goon in front of him +1 punch each shop phase.
  const kw = newRun("Test", 2);
  kw.lineup[0] = { id: "tommy", copies: 1, bonusPunch: 0, bonusToughness: 0, mouthguard: false };
  kw.lineup[2] = { id: "kowalski", copies: 1, bonusPunch: 0, bonusToughness: 0, mouthguard: false };
  endShopPhase(kw); endShopPhase(kw);
  check("Kowalski's film study gives the goon ahead +1 punch each shop phase", goonStats(kw.lineup[0]!).punch === 4);

  // Greedy Glen: the next shop phase starts with extra pucks (level 2 = +2), win or lose.
  const gl = newRun("Test", 8);
  gl.lineup[0] = { id: "walsh", copies: 6, bonusPunch: 20, bonusToughness: 20, mouthguard: false };
  gl.lineup[1] = { id: "glen", copies: 3, bonusPunch: 0, bonusToughness: 0, mouthguard: false };
  fightRound(gl, { name: "Weak", goons: [makeUnit("randy")], coaches: 0 }, false);
  check("Greedy Glen's payday adds pucks to the next shop phase", gl.pucks === 12 && gl.payday === 2, `pucks ${gl.pucks}`);

  // Mad Max Mahoney keeps what he earns: each knockout is +1/+1 for the rest of the run.
  const mm = newRun("Test", 9);
  mm.lineup[0] = { id: "mahoney", copies: 1, bonusPunch: 0, bonusToughness: 0, mouthguard: false };
  const mmRes = fightRound(mm, { name: "Weak", goons: [makeUnit("randy"), makeUnit("tommy")], coaches: 0 }, false);
  const mmStats = goonStats(mm.lineup[0]!);
  check("Mad Max Mahoney keeps +1/+1 per knockout after the fight", mmRes.outcome === "win" && mmStats.punch === 7 && mmStats.toughness === 8, JSON.stringify(mmStats));

  // 5 losses end the run; 9 wins set up the championship, which ends the run either way.
  const lose = newRun("Test", 6);
  const strong = { name: "Strong", goons: [makeUnit("walsh"), makeUnit("walsh"), makeUnit("walsh")], coaches: 0 };
  lose.lineup[0] = { id: "randy", copies: 1, bonusPunch: 0, bonusToughness: 0, mouthguard: false };
  for (let i = 0; i < 5; i++) fightRound(lose, strong, false);
  check("Five losses end the run", lose.over && lose.losses === 5 && !lose.champion);

  const win = newRun("Test", 7);
  win.lineup[0] = { id: "walsh", copies: 6, bonusPunch: 20, bonusToughness: 20, mouthguard: false };
  const weak = { name: "Weak", goons: [makeUnit("randy")], coaches: 0 };
  for (let i = 0; i < 9; i++) fightRound(win, weak, false);
  check("Nine wins set up the championship", win.championship && !win.over && win.wins === 9);
  fightRound(win, weak, false);
  check("Winning the championship is the 10th win and ends the run", win.over && win.champion && win.wins === 10);
}

// Saving and loading a run picks up exactly where it left off, random rolls included.
{
  const { startRun, saveRun, loadRun } = await import("./run.ts");
  const { roll, buyGoon } = await import("./shop.ts");
  const a = startRun(4242);
  buyGoon(a.player, 1);
  roll(a.player);
  const b = loadRun(saveRun(a))!;
  roll(a.player); roll(b.player);
  const same = saveRun(a) === saveRun(b);
  check("A saved run loads back identically and rolls the same shop", !!b && same && a.player.rng.next() === b.player.rng.next());
  check("A broken save is ignored", loadRun("{oops") === null && loadRun(null) === null);
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
