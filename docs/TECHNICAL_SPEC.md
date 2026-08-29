# Bachelor Party Quiz — Technical Specification

## 1. Runtime

The application runs locally in a browser.

Requirements:

- no internet required during gameplay
- no external APIs
- no authentication
- no backend required
- no database required for the first version
- simple local startup

Use a modern component-based web framework appropriate for a small local application.

---

## 2. Project Structure

Keep these concerns separate:

```text
src/
  game/          game state and rules
  components/    reusable UI components
  screens/       major game screens
  data/          content loading
  ...
data/
  questions.json
  forfeits.json
  categories.json (if useful)
docs/
  GAME_DESIGN.md
  TECHNICAL_SPEC.md
  CONTENT_GUIDE.md
```

The exact framework/file structure may differ, but game rules, UI, and content must remain separated.

---

## 3. Content Editing

Content must be editable without modifying application logic.

Questions, forfeits and categories should be stored as simple human-editable files.

The preferred workflow is:

1. Open the content file.
2. Add/edit an entry.
3. Save.
4. Restart/reload the application.

Do not require a database or code changes to add or edit questions.

The application should validate content and report useful errors if an entry is malformed.

---

## 4. Question Data

A question should support at least:

```text
id
category
difficulty
type
question
answer
choices (optional)
image (optional)
explanation (optional)
tags (optional)
```

Example:

```json
{
  "id": "lotr-001",
  "category": "Lord of the Rings",
  "difficulty": 3,
  "type": "text",
  "question": "Who is the father of Boromir and Faramir?",
  "answer": "Denethor II",
  "explanation": "Denethor is the Steward of Gondor.",
  "tags": ["lotr", "characters"]
}
```

Multiple choice:

```json
{
  "id": "gaming-001",
  "category": "Video Games",
  "difficulty": 2,
  "type": "multiple-choice",
  "question": "Which company developed Hollow Knight?",
  "choices": [
    "Team Cherry",
    "Supergiant Games",
    "FromSoftware",
    "Larian Studios"
  ],
  "answer": "Team Cherry"
}
```

Image question:

```json
{
  "id": "gaming-002",
  "category": "Video Games",
  "difficulty": 4,
  "type": "image",
  "question": "Which game is this screenshot from?",
  "image": "images/questions/gaming-002.png",
  "answer": "Example answer"
}
```

The exact schema may be improved if necessary, but it must remain simple to edit manually.

---

## 5. Categories

Categories must be data-driven.

Do not hard-code category names into components or game logic.

Adding a new category should require only adding it to the content/configuration data and using it in questions.

Renaming a category should not require code changes.

---

## 6. Question Selection

Encounter type → difficulty mapping (see GAME_DESIGN.md §6):

```text
TREASURE     → 2 (easy)
BATTLE       → 3 (medium)
MYSTERY      → 3 (medium)
PUZZLE       → 4 (hard)
ELITE        → 5 (very hard)
FINAL_BOSS   → 5 (very hard)
```

Difficulty 1 (very easy) is not a primary target for any encounter type; it is only used as a fallback.

When an encounter begins:

1. Determine the encounter's target difficulty from the mapping above.
2. Filter out all previously used questions.
3. Filter out questions sharing a category with the immediately preceding question answered by this team. Skip this filter if it would leave zero eligible questions.
4. For a MYSTERY encounter, prefer `type: "image"` questions within the remaining pool, if any are eligible.
5. Select from questions matching the target difficulty exactly. If none are eligible, widen to the nearest difficulty (±1, then ±2, ...) before falling back to any remaining eligible question.
6. Select one question randomly from the resulting eligible pool.
7. Mark it as used.

A question can only be used once per game.

Never select a previously used question.

The fallback must never crash the game.

---

## 7. Answer Flow

The question lifecycle is:

```text
QUESTION
    ↓
TEAM ANSWERS
    ↓
REVEAL ANSWER
    ↓
GM SELECTS CORRECT / INCORRECT
    ↓
SCORE UPDATE
    ↓
FORFEIT IF INCORRECT
    ↓
ADVANCE TEAM
```

The answer must not be revealed automatically before the GM requests it.

The GM controls when the answer is revealed.

The GM manually determines correctness for every question type, including multiple-choice and numerical questions — the system never auto-grades, regardless of `type`.

There is no per-question timer; the GM advances each step manually.

---

## 8. Scoring

Implement scoring in one central game-logic function.

For an encounter with value `X`:

```text
correct → score + X
incorrect → score - X
```

Never implement scoring separately in individual UI components.

A single answer resolution must produce exactly one score change.

Protect against double-clicks and repeated submissions.

Negative scores must be supported.

---

## 9. Game State

Game state should contain at least:

```text
teams
currentTeamIndex
map
usedQuestionIds
currentEncounter
gamePhase
turnHistory
previousStateSnapshot   (for single-step undo, see §10)
```

