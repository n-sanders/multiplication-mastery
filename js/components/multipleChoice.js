/* ==========================================================================
   PRIMARY PRACTICE MODE: MULTIPLE CHOICE MASTERY (js/components/multipleChoice.js)
   ========================================================================== */

import { selectAdaptiveFact, generateChoices, updateFactMastery } from '../mastery.js';
import { awardXP, updateStreak } from '../storage.js';

export class MCQPracticeMode {
    constructor(containerId, onStatsUpdatedCallback) {
        this.container = document.getElementById(containerId);
        this.onStatsUpdated = onStatsUpdatedCallback;
        
        // Active round state variables
        this.currentFact = null;
        this.choices = [];
        this.startTime = 0;
        this.hasAnswered = false;
        this.hasMadeMistake = false;
        this.timerInterval = null;
    }

    render() {
        this.loadNextFact();
    }

    cleanup() {
        // Clear any running background burndown timers
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    loadNextFact() {
        this.cleanup(); // stop any running timer ticks
        
        // Select next fact and distractors beforehand
        this.currentFact = selectAdaptiveFact();
        this.choices = generateChoices(this.currentFact.a, this.currentFact.b);
        this.hasAnswered = false;
        this.hasMadeMistake = false;

        // Render the pre-question "GO" Ready Screen
        this.renderGoScreen();
    }

    renderGoScreen() {
        const currentStreak = this.getStreakCount();
        const streakMilestone = Math.ceil((currentStreak + 1) / 5) * 5;
        const progressPercent = Math.min(100, (currentStreak / streakMilestone) * 100);

        this.container.innerHTML = `
            <div class="practice-card glass-panel animate-pop">
                <!-- Mini Progress Track toward milestone -->
                <div class="card-progress-bar" title="Streak progress to next milestone!">
                    <div class="card-progress-fill" style="width: ${progressPercent}%"></div>
                </div>

                <div class="ready-panel">
                    <h3>Ready for the next fact?</h3>
                    <p style="font-size: 13px; color: var(--text-secondary);">
                        Tap <strong>GO</strong> to start the countdown timer and solve!
                    </p>
                    
                    <!-- Pulsing Circular GO Button -->
                    <button id="mcq-go-btn" class="go-btn ripple-btn">
                        GO!
                    </button>
                    
                    <span style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">
                        Quick Answers Earn Maximum XP! ⚡
                    </span>
                </div>
            </div>
        `;

        const goBtn = this.container.querySelector('#mcq-go-btn');
        goBtn.addEventListener('click', () => {
            this.startActiveQuestion();
        });
    }

    startActiveQuestion() {
        this.startTime = Date.now();
        this.renderCardSkeleton();
        
        // Start high frequency burndown meter ticks (50ms interval for fluid sub-second animation)
        this.timerInterval = setInterval(() => {
            this.updateBurndownTimer();
        }, 50);
    }

    renderCardSkeleton() {
        const currentStreak = this.getStreakCount();
        const streakMilestone = Math.ceil((currentStreak + 1) / 5) * 5;
        const progressPercent = Math.min(100, (currentStreak / streakMilestone) * 100);

        this.container.innerHTML = `
            <div class="practice-card glass-panel animate-pop">
                <!-- Mini Progress Track toward milestone -->
                <div class="card-progress-bar" title="Streak progress to next milestone!">
                    <div class="card-progress-fill" style="width: ${progressPercent}%"></div>
                </div>

                <!-- Equation Display -->
                <div class="equation-display" id="mcq-equation">
                    <span class="factor-a">${this.currentFact.a}</span>
                    <span class="factor-sign">×</span>
                    <span class="factor-b">${this.currentFact.b}</span>
                    <span class="equals">=</span>
                    <span class="answer-unknown" id="equation-answer-block">?</span>
                </div>

                <!-- Visual Horizontal Burndown Timer -->
                <div class="burndown-container" title="XP Burndown Meter">
                    <div class="burndown-bar" id="burndown-timer" style="width: 100%;"></div>
                </div>
                <div class="mcq-timer-status" id="mcq-timer-status">
                    ⚡ Double speed! Solve now for <strong style="color: var(--color-warning);">15 XP</strong>!
                </div>

                <!-- Answer Choices Grid -->
                <div class="choices-grid" id="mcq-choices">
                    ${this.choices.map(choice => `
                        <button class="choice-btn ripple-btn" data-val="${choice}">
                            ${choice}
                        </button>
                    `).join('')}
                </div>

                <!-- Feedback & Hints Column -->
                <div class="feedback-box" id="mcq-feedback"></div>
            </div>
        `;

        this.setupEventListeners();
    }

    updateBurndownTimer() {
        const bar = this.container.querySelector('#burndown-timer');
        const timerStatus = this.container.querySelector('#mcq-timer-status');
        if (!bar || this.hasAnswered || this.hasMadeMistake) return;

        const elapsedSec = (Date.now() - this.startTime) / 1000;
        
        // High XP Zone decays down to 25s visually
        const visualLimit = 25; 
        const percent = Math.max(0, 100 - (elapsedSec / visualLimit) * 100);
        
        bar.style.width = `${percent}%`;

        // Style/Color and XP message transitions in real-time
        if (elapsedSec <= 5) {
            bar.style.backgroundColor = 'var(--color-success)'; // green
            if (timerStatus) timerStatus.innerHTML = `⚡ Double speed! Solve now for <strong style="color: var(--color-warning);">15 XP</strong>!`;
        } else if (elapsedSec <= 15) {
            bar.style.backgroundColor = 'var(--color-warning)'; // yellow
            if (timerStatus) timerStatus.innerHTML = `⏱️ Worth <strong style="color: var(--color-warning);">10 XP</strong>. Keep focusing!`;
        } else if (elapsedSec <= 25) {
            bar.style.backgroundColor = '#ff7849'; // orange
            if (timerStatus) timerStatus.innerHTML = `🔍 Clock ticking... Worth <strong style="color: var(--color-warning);">5 XP</strong>!`;
        } else {
            bar.style.backgroundColor = 'var(--color-danger)'; // red
            if (timerStatus) timerStatus.innerHTML = `💡 Minimum XP tier reached: Worth <strong style="color: var(--color-warning);">3 XP</strong>. You can do it!`;
        }
    }

    getStreakCount() {
        try {
            const stored = localStorage.getItem('multiplication_mastery_student_profile');
            return stored ? JSON.parse(stored).currentStreak : 0;
        } catch (e) {
            return 0;
        }
    }

    setupEventListeners() {
        const choiceBtns = this.container.querySelectorAll('.choice-btn');
        const feedbackBox = this.container.querySelector('#mcq-feedback');
        const answerBlock = this.container.querySelector('#equation-answer-block');
        const card = this.container.querySelector('.practice-card');

        choiceBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.hasAnswered) return; // ignore extra clicks

                this.hasAnswered = true;
                this.cleanup(); // stop the burndown timer interval ticks

                const selectedVal = parseInt(btn.getAttribute('data-val'), 10);
                const correctAnswer = this.currentFact.a * this.currentFact.b;
                const responseTimeMs = Date.now() - this.startTime;
                const elapsedSec = responseTimeMs / 1000;

                if (selectedVal === correctAnswer) {
                    // CORRECT ANSWER
                    btn.classList.add('correct');
                    answerBlock.innerText = correctAnswer;
                    answerBlock.style.color = 'var(--color-success)';
                    answerBlock.style.borderColor = 'var(--color-success)';
                    answerBlock.style.background = 'rgba(16,185,129,0.1)';

                    // Mute other buttons
                    choiceBtns.forEach(b => {
                        if (parseInt(b.getAttribute('data-val'), 10) !== correctAnswer) {
                            b.classList.add('muted');
                        }
                    });

                    // Update storage streak and solve count
                    updateStreak(true);

                    // Update mastery values
                    const { newMastery } = updateFactMastery(
                        this.currentFact.a, 
                        this.currentFact.b, 
                        true, 
                        responseTimeMs
                    );

                    // Compute time-dependent XP award
                    // Within 5s: 15 XP. Past 5s: drops by 5 every 10 seconds. Min: 3 XP.
                    let xpToAward = 15;
                    let speedText = '';
                    
                    if (this.hasMadeMistake) {
                        xpToAward = 1;
                        speedText = '🌟 You found it! ';
                    } else {
                        if (elapsedSec <= 5) {
                            xpToAward = 15;
                            speedText = '⚡ Super Fast! ';
                        } else if (elapsedSec <= 15) {
                            xpToAward = 10;
                            speedText = '✨ Nice work! ';
                        } else if (elapsedSec <= 25) {
                            xpToAward = 5;
                            speedText = '👍 Correct! ';
                        } else {
                            xpToAward = 3;
                            speedText = '🌟 You did it! ';
                        }
                    }

                    const xpAwardDetails = awardXP(xpToAward);

                    // Display floaty XP text popup
                    this.triggerXpPopup(btn, `+${xpToAward} XP`);

                    // Display Success Encouragement Message
                    feedbackBox.innerHTML = `<span class="correct">${speedText}${this.currentFact.a} × ${this.currentFact.b} = ${correctAnswer} (+${xpToAward} XP)</span>`;

                    // Synchronize the header bars
                    this.onStatsUpdated(xpAwardDetails);

                    // Automatically load next fact (which will display the GO screen!) after 1.5 seconds
                    setTimeout(() => {
                        const currentActiveTab = document.querySelector('.nav-tab.active')?.getAttribute('data-tab');
                        if (currentActiveTab === 'mcq') {
                            this.loadNextFact();
                        }
                    }, 1500);

                } else {
                    // INCORRECT ANSWER
                    btn.classList.add('incorrect');
                    btn.disabled = true; // disable this wrong option
                    card.classList.add('animate-shake');
                    
                    // Remove shake class after animation completes so it can shake again on next mistake
                    setTimeout(() => card.classList.remove('animate-shake'), 500);

                    // Update local storage streak (reset) but keep problem solve count ticking
                    updateStreak(false);

                    // Update mastery values
                    updateFactMastery(this.currentFact.a, this.currentFact.b, false, responseTimeMs);

                    // Sync stats (resets streak)
                    this.onStatsUpdated({ levelUp: false });

                    // Generate an educational tip
                    const groups = Array(this.currentFact.a).fill(this.currentFact.b).join(' + ');
                    feedbackBox.innerHTML = `
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <span class="incorrect" style="font-weight: 700;">Oops! Let's try again! 🌟</span>
                            <span style="font-size: 13px; color: var(--text-secondary);">
                                Tip: <strong>${this.currentFact.a} × ${this.currentFact.b}</strong> means ${this.currentFact.a} groups of ${this.currentFact.b} 
                                (<span style="color: var(--color-accent);">${groups}</span>)
                            </span>
                        </div>
                    `;
                    
                    // Allow clicking other buttons by leaving hasAnswered false!
                    this.hasAnswered = false; 
                    
                    // NEW REQUIREMENT: Stop the timer and change the XP available to earn as just 1 XP
                    this.hasMadeMistake = true;
                    this.cleanup(); // stop the burndown timer interval ticks
                    
                    const bar = this.container.querySelector('#burndown-timer');
                    const timerStatus = this.container.querySelector('#mcq-timer-status');
                    if (bar) {
                        bar.style.width = '0%';
                        bar.style.backgroundColor = 'var(--color-danger)';
                    }
                    if (timerStatus) {
                        timerStatus.innerHTML = `⚠️ Mistake made. Worth <strong style="color: var(--color-warning);">1 XP</strong>. Find the correct answer!`;
                    }
                }
            });
        });
    }

    triggerXpPopup(element, text) {
        const rect = element.getBoundingClientRect();
        const popup = document.createElement('div');
        popup.className = 'xp-popup';
        popup.innerText = text;
        popup.style.left = `${rect.left + rect.width / 2}px`;
        popup.style.top = `${rect.top - 20}px`;
        document.body.appendChild(popup);

        // Remove element after animation completes
        setTimeout(() => popup.remove(), 1000);
    }
}
