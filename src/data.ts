// All goon stats and abilities live here. Tweak numbers in this file to rebalance.
// Ability "amount" is the level 1 value; it doubles at level 2 and triples at level 3.

export type Tier = 1 | 2 | 3 | 4;

export type Ability =
  // Start of fight
  | { kind: "weakenEnemyFront"; amount: number } // enemy front goon loses punch
  | { kind: "damageEnemyFront"; amount: number } // deal damage to enemy front goon
  | { kind: "damageAllEnemies"; amount: number } // deal damage to every enemy goon
  | { kind: "mutualDamageFront"; amount: number } // he and the enemy front goon both take damage
  | { kind: "buffBehindPunch"; amount: number } // every teammate behind gets +punch
  | { kind: "buffFrontToughness"; amount: number } // your front goon gets +toughness
  | { kind: "snipeWeakest"; amount: number } // ranged: damage the enemy goon with the lowest toughness
  | { kind: "lassoTopPuncher"; amount: number } // start of fight: tie up the hardest-punching enemy (1 per level): he misses his next punch
  | { kind: "hookBackToFront"; amount: number } // start of fight: drag the enemy's back goon to the front and hit him
  | { kind: "toughnessPerTeammateBehind"; amount: number } // start of fight: +toughness for each teammate behind him
  // During the fight (more)
  | { kind: "onTeammateDownHitFront"; amount: number } // a teammate is knocked out: damage the enemy front goon
  | { kind: "onKnockedOutWeakenKiller"; amount: number } // knocked out: whoever did it loses punch
  // During the fight
  | { kind: "firstPunchMultiplier"; multiplier: number } // first punch deals extra damage
  | { kind: "onHurtGainPunch"; amount: number } // takes a hit: +punch
  | { kind: "onHurtHitBack"; amount: number } // takes a hit: damage back to the attacker
  | { kind: "onHurtThrowRandom"; amount: number } // takes a hit: deal amount to 1 random enemy per level (different goons)
  | { kind: "onKnockoutGainStats"; amount: number } // knocks someone out: +punch and +toughness
  | { kind: "onKnockedOutBuffBehind"; amount: number } // knocked out: goon behind gets +punch and +toughness
  | { kind: "reviveOnce"; toughness: number } // knocked out: gets back up once
  | { kind: "lastStandingGainPunch"; amount: number } // only teammate left: +punch
  | { kind: "saveTeammate"; uses: number } // a teammate that would be knocked out survives with 1
  | { kind: "reduceDamage"; amount: number } // every hit he takes deals less damage (never below 1)
  | { kind: "healFront"; amount: number } // after each exchange: heal the front teammate (never above his best toughness this fight)
  | { kind: "overkillCarry" } // his punch knocks out the front goon: leftover damage hits the next enemy
  | { kind: "bodyguard" } // directly behind the front goon: takes half of every punch aimed at that goon
  | { kind: "sparkAhead"; amount: number } // after each exchange: the teammate directly ahead gets +punch and +toughness for this fight
  | { kind: "whipBackswing"; amount: number } // punches deal +amount; his backswing deals 1 to the teammate behind him
  | { kind: "punchSplashBehind"; amount: number } // his punches also hit the enemy goon behind the front one
  | { kind: "summonOnKnockout"; summon: string; punch: number; toughness: number } // knocked out: a new goon takes his spot (stats x level)
  | { kind: "none" }
  // Shop only (does nothing in a fight)
  | { kind: "endOfShopGainToughness"; amount: number }
  | { kind: "endOfShopBuffFrontPunch"; amount: number } // end of shop: the goon in front of him gets +punch permanently
  | { kind: "bonusPucks"; amount: number }; // each new shop phase starts with extra pucks while he's in the lineup

export type GoonDef = {
  id: string;
  name: string;
  tier: Tier;
  goalie?: boolean; // a goalie by trade: shown on his card, no rules effect yet
  punch: number;
  toughness: number;
  ability: Ability;
  abilityText: string;
};

