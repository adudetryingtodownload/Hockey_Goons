// The fight engine. Pure logic: no graphics, no shop.
// Follows the Fight rules and Coaches sections of SPEC.md.

import { COACH_MULTIPLIER, GOON_BY_ID, MAX_COACHES, MAX_EXCHANGES, type GoonDef } from "./data.ts";
import { makeRng, type Rng } from "./rng.ts";

// ---------- Inputs ----------

// One goon as it stands going into a fight (shop buffs and gear already included).
// mouthguard: ignores the first punch this fight (gear).
export type UnitInput = { id: string; level: number; punch: number; toughness: number; mouthguard?: boolean };

// A team: goons in slot order (slot 1 first), plus how many coaches are stacked (0 to 3).
export type TeamInput = { name: string; goons: UnitInput[]; coaches: number };

// Copies of the same goon stack: each extra copy is +1 punch and +1 toughness.
// 3 copies = level 2, 6 copies = level 3.
export function levelForCopies(copies: number): number {
  if (copies >= 6) return 3;
  if (copies >= 3) return 2;
  return 1;
}

export function makeUnit(id: string, copies = 1): UnitInput {
  const def = GOON_BY_ID[id];
  if (!def) throw new Error(`Unknown goon: ${id}`);
  const extra = Math.max(0, copies - 1);
  return { id, level: levelForCopies(copies), punch: def.punch + extra, toughness: def.toughness + extra };
}

// ---------- Fight state ----------

type Fighter = {
  uid: number;
  def: GoonDef;
  team: 0 | 1;
  level: number;
  punch: number;
  toughness: number;
  removed: boolean;
  punchesThrown: number;
  revived: boolean;
  lastStandTriggered: boolean;
  savesLeft: number;
  mouthguard: boolean;
  lastHitBy: Fighter | null;
  tied: number; // punches he still has to miss (Texas Ted's lasso)
  peak: number; // highest toughness he has had this fight: Doc can't heal past it
};

// One step of the fight, with every goon's stats at that moment, for replaying it as an animation.
export type FightEvent = {
  kind: "lineup" | "phase" | "ability" | "buff" | "save" | "revive" | "ko" | "summon" | "exchange" | "impact" | "info" | "result" | "coach";
  text: string;
  actors: number[]; // uids of the goons involved
  snap: { uid: number; id: string; team: 0 | 1; level: number; punch: number; toughness: number; removed: boolean; tied: boolean }[];
};

export type FightResult = {
  winner: 0 | 1 | null; // 0 = team A, 1 = team B, null = tie
  decidedBy: "fight" | "damage" | "coach" | "tie";
  exchanges: number;
  log: string[];
  events: FightEvent[];
};

type HurtEvent = { target: Fighter; source: Fighter | null };

