# Update to 0.22.101

Extract the changed files over 0.22.100 at the repository root. The existing backend workflow applies `20261122020000_guard_champion_stage.sql` and deploys the matching `arena-combat` function. Publish the Pages client from the same commit. Existing weekly runs keep their locked team, stage, HP and remaining heal.

# Update to 0.22.100

Extract the changed files at the repository root over 0.22.99, preserving the directories. Deploy the Pages client, the `20261122010000_champion_and_friend_challenges.sql` migration and the `arena-combat` function with the existing workflows. Gauntlet verification and saved-team challenges use the matching combat engine. Run `npm ci` and `npm test` to verify the release locally.

This release adds the Road to Brock, gym practice, PC build goals, the weekly Champion Gauntlet, friend sparring, guild raid marks and flame vent calls in both Mega Charizard X raids. The gauntlet and guild week starts Monday at 00:00 UTC.

# Update to 0.22.99

Extract the changed files over **0.22.98**. Publish both pages, the Roguelit and Tactics scripts, version manifest and Supabase combat engine together using the existing workflows. The six new held items use the existing inventory and equipment save format.

All 370 PFT signatures were also checked in 1,480 mirrored solo and three-Pokémon trials. Run `node tests/release-smoke.cjs --balance` to see each signature’s results. Recoil now costs 25% of direct damage actually dealt, up to its previous max-HP cost. Spark can refund its caster when teammates cannot accept mana. Weaker shields preserve the remaining time on a stronger shield.

The combat audit covered 846 moves and 311 abilities. Each build ran 4,628 seeded, 16-second singles and doubles trials plus 32 contact trials for each of the 577 damaging moves. Run `npm run audit:balance` to repeat it or `node scripts/audit-arena-balance.mjs --json` to see each entry. Contact damage assumes the move reaches its target and includes accuracy and critical rolls.

| Move | Previous cooldown | New cooldown |
| --- | ---: | ---: |
| Population Bomb | 1.6 s | 8.1 s |
| Surging Strikes | 1.8 s | 5.0 s |
| Bullet Seed | 1.8 s | 3.7 s |
| Absorb | 2.2 s | 1.5 s |
| Mega Drain | 2.9 s | 2.2 s |
| Pound, Tackle, Scratch | 2.3 s | 2.0 s |

Overheat, Close Combat and the other self-debuffing attacks now charge their user once per successful cast. Leech Seed drains up to 16% over eight seconds. Reflect and Light Screen last ten seconds on a sixteen-second cooldown. Fissure, Guillotine, Horn Drill and Sheer Cold gain power and accuracy against opponents at or below one-third HP.

Huge Power and Pure Power grant 50% more physical damage. Iron Fist grants 35% more punching damage. Poison Heal recovers 1/32 max HP per poison tick. Rough Skin and Iron Barbs can retaliate once per attacking Pokémon each second. Healer can cure its user when there is no afflicted ally in range. Tera Shift grants a 15% shield and defensive bonus on first entry. Perish Body pairs its holder with one attacker per 16 seconds. Cute Charm gives each attacker at least three seconds between infatuations it causes.

| New held item | Coins | Arena effect |
| --- | ---: | --- |
| Expert Belt | 1,800 | Increases super-effective damage from stat-based attacks by 15%. |
| Big Root | 950 | Increases healing from draining attacks by 30%. |
| Rocky Helmet | 2,200 | Returns 20% of enemy contact damage, capped at 4% of the attacker’s max HP per hit. |
| Covert Cloak | 2,200 | Blocks the secondary ailments, flinches and stat drops of damaging moves. |
| Light Clay | 1,800 | Extends the holder’s Reflect and Light Screen from 10 to 13 seconds. |
| Scope Lens | 1,400 | Adds one critical-hit stage. |

# Update to 0.22.98

Extract the changed files over **0.22.97** and publish the client scripts, pages and versioned artwork together.

# Update to 0.22.97

Extract the changed files over **0.22.96** and publish them together. The hosted and local clients load the updated expedition and Tactics scripts. The existing workflow ships the matching generated engine. This update requires no database migration.

# Update to 0.22.96