export const GOONS: GoonDef[] = [
  // Tier 1 · round 1
  { id: "tommy", name: "Toothless Tommy", tier: 1, punch: 2, toughness: 3,
    ability: { kind: "weakenEnemyFront", amount: 1 },
    abilityText: "Start of fight: the enemy front goon loses 1 punch." },
  { id: "eddie", name: "Elbows Eddie", tier: 1, punch: 3, toughness: 1,
    ability: { kind: "damageEnemyFront", amount: 1 },
    abilityText: "Start of fight: deal 1 damage to the enemy front goon." },
  { id: "dusty", name: "Dusty the Grinder", tier: 1, punch: 2, toughness: 2,
    ability: { kind: "onKnockedOutBuffBehind", amount: 1 },
    abilityText: "Knocked out: the goon behind him gets +1 punch and +1 toughness." },
  { id: "craig", name: "Bobby Brawler", tier: 1, punch: 2, toughness: 3,
    ability: { kind: "onKnockedOutWeakenKiller", amount: 1 },
    abilityText: "Broken knuckles: when he's knocked out, the goon who did it breaks his knuckles and loses 1 punch." },
  { id: "randy", name: "Rookie Randy", tier: 1, punch: 1, toughness: 3,
    ability: { kind: "endOfShopGainToughness", amount: 1 },
    abilityText: "End of shop phase: gains +1 toughness permanently." },
  { id: "kowalski", name: "Kowalski", tier: 1, punch: 2, toughness: 2,
    ability: { kind: "endOfShopBuffFrontPunch", amount: 1 },
    abilityText: "Film study: end of each shop phase, the goon in front of him gets +1 punch permanently." },
  { id: "sid", name: "Cross-Check Chris", tier: 1, punch: 2, toughness: 2,
    ability: { kind: "punchSplashBehind", amount: 1 },
    abilityText: "Cross-check: every punch also hits the enemy goon behind the front one for 1." },
  { id: "henry", name: "Hooking Henry", tier: 1, punch: 2, toughness: 3,
    ability: { kind: "hookBackToFront", amount: 1 },
    abilityText: "Hook: start of fight, hooks the enemy's back goon, drags him to the front and deals 1 damage." },

  // Tier 2 · round 3
  { id: "larry", name: "Uppercut Larry", tier: 2, punch: 4, toughness: 4,
    ability: { kind: "firstPunchMultiplier", multiplier: 2 },
    abilityText: "His first punch deals double damage." },
  { id: "mcgraw", name: "Mullet McGraw", tier: 2, punch: 4, toughness: 4,
    ability: { kind: "mutualDamageFront", amount: 2 },
    abilityText: "Mullet toss: start of fight, he and the enemy front goon both take 2 damage." },
  { id: "pete", name: "Pretty Boy Pete", tier: 2, punch: 3, toughness: 3,
    ability: { kind: "snipeWeakest", amount: 2 },
    abilityText: "Slap shot: start of fight, deal 2 damage to the enemy goon with the lowest toughness." },
  { id: "sal", name: "Sucker Punch Sal", tier: 2, punch: 4, toughness: 4,
    ability: { kind: "onHurtHitBack", amount: 1 },
    abilityText: "Takes a hit: deals 1 damage back to whoever hit him." },
  { id: "sebastien", name: "Sébastien Spark", tier: 2, punch: 2, toughness: 3,
    ability: { kind: "sparkAhead", amount: 1 },
    abilityText: "Spark plug: after every exchange, zaps the teammate directly in front of him for +1 punch and +1 toughness. It keeps building all fight." },
  { id: "twins", name: "The Camo Twins", tier: 2, punch: 3, toughness: 3,
    ability: { kind: "summonOnKnockout", summon: "twin", punch: 2, toughness: 2 },
    abilityText: "Tag in: when he's knocked out, his twin brother steps in to take his spot as a 2/2 (4/4 at level 2, 6/6 at level 3)." },
  { id: "doc", name: "Dr. Sawbones", tier: 2, punch: 2, toughness: 4,
    ability: { kind: "healFront", amount: 2 },
    abilityText: "Patch up: after every exchange, heals your front goon for 2 (never above his best toughness this fight)." },
  { id: "willie", name: "Whipping Willie", tier: 2, punch: 3, toughness: 5,
    ability: { kind: "whipBackswing", amount: 1 },
    abilityText: "Whip: his punches deal +1 damage, but his backswing hits the teammate behind him for 1. Line up a goon who likes getting hit." },
  { id: "glen", name: "Greedy Glen", tier: 2, goalie: true, punch: 2, toughness: 5,
    ability: { kind: "bonusPucks", amount: 1 },
    abilityText: "Payday: while he's in your lineup, every shop phase starts with +1 puck (+2 at level 2, +3 at level 3)." },

  // Tier 3 · round 5
  { id: "stan", name: "Stitches Stan", tier: 3, punch: 4, toughness: 5,
    ability: { kind: "reviveOnce", toughness: 1 },
    abilityText: "Knocked out: gets back up once with 1 toughness." },
  { id: "frankie", name: "Short Fuse Frankie", tier: 3, punch: 3, toughness: 5,
    ability: { kind: "onHurtThrowRandom", amount: 2 },
    abilityText: "Short fuse: every time he takes a hit, he throws a glove at a random enemy for 2. Level 2 throws at 2 enemies, level 3 at 3." },
  { id: "ted", name: "Texas Ted", tier: 3, punch: 3, toughness: 5,
    ability: { kind: "lassoTopPuncher", amount: 1 },
    abilityText: "Lasso: start of fight, ropes the enemy goon with the most punch. He misses his next punch. Level 2 ropes 2 goons, level 3 ropes 3." },
  { id: "moose", name: "Big Moose", tier: 3, punch: 3, toughness: 8,
    ability: { kind: "onHurtGainPunch", amount: 1 },
    abilityText: "Takes a hit: gains +1 punch for this fight." },
  { id: "knuckles", name: "Captain Knuckles", tier: 3, punch: 4, toughness: 6,
    ability: { kind: "buffBehindPunch", amount: 1 },
    abilityText: "Start of fight: every goon behind him gets +1 punch." },
  { id: "ike", name: "Iron Ike", tier: 3, punch: 4, toughness: 6,
    ability: { kind: "toughnessPerTeammateBehind", amount: 1 },
    abilityText: "Anchor: start of fight, gains +1 toughness for each teammate behind him." },
  { id: "sam", name: "Scared Sammy", tier: 3, goalie: true, punch: 3, toughness: 7,
    ability: { kind: "buffFrontToughness", amount: 2 },
    abilityText: "Start of fight: your front goon gets +2 toughness." },

  // Tier 4 · round 7 · the heavy hitters
  { id: "hammer", name: "The Hammer", tier: 4, punch: 6, toughness: 6,
    ability: { kind: "onKnockoutGainStats", amount: 2 },
    abilityText: "Knocks someone out: gains +2 punch and +2 toughness for this fight." },
  { id: "gus", name: "Cyclone Gus", tier: 4, punch: 5, toughness: 5,
    ability: { kind: "damageAllEnemies", amount: 1 },
    abilityText: "Start of fight: deal 1 damage to every enemy goon." },
  { id: "otto", name: "Old Man Otto", tier: 4, punch: 5, toughness: 7,
    ability: { kind: "reduceDamage", amount: 1 },
    abilityText: "Old school: every hit he takes deals 1 less damage (always at least 1)." },
  { id: "brick", name: "Benoît the Brick", tier: 4, goalie: true, punch: 5, toughness: 9,
    ability: { kind: "lastStandingGainPunch", amount: 4 },
    abilityText: "When he is the only teammate left: +4 punch." },
  { id: "walsh", name: "Wall Walsh", tier: 4, goalie: true, punch: 5, toughness: 8,
    ability: { kind: "saveTeammate", uses: 1 },
    abilityText: "The first time a teammate would be knocked out, he survives with 1 toughness." },
  { id: "richard", name: "Richard the Rocket", tier: 4, goalie: true, punch: 4, toughness: 8,
    ability: { kind: "onTeammateDownHitFront", amount: 2 },
    abilityText: "Rocket shot: every time a teammate is knocked out, he deals 2 damage to the enemy front goon." },
  { id: "zeke", name: "Zamboni Zeke", tier: 4, punch: 6, toughness: 6,
    ability: { kind: "overkillCarry" },
    abilityText: "Clean sweep: when his punch knocks out the front goon, the leftover damage carries through to the next enemy." },
  { id: "bertrand", name: "Big Bertrand", tier: 4, punch: 5, toughness: 10,
    ability: { kind: "bodyguard" },
    abilityText: "Bodyguard: standing directly behind your front goon, he takes half of every punch aimed at him." },
];