export function runFight(teamA: TeamInput, teamB: TeamInput, seed: number, verbose = false): FightResult {
  const rng: Rng = makeRng(seed);
  const log: string[] = [];
  const events: FightEvent[] = [];
  let lineups: [Fighter[], Fighter[]] = [[], []];
  const say = (line: string, kind: FightEvent["kind"] = "info", actors: Fighter[] = []) => {
    if (!verbose) return;
    if (line) log.push(line);
    events.push({
      kind, text: line.trim(), actors: actors.map((f) => f.uid),
      snap: [...lineups[0], ...lineups[1]].map((f) => ({ uid: f.uid, id: f.def.id, team: f.team, level: f.level, punch: f.punch, toughness: f.toughness, removed: f.removed, tied: f.tied > 0 })),
    });
  };

  let uidCounter = 0;
  const makeFighter = (def: GoonDef, side: 0 | 1, level: number, punch: number, toughness: number, mouthguard: boolean): Fighter => ({
    uid: uidCounter++, def, team: side, level,
    punch, toughness,
    removed: false, punchesThrown: 0, revived: false, lastStandTriggered: false,
    savesLeft: def.ability.kind === "saveTeammate" ? def.ability.uses * level : 0,
    mouthguard,
    lastHitBy: null,
    tied: 0,
    peak: toughness,
  });
  const build = (team: TeamInput, side: 0 | 1): Fighter[] =>
    team.goons.map((u) => {
      const def = GOON_BY_ID[u.id];
      if (!def) throw new Error(`Unknown goon: ${u.id}`);
      return makeFighter(def, side, u.level, u.punch, u.toughness, !!u.mouthguard);
    });

  lineups = [build(teamA, 0), build(teamB, 1)];
  const teamName = [teamA.name, teamB.name];
  const possessive = (name: string) => (name === "You" ? "Your" : name.endsWith("s") ? `${name}'` : `${name}'s`);
  const label = (f: Fighter) => `${possessive(teamName[f.team])} ${f.def.name}`;
  const wins = (name: string) => (name === "You" || name.endsWith("s") ? `${name} win.` : `${name} wins.`);
  const stats = (f: Fighter) => `${f.punch}/${f.toughness}`;
  const alive = (side: 0 | 1) => lineups[side].filter((f) => !f.removed);
  const front = (side: 0 | 1) => alive(side)[0] ?? null;
  const behind = (f: Fighter) => alive(f.team).filter((x) => lineups[f.team].indexOf(x) > lineups[f.team].indexOf(f));
  const position = (f: Fighter) => lineups[f.team].indexOf(f);
  // Same-moment order: closer to the front first, player's team (A) first.
  const byFrontThenTeam = (a: Fighter, b: Fighter) => position(a) - position(b) || a.team - b.team;

  let pendingHurt: HurtEvent[] = [];

  const dealt = [0, 0]; // damage each team has dealt to the other, for the double-knockout tiebreak
  const damage = (target: Fighter, amount: number, source: Fighter | null) => {
    if (target.removed || amount <= 0) return;
    target.peak = Math.max(target.peak, target.toughness);
    const tab = target.def.ability;
    if (tab.kind === "reduceDamage" && amount > 1) {
      const cut = Math.min(tab.amount * target.level, amount - 1);
      amount -= cut;
      say(`  ${label(target)} shrugs it off: -${cut} damage`, "ability", [target]);
    }
    target.toughness -= amount;
    if (source && source.team !== target.team) dealt[source.team] += amount;
    target.lastHitBy = source;
    pendingHurt.push({ target, source });
  };

  // Resolve hurt triggers, then knockouts, repeating until nothing is left to resolve.
  const resolve = () => {
    let guard = 0;
    while (guard++ < 100) {
      const hurts = pendingHurt.sort((x, y) => byFrontThenTeam(x.target, y.target));
      pendingHurt = [];
      for (const { target, source } of hurts) {
        if (target.removed) continue;
        const ab = target.def.ability;
        if (ab.kind === "onHurtGainPunch") {
          target.punch += ab.amount * target.level;
          say(`  ${label(target)} gets angrier: +${ab.amount * target.level} punch (${stats(target)})`, "buff", [target]);
        } else if (ab.kind === "onHurtThrowRandom") {
          const pool = alive((1 - target.team) as 0 | 1).filter((x) => x.toughness > 0);
          const picks: Fighter[] = [];
          for (let k = 0; k < target.level && pool.length; k++) picks.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
          for (const t of picks) {
            say(`  ${label(target)} blows his top and throws a glove at ${t.def.name} for ${ab.amount}`, "ability", [target, t]);
            damage(t, ab.amount, target);
          }
        } else if (ab.kind === "onHurtHitBack" && source && !source.removed && source.team !== target.team) {
          say(`  ${label(target)} sucker punches back`, "ability", [target, source]);
          damage(source, ab.amount * target.level, target);
        }
      }

      const downs = [...lineups[0], ...lineups[1]].filter((f) => !f.removed && f.toughness <= 0).sort(byFrontThenTeam);
      for (const f of downs) {
        const walsh = alive(f.team).find((x) => x !== f && x.toughness > 0 && x.savesLeft > 0);
        if (walsh) {
          walsh.savesLeft--;
          f.toughness = 1;
          say(`  ${label(walsh)} saves ${f.def.name}, who stays up with 1 toughness`, "save", [walsh, f]);
          continue;
        }
        const ab = f.def.ability;
        if (ab.kind === "reviveOnce" && !f.revived) {
          f.revived = true;
          f.toughness = ab.toughness * f.level;
          say(`  ${label(f)} goes down... and gets back up with ${f.toughness} toughness`, "revive", [f]);
          continue;
        }
        f.removed = true;
        say(`  ${label(f)} is knocked out`, "ko", [f]);
        if (ab.kind === "summonOnKnockout") {
          // His replacement takes his spot in the line, with stats that grow with his level.
          const def = GOON_BY_ID[ab.summon];
          const line = lineups[f.team];
          const sub = makeFighter(def, f.team, f.level, ab.punch * f.level, ab.toughness * f.level, false);
          line.splice(line.indexOf(f) + 1, 0, sub);
          say(`  The other twin tags in: ${def.name} ${stats(sub)}`, "summon", [sub]);
        }
        if (ab.kind === "onKnockedOutBuffBehind") {
          const next = behind(f)[0];
          if (next) {
            next.punch += ab.amount * f.level;
            next.toughness += ab.amount * f.level;
            say(`  ${f.def.name} fires up ${next.def.name}: +${ab.amount * f.level}/+${ab.amount * f.level} (${stats(next)})`, "buff", [f, next]);
          }
        }
        const killer = f.lastHitBy;
        if (ab.kind === "onKnockedOutWeakenKiller" && killer && !killer.removed && killer.team !== f.team) {
          const n = ab.amount * f.level;
          killer.punch = Math.max(0, killer.punch - n);
          say(`  ${killer.def.name} breaks his knuckles on ${f.def.name}: -${n} punch (${stats(killer)})`, "ability", [f, killer]);
        }
        for (const mate of alive(f.team)) {
          const mab = mate.def.ability;
          if (mab.kind !== "onTeammateDownHitFront" || mate.toughness <= 0) continue;
          const t = front((1 - f.team) as 0 | 1);
          if (!t) continue;
          say(`  ${label(mate)} fires a rocket at ${t.def.name} for ${mab.amount * mate.level}`, "ability", [mate, t]);
          damage(t, mab.amount * mate.level, mate);
        }
        if (killer && !killer.removed && killer.team !== f.team && killer.def.ability.kind === "onKnockoutGainStats") {
          const n = killer.def.ability.amount * killer.level;
          killer.punch += n;
          killer.toughness += n;
          say(`  ${label(killer)} feeds off the knockout: +${n}/+${n} (${stats(killer)})`, "buff", [killer]);
        }
      }

      for (const side of [0, 1] as const) {
        const left = alive(side);
        const last = left[0];
        if (left.length === 1 && last.def.ability.kind === "lastStandingGainPunch" && !last.lastStandTriggered) {
          last.lastStandTriggered = true;
          last.punch += last.def.ability.amount * last.level;
          say(`  ${label(last)} makes a last stand: +${last.def.ability.amount * last.level} punch (${stats(last)})`, "buff", [last]);
        }
      }

      if (pendingHurt.length === 0) break;
    }
  };

  // ---------- Start of fight ----------
  say(`${teamA.name}: ${lineups[0].map((f) => `${f.def.name} ${stats(f)}`).join(", ") || "(empty)"}`, "lineup");
  say(`${teamB.name}: ${lineups[1].map((f) => `${f.def.name} ${stats(f)}`).join(", ") || "(empty)"}`, "lineup");

  const startKinds = new Set(["weakenEnemyFront", "damageEnemyFront", "mutualDamageFront", "damageAllEnemies", "buffBehindPunch", "buffFrontToughness", "snipeWeakest", "toughnessPerTeammateBehind", "hookBackToFront", "lassoTopPuncher"]);
  // Hooks go first so the other start-of-fight abilities see the new front goon.
  const hookFirst = (f: Fighter) => (f.def.ability.kind === "hookBackToFront" ? 0 : 1);
  const starters = [...lineups[0], ...lineups[1]]
    .filter((f) => startKinds.has(f.def.ability.kind))
    .map((f) => ({ f, tiebreak: rng.next() }))
    .sort((x, y) => hookFirst(x.f) - hookFirst(y.f) || y.f.punch - x.f.punch || x.tiebreak - y.tiebreak)
    .map((x) => x.f);

  if (starters.length) say("Start of fight:", "phase");
  for (const f of starters) {
    if (f.removed) continue;
    const ab = f.def.ability;
    const enemy = (1 - f.team) as 0 | 1;
    if (ab.kind === "weakenEnemyFront") {
      const t = front(enemy);
      if (t) {
        const n = ab.amount * f.level;
        t.punch = Math.max(0, t.punch - n);
        say(`  ${label(f)} chirps at ${t.def.name}: -${n} punch (${stats(t)})`, "ability", [f, t]);
      }
    } else if (ab.kind === "damageEnemyFront") {
      const t = front(enemy);
      if (t) {
        say(`  ${label(f)} hits ${t.def.name} for ${ab.amount * f.level}`, "ability", [f, t]);
        damage(t, ab.amount * f.level, f);
      }
    } else if (ab.kind === "mutualDamageFront") {
      const t = front(enemy);
      if (t) {
        const n = ab.amount * f.level;
        say(`  ${label(f)} tosses his mullet and crashes into ${t.def.name}: ${n} damage each`, "ability", [f, t]);
        damage(t, n, f);
        damage(f, n, t);
      }
    } else if (ab.kind === "snipeWeakest") {
      // Lowest toughness; ties go to the goon closest to the front.
      const t = alive(enemy).reduce<Fighter | null>((best, x) => (!best || x.toughness < best.toughness ? x : best), null);
      if (t) {
        say(`  ${label(f)} fires a slap shot at ${t.def.name} for ${ab.amount * f.level}`, "ability", [f, t]);
        damage(t, ab.amount * f.level, f);
      }
    } else if (ab.kind === "lassoTopPuncher") {
      // Hardest punchers first; ties go to the goon closest to the front. Already-roped goons are skipped.
      const pool = alive(enemy).filter((x) => x.tied === 0).sort((x, y) => y.punch - x.punch || position(x) - position(y));
      for (const t of pool.slice(0, f.level)) {
        t.tied = 1;
        say(`  ${label(f)} lassos ${t.def.name}: he misses his next punch`, "ability", [f, t]);
      }
    } else if (ab.kind === "hookBackToFront") {
      const enemies = alive(enemy);
      const t = enemies[enemies.length - 1];
      if (t) {
        if (enemies.length > 1) {
          const line = lineups[enemy];
          line.splice(line.indexOf(t), 1);
          line.unshift(t);
          say(`  ${label(f)} hooks ${t.def.name} and drags him to the front`, "ability", [f, t]);
        }
        damage(t, ab.amount * f.level, f);
      }
    } else if (ab.kind === "toughnessPerTeammateBehind") {
      const n = behind(f).length * ab.amount * f.level;
      if (n > 0) {
        f.toughness += n;
        say(`  ${label(f)} anchors the line: +${n} toughness (${stats(f)})`, "buff", [f]);
      }
    } else if (ab.kind === "damageAllEnemies") {
      say(`  ${label(f)} windmills into everyone for ${ab.amount * f.level}`, "ability", [f]);
      for (const t of alive(enemy)) damage(t, ab.amount * f.level, f);
    } else if (ab.kind === "buffBehindPunch") {
      const team = behind(f);
      for (const t of team) t.punch += ab.amount * f.level;
      if (team.length) say(`  ${label(f)} rallies the goons behind him: +${ab.amount * f.level} punch`, "ability", [f, ...team]);
    } else if (ab.kind === "buffFrontToughness") {
      const t = front(f.team);
      if (t) {
        t.toughness += ab.amount * f.level;
        say(`  ${label(f)} pumps up ${t.def.name}: +${ab.amount * f.level} toughness (${stats(t)})`, "ability", [f, t]);
      }
    }
    say("", "impact");
    resolve();
  }

  // ---------- Exchanges ----------
  let exchanges = 0;
  while (front(0) && front(1) && exchanges < MAX_EXCHANGES) {
    exchanges++;
    const a = front(0)!;
    const b = front(1)!;
    const hit = (f: Fighter) => {
      const ab = f.def.ability;
      if (ab.kind === "firstPunchMultiplier" && f.punchesThrown === 0) {
        return f.punch * (1 + (ab.multiplier - 1) * f.level);
      }
      if (ab.kind === "whipBackswing" && f.punch > 0) return f.punch + ab.amount * f.level;
      return f.punch;
    };
    const tiedA = a.tied > 0;
    const tiedB = b.tied > 0;
    const dmgToB = tiedA ? 0 : hit(a);
    const dmgToA = tiedB ? 0 : hit(b);
    say(`Exchange ${exchanges}: ${a.def.name} ${stats(a)} vs ${b.def.name} ${stats(b)}`, "exchange", [a, b]);
    for (const [f, tied] of [[a, tiedA], [b, tiedB]] as const) {
      if (tied) say(`  ${label(f)} is tied up in the lasso and can't punch`, "ability", [f]);
      else if (f.def.ability.kind === "firstPunchMultiplier" && f.punchesThrown === 0) say(`  ${label(f)} throws the uppercut!`, "ability", [f]);
    }
    if (tiedA) a.tied--;
    if (tiedB) b.tied--;
    say(`  ${a.def.name} hits for ${dmgToB}, ${b.def.name} hits for ${dmgToA}`);
    a.punchesThrown++;
    b.punchesThrown++;
    const punchLands = (target: Fighter, dmg: number) => {
      if (target.mouthguard && dmg > 0) {
        target.mouthguard = false;
        say(`  ${label(target)}'s mouthguard takes the punch`, "ability", [target]);
        return 0;
      }
      return dmg;
    };
    // Big Bertrand, right behind the front goon, takes half of each punch aimed at him.
    const guard = (target: Fighter, dmg: number, source: Fighter) => {
      const mates = alive(target.team);
      const g = mates[1];
      if (dmg < 2 || mates[0] !== target || !g || g.def.ability.kind !== "bodyguard" || g.toughness <= 0) return dmg;
      const share = Math.floor(dmg / 2);
      say(`  ${label(g)} steps in and takes ${share} for ${target.def.name}`, "ability", [g, target]);
      damage(g, share, source);
      return dmg - share;
    };
    const landedOnB = guard(b, punchLands(b, dmgToB), a);
    const landedOnA = guard(a, punchLands(a, dmgToA), b);
    const beforeB = b.toughness, beforeA = a.toughness;
    damage(b, landedOnB, a);
    damage(a, landedOnA, b);
    // Zamboni Zeke: whatever his punch didn't need carries through to the next enemy.
    for (const [f, t, landed, before] of [[a, b, landedOnB, beforeB], [b, a, landedOnA, beforeA]] as const) {
      if (f.def.ability.kind !== "overkillCarry") continue;
      const excess = landed - Math.max(0, before);
      const next = alive(t.team).filter((x) => x !== t)[0];
      if (excess <= 0 || !next) continue;
      say(`  ${label(f)} plows straight through into ${next.def.name} for ${excess}`, "ability", [f, next]);
      damage(next, excess, f);
    }
    for (const f of [a, b]) {
      if (f.def.ability.kind !== "whipBackswing" || f.punch <= 0 || (f === a ? tiedA : tiedB)) continue;
      const mate = behind(f)[0];
      if (!mate) continue;
      say(`  ${label(f)}'s backswing clips ${mate.def.name} for 1`, "ability", [f, mate]);
      damage(mate, 1, f);
    }
    for (const [f, side] of [[a, 1], [b, 0]] as const) {
      const ab = f.def.ability;
      if (ab.kind !== "punchSplashBehind" || f.punch <= 0 || (f === a ? tiedA : tiedB)) continue;
      const second = alive(side)[1];
      if (!second) continue;
      say(`  ${label(f)}'s stick catches ${second.def.name} for ${ab.amount * f.level}`, "ability", [f, second]);
      damage(second, ab.amount * f.level, f);
    }
    say("", "impact", [a, b]);
    resolve();
    // Doc patches up the front goon once the exchange is over.
    for (const side of [0, 1] as const) {
      for (const f of alive(side)) {
        if (f.def.ability.kind !== "healFront" || f.toughness <= 0) continue;
        const t = front(side);
        if (!t) continue;
        t.peak = Math.max(t.peak, t.toughness);
        const n = Math.min(f.def.ability.amount * f.level, t.peak - t.toughness);
        if (n <= 0) continue;
        t.toughness += n;
        say(`  ${label(f)} patches up ${t === f ? "himself" : t.def.name}: +${n} toughness (${stats(t)})`, "buff", [f, t]);
      }
    }
    // Spark plugs charge up the teammate in front of them once the exchange is over.
    for (const side of [0, 1] as const) {
      for (const f of alive(side)) {
        if (f.def.ability.kind !== "sparkAhead" || f.toughness <= 0) continue;
        const ahead = alive(side).filter((x) => position(x) < position(f)).pop();
        if (!ahead) continue;
        const n = f.def.ability.amount * f.level;
        ahead.punch += n;
        ahead.toughness += n;
        say(`  ${label(f)} sparks ${ahead.def.name}: +${n}/+${n} (${stats(ahead)})`, "buff", [f, ahead]);
      }
    }
  }

  // ---------- Result ----------
  const leftA = alive(0).length;
  const leftB = alive(1).length;
  if (leftA > 0 && leftB === 0) {
    say(wins(teamA.name), "result");
    return { winner: 0, decidedBy: "fight", exchanges, log, events };
  }
  if (leftB > 0 && leftA === 0) {
    say(wins(teamB.name), "result");
    return { winner: 1, decidedBy: "fight", exchanges, log, events };
  }

  // Both teams out together: whoever dealt more damage over the whole fight wins.
  if (exchanges < MAX_EXCHANGES && dealt[0] !== dealt[1]) {
    const w = dealt[0] > dealt[1] ? 0 : 1;
    say(`Both teams are out. ${[teamA.name, teamB.name][w]} dealt more damage (${dealt[w]} to ${dealt[1 - w]}).`, "result");
    say(wins([teamA.name, teamB.name][w]), "result");
    return { winner: w as 0 | 1, decidedBy: "damage", exchanges, log, events };
  }
  say(exchanges >= MAX_EXCHANGES ? "Safety limit reached: it's a tie." : "Both teams are out with equal damage: it's a tie.", "result");
  const coachWinner = coachTiebreak(teamA, teamB, (l) => say(l, "coach"));
  if (coachWinner === null) return { winner: null, decidedBy: "tie", exchanges, log, events };
  return { winner: coachWinner, decidedBy: "coach", exchanges, log, events };
}