Extract the changed files over **0.22.95** and publish them together. The hosted and local pages load the updated Roguelit and Tactics scripts. The existing backend workflow includes the matching generated Arena engine. This update uses the existing save format and requires no database migration.

Regional field studies and Tactics board challenges earn the selected main-game supplies. New expeditions also offer alternate sites and relic hunts. Existing expedition checkpoints keep their opponents and pending rewards. Three tournament rules rotate between Tactics matches, and stage 4 offers a second augment. Tactics placement saves its coins, items and Battle Pass credit together and retries pending deliveries on reload.

# Update to 0.22.95

Extract the changed files over **0.22.94** and push them together. Both game pages load the new `roguelit.js` script. The existing backend deployment includes the matching Arena engine. This update uses the existing per-player cloud save entry and requires no database migration.

Roguelit now visits Viridian Forest, Burned Tower and Sky Pillar. A win banks shards and saves the next reward choice. Returning to an unfinished battle restarts that encounter with the same team and opponents. Existing shards, best scores and upgrade ranks carry forward. Each win deposits account coins, regional bosses award main-game inventory items, and first clears add a one-time bonus. The checkpoint tracks a pending delivery until the wallet and bag have saved it. Five additional permanent upgrade paths expand expedition draft choices, starting gear and account coin payouts. After the twelfth fight, players can finish the expedition or keep their team for endless play.

# Update to 0.22.94

Extract these changed files over **0.22.93** and push them together. The hosted and local clients both load the new Tactics script. The existing version check waits for an active battle or auto-repeat session to finish. This update requires no database migration.

Poke Fight Tactics trainers draft against a shared family pool and build around trait breakpoints, upgrades and team roles. Completed fights and final placement earn account coins. The rate uses the highest level in PC storage and the account’s unlocked Arena speed at the start of the match.

# Update to 0.22.93

Extract the changed files over **0.22.92** and push them together. The existing backend workflow runs the PC migration `20261121030000_pc_iv_budget.sql` and deploys the matching combat engine. The client version check waits for an active battle or auto-repeat session to finish.

All active Pokémon and stored copies with more than 93 IVs receive six new IVs totaling 93. Each IV stays between 0 and 31. A Pokémon’s existing personality, nature, EVs, and identity carry over. The local client and the database use the same roll for an individual, including Pokémon held for trade. Opening a PC box or signing in again preserves the result. At 93 total, an IV Reducer frees points for training another stat.

# Update to 0.22.92

Extract the changed files over **0.22.91** and push them together. The backend workflow applies `20261121020000_chat_read_state.sql` for account-wide unread counts and mute preferences. It also deploys the combat engine with the five personality tiers. The version check picks up the new client after an active battle or auto-repeat session ends.

# Update to 0.22.91

Extract the changed files over **0.22.90** and push them together. The backend workflow applies `20261121010000_permanent_personalities.sql` and deploys the matching combat engine. Pokémon Database supplies the three move category images and the listed accuracy values. The client bundles the icons for offline use.

# Update to 0.22.90

Extract these files over **0.22.89** and push them together to `main`. The existing deployment workflow applies `20261120030000_chat_and_direct_trades.sql` for the four Messages channels and private Pokémon trades. Players can start a trade from an online profile and resume it from Notifications or Trade Chat.

# Update to 0.22.89

Extract over **0.22.88** and push the changed files to `main`. The client uses the existing Online directory to filter room invites. The backend workflow applies `20261120020000_online_room_invites.sql` so both PvP and co-op also check the recipient's presence when saving an invitation.

# Update to 0.22.88

Extract over **0.22.87** and push the changed files to `main`. PC storage preferences are saved per player on this browser. The included combat engine carries the matching version for regional contracts.

# Update to 0.22.87

Extract the changed files over **0.22.86** and push them together to `main`.
The existing GitHub workflow runs the online checks, applies the new turn-read
migration, and deploys `arena-combat` with its pinned token-verification dependency.
Existing rooms keep their saved state. Both previously signed and newer sessions
can play through the update.

