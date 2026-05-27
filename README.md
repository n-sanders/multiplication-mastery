# Multiplication Mastery! 🚀

A highly responsive, visual, and educational single-page web application (SPA) designed for elementary students to practice, internalize, and master multiplication facts from $1 \times 1$ to $15 \times 15$. 

Built entirely with modern **HTML5, Vanilla CSS, and modular ES6 JavaScript**, the application operates 100% client-side, using browser `localStorage` for progress persistence with no external dependencies or backend requirements.

---

## 🎨 Interactive Custom Themes
Students can choose from four rich, theme-tailored, opaque color schemes in real-time by tapping the palette `🎨` icon:
- **Cosmic Explorer (Default)**: Deep indigo backgrounds with playful purple, gold, and blue accents.
- **Ocean Breeze**: Calming, high-focus environment with teal, cyan, and emerald green tones.
- **Cyber Racer**: High-contrast slate backgrounds with glowing neon red and amber accents.
- **Candy Land**: Sweet bubblegum pink and vibrant purple gradients.

---

## 🚀 Core Features & Educational Systems

### 1. Progressive XP-Based Unlocking System
Rather than overwhelming students with a full $15 \times 15$ grid right away, the grid is restricted and expands systematically as they solve problems, earn XP, and level up:
- **Level 1 (0 XP)**: Starting base allows only facts up to **$5 \times 5$**.
- **Unlocking Progression**: Subsequent factors unlock in a curriculum-structured order: **10s ➔ 9s ➔ 6s ➔ 7s ➔ 8s ➔ 11s ➔ 12s ➔ 13s ➔ 14s ➔ 15s**.
- **Locked Grid Visualization**: Locked cells in the dashboard matrix are rendered in translucent gray with a padlock icon. Clicking them tells students which level and XP threshold is required to unlock them.
- **Celebration overlay**: Hitting a new level spawns an immersive level-up splash screen with canvas confetti particle explosions.

### 2. Interactive Practice Modes

#### 📝 MCQ Mastery Mode (Timed Burndown)
The primary mode designed to build high-speed mental recall.
- **Ready-Check GO Screen**: Before each problem, a massive pulsing button appears. Tapping "GO" starts the timing run, ensuring complete student readiness.
- **Horizontal Burndown Timer**: Once active, a horizontal progress bar drains across the screen over 25 seconds, wiggling and shifting colors (Green ➔ Yellow ➔ Orange ➔ Red) to visually reflect speed zones.
- **Speed-Decaying XP Payout**:
  - $\le 5$ seconds: **15 XP** (Double speed reward!)
  - $5 - 15$ seconds: **10 XP**
  - $15 - 25$ seconds: **5 XP**
  - $> 25$ seconds: A guaranteed baseline of **3 XP** for getting it correct.
- **Immediate Rewarding Transitions**: Correct answers highlight in emerald green, spawn a floating XP tick, and automatically load the next GO check after 1.5 seconds.
- **Active Corrective Guidance**: Incorrect options are disabled and trigger a gentle card shake. The burndown timer pauses, and a tip illustrating multiplication as groups (e.g. *Tip: $3 \times 4$ means 3 groups of 4: $4+4+4$*) is displayed, allowing the student to learn and try again.

#### 🔢 Skip Counting Mode
Bridges simple sequential addition concepts with multiplication.
- Bubble chains representing jumps (e.g., `3 ➔ 6 ➔ 9 ➔ [?] ➔ 15`).
- A **live-rendered dot matrix grid** builds in real-time corresponding columns/rows, helping students visualize grouping.
- Bridging summary: *“3 jumps of 3 is 9, which is the exact same as 3 × 3 = 9!”*
- Paced to award **1 XP** per correct leap to maintain practice balance.