// ---------- Coach tiebreaker ----------
// Each coach's punch and toughness are his team's totals going into the fight,
// multiplied by his stack bonus (1.0 / 1.1 / 1.2) and rounded.
function coachTiebreak(teamA: TeamInput, teamB: TeamInput, say: (l: string) => void): 0 | 1 | null {
  const ca = Math.min(teamA.coaches, MAX_COACHES);
  const cb = Math.min(teamB.coaches, MAX_COACHES);
  if (ca === 0 && cb === 0) {
    say("No coaches: the tie stands.");
    return null;
  }
  if (ca > 0 && cb === 0) { say(`${teamA.name} has a coach and takes the tie.`); return 0; }
  if (cb > 0 && ca === 0) { say(`${teamB.name} has a coach and takes the tie.`); return 1; }

  const coachStats = (t: TeamInput, n: number) => {
    const m = COACH_MULTIPLIER[n];
    const punch = Math.round(t.goons.reduce((s, g) => s + g.punch, 0) * m);
    const toughness = Math.round(t.goons.reduce((s, g) => s + g.toughness, 0) * m);
    return { punch, toughness };
  };
  const a = coachStats(teamA, ca);
  const b = coachStats(teamB, cb);
  say(`Coach fight: ${teamA.name}'s coach ${a.punch}/${a.toughness} vs ${teamB.name}'s coach ${b.punch}/${b.toughness}`);
  for (let i = 0; i < MAX_EXCHANGES; i++) {
    a.toughness -= b.punch;
    b.toughness -= a.punch;
    if (a.toughness <= 0 && b.toughness <= 0) { say("Both coaches go down: the tie stands."); return null; }
    if (b.toughness <= 0) { say(`${teamA.name}'s coach wins the tiebreaker.`); return 0; }
    if (a.toughness <= 0) { say(`${teamB.name}'s coach wins the tiebreaker.`); return 1; }
  }
  say("The coaches can't finish it: the tie stands.");
  return null;
}