The `map` must be stored as a plain, JSON-serializable structure — for example a record/object keyed by node id, or an array of nodes — not a native `Map` instance. `usedQuestionIds` should likewise be a JSON-serializable array (reconstructed into a `Set` at runtime if convenient). Both need to round-trip through local-storage persistence (§14) without a custom serializer.

Each team should contain:

```text
id
name
icon
score
position
encountersCompleted
```

A team's `position` can equal another team's `position` — teams are allowed to share a node.

The game state must make it impossible for a team to complete more than 10 encounters.

---

## 10. Undo

Undo reverses only the single most recently completed action. There is no multi-step undo and no redo.

Implement it by keeping a snapshot of the game state immediately before each action is applied. Undo restores that snapshot and then discards it, so an already-undone action cannot be undone again.

Undo must correctly reverse the previous completed game action, including:

- score
- team position
- encounter count
- question usage (a question un-used by an undo becomes eligible for selection again)
- current turn
- encounter state
- forfeit state where relevant

Do not allow an undo operation to corrupt the used-question pool.

---

## 11. Map

Use a predefined map layout unless there is a strong technical reason not to.

The map must contain:

- START (single node)
- 9 normal progression layers
- BOSS

Topology mimics a Slay the Spire-style branching map:

- START connects forward to all 3 nodes of layer 1. Layer 1 always has exactly 3 nodes.
- Layers 2–9 each contain 2–3 nodes.
- Each node connects forward to 1–3 nodes in the next layer.
- A node may share at most one of its forward connections with a neighboring node in the same layer, allowing adjacent paths to converge on a shared next-layer node without turning the map into a fully connected mess.

Every valid path contains exactly 9 normal encounters before the boss.

Every node must define:

```text
id
layer
encounterType
value
connections
x, y   (for visual layout)
```

Multiple teams may occupy the same node at the same time. Rendering must visually distinguish teams sharing a node (e.g. stacked or offset icons) — this is a display concern, not a game-state concern.

The application must validate that all nodes have valid forward connections and that the boss is reachable from every possible path.

---

## 12. Forfeits

Forfeits are stored separately.

Example:

```json
{
  "id": "forfeit-001",
  "text": "Speak in a dramatic fantasy narrator voice until your next turn.",
  "intensity": 1,
  "tags": ["funny", "performance"]
}
```

Select forfeits randomly. Do not track forfeits as "used" — the same forfeit can be selected more than once in a game.

Resolution is a single action: the GM clicks a **Forfeit Complete** control once it has been performed, which unblocks turn advancement. The application does not verify that the forfeit was actually performed.

Do not make forfeits part of the scoring system.

---

## 13. Answer Visibility

The application uses a single interface — there is no separate public view and GM view.

The canonical answer must not be rendered anywhere in the interface before the answer-reveal stage. Don't rely solely on CSS to hide it (e.g. `display: none`) — omit it from rendered output entirely until the reveal action fires.

Everything else (question metadata, scoring controls, game controls, node values, etc.) is visible at all times; the answer is the only piece of state that is ever withheld.

---

## 14. Persistence

Use local browser persistence if practical.

A browser refresh should preferably allow recovery of an active game.

Provide a clear way to start a new game and discard the previous state.

Do not introduce a backend.

---

## 15. Reliability

Prevent:

- double scoring
- double progression
- repeated questions
- invalid node selection
- skipping turns
- completing more than 10 encounters
- advancing before answer resolution
- revealing answers prematurely

The game should fail gracefully when content is missing or malformed.

---

## 16. Configuration

Centralize configurable values such as:

- number of teams
- encounters per team
- node values
- encounter types
- difficulty mapping
- boss value

Do not scatter these values throughout the UI code.

---

## 17. Presentation

A persistent scoreboard bar is always visible at the bottom of the screen, showing every team's name and current score, evenly spaced across its width. It updates immediately on every score change and does not depend on game phase.

Each encounter type has one shared icon asset, not a per-node image — every node of a given `encounterType` renders the same icon. Store this icon mapping centrally alongside the other configuration in §16, not per-node in the map data. Keep icon files locally in the project (e.g. `public/images/icons/`), consistent with how question images are stored (CONTENT_GUIDE.md §8).

Connections between nodes are rendered as visible path lines on the map, matching each node's `connections` list (§11).

Each team has a token/character rendered at its current node's `(x, y)` position. Only the active team's token animates, and only when its turn resolves: it moves along the path line to the newly selected node. The animation must only ever traverse an edge present in that node's `connections` — it never jumps to an unconnected node.

The question and, when applicable, the forfeit are each presented as an overlay on top of the map: it pops in when the step begins and pops back out (closes) once that step concludes, returning focus to the map underneath.