# Art for goons not in the game yet

These goons have art but no stats yet. When one joins the roster:

1. Add him to `src/data.ts` with his stats and ability.
2. Move his files from this folder into `web/assets/`.
3. Add his attack-pose size to `ATTACK_FIT` in `web/game.html`.
4. Run `node web/build.mjs`.

| Goon | Standing art | Attack pose | Attack size (ATTACK_FIT) |
| --- | --- | --- | --- |
| Ike | `ike.webp` | `ike-attack.webp` | 1.0 |
| Craig | `craig.webp` | `craig-attack.webp` | 1.0 |
| Masked goalie | `masked-goalie.webp` | `masked-goalie-attack.webp` | 0.9 (check when added) |
| Kowalski | `kowalski.webp` | none yet | |
