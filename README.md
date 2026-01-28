# Mental Math Trainer

A comprehensive Single Page Application (SPA) designed to improve mental arithmetic speed and accuracy. Built with vanilla JavaScript, this application combines rigorous mathematical drills with speedcubing-inspired analytics to track progress effectively.

## 🚀 Features

### Core Training Modes
* **Standard Operations:** Practice Multiplication, Addition, Subtraction, and Division with customizable digit ranges.
* **Mixed Mode:** A configurable gauntlet where you can toggle specific operations and difficulty levels (Warm Up to Extra Hard).
* **Chain Math (Flash Anzan):** A visual memory and calculation drill where numbers flash sequentially on the screen.
* **Exponents:** Practice powers (squares and cubes).

### Advanced Analytics
* **Speedcubing Metrics:** Tracks "Average of 5" (Ao5) and "Average of 12" (Ao12) by trimming best and worst times to provide a fair assessment of current skill.
* **Detailed Statistics:** View accuracy, total problems solved, and personal bests for every operation type.
* **History Log:** comprehensive session history and a "Wrong Answers" log to review and learn from mistakes.

### Customization & UX
* **Smart Division Logic:** Uses reverse-multiplication generation to ensure clean integer results (e.g., 2-digit dividend / 1-digit divisor).
* **Vertical Alignment:** Toggle between standard line equation format ($12 \times 8$) and vertical "school-style" layout.
* **Dark Mode:** A fully responsive dark theme with neon accents for comfortable night practice.
* **Reference Tables:** Built-in Power Tables ($x^n$) and Multiplication Tables (up to 40x40).

## 🛠️ Technology Stack

* **HTML5:** Semantic structure.
* **CSS3:** Custom responsive design using CSS variables for theming and Flexbox/Grid for layout.
* **JavaScript (ES6+):** Pure vanilla JS with no external dependencies or frameworks.
* **Local Storage:** Persists user settings, session history, and solve times directly in the browser.
