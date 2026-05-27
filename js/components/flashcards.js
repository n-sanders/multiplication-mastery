/* ==========================================================================
   FLASHCARD COMPONENT (js/components/flashcards.js)
   Traditional 3D flipping flashcards with self-grading controls ("I knew it!"
   vs "I missed it") and immediate adaptive session re-queuing of weak cards.
   ========================================================================== */

import { selectAdaptiveFact, updateFactMastery } from '../mastery.js';
import { awardXP, updateStreak } from '../storage.js';

export class FlashcardMode {
    constructor(containerId, onStatsUpdatedCallback) {
        this.container = document.getElementById(containerId);
        this.onStatsUpdated = onStatsUpdatedCallback;
        
        // Active card state
        this.currentFact = null;
        this.startTime = 0;
        this.isFlipped = false;
        
        // Mini session queue to immediately review cards the student missed!
        this.missedQueue = []; 
    }

    render() {
        this.loadNextCard();
    }

    loadNextCard() {
        this.isFlipped = false;
        
        // Adaptive selection: 45% chance to draw from immediately missed session card list
        if (this.missedQueue.length > 0 && Math.random() < 0.45) {
            this.currentFact = this.missedQueue.shift(); // take the oldest missed card
        } else {
            this.currentFact = selectAdaptiveFact();
        }
        
        this.startTime = Date.now();
        this.renderCardSkeleton();
    }

    renderCardSkeleton() {
        this.container.innerHTML = `
            <div class="practice-card glass-panel animate-pop">
                <h2 style="font-family: 'Outfit', sans-serif; font-size: 18px; margin-bottom: 4px;">
                    🎴 Flashcard Arena
                </h2>
                <p style="font-size: 12px; color: var(--text-secondary); text-align: center; margin-bottom: 8px;">
                    Test your memory! Tap the card to flip and reveal, then grade yourself.
                </p>

                <!-- 3D Card Element -->
                <div class="flashcard-wrapper" id="flashcard-element">
                    <div class="flashcard-inner">
                        <!-- Front (Equation) -->
                        <div class="flashcard-side flashcard-front">
                            <span class="hud-label" style="position: absolute; top: 12px;">FRONT</span>
                            <div class="flashcard-eq">
                                ${this.currentFact.a} × ${this.currentFact.b}
                            </div>
                            <span class="flashcard-hint-text">Touch to flip or reveal ➔</span>
                        </div>
                        
                        <!-- Back (Solution) -->
                        <div class="flashcard-side flashcard-back">
                            <span class="hud-label" style="position: absolute; top: 12px; color: rgba(16,185,129,0.6);">BACK</span>
                            <div class="flashcard-ans">
                                ${this.currentFact.a * this.currentFact.b}
                            </div>
                            <span style="font-size: 11px; color: var(--text-secondary); margin-top: 12px;">
                                How did you do? Grade honestly!
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Self-Grading Action buttons -->
                <div class="flashcard-controls" id="flashcard-controls-panel">
                    <button id="flashcard-reveal-btn" class="primary-btn ripple-btn" style="width: 100%;">
                        Reveal Answer 👁️
                    </button>
                </div>
            </div>
        `;

        this.setupCardListeners();
    }

    setupCardListeners() {
        const cardWrapper = this.container.querySelector('#flashcard-element');
        const revealBtn = this.container.querySelector('#flashcard-reveal-btn');
        const controlPanel = this.container.querySelector('#flashcard-controls-panel');

        const toggleFlip = () => {
            if (this.isFlipped) return; // ignore extra flips if already revealed
            
            this.isFlipped = true;
            cardWrapper.classList.add('flipped');
            
            // Swap reveal button with choice self-grades
            setTimeout(() => {
                this.renderGradingControls(controlPanel);
            }, 250); // wait for flip transition midpoint
        };

        // Click card to flip
        cardWrapper.addEventListener('click', toggleFlip);
        // Click button to flip
        revealBtn.addEventListener('click', toggleFlip);
    }

    renderGradingControls(panelElement) {
        panelElement.innerHTML = `
            <div class="flashcard-grading-row">
                <button id="grade-fail-btn" class="grade-btn fail ripple-btn">
                    <span>🧐</span> I Missed It
                </button>
                <button id="grade-success-btn" class="grade-btn success ripple-btn">
                    <span>👍</span> I Knew It!
                </button>
            </div>
        `;

        this.setupGradingListeners();
    }

    setupGradingListeners() {
        const successBtn = this.container.querySelector('#grade-success-btn');
        const failBtn = this.container.querySelector('#grade-fail-btn');
        const responseTime = Date.now() - this.startTime;

        successBtn.addEventListener('click', () => {
            // Update streak & solvers
            updateStreak(true);

            // Update fact mastery (simulates correct answer)
            const { newMastery, change, isSpeedDemon } = updateFactMastery(
                this.currentFact.a, 
                this.currentFact.b, 
                true, 
                responseTime
            );

            // Award XP: Correct flashcard only awards 1 XP
            let xpToAward = 1;

            const xpDetails = awardXP(xpToAward);

            // Display floating text indicator on success button
            const rect = successBtn.getBoundingClientRect();
            const popup = document.createElement('div');
            popup.className = 'xp-popup';
            popup.innerText = `+1 XP`;
            popup.style.left = `${rect.left + rect.width / 2}px`;
            popup.style.top = `${rect.top - 20}px`;
            document.body.appendChild(popup);
            setTimeout(() => popup.remove(), 1000);

            // Sync main header HUD
            this.onStatsUpdated(xpDetails);

            // Load next card
            this.loadNextCard();
        });

        failBtn.addEventListener('click', () => {
            // Reset streak
            updateStreak(false);

            // Update fact mastery (simulates incorrect answer)
            updateFactMastery(this.currentFact.a, this.currentFact.b, false, responseTime);

            // Sync stats
            this.onStatsUpdated({ levelUp: false });

            // Add back to local session queue to show again soon!
            // Make sure we don't spam duplicate entries
            if (!this.missedQueue.some(f => f.key === this.currentFact.key)) {
                this.missedQueue.push(this.currentFact);
            }

            // Immediately load next card
            this.loadNextCard();
        });
    }
}
