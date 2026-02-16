# Mental Math Trainer

A comprehensive Single Page Application (SPA) designed to improve mental arithmetic speed and accuracy. Built with vanilla JavaScript, it combines rigorous mathematical drills with speedcubing-inspired analytics to track your progress.

## 🚀 Features

### Training Modes

| Mode | Description |
|------|-------------|
| **Addition** | Configurable digit-by-digit addition (1×1 up to 5×5) |
| **Subtraction** | Always produces positive results; same digit config |
| **Multiplication** | Digit-selectable multiplication drills |
| **Division** | 5 difficulty levels — from basic tables (1–12) to 5-digit dividends with modulo challenges |
| **Mixed** | Customizable gauntlet — toggle each operation independently with per-operation difficulty (Warm Up → Extra Hard) |
| **Chain Math (Flash Anzan)** | Numbers flash sequentially on screen; calculate the running total from memory |
| **Algebra** | Solve for the missing operand: `? × 7 = 56` or `48 ÷ ? = 6` |
| **Square** | Calculate perfect squares up to 35² |
| **Square Root** | Identify the integer root of perfect squares |

### Analytics & Tracking

- **Speedcubing Metrics** — Ao5 and Ao12 averages (best and worst times trimmed)
- **7-Day Activity Chart** — Visual bar chart of daily problem count
- **Per-Operation Stats** — Accuracy and volume breakdown by operation type
- **Session History** — Review past sessions with score, accuracy, and average time
- **Wrong Answers Log** — Revisit mistakes to identify weak areas
- **Combo & Streak System** — Score multiplier that rewards consecutive correct answers

### Customization

- **Digit Configuration** — Select operand sizes (e.g., 3-by-2 for 3-digit × 2-digit)
- **Time Limits** — 10s speed mode, 30s moderate, or unlimited
- **6 Themes** — Clean, Night Owl, Chalkboard, Swiss, Solarized, Vaporwave
- **Vertical Layout** — School-style stacked format for standard operations
- **Reference Tables** — Power table (x^n, up to 20^20) and multiplication table (up to 40×40)
- **Target Goals** — Set personal target time and streak goals

## 🛠️ Technology Stack

- **HTML5** — Semantic structure with accessible form controls
- **CSS3** — Custom properties for theming, Flexbox/Grid layout, glassmorphism effects
- **JavaScript (ES6+)** — Pure vanilla JS, zero dependencies
- **localStorage** — Persists settings, session history, solve times, and wrong answers

## 📂 Project Structure

```
mental-math-trainer/
├── index.html      # App structure and all screen layouts
├── styles.css      # Theming, responsive design, animations
├── app.js          # All application logic (problem generation, state, analytics)
├── package.json    # Project metadata
└── README.md
```

## 🚀 Getting Started

1. Clone or download this repository
2. Open `index.html` in any modern browser
3. No build step, no server, no dependencies — it just works

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
