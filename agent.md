# Developer Agent Onboarding Guide: Multiplication Mastery

Welcome, fellow coding assistant! This guide provides full context, architectural mapping, mathematical equations, and coding guidelines for the **Multiplication Mastery** single-page web application (SPA). Use this to quickly understand the codebase and maintain consistency.

---

## 🎯 Project Overview & Core Goals

**Multiplication Mastery** is an interactive, responsive web application designed for elementary students to practice and master multiplication facts from $1 \times 1$ to $15 \times 15$. 

### High-Fidelity UX & Aesthetics
- **Vibrant Kid-Friendly Visuals**: Uses Outfit and Fredoka Google Fonts, glassmorphism card panels (`backdrop-filter`), and smooth scale micro-animations.
- **Ambient Drift Canvas**: An HTML5 Canvas runs an ambient background loop rendering drifting bubble rings behind the interface.
- **Custom Color Themes**: Four complete visual palettes are switchable in real-time inside the header menu:
  - `theme-default` (Cosmic Explorer)
  - `theme-blue-green` (Ocean Breeze)
  - `theme-black-red` (Cyber Racer)
  - `theme-pink-purple` (Candy Land)
- **Responsive Stacking**: Stacking context is preserved by holding `z-index: 999` on the header panel (`#app-header`), ensuring overlays drop down correctly over content viewports.

---

## 🎓 Mathematical & Staging Systems

### 1. Weighted Fact Selection (Adaptive Practice)
To naturally repeat facts a student struggles with, `mastery.js` implements a weighted selection model. Fully mastered facts ($100\%$ mastery) still appear at a low probability so they are periodically reviewed.

$$\text{Weight} = \max(8, 100 - \text{Mastery})$$

- *New/Unpracticed facts* receive a weight of $120$ to ensure they are quickly introduced.
- *Active Pools*: MCQ and Timed Challenge modes draw facts *only* from the certified fluent fact list.

### 2. Fact Mastery Mechanics
Individual facts ($A \times B$) have independent mastery scores bounded in $[0, 100]$. On practice step completion, mastery shifts based on response times:
- **Correct ($\le 1.5$s)**: $+12\%$ Mastery (Fluent)
- **Correct ($1.5$s to $3.0$s)**: $+8\%$ Mastery
- **Correct ($> 3.0$s)**: $+4\%$ Mastery
- **Incorrect**: $-6\%$ Mastery

### 3. Progressive XP Advancement & Unlocking
To prevent overwhelm, facts are unlocked systematically as students earn XP and level up:
- **Base Level (0 XP)**: Facts up to **$5 \times 5$** are unlocked and certified.
- **Factor Unlocking Order**: **10s $\to$ 9s $\to$ 6s $\to$ 7s $\to$ 8s $\to$ 11s $\to$ 12s $\to$ 13s $\to$ 14s $\to$ 15s**.

### 4. Two-Tier Certification Staging
- **Locked Phase 🔒**: Fact is completely inaccessible.
- **Introductory Concept Phase 📖**: Unlocked by level XP. Available *only* in **Skip Counting** and **Flashcard** modes. Allows students to learn groupings and memory cues.
- **Certified & Fluent Phase 🎓**: Promoted to the active pool once certification targets are met:
  - Complete the skip counting sequence for factor $N$ exactly **3 times**.
  - Solve **15 targeted flashcards** containing factor $N$ correctly.
- **Certification Celebration**: Promoted factors trigger a full-screen congratulations card overlaid with falling canvas confetti particles.

---

## 🛠️ File Structure & Responsibilities

```
multiplication-mastery/
├── index.html              # Main page, Fonts, Overlay modals, Canvas containers
├── README.md               # User-facing project documentation
├── agent.md                # Developer agent context file (This file!)
├── css/
│   └── style.css           # Styling rules, variables, keyframe animations, media queries
└── js/
    ├── app.js              # Routing, Confetti and Ambient Canvas animation loops
    ├── storage.js          # LocalStorage wrappers, streaks, badges, intro certifications progress
    ├── mastery.js          # Adaptive weights, distractors, fact masteries
    └── components/
        ├── navigation.js   # XP gauges, streaks, theme toggler, active tab select
        ├── multipleChoice.js # Timed MCQ, GO button checks, burndown bar calculations
        ├── skipCounting.js # Sequence chain inputs and live dot matrix grids
        ├── timedChallenge.js # HUD counts, SVG radial tickers, focus review tables
        ├── flashcards.js   # 3D transforms, targeted family selector decks
        └── dashboard.js    # Interactive 15x15 inspection grid, tooltips, badge shelf
```

---

## 💾 LocalStorage Data Schema

All data operates under the `multiplication_mastery_` prefix:

### 1. `student_profile`
```javascript
{
  xp: 1250,
  level: 3,
  totalProblemsSolved: 142,
  totalCorrect: 121,
  currentStreak: 5,
  highestStreak: 12,
  lastActiveDate: "2026-05-27",
  unlockedBadges: ["first_steps", "streak_5"],
  certifiedFactors: [1, 2, 3, 4, 5, 10], // Unlocks for MCQ
  introProgress: {
    "9": {
      skipCountingCount: 1,       // Target: 3
      flashcardsCorrectCount: 4   // Target: 15
    }
  }
}
```

### 2. `fact_data`
```javascript
{
  "7x8": {
    mastery: 82,
    correctCount: 8,
    incorrectCount: 1,
    lastPracticed: "2026-05-27T10:45:00Z",
    averageResponseTimeMs: 1800
  }
}
```

### 3. `timed_records`
```javascript
{
  "1min": { highScore: 18, accuracy: 95 },
  "3min": { highScore: 48, accuracy: 92 },
  "endless": { highScore: 104, accuracy: 97 }
}
```

---

## ⚠️ Critical Implementation Notes

### MCQ Timer & Mistake Mechanic
The primary MCQ Practice Mode uses a highly optimized countdown mechanism:
- Displays a **GO** check button first. Once clicked, the timer records `Date.now()`.
- Starts a 50ms interval loop to update the horizontal burndown bar width and active color.
- **Mistake Override**: If a wrong answer is clicked:
  - Sets `this.hasMadeMistake = true`.
  - Clears the interval (`this.cleanup()`).
  - Drains the burndown bar instantly to `0%` (Red) and changes status to: `"⚠️ Mistake made. Worth 1 XP. Find the correct answer!"`.
  - Halts further time calculations. Answering correctly afterwards awards a flat **1 XP** (and triggers `"🌟 You found it!"`).

### Memory & Hook Safety
- **Interval Cleanups**: Always clean up running timers (`clearInterval`) inside a `cleanup()` hook. MCQPracticeMode and TimedChallengeMode both require this cleanup when tabs are swapped in `app.js` to prevent interval stack overflows.
- **No Heavy Bundlers**: Do not introduce Webpack, Vite, or Babel configurations. Keep the project purely native HTML5, CSS3, and ES6 Modules to maintain instant local browser server boots.
