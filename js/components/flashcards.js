/* ==========================================================================
   FLASHCARD COMPONENT (js/components/flashcards.js)
   Traditional 3D flipping flashcards with self-grading controls.
   Supports Mixed Practice (certified pool) and Targeted Fact Families (intro focus)
   with real-time progress counters (correct solved stats out of 15).
   ========================================================================== */

import { selectAdaptiveFact, updateFactMastery } from '../mastery.js';
import { loadProfile, getUnlockedFactors, awardXP, updateStreak, isFactorCertified, recordFlashcardIntro } from '../storage.js';

export class FlashcardMode {
    constructor(containerId, onStatsUpdatedCallback) {
        this.container = document.getElementById(containerId);
        this.onStatsUpdated = onStatsUpdatedCallback;
        
        // Deck routing state
        this.deckMode = null;       // null (selection screen), 'mixed', 'targeted'
        this.targetFactor = null;   // e.g. 10 if targeted
        
        // Active card state
        this.currentFact = null;
        this.startTime = 0;
        this.isFlipped = false;
        
        // Mini session queue to immediately review cards the student missed!
        this.missedQueue = []; 
    }

    render() {
        if (this.deckMode === null) {
            this.renderDeckSelection();
        } else {
            this.loadNextCard();
        }
    }

    renderDeckSelection() {
        const profile = loadProfile();
        const unlockedFactors = getUnlockedFactors(profile.level);
        
        // Factors 1 through 15
        const allFactors = Array.from({ length: 15 }, (_, i) => i + 1);

        this.container.innerHTML = `
            <div class="practice-card glass-panel animate-pop" style="max-width: 600px;">
                <h2 style="font-family: 'Fredoka', sans-serif; font-size: 24px; text-align: center; margin-bottom: 4px;">
                    🎴 Select a Flashcard Deck!
                </h2>
                <p style="font-size: 13px; color: var(--text-secondary); text-align: center; margin-bottom: 16px;">
                    Practice all certified facts together, or select a targeted table to certify!
                </p>

                <!-- Mixed Practice option -->
                <button id="mixed-deck-btn" class="primary-btn ripple-btn" 
                        style="width: 100%; padding: 16px; font-size: 18px; border-radius: 16px; margin-bottom: 24px; display: flex; justify-content: center; align-items: center; gap: 8px;">
                    🌟 Mixed Practice Deck (All Certified Facts)
                </button>

                <h3 style="font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; align-self: flex-start; margin-bottom: 10px; color: var(--text-secondary); text-transform: uppercase;">
                    🎯 Targeted Fact Families
                </h3>

                <!-- Unlocked Selector Grid -->
                <div class="skip-grid" style="width: 100%;">
                    ${allFactors.map(f => {
                        const isUnlocked = unlockedFactors.includes(f);
                        const isCertified = isFactorCertified(f);
                        
                        let subtext = '';
                        let extraClass = '';
                        
                        if (!isUnlocked) {
                            subtext = 'Locked';
                            extraClass = 'locked';
                        } else if (isCertified) {
                            subtext = '🎓 Fluent';
                            extraClass = 'certified';
                        } else {
                            const progressObj = profile.introProgress?.[f] || { flashcardsCorrectCount: 0 };
                            subtext = `⚡ ${progressObj.flashcardsCorrectCount}/15`;
                            extraClass = 'intro-phase';
                        }

                        return `
                            <button class="skip-number-btn ${extraClass} targeted-deck-btn" 
                                    data-factor="${f}" 
                                    ${isUnlocked ? '' : 'disabled'}
                                    style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; height: 80px;"
                                    title="${isUnlocked ? `Practice only ${f}s!` : `Locked: Reach a higher level to unlock ${f}s`}">
                                <span style="font-size: 24px; font-weight: 700;">${isUnlocked ? f : '🔒'}</span>
                                <span style="font-size: 10px; font-weight: 500; opacity: 0.85;">${subtext}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        this.setupDeckSelectionListeners();
    }

    setupDeckSelectionListeners() {
        const mixedBtn = this.container.querySelector('#mixed-deck-btn');
        const targetBtns = this.container.querySelectorAll('.targeted-deck-btn');

        mixedBtn.addEventListener('click', () => {
            this.deckMode = 'mixed';
            this.targetFactor = null;
            this.loadNextCard();
        });

        targetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const factor = parseInt(btn.getAttribute('data-factor'), 10);
                this.deckMode = 'targeted';
                this.targetFactor = factor;
                this.loadNextCard();
            });
        });
    }

    loadNextCard() {
        this.isFlipped = false;
        const profile = loadProfile();
        
        if (this.deckMode === 'targeted') {
            // TARGETED FACT FAMILY GENERATION
            // Select equations focusing exclusively on targetFactor (e.g. 10)
            const unlockedFactors = getUnlockedFactors(profile.level);
            // Choose a random factor K from the unlocked list
            const K = unlockedFactors[Math.floor(Math.random() * unlockedFactors.length)];
            
            // Randomly order factor A and factor B
            const coinFlip = Math.random() > 0.5;
            const a = coinFlip ? this.targetFactor : K;
            const b = coinFlip ? K : this.targetFactor;
            
            this.currentFact = {
                a,
                b,
                key: `${a}x${b}`
            };
        } else {
            // MIXED CERTIFIED FACTS GENERATION
            // 45% chance to draw from immediately missed session card list
            if (this.missedQueue.length > 0 && Math.random() < 0.45) {
                this.currentFact = this.missedQueue.shift(); 
            } else {
                this.currentFact = selectAdaptiveFact();
            }
        }
        
        this.startTime = Date.now();
        this.renderCardSkeleton();
    }

    renderCardSkeleton() {
        const deckTitle = this.deckMode === 'targeted' 
            ? `🎯 targeted Deck: ${this.targetFactor}s` 
            : `📝 Mixed certified Deck`;

        this.container.innerHTML = `
            <div class="practice-card glass-panel animate-pop">
                <button id="flashcard-back-btn" class="secondary-btn" style="align-self: flex-start; padding: 6px 12px; font-size: 11px;">
                    ← Choose Deck
                </button>
                
                <h2 style="font-family: 'Fredoka', sans-serif; font-size: 22px; margin-top: 4px; text-align: center;">
                    ${deckTitle}
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
        const backBtn = this.container.querySelector('#flashcard-back-btn');

        backBtn.addEventListener('click', () => {
            this.deckMode = null;
            this.targetFactor = null;
            this.renderDeckSelection();
        });

        const toggleFlip = () => {
            if (this.isFlipped) return; 
            
            this.isFlipped = true;
            cardWrapper.classList.add('flipped');
            
            // Swap reveal button with choice self-grades
            setTimeout(() => {
                this.renderGradingControls(controlPanel);
            }, 250); 
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
            updateFactMastery(this.currentFact.a, this.currentFact.b, true, responseTime);

            // Award XP: 1 XP
            let xpDetails = awardXP(1);

            // Record targeted introductory progress if practicing targeted
            if (this.deckMode === 'targeted') {
                const certDetails = recordFlashcardIntro(this.targetFactor);
                
                // Check if factor certification criteria are now met!
                if (certDetails.newlyCertified) {
                    xpDetails.newlyCertified = true;
                    xpDetails.factorCertified = this.targetFactor;
                }
            }

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

            // Add back to local session queue to show again soon (for mixed mode only)
            if (this.deckMode === 'mixed') {
                if (!this.missedQueue.some(f => f.key === this.currentFact.key)) {
                    this.missedQueue.push(this.currentFact);
                }
            }

            // Immediately load next card
            this.loadNextCard();
        });
    }
}
