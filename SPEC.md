# Hockey Goons game spec

Oct 20, 2026 · @Bro

## Overview

Hockey Goons is an auto battler in the style of Super Auto Pets: you build a lineup of cartoon hockey goons in a shop, then watch them brawl another team slot against slot. Every fight is decided by math and played back as an animation.

Version 1 covers one complete run: the shop, a 5-goon lineup plus a coach, fights against computer teams, leveling and gear, and the 15 goons with finished art. Online opponents and the full animation rig come later.

## Run structure

A run is a series of rounds. Win 9 fights before losing 5 and you earn a spot in the championship game. Lose 5 first and the run ends. There is no limit on the number of rounds.

1. **Shop phase:** spend pucks to build and arrange your lineup.
2. **Fight phase:** your lineup fights a computer team of the same round. Nothing the player does affects the fight.
3. **Result:** a win, a loss or a draw. A tie is settled by the coaches (see Coaches); a tie with no coach on either side counts as neither a win nor a loss.
4. The next round starts with a fresh 10 pucks.

The championship is the 10th win: one final fight against a tougher team, with no retry. Win it and the run is complete; lose it and the run ends. A championship tie that no coach breaks counts as a loss.

Damage taken in a fight does not carry over. Every fight starts from your goons' current stats, including any permanent buffs bought in the shop.

## Shop and pucks

Every round starts with 10 pucks. Pucks left at the end of the shop phase are lost, so there is no saving up.

| Action | Cost | Notes |
| --- | --- | --- |
| Buy a goon | 3 pucks | Goes into an empty slot, or onto a matching goon to level it up |
| Buy gear | 3 pucks | Applied to one goon in your lineup |
| Reroll the shop | 1 puck | Replaces every unfrozen offer |
| Sell a goon | +1 puck | +1 more per level above 1 |
| Freeze an offer | Free | Keeps it in the shop for next round |

The shop grows as the run goes on, and only offers goons from the tiers unlocked so far. Each offer picks one of the unlocked tiers at random (all equally likely), then a goon from that tier, so a tier with more goons isn't offered more often. The sizes below are a first guess to tune in testing:

| Rounds | Goons offered | Gear offered | Tiers in the shop |
| --- | --- | --- | --- |
| 1 to 2 | 3 | 1 | Tier 1 |
| 3 to 4 | 4 | 1 | Tiers 1 and 2 |
| 5 to 6 | 4 | 2 | Tiers 1, 2 and 3 |
| 7 and later | 5 | 2 | Tiers 1, 2, 3 and 4 |

Coaches are not sold in the shop: every team has a bench coach (see Bench coaches).

Every unlocked tier has an equal chance of each offer, then every goon in that tier has an equal chance.

## Lineup

Your team has 5 lineup slots, numbered 1 to 5 from front to back, plus a coach slot. Slot 1 fights first.

- During the shop phase you can drag goons between slots to change the order at no cost. Dropping a goon on a slot held by a different goon puts him there and slides the others toward the nearest empty slot, back toward slot 5 when there's room, otherwise forward. This works for new goons from the shop too, as long as the lineup has an empty slot.
- Empty slots are allowed. The lineup fights with whoever is in it.
- Goalies are spread across the tiers like everyone else. "Goalie" is a label on their cards; they can go in any slot, but most of their abilities are built for the back.
- The coach never fights in the lineup. He only breaks ties (see Coaches).
- Order matters because of abilities: some hit the enemy front goon, some buff the goon behind them, and some only trigger when a teammate goes down.

## Fight rules

The front goon of each team fights the other team's front goon, like Super Auto Pets. Your slot 1 starts against their slot 1; when a goon is knocked out, the next goon in line steps up.

1. **Start of fight:** every "start of fight" ability triggers once. They resolve in order of highest punch first, across both teams. Ties are broken by a seeded coin flip.
2. **Exchange:** the two front goons hit each other at the same time. Each loses toughness equal to the other's punch.
3. **Hit triggers:** "takes a hit" abilities trigger for any goon that lost toughness.
4. **Knockouts:** any goon at 0 toughness or less is knocked out and removed. Its "knocked out" ability triggers, then the attacker's "knocks someone out" ability.
5. **Step up:** the next goon in line moves to the front. Repeat from step 2.

