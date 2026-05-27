/* ==========================================================================
   TIMED CHALLENGE COMPONENT (js/components/timedChallenge.js)
   Renders and manages timed practices: 1m, 3m, and Endless challenges.
   Includes animated timers, high score checks, and session analytics.
   ========================================================================== */

import { selectAdaptiveFact, generateChoices } from '../mastery.js';
import { loadTimedRecords, saveTimedRecords, awardXP } from '../storage.js';

export class TimedChallengeMode {
    constructor(containerId, onStatsUpdatedCallback) {
        this.container = document.getElementById(containerId);
        this.onStatsUpdated = onStatsUpdatedCallback;
        
        // Active game state values
        this.selectedMode = null;     // '1min', '3min', 'endless'
        this.isGameActive = false;
        this.timeRemaining = 0;       // seconds
        this.totalDuration = 60;      // seconds
        this.timerInterval = null;
        
        // Performance metrics
        this.currentFact = null;
        this.choices = [];
        this.score = 0;
        this.attempts = 0;
        this.mistakesCount = 0;       // endless mode ends at 3
        this.sessionHistory = [];     // Array of { eq: '7x8', correct: true/false }
    }

    render() {
        if (this.isGameActive) {
            this.renderGameHUD();
        } else {
            this.renderSetup();
        }
    }

