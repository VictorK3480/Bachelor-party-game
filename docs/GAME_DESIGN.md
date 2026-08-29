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

The game uses a **dual-display system**:

- **Public Display** (1080p TV/Projector): Fantasy-themed presentation optimized for viewing from several meters away. Shows current team, encounter type, question, answer reveal (when authorized), forfeit, and leaderboard.
- **GM Control Interface** (Laptop): Comprehensive control panel for game progression, answer validation, node selection, and game management.

The public display features:
- Gradient dark blue-to-purple background
- Serif "Cinzel" font for fantasy aesthetic
- Emoji-based icons (🗡️ 🏹 🛡️ 🔥) for teams and (💎 ⚔️ 🧩 🔮 👑 🐉) for encounter types
- Glowing and pulsing animations for dramatic answer reveals and forfeits
- Large, readable typography (52-72px minimum) for TV viewing distance
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
  - Encounters completed counter (0/10)
- Every team starts at 0 points
- Scores may become negative
- There is no minimum score

Both the public display and GM interface prominently show current team identity, score, and progress.

---

## 3. Game Length

Each team completes exactly **10 encounters**:

- Encounters 1–9: normal map encounters
- Encounter 10: final boss

The boss is included in the 10 encounters.

Therefore every team answers exactly 10 questions.

---

## 4. Turn Flow

Teams play in a fixed turn order. Each phase is visually distinct on the public display.

### Phase: TURN_START
GM selects the next node for the current team.
- Public Display: Shows current team with "✨ Team Selecting Path ✨" message
- GM Interface: Displays available connected nodes with encounter type and point value

### Phase: QUESTION_DISPLAY
Question is presented to the team for discussion.
- Public Display: Shows the question text (52px font), and if applicable, multiple-choice options (A/B/C/D) or images
- GM Interface: Shows question and canonical answer (blurred until reveal)
- Team discusses and provides an answer verbally

### Phase: ANSWER_REVEAL
GM reviews the team's answer.
- Public Display: Shows "⏳ AWAITING REVELATION ⏳" until GM triggers reveal, then displays the canonical answer in glowing gold box with "✨ THE ANSWER ✨" heading and optional explanation
- GM Interface: Answer becomes clear (unblurred), GM clicks "✓ Correct" or "✗ Incorrect"

### Phase: FORFEIT_DISPLAY (if incorrect)
Team performs the forfeit.
- Public Display: Displays forfeit text in pulsing red box with "🎭 FORFEIT 🎭" heading
- GM Interface: "Forfeit Complete" button to advance after forfeit is performed
- Scoring automatically applied: score ± node value
- Team progresses to selected node

### Turn Completion
- Score updates with animation (scoreFlash)
- Leaderboard updates
- Next turn begins

A team **always advances**, regardless of correctness.

An incorrect answer never prevents progression — the team still moves to the selected node.

There is no time limit on any step. The game master controls the pacing by manually advancing through each phase.

### Answer Security

The canonical answer is **never visible on the public display before the GM authorizes it**. This prevents spoiling for the audience:
- During QUESTION_DISPLAY: answer is not rendered anywhere
- During ANSWER_REVEAL: answer is hidden with "⏳ AWAITING REVELATION ⏳" message until GM clicks "📢 Reveal Answer"
- After reveal: answer displays prominently with glowing animation

The GM interface always shows the answer for reference, but it is visually dimmed/blurred before the reveal action, becoming clear after.

---

## 5. Map

The map has:

- START
- 9 branching normal layers
- 1 final boss

The layout mimics a Slay the Spire-style branching map:

- START is a single node that branches forward to all 3 nodes of layer 1.
- Layer 1 always has exactly 3 nodes.
- Layers 2–9 each contain 2–3 nodes.
- Each node connects forward to 1–3 nodes in the next layer.
- Paths may converge: a node may share at most one of its forward connections with a neighboring node in the same layer, so two adjacent paths can merge into a common next-layer node. Convergence beyond that is avoided to keep the map readable.

Every team follows one path through the 9 normal layers and then reaches the boss.

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

Public Display: Golden icon with gold accent color

### BATTLE ⚔️ (Red)
Medium question. **Difficulty 3.**

**±400 points**

Public Display: Sword icon with red accent color

### PUZZLE 🧩 (Cyan)
Hard question. **Difficulty 4.**

**±600 points**

Public Display: Puzzle piece icon with cyan accent color

### MYSTERY 🔮 (Purple)
Medium question with a less predictable category or format. **Difficulty 3.** Prefers an image-based question with accompanying question text over a plain text question, when one is available.

**±400 points**

Public Display: Crystal ball icon with purple accent color

### ELITE 👑 (Orange)
Very hard question. **Difficulty 5.**

**±800 points**

Public Display: Crown icon with orange accent color

### FINAL BOSS 🐉 (Bright Red)
Special final encounter at the hardest tier. **Difficulty 5.**

**±1000 points**

Public Display: Dragon icon with bright red accent color, emphasizing the climactic nature

Difficulty 1 (very easy) is not directly targeted by any encounter type. It exists as an extra buffer/fallback tier for the question-selection system (see §9).

Encounter values are always symmetric:

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

The winner is the team with the highest score after all teams complete the boss.

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

Forfeits are randomly selected. Unlike questions, forfeits are not tracked as used — the same forfeit may come up more than once in a game.

Forfeits do not affect:
- score
- map progression
- number of encounters

Once the forfeit has been performed, the game master clicks a single **Forfeit Complete** control to let the game advance to the next turn.

The application does not attempt to verify that a forfeit was performed.

---

## 14. Final Boss

The final boss is encounter 10.

It is worth ±1000 points.

It should have a more dramatic presentation than normal encounters.

The boss is one question unless the game configuration is later changed.

All teams must complete the boss before final results are shown.

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