The fight ends when one team has no goons left. If both teams run out on the same exchange, the team that dealt more damage over the whole fight wins (damage to your own teammates doesn't count). Only equal damage makes a tie, settled by the coaches. A fight that reaches 50 exchanges also ends in a tie, as a safety limit.

When two abilities trigger at the same moment, the goon closer to the front resolves first, starting with the player's team. All randomness comes from one seeded random number generator, so any fight can be replayed exactly.

## Leveling and gear

Buying a goon you already own and dropping it onto him stacks them. Each extra copy gives +1 punch and +1 toughness. Two matching goons already in your lineup can also be stacked by dragging one onto the other: their copies and gear bonuses combine, up to 6 copies.

| Copies | Level | Effect |
| --- | --- | --- |
| 1 | 1 | Base stats and ability |
| 3 | 2 | Ability numbers double |
| 6 | 3 | Ability numbers triple |

Gear is a one-time buff bought from the shop and applied to one goon:

| Gear | Effect |
| --- | --- |
| Tape Job | +1 punch, permanent |
| Ice Pack | +1 toughness, permanent |
| Energy Drink | +1 punch and +1 toughness, permanent |
| Mouthguard | Ignores the first punch of the next fight |
| Pep Talk | Every goon in the lineup gets +1 punch for the next fight |

## Roster

Version 1 has 34 goons with finished art. Pretty Boy Pete is a placeholder name and stat line for the newest goon, a ranged sniper like Super Auto Pets' dolphin. Stats are starting points for testing, not final balance. Tier 4 (round 7) holds the heavy hitters, with stats a step above tier 3.

| Goon | Tier | Punch | Toughness | Trigger | Ability (level 1) |
| --- | --- | --- | --- | --- | --- |
| Toothless Tommy | 1 | 2 | 3 | Start of fight | The enemy front goon loses 1 punch |
| Elbows Eddie | 1 | 3 | 1 | Start of fight | Deal 1 damage to the enemy front goon |
| Dusty the Grinder | 1 | 2 | 2 | Knocked out | The goon behind him gets +1 punch and +1 toughness for this fight |
| Rookie Randy | 1 | 1 | 3 | End of shop phase | Gains +1 toughness permanently |
| Kowalski | 1 | 2 | 2 | End of shop phase | Film study: the goon in front of him gets +1 punch permanently |
| Bobby Brawler | 1 | 2 | 3 | Knocked out | Broken knuckles: the goon who knocked him out breaks his knuckles and loses 1 punch |
| Cross-Check Chris | 1 | 2 | 2 | Each punch | Cross-check: every punch also hits the enemy goon behind the front one for 1 |
| Hooking Henry | 1 | 2 | 3 | Start of fight (goes first) | Hook: drags the enemy's back goon to the front and deals 1 damage to him |
| Uppercut Larry | 2 | 4 | 4 | First exchange | His first punch deals double damage |
| Mullet McGraw | 2 | 4 | 4 | Start of fight | Mullet toss: he and the enemy front goon both take 2 damage |
| Sucker Punch Sal | 2 | 4 | 4 | Takes a hit | Deals 1 damage back to whoever hit him |
| Pretty Boy Pete | 2 | 3 | 3 | Start of fight | Slap shot: deal 2 damage to the enemy goon with the lowest toughness (ties go to the one closest to the front) |
| Whipping Willie | 2 | 3 | 5 | Each punch | Whip: his punches deal +1 damage, but his backswing hits the teammate behind him for 1 (a teammate's hit-back or broken-knuckles ability never fires at him) |
| Sébastien Spark | 2 | 2 | 3 | After each exchange | Spark plug: zaps the teammate directly in front of him for +1 punch and +1 toughness (this fight), building every exchange |
| The Camo Twins | 2 | 3 | 3 | Knocked out | Tag in: his twin brother (Camo Twin, no ability) takes his spot as a 2/2; 4/4 at level 2, 6/6 at level 3 |
| Dr. Sawbones | 2 | 2 | 4 | After each exchange | Patch up: heals your front goon for 2, never above his best toughness this fight |
| Greedy Glen | 2 (goalie) | 2 | 5 | Start of shop phase | Payday: while he's in your lineup, every shop phase starts with +1 puck (+2 at level 2, +3 at level 3) |
| Stitches Stan | 3 | 4 | 5 | Knocked out | Gets back up once with 1 toughness |
| Short Fuse Frankie | 3 | 3 | 5 | Takes a hit | Short fuse: throws a glove at a random enemy for 2; level 2 throws at 2 different enemies, level 3 at 3 |
| Texas Ted | 3 | 3 | 5 | Start of fight | Lasso: ropes the enemy goon with the most punch, who misses his next punch (a missed first punch also wastes Uppercut Larry's uppercut); level 2 ropes 2 goons, level 3 ropes 3 |
| Big Moose | 3 | 3 | 8 | Takes a hit | Gains +1 punch for this fight |
| Captain Knuckles | 3 | 4 | 6 | Start of fight | Every goon behind him gets +1 punch for this fight |
| Iron Ike | 3 | 4 | 6 | Start of fight | Anchor: +1 toughness for each teammate behind him |
| Scared Sammy | 3 (goalie) | 3 | 7 | Start of fight | Your front goon gets +2 toughness for this fight |
| The Hammer | 4 | 6 | 6 | Knocks someone out | Gains +2 punch and +2 toughness for this fight |
| Cyclone Gus | 4 | 5 | 5 | Start of fight | Deal 1 damage to every enemy goon |
| Old Man Otto | 4 | 5 | 7 | Takes a hit | Old school: every hit he takes deals 1 less damage (always at least 1) |
| Benoît the Brick | 4 (goalie) | 5 | 9 | Last one standing | Gains +4 punch when he is the only teammate left |
| Wall Walsh | 4 (goalie) | 5 | 8 | Teammate knocked out | The first time a teammate would be knocked out, he survives with 1 toughness instead |
| Richard the Rocket | 4 (goalie) | 4 | 8 | Teammate knocked out | Rocket shot: every time a teammate is knocked out, deal 2 damage to the enemy front goon |
| Zamboni Zeke | 4 | 6 | 6 | His punch knocks someone out | Clean sweep: the leftover damage carries through to the next enemy |
| Big Bertrand | 4 | 5 | 10 | Teammate in front is punched | Bodyguard: standing directly behind your front goon, he takes half of every punch aimed at him (rounded down) |
| Mad Max Mahoney | 4 | 5 | 6 | Knocks someone out | Trophy hunter: +1/+1 right away and for the rest of the run |
| Iron Jaw Igor | 4 | 4 | 9 | Takes a hit | Iron jaw: no single hit can deal him more than 3 damage |

Balance pass 1 (Oct 20): Wall Walsh 5/10 to 4/8, Stitches Stan's toughness 5 to 4, Mullet McGraw's start-of-fight hit 2 to 1, Cyclone Gus 5/4 to 4/4. Balance pass 2: Uppercut Larry 4/3 to 4/4, Sucker Punch Sal 3/3 to 4/4.

Bobby Brawler, Iron Ike and Richard the Rocket (the masked goalie) were added Oct 21; in the sim Bobby wins about 52% (tier 1 range), Iron Ike about 62% after a bump to 4/6, Richard about 60%. Kowalski (now with an attack pose), Cross-Check Chris and Old Man Otto were added Oct 21: Kowalski sits in the tier 1 range, Chris was bumped to 4/3 to reach the tier 2 range, and Otto lands with the other tier 3 goons. Whipping Willie joined tier 2 after them at 3/5 (3/4 tested at the bottom of tier 2). Hooking Henry joined tier 2 at 3/4 and tests mid-tier. Short Fuse Frankie tested at 68% as a 2/5, so he dropped to 2/4 (about 62%, just behind Stitches Stan). Texas Ted tested at 63% as a 3/4 and dropped to 2/4 (about 59%). Sébastien Spark tested at 44% giving +1 punch per exchange, so his zap became +1/+1 (about 54%).

Balance pass 3 (Oct 21): tier 2 had grown to 11 goons, so Hooking Henry (now 2/3) and Cross-Check Chris (now 2/2) moved down to tier 1, and Short Fuse Frankie and Texas Ted (both now 3/5) moved up to tier 3, leaving 8 / 7 / 8 goons plus 4 goalies. The shop now picks a tier first (every unlocked tier equally likely), then a goon from it. Rookie Randy went to 1/3, Wall Walsh to 4/7 (he was the strongest goon in the game at 67%), Scared Sammy to 3/7. Mullet McGraw's ability was a copy of Elbows Eddie's, so he got Mullet toss. Fights where both teams go down together now go to the team that dealt more damage; early-round ties fell from about 25% of fights to about 5%. Rookie Randy and Kowalski still test lowest in tier 1, but the balance test plays single fights and can't count the stats they add between rounds.

The Camo Twins (replacement on knockout) joined tier 2 at 3/3 and test mid-tier (about 57%). Camo Twin, the brother who tags in, only exists during fights: he is never in the shop or the card packs.

Dr. Sawbones (healing, first called Doc) joined tier 2. As a 2/3 he tested at the bottom of tier 2 (51%), so he went to 2/4 (about 55%). His heal can't push a goon above the best toughness he has had in the fight, so it undoes damage rather than stacking toughness.

Greedy Glen (economy) joined the goalies. He wins about 47% of straight fights, the weakest goalie, on purpose: he trades fight strength for pucks. Signing him costs 3 pucks, so he pays for himself after three rounds. The computer teams' extra pucks from him count too.

Balance pass 4 (Oct 21): the goalie tier is gone. Goalies were a fourth tier in all but name, but mixed strengths: three played like tier 3, Scared Sammy like tier 2, and Greedy Glen arrived too late to earn. Now there are four tiers of 8 / 9 / 7 / 6 goons. Greedy Glen moved to tier 2 (2/5) so he has more rounds to pay out; Stitches Stan (now 4/5) and Scared Sammy moved to tier 3; and tier 4, unlocking at round 7, holds the heavy hitters with about +1/+1 each: The Hammer 6/6, Cyclone Gus 5/5, Old Man Otto 5/7, Benoît the Brick 5/9, Wall Walsh 5/8, Richard the Rocket 4/8. In the round 7+ test, tier 4 wins 64–66% and tier 3 about 56–58%, a clear step up.

Zamboni Zeke and Big Bertrand joined tier 4 (Oct 21). Zeke tests at about 65%. Bertrand only helps from the slot right behind the front goon, which random test lineups rarely give him, so he went from 4/9 to 5/10 (about 61% even with random placement); the computer teams now put him in that slot. Mad Max Mahoney and Iron Jaw Igor joined tier 4 the same day. Igor tests at about 66%. Mahoney tests at about 54%, but the balance test plays single fights; his real strength is the +1/+1 he keeps after every knockout, which compounds over a run, so he stays at 5/6 until full runs are tested.

## Coaches

A coach sits in the coach slot and is used only when a fight ends in a tie. Coaches appear in the shop from round 8 and cost 3 pucks. One coach is on offer each round, and a reroll brings him back after you hire one, until you have 3. Version 1 has one coach, a placeholder: a stern guy in a black suit.

| Fight ends in a tie (equal damage, or the safety limit) and... | Result |
| --- | --- |
| Both teams have a coach | The coaches fight each other to decide it |
| Only one team has a coach | That team wins |
| Neither team has a coach | It stays a tie: no win, no loss |

In a coach fight, each coach's punch is the total punch of every goon on his team, and his toughness is their total toughness. Totals use the goons' stats at the start of the fight, including shop buffs and gear but not fight damage. The coaches trade punches like goons, with no abilities, until one goes down. If both go down on the same exchange, it stays a tie.

Buying more coaches and stacking them in the coach slot boosts the coach fight. The bonus multiplies both totals, rounded to the nearest whole number:

| Coaches stacked | Coach fight stats |
| --- | --- |
| 1 | Team totals × 1.0 |
| 2 | Team totals × 1.1 |
| 3 | Team totals × 1.2 |

Three is the maximum stack. Once a team has 3 coaches, the shop stops offering them.

## Computer opponents

In version 1 every opponent is a computer team built with the same shop rules as the player, so it is always fair for the round.

- Each round brings a different computer team. It is built by a computer player that has shopped through every round so far, with 10 pucks a round and the same tier unlocks, so it is always the right strength for the round.
- It buys the highest-tier goon it can afford, prefers copies of goons it already owns, and spends leftover pucks on gear. It buys a coach as soon as one can be bought.
- It orders its lineup with the toughest goon in slot 1 and start-of-fight goons behind him.
- The championship opponent gets 2 extra rounds of shopping before the final fight.

Playing against saved player teams, like Super Auto Pets does, needs a server and comes after version 1.

## Build and test plan

Build in Claude Code as a TypeScript browser project. Give it this whole doc as the spec. Keep the game logic separate from anything visual so it can be tested on its own.

1. **Fight engine:** the fight rules and every ability, with goon data in one file so stats are easy to change. A fight prints a text play-by-play, such as "Larry hits Tommy for 8. Tommy is knocked out. Eddie steps up."
2. **Simulation tests:** run 10,000 fights between random lineups for each tier and report each goon's win rate. Any goon far above or below 50% gets adjusted.
3. **Shop and run loop:** pucks, rolling, freezing, buying, selling, leveling, gear, wins, losses and the championship, still playable as text.
4. **Computer opponents** as described above.
5. **Visuals:** the shop and lineup as cards, and fights shown with the goon art, using whole-sprite animations until each goon is split into body, head and punching arm.
6. **Playtest and balance**, then add the four unassigned goons.

At the end of each step, play it and adjust this doc before moving on.

## Open questions

- [ ] Shop sizes per round: tune after testing.
- [x] Stats and abilities for Bobby Brawler, Iron Ike and Richard the Rocket.
- [x] Stats, ability and attack pose for Kowalski.
- [ ] A goalie-only slot at the back: revisit after testing. Goalies are marked on their cards (the goalie flag in the data), ready for it.

## Screens (added Oct 21)

- **Title screen:** New game, Continue, Goons, Settings. New game asks for a second tap when it would replace a saved game.
- **Continue:** the run saves itself after every shop action and as soon as a fight's result is decided, so closing the page mid-fight can't be used to replay it. A finished run clears the save. The save lives in the player's browser.
- **Goons:** packs by season. Season One holds every current goon as a hockey card (tier color, number, punch, toughness, ability); hovering a card shows his attack pose. Season Two is a locked placeholder.
- **Settings:** sound effects, music and default fight speed are placeholders for later.
- **Menu button** on the scoreboard returns to the title screen between fights.

## Bench coaches (added Oct 21)

Every team has a coach standing behind the boards, in front of the glass, on either side of the red line, cut off at the waist by the boards. They show in the shop and in every fight. When both teams are knocked out together, the coaches come off the benches and brawl at center ice. The team that dealt more damage wins the brawl; with exactly equal damage both coaches go down and it's a tie. Coaches were taken out of the shop the same day, so the older Coaches section below (shop coaches, stack bonus) no longer applies. The losing coach is knocked flying; the winner skates back to his bench.

Coach poses: standing, walking (he paces a couple of steps along the bench now and then), cheering and angry (after every exchange, the coach whose goon took less damage cheers and the other one blows up), jumping (over the boards for a brawl), fighting (each brawl punch) and knocked out (the brawl loser).
