# Bachelor Party Quiz — Content Guide

## 1. Editing Questions

Questions live in:

```text
data/questions.json
```

I should be able to add, remove or edit questions by editing this file.

Do not require changes to application code.

The single final-boss question lives separately, in `data/final-boss.json` — see §2.

Each question must have:

```text
id
category
difficulty
type
question
answer
```

Optional fields:

```text
choices
image
media
explanation
tags
```

---

## 2. Question Types

### text

Normal question answered verbally.

```json
{
  "id": "example-001",
  "category": "groom",
  "difficulty": 3,
  "type": "text",
  "question": "What was the groom's first job?",
  "answer": "Example answer"
}
```

### multiple-choice

```json
{
  "id": "example-002",
  "category": "gaming",
  "difficulty": 2,
  "type": "multiple-choice",
  "question": "Which game features Hyrule?",
  "choices": [
    "The Legend of Zelda",
    "Dark Souls",
    "Mass Effect",
    "Portal"
  ],
  "answer": "The Legend of Zelda"
}
```

### image

```json
{
  "id": "example-003",
  "category": "gaming",
  "difficulty": 4,
  "type": "image",
  "question": "What game is this?",
  "image": "images/questions/example-003.png",
  "answer": "Example answer"
}
```

### audio / video

Same shape as `image`, but use `media` instead of `image` as the file field:

```json
{
  "id": "example-004",
  "category": "gaming",
  "difficulty": 3,
  "type": "audio",
  "question": "What game is this sound effect from?",
  "media": "audio/questions/example-004.mp3",
  "answer": "Example answer"
}
```

`type: "video"` works the same way, with `media` pointing at a video file.

Both support optional `clipStart`/`clipEnd` (seconds) to only reveal an excerpt before the answer is shown - e.g. play just seconds 1-4 of a longer clip, so the punchline/full clip doesn't spoil the question. Before the GM reveals the answer, playback and seeking are confined to that window; once revealed, the full file becomes playable and scrubbable normally. Either can be omitted (e.g. only `clipEnd` just caps how far the pre-reveal excerpt runs). Only meaningful for `audio`/`video`:

```json
{
  "id": "example-004b",
  "category": "gaming",
  "difficulty": 3,
  "type": "video",
  "question": "What happens right after this clip?",
  "media": "video/questions/example-004b.mp4",
  "clipStart": 0,
  "clipEnd": 3,
  "answer": "Example answer"
}
```

### youtube

For a clip you can't or don't want to store as a local file. Uses `youtubeId` (just the video id, not the full URL) instead of `image`/`media`:

```json
{
  "id": "example-005",
  "category": "gaming",
  "difficulty": 3,
  "type": "youtube",
  "question": "What game is this trailer for?",
  "youtubeId": "dQw4w9WgXcQ",
  "answer": "Example answer"
}
```

Embedded via `youtube-nocookie.com` with related-videos/branding/annotations minimized, and always shown in-page (never a direct link to youtube.com), so the browser's tab/page title never shows the real video title. There's no fully guaranteed way to hide YouTube's own in-player title text via URL params alone (YouTube dropped that option years ago) — the player has a permanent cover over the title/channel row as a fallback, regardless.

**This is the one exception to "the game must work offline" (§8 below, TECHNICAL_SPEC.md §1): a `youtube` question needs real internet access at the venue at the moment it's played.** Use it sparingly, and only when you actually can't get a local file.

The architecture should allow additional question types later.

### The final boss question

The single climactic final-boss question is stored separately, in `data/final-boss.json`, as one `Question` object (not an array). It is posed once, shared by every team at once, at the end of the game — see GAME_DESIGN.md §14. Edit it the same way as any other question; it doesn't need a `difficulty` that matches anything, since it's never drawn from the main pool.

---

## 3. Difficulty

Use 1–5:

1 = very easy

2 = easy

3 = medium

4 = hard

5 = very hard

Difficulty means how difficult the question should be for this particular group.

Obscure does not automatically mean difficult.

---

## 4. Categories

Categories are flexible data.

Current categories (`data/questions.json`):

- Amerika
- Jylland x Louise
- Nørde-lort
- Patrick Lore
- Nørde-lort Vol. 2

Add, remove or rename categories freely.

Do not change application code when doing so.

---

## 5. Tags

Tags are optional and can describe more specific subjects.

Examples:

```text
lotr
characters
dnd
5e
python
gaming
nintendo
physics
groom
bride
university
friend-group
```

Tags may be used by the question-selection system but should not be required.

---

## 6. Answers

Every question must have a canonical answer.

The answer is what appears when the GM selects **Reveal Answer**.

For subjective questions, write an answer that gives the GM a clear basis for judging the response.

Example:

```text
question:
"Where did the groom and bride first meet?"

answer:
"At the DTU summer party in 2022."
```

The GM still decides whether a team's wording is sufficiently correct. This applies to every question type — even multiple-choice or numerical questions are judged manually by the GM, never auto-graded by the system.

---

## 7. Multiple Choice

Multiple choice should be used selectively.

Most questions can simply require the team to know the answer.

Do not add multiple-choice options merely to make a question easier.

The GM still manually marks a multiple-choice answer correct or incorrect; the system never checks the team's answer against `choices` automatically.

---

## 8. Images, Audio & Video

Media files belong in local project directories:

```text
public/images/questions/
public/audio/questions/
public/video/questions/
```

Reference them from the question data (`image` for `type: "image"`, `media` for `type: "audio"`/`"video"`).

Use media for questions where the image/sound/clip itself is part of the challenge.

Do not rely on external URLs because the game must work offline — with one deliberate exception: `type: "youtube"` (see §2), for a clip you can't store as a local file. Use it sparingly; it needs real internet access at play time, unlike everything else in the game.

---

## 9. Visual Presentation

The game presents questions within a fantasy roguelike aesthetic on the public display.

### How Questions Appear

- **Question text** is displayed at 52px serif font ("Cinzel", "Georgia") on a gradient dark blue-to-purple background
- **Multiple choice options** are shown as 4 lettered gold cards (A, B, C, D) with a 36px font size, arranged in a 2×2 grid
- **Images** are displayed as the question, scaled to fit while maintaining aspect ratio, with a decorative cyan border and glow effect
- **Answer reveal** shows the canonical answer in a large gold-glowing box with the heading "✨ THE ANSWER ✨", plus an optional explanation below in smaller italic text

### Question Formatting Tips

- Keep question text **concise and readable at 52px**: avoid very long wording
- For **multiple-choice**, write clear, distinct options that fit comfortably as card labels (30-40 characters each)
- For **image-based questions**, ensure the image is clear and unambiguous when viewed on a 1080p display from several meters away
- For **explanations**, keep them short (1–2 sentences) and accessible to your group; they appear after the answer reveal

### Matching Encounter Types to Questions

Encounter types are automatically assigned by the game based on map nodes, and questions are randomly selected to match each encounter's difficulty:

| Encounter | Difficulty | Card Color | Theme | Best Question Types |
|-----------|-----------|-----------|-------|-------------------|
| TREASURE 💎 | 2 (easy) | Gold | Straightforward | General knowledge, groom facts |
| BATTLE ⚔️ | 3 (medium) | Red | Combat-themed | Mixed knowledge, predictions |
| PUZZLE 🧩 | 4 (hard) | Cyan | Problem-solving | Logic, wordplay, trivia |
| MYSTERY 🔮 | 3 (medium) | Purple | Enigmatic | **Prefer media questions (image/audio/video/youtube)** |
| ELITE 👑 | 5 (very hard) | Orange | Authoritative | Deep nerd knowledge, obscure |

FINAL BOSS 🐉 isn't in this table — it's a single dedicated question (`data/final-boss.json`) posed once to every team together, not matched by difficulty like the rest of the pool (see §2 and GAME_DESIGN.md §14).

The game automatically ensures variety by avoiding repeating a team's previous question category within a single game.

---

## 10. Question Quality

Prefer questions that are:

- clear
- concise
- fair
- interesting
- relevant to the group
- answerable without internet access

Avoid:

- ambiguous questions
- disputed answers
- excessively obscure trivia unless intentionally used
- questions requiring current information
- unnecessarily long wording

Groom and friend-group questions can be personal, weird or humorous.

---

## 10. Recommended Final Pool

The pool is built for a single game only — it does not need to support replaying the game across multiple separate sessions.

Target enough headroom over what a full game actually draws. A full game draws 36 questions from the main pool (4 teams × 9 encounters) plus the one dedicated final-boss question — so a pool of 50+ questions leaves comfortable room for the difficulty- and category-based selection rules (see TECHNICAL_SPEC.md §6) to find a good match without constantly falling back.

The pool should contain a mixture of:

- groom/friend-group questions
- the groom's interests
- general nerd knowledge
- general trivia

Use varied difficulties, with the most depth at difficulty 3 (medium) since both BATTLE and MYSTERY draw from it. Include a reasonable number of media (`image`/`audio`/`video`) questions, since MYSTERY encounters prefer them when available.

Not every question needs to be multiple choice.

A useful mix would be approximately:

- 50–70% open-answer
- 20–30% multiple choice
- 10–20% image/puzzle/special formats

These percentages are guidelines, not game rules.

During development, it's fine to fill the pool with placeholder/dummy questions before final content is written. Keep them in `data/questions.json` like any other question — never hard-code question content in application code — so swapping in the final pool later never touches the game engine.

---

## 11. Forfeits

Forfeits live in:

```text
data/forfeits.json
```

Example:

```json
{
  "id": "forfeit-001",
  "text": "Hele holdet tager en tår.",
  "intensity": 1,
  "tags": ["drink", "group"]
}
```

Unlike questions, forfeits are never excluded once used — the same forfeit can come up more than once in a game — but each use makes it progressively less likely to be picked again relative to the rest of the pool (see TECHNICAL_SPEC.md §12), so a smaller pool (the current 15) is fine; repeats will lean toward the ones used least so far.

There's no association between a forfeit and how hard the question was — a forfeit is drawn from the whole pool regardless of which node/difficulty the wrong answer came from.

Forfeits should be:

- short
- funny
- easy to understand
- appropriate for the group
- varied

Avoid dangerous activities, excessive alcohol requirements, harassment, property damage or anything that could reasonably make someone uncomfortable.

---

## 12. Content Validation

The application should validate the content files when loading them.

Useful errors include:

- duplicate question ID
- missing answer
- missing question text
- invalid difficulty
- invalid question type
- missing image
- missing audio/video media
- duplicate forfeit ID

Show useful error messages rather than failing silently.