After a PvP match, expand **PvP connection timing** on each device. It reports
mean and 95th-percentile processing time for the advancing server turns that
device observed, the longest gap between fresh updates, and the count of gaps
of at least two seconds. Compare several 6v6 matches against the 50 ms mean and
100 ms 95th-percentile targets, and check both players for multi-second gaps.
The Supabase Overview also includes raids, campaign verification, and other
requests. Slow combat requests and a sample of regular turns log an `arena_turn`
record with the match, mode, turn, execution region, retries and stage timings.
Individual combat responses also include a `Server-Timing` header.

The first combat request uses automatic routing. The deployment workflow reads
the project's database region and the client uses that region on subsequent
requests. Regional failures let the next request use automatic routing for one
minute. To compare routing, open the game with `?arenaRegion=auto` on both
devices during a second set of matches. For a manual function deployment, set
the optional `ARENA_COMBAT_REGION` to the project's exact region. If the region
is unavailable, the game uses automatic routing.

Run `npm ci` and `npm run test:online` for the regression checks.
`npm run test:online -- --benchmark` runs five complete seeded 6v6 matches
through the local function and embedded database. Hosted latency is measured
in the deployed game.

# Update to 0.22.86

This cumulative soundtrack repair applies to **0.22.83 through 0.22.85**.
Extract the ZIP at the repository root, replacing the game files and all 30
regional battle and victory MP3s in `assets/`. Commit the extracted files
together. Run `node tests/release-smoke.cjs` to verify the installation.

# Update to 0.22.85

Extract the changed files over **0.22.84**, keeping the folders intact, and push
to `main` to publish the edited trainer victory theme.

# Update to 0.22.84

Extract the changed files over **0.22.83**, keeping the folders intact, and push
to `main`. The game now loads the edited wild, trainer, and gym battle themes
for all nine regions and the edited wild and gym victory themes.

# Update to 0.22.83

Extract the changed files over **0.22.82** and keep the folder structure. Push to
`main` to publish the six raid music tracks and the updated player. The included
combat engine carries the matching release version for regional contracts.

# Update to 0.22.82

Extract the changed files over **0.22.81**, keeping the folders intact. Publish the
web files and deploy the updated Supabase `arena-combat` function so PvP and co-op
receive charge, release and contact sounds at the right time. The bundled sounds
also work in the local test page. Rebuilding the sound bank is optional.

# Update to 0.22.81

Extract the changed files over **0.22.80** with their folders intact and push to
`main`. Deploy the updated `arena-combat` function so online rooms show the
recipient of support skills and the moment Wish restores HP.

# Update to 0.22.80

Extract the changed files over **0.22.79** with their folders intact and push to
`main`. This version adds artwork for all remaining damaging moves. The visuals
use the cast and hit events already sent by 0.22.79 rooms.

# Update to 0.22.79

Extract the changed files over **0.22.78** and keep their folder structure.
Push to `main` to publish the new move artwork and status animations. Local
battles and online replays use the existing battle condition data. Deploy the
updated `arena-combat` function for the Ally Switch and Curse cast locations.

# Update to 0.22.78

Extract the changed files over **0.22.77** with their folders intact. Push to
`main` to publish the artwork and deploy the updated `arena-combat` function.
It sends the Sleep Talk cast alongside the move the sleeping Pokémon calls.

# Update to 0.22.77

Extract the changed files over **0.22.76** with their folders intact. Push to
`main` to publish the artwork and deploy the updated `arena-combat` function.
The server now sends the Helping Hand recipient, successful Baton Pass casts,
and the weather at Weather Ball launch.

# Update to 0.22.76

Extract the changed files over **0.22.75** with their folders intact. Push to
`main` to publish the client artwork and deploy the updated `arena-combat`
function. The function sends entry-hazard visuals to PvP and Co-op clients.

# Update to 0.22.75

Extract the changed files over **0.22.74**, keeping the folder structure, and push to
`main` to publish the new move artwork. This release uses the existing combat event
format for local battles, PvP and Co-op.

# Update to 0.22.74

Extract the changed files over **0.22.73** with their folders intact. Push to
`main` to publish the new client artwork and deploy the updated `arena-combat`
function. The function sends the three Earthquake rings to Co-op and PvP
clients. This release requires no database migration.

# Update to 0.22.73