#### ⚡ Timed Challenge Arena
Builds mental endurance and tests overall fluency.
- Modes include: **1-Minute Sprint**, **3-Minute Marathon**, and **Endless Survival** (lasts until 3 mistakes).
- Display HUD includes correct score tallies, active accuracy percentages, and an SVG radial ticker ring.
- Post-round panels highlight final statistics, Facts Per Minute (FPM), personal records, and a detailed **Focus Review Target** list of equations answered incorrectly.

#### 🎴 Flashcard Arena
Encourages traditional memory recall.
- Cards flip with a smooth **3D css rotateY transition** when tapped.
- Self-graded buttons: *"I Knew It! 👍"* (awards **1 XP**) vs *"I Missed It 🧐"*.
- **Adaptive Re-queue**: Missed cards are put into a session queue and have a 45% probability of loading next, reinforcing weak spots quickly.

---

## 📊 Analytics Dashboard & Badges
- **Overall Mastery %**: Aggregates mastery rates of all active unlocked facts.
- **Interactive 15×15 Grid**: Cell grids color-coded by mastery status (Gold $\ge 80\%$ Mastered; Blue $40-79\%$ Improving; Purple $<40\%$ Needs Practice).
- **Interactive Tooltips**: Click any cell in the grid to inspect solved history, exact accuracy margins, and average response speed.
- **Sticker Badges Cabinet**: 8 unlockable sticker milestones (e.g., *Rising Star*, *Centurion*, *Speed Demon*) that activate vibrant colors and subtle hover floating animations when achieved.

---

## 🔬 Stacking Math Systems

### Adaptive Fact Selection (Weighted Probability)
The fact selection engine uses an inverse-weighted mastery model to naturally repeat weak facts. 

$$\text{Weight} = \max(8, 100 - \text{Mastery})$$

Unpracticed facts receive an additional weight boost of $120$. This guarantees that weak or new facts appear up to **$15\times$ more frequently** than mastered ones, while still occasionally presenting mastered facts to maintain recall and streaks.

### Fact Mastery Calculations
Every single multiplication fact ($1 \times 1$ to $15 \times 15$) has an independent, speed-sensitive mastery percentage:
- **Correct ($\le 1.5$s)**: $+12\%$ Mastery
- **Correct ($1.5$s to $3.0$s)**: $+8\%$ Mastery
- **Correct ($> 3.0$s)**: $+4\%$ Mastery
- **Incorrect**: $-6\%$ Mastery
- Bounded in the interval $[0, 100]$.

---

## 📂 Codebase Directory Layout

```
multiplication-mastery/
├── README.md               # Project documentation and details
├── index.html              # Main application entry and skeleton
├── css/
│   └── style.css           # UI variables, layouts, themes, and animations
└── js/
    ├── app.js              # Coordinator, Canvas particles, and level overlays
    ├── storage.js          # Profile state, streaks, levels, and badge checks
    ├── mastery.js          # Adaptive weights math and MCQ distractors generator
    └── components/
        ├── navigation.js   # Header statistics (streaks, XP) and theme switcher
        ├── multipleChoice.js # Timed MCQ practitioner and GO panels
        ├── skipCounting.js # Skip numbers and live dot arrays
        ├── timedChallenge.js # Score ticker grids and radial clock HUDs
        ├── flashcards.js   # 3D transforms and session queue arrays
        └── dashboard.js    # 15x15 inspection grid, stats, and badges
```

---

## 💻 Local Setup & Development

The application runs locally in any browser with **zero dependencies or package installations required**. Because it uses ES6 Modules, it must be loaded via a basic HTTP server to satisfy standard browser security protocols.

### Using Python (Easiest)
Navigate into the project root directory and run:
```bash
# Python 3
python -m http.server 8000
```
Then, open [http://localhost:8000](http://localhost:8000) in your browser.

### Using Node.js
If you have Node.js installed, you can launch a server instantly:
```bash
npx http-server
```

### Using VS Code
Install the **Live Server** extension, open the project workspace, and click the **"Go Live"** button in the status bar.
