# Hockey Goons

Steps 1 to 5 of the build plan in `SPEC.md`: the fight engine, the shop and run loop, computer opponents, and a playable browser version with the goon art.

## Play in your browser

Double-click **Play Hockey Goons.html**. No setup needed.

Drag a goon from the shop onto a slot on the ice to sign him. Drag your goons to reorder them, onto a matching goon to stack them, or onto **Sell**. Tapping works too: tap a goon, then tap a slot. Hit **Fight** when your lineup is ready.

To rebuild the browser version after changing stats or rules, run `node web/build.mjs`. It writes `dist/hockey-goons.html`; copy it over `Play Hockey Goons.html`.

## Setup

Install [Node.js](https://nodejs.org) version 22.6 or newer. There is nothing else to install.

Open a terminal in this folder and try:

```
npm run play     play a full run as text
npm test         rule checks with known answers
npm run fight    one random fight with a play-by-play
npm run sim      fight balance report: 10,000 random fights per round bracket
npm run runs     2,000 simulated full runs by a computer player
```

## Playing a run

```
npm run play
npm run play -- --seed 42        replay the same shop rolls and opponents
```

Type `help` in the game for the commands. The basics:

| Command | What it does |
| --- | --- |
| `buy 2` | Buy goon offer 2. Stacks onto a matching goon, or takes the first empty slot |
| `buy 2 4` | Buy goon offer 2 into slot 4 |
| `gear 1 3` | Buy gear offer 1 for the goon in slot 3 |
| `coach` | Hire a coach (from round 8) |
| `sell 3` | Sell the goon in slot 3 |
| `move 1 3` | Move the goon in slot 1 to slot 3 (matching goons stack) |
| `freeze 2` / `freeze g1` | Keep a goon or gear offer for next round |
| `roll` | Reroll the shop for 1 puck |
| `fight` | End the shop phase and fight |
| `quiet` / `loud` | Hide or show the play-by-play |

## Running single fights

```
npm run fight -- --a larry,tommy,moose --b mcgraw,gus,stan
npm run fight -- --a "larry*3,sal" --b hammer --coachA 1 --coachB 2
npm run fight -- --seed 42
npm run fight -- --help          lists every goon id
```

- `--a` and `--b` are lineups in slot order, slot 1 first. Leave one out for a random lineup.
- `larry*3` means three copies stacked, which makes a level 2 Larry.
- `--coachA` and `--coachB` set how many coaches each team has stacked (0 to 3).

## Balance reports

`npm run sim` shows each goon's win rate in random lineups, split by the round brackets from the spec, plus one-on-one duels. A healthy goon sits near 50% against goons of its own tier.

`npm run runs` plays whole runs with a computer player. It checks that runs work end to end and shows how often runs reach and win the championship, how often fights tie, and which goons title-winning teams use. The computer player shops simply, so treat its picks as a hint, not proof.

## Changing stats and rules

Every goon's punch, toughness and ability, the shop sizes, prices and gear live in `src/data.ts`. Change a number there, rerun the reports, and compare.

## Files

| File | What it does |
| --- | --- |
| `src/data.ts` | Goon stats and abilities, gear, prices, shop sizes, coach multipliers |
| `src/engine.ts` | The fight rules |
| `src/shop.ts` | The shop, lineup, leveling, gear, coaches, wins and losses |
| `src/ai.ts` | How computer teams shop and set their lineup |
| `src/run.ts` | A full run: a fresh computer opponent every round |
| `src/play.ts` | The `play` command |
| `src/fight.ts` | The `fight` command |
| `src/sim.ts` | The `sim` fight balance report |
| `src/runs.ts` | The `runs` full-run report |
| `src/rng.ts` | Seeded random numbers, so everything replays exactly |
| `src/lineups.ts` | Building lineups by hand or at random for tests |
| `src/test.ts` | Rule checks |
| `web/game.html` | The browser game's screens and animations |
| `web/build.mjs` | Bundles the engine and art into one HTML file |
| `web/assets/` | Web-sized goon art and the rink |