Extract this patch over **0.22.72**, preserving the folder structure. Push the
files to `main` so the existing workflow deploys the updated `arena-combat`
function. That deployment applies the four-move Transform limit in Co-op and
resumed raids. This release requires no database migration.

# Update to 0.22.72

Extract this patch over **0.22.71** and preserve the folder structure. The
profile frame, featured Pokémon and terrain effect update on personal and
shared trainer cards. Claim All is in **Profile → Missions → Regional rewards**.

Push the files to `main` so the existing Supabase workflow applies
`supabase/migrations/20261119020000_claim_all_regional_rewards.sql`.
Signed-in players need that migration to claim multiple bundles at once.

# Update to 0.22.71

Extract the changed files over **0.22.70**, preserving their paths. Profile holds
regional missions, the badge gallery and trainer-card cosmetics. The existing
Kalos Laurel and badge images are reused.

Push the patch to `main` to run the existing Supabase deployment workflow.
The Online directory and its profile visibility settings require
`supabase/migrations/20261119010000_online_directory.sql`. The version manifest
and browser asset references are updated together for the automatic updater.

# Update to 0.22.70

Apply this changed-files ZIP over **0.22.69**, preserving its folder structure.
The PC and personal trainer card work offline. To enable friend profiles and
online records, push the included migration and workflow to `main`.
The workflow runs `npm run test:profile` and applies
`supabase/migrations/20261118040000_trainer_cards.sql`.

# Update to 0.22.69

Apply this changed-files patch over **0.22.68**. Keep the complete `assets`
directory and replace the included files at their original paths. The new atlas
files and expanded `pokemon-icons.png` are required for offline rendering.

This update includes all 1,025 National Dex species and 58 regional forms.
Existing Pokémon retain their save IDs. Regional forms use separate internal
IDs while displaying the original National Dex number. All available PMDCollab
animations and offline fallback icons are included; there are no runtime image
requests to third-party sprite servers.

The new migration is
`supabase/migrations/20261118030000_complete_pokedex.sql`. Push all included
files to `main` and let the existing Supabase deployment workflow finish. It
extends the shared species and family-hunt catalogs, preserves auction escrow
and account session checks, and deploys the regenerated combat engine.

The new roster-specific checks are available with `npm run test:roster`.
Source import tools are `scripts/expand-roster.py` followed by
`scripts/import-roster-sprites.py`; these are development tools, not runtime
requirements. Source attribution is in `assets/roster-sprite-credits.json`.

Copy the ZIP contents into the existing PokeArena repository, preserving the
directory paths. This is a changed-files patch; keep all other files and assets.

The Trading Hub needs the new database migration as well as the client files.
The included `.github/workflows/deploy-supabase.yml` installs the pinned test
dependency, checks Hub transactions and update safety, applies pending database
migrations, and deploys the Arena combat function when pushed to `main`.
It uses the existing `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` repository
secrets. Wait for that workflow to succeed before testing the Hub online.

For a manual backend deployment from the existing complete repository:

```sh
supabase link --project-ref ckgcuhaiuwlccyaxewbv
supabase db push --remote --yes
supabase functions deploy arena-combat --project-ref ckgcuhaiuwlccyaxewbv --no-verify-jwt
```

The Trading Hub foundation migration is `supabase/migrations/20261118010000_trading_hub.sql`.
It preserves existing account session checks, save validation, and reward ledgers.
Auctions escrow the selected individual and bids reserve coins. Completed trades,
expired listings, and outbid refunds are delivered safely from the main menu;
offline completions keep persistent notifications. Timed auctions settle on the
next Hub or notification request, or every minute if the project enables pg_cron.

Deploy `trade-hub.js` alongside `cloud.js`, `multiplayer.js`, `index.html`, and
`version.json`. Both the main client and local-test page reference the new script.
Automatic updates wait until an automatic Pokébattle or Trainer battle session
has ended, including repeat countdowns, captures, and evolution dialogs.

Run checks locally:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

`npm run test:trade` runs the client checks and real PostgreSQL migration tests
without production accounts or credentials. PostgreSQL tests use an isolated,
in-memory PGlite database with the released save validators.

After editing the inline battle engine, regenerate its deployed copy with
`python3 build-online-engine.py`.
