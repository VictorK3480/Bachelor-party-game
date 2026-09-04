# Bachelor Party Quiz — Game Design

## 1. Concept

A competitive quiz presented as a branching fantasy-adventure map with a polished indie roguelike aesthetic.

The game combines:
- quiz questions
- risk/reward path selection
- symmetric positive/negative scoring
- randomized questions
- forfeits for incorrect answers

### Display Architecture

The game uses a **single shared screen** for both players and the game master — there is no separate public-only display and GM-only display (see §15). The game master drives the game forward from the same view everyone else is watching (e.g. on a shared TV/projector), rather than a private control panel.

The display features:
- Gradient dark blue-to-purple background
- Serif "Cinzel" font for fantasy aesthetic
- Emoji-based icons (🗡️ 🏹 🛡️ 🔥) for teams and (💎 ⚔️ 🧩 🔮 👑 🐉) for encounter types
- Glowing and pulsing animations for dramatic answer reveals and forfeits
- Large, readable typography that scales up on bigger screens for viewing distance, and compacts back down on smaller ones (§15)
- Color-coded encounter cards matching encounter type themes

The game is fundamentally a quiz, not an RPG.

---

## 2. Teams

- 3–4 teams (configurable at setup)
- Teams are configured before the game starts
- Each team has:
  - Name (user-provided)
  - Icon/Token (auto-assigned emoji: 🗡️ 🏹 🛡️ 🔥)
  - Score (starts at 0)
  - Position on map
  - Encounters completed counter (0/9)
- Every team starts at 0 points
- Scores may become negative
- There is no minimum score

Both the public display and GM interface prominently show current team identity, score, and progress.

---

## 3. Game Length

Each team completes exactly **9 encounters**, one per normal map layer.

The final boss is **not** one of a team's own encounters. It is a single shared round, played once, after every team has finished its own 9 (see §14).

---

## 4. Turn Flow

Teams play in a fixed turn order. Each phase is visually distinct on the public display.

Once every team has completed its 9th encounter, normal turn-taking stops and the game moves into the shared Final Boss round (§14) instead of continuing to a 10th per-team turn.

### Phase: TURN_START
The current team picks their next node from the map, on the shared screen everyone is watching — showing each reachable node's encounter type and point value, not the question.

### Phase: QUESTION_DISPLAY
The question (and its image/audio/video/YouTube clip, if it has one) is shown to everyone at once. The team discusses and answers verbally. The canonical answer is not rendered anywhere yet.

### Phase: ANSWER_REVEAL
The game master clicks "Vis svaret" ("Reveal Answer") when ready. The canonical answer then appears for everyone simultaneously — there is no GM-only preview beforehand. The game master then marks the team's verbal answer "✓ Korrekt" or "✗ Forkert".

### Phase: FORFEIT_DISPLAY (if incorrect)
Team performs the forfeit, shown on the same shared screen. The game master clicks "Straffen er udført" ("Forfeit Complete") once it's been performed.
- Scoring automatically applied: score ± node value (§12; doubled for a double-points question)
- Team progresses to selected node

### Turn Completion
- Score updates with animation (scoreFlash)
- Leaderboard updates
- Next turn begins

A team **always advances**, regardless of correctness.

An incorrect answer never prevents progression — the team still moves to the selected node.

There is no time limit on any step. The game master controls the pacing by manually advancing through each phase.

### Answer Security

The canonical answer is **never visible before the game master authorizes it**, since everyone (including the game master) is looking at the same screen:
- During QUESTION_DISPLAY: the answer is not rendered anywhere
- The game master clicks "Vis svaret" ("Reveal Answer") to reveal it
- After that click: the answer displays prominently for everyone at once, with a glowing animation

There is no separate GM-only view where the answer is visible early (dimmed or otherwise) — the game master learns it at the same moment as everyone else, by choosing to click reveal.

---

## 5. Map

The map has:

- START
- 9 branching normal layers

There is no boss node on the map — the final boss is a separate shared round played after the map (§14), not a map destination.

The layout mimics a Slay the Spire-style branching map:

- START is a single node that branches forward to all 3 nodes of layer 1.
- Layer 1 always has exactly 3 nodes.
- Layers 2–9 each contain 2–3 nodes.
- Each node connects forward to 1–3 nodes in the next layer, except layer 9, whose nodes are terminal (a team's path simply ends there).
- Paths may converge: a node may share at most one of its forward connections with a neighboring node in the same layer, so two adjacent paths can merge into a common next-layer node. Convergence beyond that is avoided to keep the map readable.

Every team follows one path through the 9 normal layers, ending at a layer-9 node.

Teams may take different paths, and may occupy different nodes or the same node as another team. When teams share a node, the display must make each team's presence clearly distinguishable (e.g. stacked or offset team icons) rather than overlapping indistinguishably.

The map must always provide at least one valid route forward.

The game does not need procedural map generation. A predefined map layout is acceptable and preferred if it is easier to control and polish.

Players see the available node types and point values before choosing.

They do not see the question.

---

## 6. Encounter Types

Difficulty follows the same 1–5 scale used for questions (see CONTENT_GUIDE.md §3): 1 = very easy, 2 = easy, 3 = medium, 4 = hard, 5 = very hard.

### TREASURE 💎 (Gold)
Easy question. **Difficulty 2.**

**±200 points**

Display: golden icon with gold accent color

### BATTLE ⚔️ (Red)
Medium question. **Difficulty 3.**

**±400 points**

Display: sword icon with red accent color

### PUZZLE 🧩 (Blue)
Hard question. **Difficulty 4.**

**±600 points**

Display: puzzle piece icon with blue accent color

### MYSTERY 🔮 (Purple)
Medium question with a less predictable category or format. **Difficulty 3.** Prefers a media question (image/audio/video/youtube) with accompanying question text over a plain text question, when one is available.

**±600 points**

Display: crystal ball icon with purple accent color

### ELITE 👑 (Magenta)
Very hard question. **Difficulty 5.**

**±800 points**

Display: crown icon with magenta accent color

Difficulty 1 (very easy) is not directly targeted by any encounter type. It exists as an extra buffer/fallback tier for the question-selection system (see §9).

FINAL BOSS 🐉 is **not** one of these map encounter types — it is a separate shared round with its own, asymmetric scoring rule (see §14).

Encounter values for the 5 map encounter types above are always symmetric:

> Correct = +value  
> Incorrect = -value

There are no other score modifiers.

All values must be configurable.

---

## 7. Path Choice

Before selecting a node, the team can see:

- encounter type
- point value

The team cannot see the question.

The purpose of path selection is risk/reward.

Example:

> TREASURE: ±200  
> BATTLE: ±400  
> ELITE: ±800

The team chooses its preferred risk level.

---

## 8. Questions

Questions are stored separately from the map.

Questions are selected dynamically when an encounter begins.

Questions are never permanently assigned to map nodes.

Each question has:

- unique ID
- category
- difficulty
- type
- question text
- canonical answer
- optional answer choices
- optional explanation
- optional image
- optional tags

Every question has a canonical answer that can be revealed to the players.

The game master decides whether the team's answer is correct.

The game must not automatically judge subjective answers.

This applies to every question type, not just open-answer ones: even for multiple-choice or numerical questions, the game master manually marks the answer correct or incorrect. The system never auto-grades any question type. This keeps the grading model uniform and avoids edge cases such as a team's spoken answer not exactly matching a stored choice's text.

### Default question format

The default format is:

> Question  
>   
> Team gives an answer verbally  
>   
> **REVEAL ANSWER**  
>   
> Canonical answer is displayed  
>   
> Game master selects CORRECT or INCORRECT

Multiple choice is optional, not the default.

### Supported question formats

The architecture should support:

- open answer
- multiple choice
- numerical answer
- image-based question
- code/output question
- logic/puzzle question

Additional formats may be added later without changing the core scoring system.

---

## 9. Question Selection

A question must only be selected if it has not already been used in the current game.

The primary matching criterion is difficulty.

A question must not share a category with the immediately preceding question answered by the same team, unless that restriction would leave no eligible questions, in which case it is dropped for that selection only.

Encounter types may additionally influence preferred question types or categories. Concretely: MYSTERY encounters prefer an image question over other types, when one is available and otherwise eligible. Beyond this, the system should remain flexible.

Fallback order when the eligible pool is empty at the exact target difficulty: try the nearest difficulty first, then fall back to any reasonable unused question rather than failing.

Never repeat a question during one game. The question pool is scoped to a single game — it does not need to support replaying the game across multiple separate sessions.

---

## 10. Question Categories

Categories are data, not hard-coded game mechanics.

Initial examples:

- Lord of the Rings
- D&D
- programming
- video games
- science
- technology
- groom
- groom + bride
- friends
- university
- general trivia

I must be able to:
- add categories
- rename categories
- remove categories
- create new categories

without changing the game engine.

---

## 11. Images

Questions may optionally contain an image.

Images should be stored locally with the project.

A question may use an image for:

- identification
- visual trivia
- diagrams
- screenshots
- maps
- other visual questions

The display should show the image clearly.

The game master should still have access to the canonical answer.

Questions without images must work normally.

---

## 12. Scoring

Initial score: 0.

For every normal encounter:

> Correct → +value  
> Incorrect → -value

Examples:

200 + correct → 200

200 + incorrect → -200

-400 + correct on ±600 → 200

-400 + incorrect on ±600 → -1000

Negative scores are intentional.

A question can be flagged as double points, doubling its node's value both ways for that one question (+2×value if correct, −2×value if incorrect). Which questions are double points is content data, not something the team can see before they've already committed to a node — the stakes only become clear once the question itself is drawn.

This ± symmetry applies to normal map encounters only. The shared Final Boss round (§14) uses a different, asymmetric rule: only the closest team is scored.

The winner is the team with the highest score after the shared Final Boss round.

Ties are allowed.

---

## 13. Forfeits

Every incorrect answer triggers one forfeit.

Forfeits come from a separate content pool.

A forfeit contains:

- unique ID
- text
- optional intensity
- optional tags

Forfeits are randomly selected, weighted by how many times each has already come up this game (weight = 1 / (useCount + 1)) — a forfeit that hasn't been used yet is more likely to be picked than one that has, but nothing is ever excluded. Unlike questions, forfeits are never fully "used up" — the same forfeit may come up more than once in a game, just with progressively lower odds each time.

There is no association between a forfeit and the difficulty of the question that triggered it — the forfeit pool is flat and unrelated to encounter type/difficulty. The one exception is a question deliberately paired with a specific forfeit (content data, not a game rule) — that forfeit always applies for that question, and is otherwise held out of the random pool.

Forfeits do not affect:
- score
- map progression
- number of encounters

Once the forfeit has been performed, the game master clicks a single **Forfeit Complete** control to let the game advance to the next turn.

The application does not attempt to verify that a forfeit was performed.

---

## 14. Final Boss

The final boss is a **single shared round**, not one of a team's own 9 encounters and not a map node. It is triggered once every team has finished its 9 normal encounters.

One question is posed to every team at once. All teams discuss/answer it in parallel (e.g. a numeric guess), then the game master reveals the canonical answer.

Unlike normal encounters, scoring here is **not symmetric ±value**. The game master judges which team's answer was closest and selects that team; only that team receives `+bossValue` (1000 by default). Every other team's score is left untouched — there is no penalty for not being closest.

It should have a more dramatic presentation than normal encounters.

All teams must have finished their 9 encounters, and the shared round must be resolved, before final results are shown.

Winner = highest final score.

---

## 15. Display

The game uses a single shared screen/interface for both players and the game master — there is no separate public-only display and GM-only display.

A persistent scoreboard bar sits at the bottom of the screen at all times, Jeopardy-style: every team's name and current score, evenly spread out across the width of the bar, always visible regardless of game phase.

Above the scoreboard, the main view shows the map: nodes connected by visible paths, each node showing an icon for its encounter type (the same icon for every node of that type — e.g. every TREASURE node uses the same chest icon). Each team has a character/token sitting on its current node. Only the currently active team's token moves during its turn; other teams' tokens stay put. When teams share a node, the display must make each team's presence clearly distinguishable (e.g. stacked or offset team icons) rather than overlapping indistinguishably.

When the active team's turn resolves and it advances, its token animates from its current node to the newly selected node along the connecting path — it never jumps directly to a node it isn't pathed to.

The question is presented as an overlay that pops up on top of the map when the encounter begins, and pops back out (closes, returning to the map) once the turn concludes. If the answer was incorrect, the forfeit is presented the same way: it pops up over the map and pops back out once the game master marks it complete.

It should show:

- map
- team positions (visually distinguishable even when multiple teams share a node)
- current team
- encounter
- question
- images when present
- answer reveal
- correct/incorrect result
- score change
- forfeit
- leaderboard
- final result

The canonical answer must not be exposed before the answer-reveal stage. This is the only piece of information ever withheld — everything else is visible to everyone at all times.

---

## 16. Game Master Controls

The game master drives the game forward from the same shared interface. Available controls:

- team setup
- node selection
- question display
- answer reveal
- correct/incorrect selection
- forfeit-complete confirmation (a single control clicked once the forfeit has been performed)
- final-round winning-team selection (§14) — a single control to pick which team was closest
- turn advancement
- undo (reverts only the single most recently completed action — there is no multi-step undo, and once another action occurs, the undone action can no longer be recovered)

No pause or reset control is needed.

---

## 17. Explicitly Out of Scope

Do not add:

- character classes
- health points
- XP levels
- inventory
- equipment
- shops
- skill trees
- additional currencies
- multiplayer networking
- accounts
- authentication
- cloud services
- a per-question timer or countdown
- a separate public-only display and GM-only display
- a pause control
- a mid-game reset control

The game should remain understandable after approximately one minute of explanation.

The primary gameplay loop is:

> **Choose → Answer → Reveal → ±Points → Forfeit if wrong → Advance**