    renderSetup() {
        const records = loadTimedRecords();
        
        this.container.innerHTML = `
            <div class="practice-card glass-panel animate-pop">
                <div class="timed-setup">
                    <h2 style="font-family: 'Fredoka', sans-serif; font-size: 24px; text-align: center;">
                        ⏱️ Timed Challenge Arena!
                    </h2>
                    <p style="font-size: 13px; color: var(--text-secondary); text-align: center; margin-bottom: 8px;">
                        Answer as many facts as you can before the clock runs out! Speed and accuracy are key.
                    </p>

                    <div class="timed-setup-options">
                        <!-- 1 Minute option -->
                        <button class="timed-mode-btn" data-mode="1min">
                            <span class="timed-mode-emoji">⚡</span>
                            <div class="timed-mode-text">
                                <span class="timed-mode-name">1 Minute Sprint</span>
                                <span class="timed-mode-desc">High speed, quick fire facts! Record: ${records['1min']?.highScore || 0} pts</span>
                            </div>
                        </button>

                        <!-- 3 Minutes option -->
                        <button class="timed-mode-btn" data-mode="3min">
                            <span class="timed-mode-emoji">⏱️</span>
                            <div class="timed-mode-text">
                                <span class="timed-mode-name">3 Minute Marathon</span>
                                <span class="timed-mode-desc">Build consistency and focus! Record: ${records['3min']?.highScore || 0} pts</span>
                            </div>
                        </button>

                        <!-- Endless option -->
                        <button class="timed-mode-btn" data-mode="endless">
                            <span class="timed-mode-emoji">♾️</span>
                            <div class="timed-mode-text">
                                <span class="timed-mode-name">Endless Survival</span>
                                <span class="timed-mode-desc">Play until 3 mistakes are made! Record: ${records['endless']?.highScore || 0} pts</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.setupSetupListeners();
    }

    setupSetupListeners() {
        const modeBtns = this.container.querySelectorAll('.timed-mode-btn');
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.getAttribute('data-mode');
                this.startChallenge(mode);
            });
        });
    }

    startChallenge(mode) {
        this.selectedMode = mode;
        this.isGameActive = true;
        this.score = 0;
        this.attempts = 0;
        this.mistakesCount = 0;
        this.sessionHistory = [];
        
        if (mode === '1min') {
            this.totalDuration = 60;
            this.timeRemaining = 60;
        } else if (mode === '3min') {
            this.totalDuration = 180;
            this.timeRemaining = 180;
        } else {
            this.totalDuration = 0; // endless uses positive timer
            this.timeRemaining = 0;
        }

        this.renderGameHUD();
        this.loadGameFact();
        this.startTimer();
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        this.timerInterval = setInterval(() => {
            if (this.selectedMode === 'endless') {
                this.timeRemaining++; // count up
                this.updateEndlessTimerUI();
            } else {
                this.timeRemaining--; // count down
                this.updateCountdownTimerUI();
                
                if (this.timeRemaining <= 0) {
                    this.endGame();
                }
            }
        }, 1000);
    }

    updateCountdownTimerUI() {
        const timerText = this.container.querySelector('#timer-display-val');
        const progressRing = this.container.querySelector('#timer-ring');
        
        if (timerText) timerText.innerText = this.timeRemaining;
        
        // Radial progress calculations: r=26, perimeter=163.36
        if (progressRing) {
            const perimeter = 163.36;
            const progress = (this.timeRemaining / this.totalDuration);
            const offset = perimeter * (1 - progress);
            progressRing.style.strokeDashoffset = offset;
            
            // Visual alarm color coding
            if (this.timeRemaining <= 10) {
                progressRing.style.stroke = 'var(--color-danger)';
            } else if (this.timeRemaining <= 25) {
                progressRing.style.stroke = 'var(--color-warning)';
            }
        }
    }

    updateEndlessTimerUI() {
        const timerText = this.container.querySelector('#timer-display-val');
        if (timerText) {
            const mins = Math.floor(this.timeRemaining / 60);
            const secs = this.timeRemaining % 60;
            timerText.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
    }

    renderGameHUD() {
        this.container.innerHTML = `
            <div class="practice-card glass-panel animate-pop">
                <div class="timed-hud">
                    <!-- HUD Score -->
                    <div class="timed-hud-item">
                        <span class="hud-label">Score</span>
                        <span class="hud-value" style="color: var(--color-warning);" id="hud-score">0</span>
                    </div>

                    <!-- Circular Ticker Timer -->
                    <div class="circular-timer">
                        <svg>
                            <circle class="timer-bg" cx="30" cy="30" r="26"></circle>
                            <circle class="timer-progress" id="timer-ring" cx="30" cy="30" r="26" 
                                    stroke-dasharray="163.36" stroke-dashoffset="0"></circle>
                        </svg>
                        <div class="timer-text" id="timer-display-val">
                            ${this.selectedMode === 'endless' ? '0:00' : this.timeRemaining}
                        </div>
                    </div>

                    <!-- HUD Health (Endless Mode) or Accuracy Percentage -->
                    <div class="timed-hud-item">
                        <span class="hud-label">${this.selectedMode === 'endless' ? 'Health' : 'Accuracy'}</span>
                        <span class="hud-value" id="hud-stats-right">
                            ${this.selectedMode === 'endless' ? '❤️ ❤️ ❤️' : '100%'}
                        </span>
                    </div>
                </div>

                <!-- Equation Area -->
                <div class="equation-display" id="mcq-equation" style="margin-top: 8px;">
                    <span class="factor-a" id="eq-a">7</span>
                    <span class="factor-sign">×</span>
                    <span class="factor-b" id="eq-b">8</span>
                    <span class="equals">=</span>
                    <span class="answer-unknown" id="equation-answer-block">?</span>
                </div>

                <!-- Answer Choices (MCQ grid is perfect for rapid fire speed) -->
                <div class="choices-grid" id="mcq-choices">
                    <!-- Loaded dynamically -->
                </div>

                <div class="feedback-box" id="timed-hud-feedback">
                    Fast! Tap the matching bubble!
                </div>
            </div>
        `;
    }

    loadGameFact() {
        this.currentFact = selectAdaptiveFact();
        this.choices = generateChoices(this.currentFact.a, this.currentFact.b);
        
        const eqA = this.container.querySelector('#eq-a');
        const eqB = this.container.querySelector('#eq-b');
        const answerBlock = this.container.querySelector('#equation-answer-block');
        const choicesGrid = this.container.querySelector('#mcq-choices');
        const feedbackBox = this.container.querySelector('#timed-hud-feedback');

        if (!eqA) return; // avoid ticks running on page changes

        eqA.innerText = this.currentFact.a;
        eqB.innerText = this.currentFact.b;
        answerBlock.innerText = '?';
        answerBlock.style.color = 'rgba(255,255,255,0.15)';
        answerBlock.style.borderColor = 'rgba(255,255,255,0.15)';
        answerBlock.style.background = 'rgba(255,255,255,0.05)';

        choicesGrid.innerHTML = `
            ${this.choices.map(choice => `
                <button class="choice-btn ripple-btn timed-btn-choice" data-val="${choice}">
                    ${choice}
                </button>
            `).join('')}
        `;

        feedbackBox.innerText = this.selectedMode === 'endless' 
            ? `Active Survival! Solved: ${this.score}` 
            : `Ticking! Answer quickly!`;

        this.setupGameChoicesListeners();
    }

    setupGameChoicesListeners() {
        const choiceBtns = this.container.querySelectorAll('.timed-btn-choice');
        const correctAnswer = this.currentFact.a * this.currentFact.b;

        choiceBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const selectedVal = parseInt(btn.getAttribute('data-val'), 10);
                const isCorrect = selectedVal === correctAnswer;

                this.attempts++;
                this.sessionHistory.push({
                    eq: `${this.currentFact.a} × ${this.currentFact.b}`,
                    correct: isCorrect,
                    val: correctAnswer
                });

                if (isCorrect) {
                    this.score++;
                    
                    // Trigger visual popup on HUD button
                    const rect = btn.getBoundingClientRect();
                    const popup = document.createElement('div');
                    popup.className = 'xp-popup';
                    popup.innerText = '+1 pt';
                    popup.style.left = `${rect.left + rect.width / 2}px`;
                    popup.style.top = `${rect.top - 20}px`;
                    document.body.appendChild(popup);
                    setTimeout(() => popup.remove(), 1000);

                    // Update UI stats rapidly
                    this.container.querySelector('#hud-score').innerText = this.score;
                    this.loadGameFact();
                } else {
                    // Wrong choice
                    if (this.selectedMode === 'endless') {
                        this.mistakesCount++;
                        const healthSpan = this.container.querySelector('#hud-stats-right');
                        
                        if (healthSpan) {
                            if (this.mistakesCount === 1) healthSpan.innerText = '❤️ ❤️ 🖤';
                            else if (this.mistakesCount === 2) healthSpan.innerText = '❤️ 🖤 🖤';
                            else healthSpan.innerText = '🖤 🖤 🖤';
                        }
                        
                        if (this.mistakesCount >= 3) {
                            this.endGame();
                        } else {
                            this.loadGameFact();
                        }
                    } else {
                        // For countdown, load next fact immediately to keep pacing moving!
                        this.loadGameFact();
                    }
                }

                // Update right HUD details for standard timer (Accuracy percentage)
                if (this.selectedMode !== 'endless') {
                    const accuracy = Math.round((this.score / this.attempts) * 100);
                    const rightHud = this.container.querySelector('#hud-stats-right');
                    if (rightHud) rightHud.innerText = `${accuracy}%`;
                }
            });
        });
    }

    endGame() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.isGameActive = false;
        
        // Load timed records and check high score
        const records = loadTimedRecords();
        const mode = this.selectedMode;
        
        const prevHighScore = records[mode]?.highScore || 0;
        const isNewRecord = this.score > prevHighScore;
        
        const accuracy = this.attempts > 0 ? Math.round((this.score / this.attempts) * 100) : 0;
        
        if (isNewRecord) {
            records[mode] = {
                highScore: this.score,
                accuracy: accuracy
            };
            saveTimedRecords(records);
        }

        // Payout calculations: 8 XP per correct answer + 200 XP record bonus!
        const xpEarned = (this.score * 8) + (isNewRecord ? 150 : 0);
        const xpDetails = awardXP(xpEarned);

        // Sync main navigation stats
        this.onStatsUpdated(xpDetails);

        this.renderResults(isNewRecord, xpEarned, prevHighScore, accuracy);
    }

    renderResults(isNewRecord, xpEarned, prevHighScore, accuracy) {
        // Calculate Facts Per Minute (FPM)
        let durationMin = 1;
        if (this.selectedMode === '3min') durationMin = 3;
        else if (this.selectedMode === 'endless') durationMin = Math.max(0.5, this.timeRemaining / 60);
        
        const fpm = Math.round(this.score / durationMin);

        // Extract mistakes to review
        const mistakes = this.sessionHistory.filter(h => !h.correct);
        const correctList = this.sessionHistory.filter(h => h.correct);

        this.container.innerHTML = `
            <div class="practice-card glass-panel animate-pop" style="max-width: 640px;">
                <div class="timed-results">
                    <span style="font-size: 54px;">${isNewRecord ? '🏆' : '🏁'}</span>
                    
                    <h2 style="font-family: 'Fredoka', sans-serif; font-size: 26px; text-align: center; color: var(--color-warning);">
                        ${isNewRecord ? 'NEW HIGH SCORE! 🎉' : 'Challenge Complete!'}
                    </h2>
                    
                    <p style="font-size: 15px; text-align: center; color: var(--text-secondary);">
                        You completed the <strong>${this.selectedMode === 'endless' ? 'Survival' : this.selectedMode === '3min' ? '3m Marathon' : '1m Sprint'}</strong>!
                        <br>
                        Earned: <strong style="color: var(--color-warning); font-family: 'Fredoka'; font-size: 18px;">+${xpEarned} XP</strong>
                    </p>

                    <!-- Metrics display -->
                    <div class="results-stats-row">
                        <div class="stat-box">
                            <span class="stat-box-val">${this.score}</span>
                            <span class="stat-box-lbl">Facts Correct</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-box-val">${accuracy}%</span>
                            <span class="stat-box-lbl">Accuracy</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-box-val">${fpm}</span>
                            <span class="stat-box-lbl">Facts Per Min</span>
                        </div>
                    </div>

                    <!-- High Score Context -->
                    ${isNewRecord ? `
                        <div style="background: rgba(251,191,36,0.1); border: 1px dashed var(--color-warning); padding: 8px 16px; border-radius: 8px; font-size: 13px;">
                            ⭐ You beat your past high score of <strong>${prevHighScore}</strong> by <strong>${this.score - prevHighScore}</strong> points!
                        </div>
                    ` : `
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            Personal Record: <strong>${prevHighScore}</strong> points
                        </div>
                    `}

                    <!-- Mistakes List (Educational target review) -->
                    ${mistakes.length > 0 ? `
                        <div style="width: 100%; text-align: left;">
                            <span style="font-size: 13px; font-weight: 700; color: var(--color-danger); display: block; margin-bottom: 8px;">
                                🎯 Focus review targets (${mistakes.length} mistakes):
                            </span>
                            <div style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 100px; overflow-y: auto;">
                                ${Array.from(new Set(mistakes.map(m => `${m.eq} = ${m.val}`)))
                                    .map(item => `
                                        <span style="background: rgba(244,63,94,0.1); border: 1px solid rgba(244,63,94,0.3); padding: 4px 8px; border-radius: 6px; font-size: 11px; font-family: 'Fredoka', sans-serif;">
                                            ${item}
                                        </span>
                                    `).join('')}
                            </div>
                        </div>
                    ` : `
                        <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); padding: 8px; border-radius: 8px; font-size: 13px; color: var(--color-success); font-weight: 600;">
                            🌟 PERFECT ROUND! 100% accuracy, incredible focus!
                        </div>
                    `}

                    <!-- Actions -->
                    <div style="display: flex; gap: 12px; width: 100%; margin-top: 10px;">
                        <button id="timed-retry-btn" class="primary-btn ripple-btn" style="flex: 1;">Practice Again ⏱️</button>
                        <button id="timed-quit-btn" class="secondary-btn" style="flex: 1;">Quit to Menu</button>
                    </div>
                </div>
            </div>
        `;

        this.setupResultsListeners();
    }

    setupResultsListeners() {
        const retryBtn = this.container.querySelector('#timed-retry-btn');
        const quitBtn = this.container.querySelector('#timed-quit-btn');

        retryBtn.addEventListener('click', () => {
            this.startChallenge(this.selectedMode);
        });

        quitBtn.addEventListener('click', () => {
            this.renderSetup();
        });
    }
}
