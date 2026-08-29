# Bachelor Party Quiz — Content Guide

## 1. Editing Questions

Questions live in:

```text
data/questions.json
```

I should be able to add, remove or edit questions by editing this file.

Do not require changes to application code.

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

The architecture should allow additional question types later.

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

## 8. Images

Images belong in a local project directory, for example:

```text
public/images/questions/
```

Reference them from the question data.

Use images for questions where the visual itself is part of the challenge.

Do not rely on external image URLs because the game must work offline.

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
| MYSTERY 🔮 | 3 (medium) | Purple | Enigmatic | **Prefer image questions** |
| ELITE 👑 | 5 (very hard) | Orange | Authoritative | Deep nerd knowledge, obscure |
| FINAL BOSS 🐉 | 5 (very hard) | Red | Epic | The hardest, most dramatic question |

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

Target approximately **60–70 questions**. A full game draws 40 questions (4 teams × 10 encounters), so this leaves enough headroom for the difficulty- and category-based selection rules (see TECHNICAL_SPEC.md §6) to find a good match without constantly falling back.

The pool should contain a mixture of:

- groom/friend-group questions
- the groom's interests
- general nerd knowledge
- general trivia

Use varied difficulties, with the most depth at difficulty 3 (medium) since both BATTLE and MYSTERY draw from it. Include a reasonable number of `image`-type questions, since MYSTERY encounters prefer them when available.

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
  "text": "Give the groom a dramatic 20-second fantasy RPG-style prophecy.",
  "intensity": 2,
  "tags": ["performance", "funny"]
}
```

Target approximately **20–30 forfeits**. Unlike questions, forfeits are not tracked as used, so the same forfeit can come up more than once in a game — a smaller pool is fine.

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
- duplicate forfeit ID

Show useful error messages rather than failing silently.