// Goons that only appear during a fight (never in the shop or the card packs).
export const TOKENS: GoonDef[] = [
  { id: "twin", name: "Camo Twin", tier: 2, punch: 2, toughness: 2,
    ability: { kind: "none" },
    abilityText: "The other Camo Twin. He tags in when his brother goes down." },
];

export const GOON_BY_ID: Record<string, GoonDef> = Object.fromEntries([...GOONS, ...TOKENS].map((g) => [g.id, g]));

// Coach tiebreaker multipliers by stack size (index = number of coaches).
export const COACH_MULTIPLIER = [0, 1.0, 1.1, 1.2];
export const MAX_COACHES = 3;

export const MAX_EXCHANGES = 50;
export const LINEUP_SLOTS = 5;

// ---------- Shop ----------

export const STARTING_PUCKS = 10;
export const GOON_COST = 3;
export const GEAR_COST = 3;
export const COACH_COST = 3;
export const ROLL_COST = 1;
export const MAX_COPIES = 6;
export const WINS_TO_CHAMPIONSHIP = 9; // the championship is the 10th win
export const LOSSES_TO_END = 5;
export const COACH_FROM_ROUND = 8;

// Shop size by round. A first guess: tune after testing.
export function shopSize(round: number): { goons: number; gear: number; tiers: Tier[] } {
  if (round <= 2) return { goons: 3, gear: 1, tiers: [1] };
  if (round <= 4) return { goons: 4, gear: 1, tiers: [1, 2] };
  if (round <= 6) return { goons: 4, gear: 2, tiers: [1, 2, 3] };
  return { goons: 5, gear: 2, tiers: [1, 2, 3, 4] };
}

export type GearDef = { id: string; name: string; text: string; target: "goon" | "team" };

export const GEAR: GearDef[] = [
  { id: "tape", name: "Tape Job", text: "+1 punch, permanent", target: "goon" },
  { id: "ice", name: "Ice Pack", text: "+1 toughness, permanent", target: "goon" },
  { id: "drink", name: "Energy Drink", text: "+1 punch and +1 toughness, permanent", target: "goon" },
  { id: "mouthguard", name: "Mouthguard", text: "Ignores the first punch of the next fight", target: "goon" },
  { id: "peptalk", name: "Pep Talk", text: "Every goon in the lineup gets +1 punch for the next fight", target: "team" },
];

export const GEAR_BY_ID: Record<string, GearDef> = Object.fromEntries(GEAR.map((g) => [g.id, g]));
