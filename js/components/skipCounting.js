/* ==========================================================================
   SKIP COUNTING MODE (js/components/skipCounting.js)
   Renders and manages interactive skip counting practice. Generates sequences,
   displays dot arrays, and bridges skip counting to multiplication concepts.
   ========================================================================== */

import { loadProfile, getUnlockedFactors, awardXP, isFactorCertified, recordSkipCountingIntro } from '../storage.js';

export class SkipCountingMode {
    constructor(containerId, onStatsUpdatedCallback) {
        this.container = document.getElementById(containerId);
        this.onStatsUpdated = onStatsUpdatedCallback;
        
        // Active mode state
        this.selectedFactor = null;  // Number we are counting by (e.g. 3)
        this.activeSequence = [];     // Array of sequence objects: { val, isBlank, isCorrect, inputVal }
        this.targetIndex = -1;        // Index of the blank bubble
        this.correctValue = -1;       // Correct answer for active step
        this.currentJumpCount = 5;    // Total length of the skip sequence
        this.activityType = 'choice'; // 'choice' or 'type'
        this.choices = [];
        this.solvedSteps = 0;
    }

    render() {
        this.renderSetup();
    }

    renderSetup() {
        const profile = loadProfile();
        const unlockedFactors = getUnlockedFactors(profile.level);
        
        // Supported skip numbers: 1 through 15
        const allFactors = Array.from({ length: 15 }, (_, i) => i + 1);

        this.container.innerHTML = `
            <div class="practice-card glass-panel animate-pop">
                <div class="skip-setup">
                    <h2 class="setup-title">🎈 Select a Skip Counting Number!</h2>
                    <p style="font-size: 13px; color: var(--text-secondary); text-align: center; margin-bottom: 12px;">
                        Complete the sequence <strong>3 times</strong> and solve <strong>15 flashcards</strong> to certify!
                    </p>
                    <div class="skip-grid">
                        ${allFactors.map(f => {
                            const isUnlocked = unlockedFactors.includes(f);
                            const isCertified = isFactorCertified(f);
                            
                            let subtext = '';
                            let extraClass = '';
                            
                            if (!isUnlocked) {
                                subtext = 'Locked';
                                extraClass = 'locked';
                            } else if (isCertified) {
                                subtext = '🎓 Certified';
                                extraClass = 'certified';
                            } else {
                                const progressObj = profile.introProgress?.[f] || { skipCountingCount: 0 };
                                subtext = `📚 ${progressObj.skipCountingCount}/3`;
                                extraClass = 'intro-phase';
                            }

                            return `
                                <button class="skip-number-btn ${extraClass}" 
                                        data-factor="${f}" 
                                        ${isUnlocked ? '' : 'disabled'}
                                        style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; height: 80px;"
                                        title="${isUnlocked ? `Practice counting by ${f}s!` : `Locked: Reach a higher level to unlock ${f}s`}">
                                    <span style="font-size: 24px; font-weight: 700;">${isUnlocked ? f : '🔒'}</span>
                                    <span style="font-size: 10px; font-weight: 500; opacity: 0.85;">${subtext}</span>
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        this.setupSelectionListeners();
    }

    setupSelectionListeners() {
        const btnList = this.container.querySelectorAll('.skip-number-btn');
        btnList.forEach(btn => {
            btn.addEventListener('click', () => {
                const factor = parseInt(btn.getAttribute('data-factor'), 10);
                this.selectedFactor = factor;
                this.solvedSteps = 0;
                this.generateNewSequence();
            });
        });
    }

    generateNewSequence() {
        const factor = this.selectedFactor;
        
        // Random Jumps between 4 and 8
        this.currentJumpCount = Math.floor(Math.random() * 4) + 4; // 4 to 7 Jumps
        
        // Generate sequence array
        const seq = [];
        for (let i = 1; i <= this.currentJumpCount; i++) {
            seq.push(i * factor);
        }
        
        // Choose one index to be the blank
        // Make sure it is not the very first one if Jumps are high
        this.targetIndex = Math.floor(Math.random() * (this.currentJumpCount - 1)) + 1; // index 1 to currentJumpCount-1
        this.correctValue = seq[this.targetIndex];
        
        // Alternating activity types: typing vs multiple choices
        this.activityType = Math.random() > 0.5 ? 'type' : 'choice';
        
        // Set sequence layout details
        this.activeSequence = seq.map((val, idx) => ({
            val,
            isBlank: idx === this.targetIndex,
            isCorrect: false,
            inputVal: null
        }));

        if (this.activityType === 'choice') {
            this.generateChoicesForSequence();
        }

        this.renderSequenceScreen();
    }

    generateChoicesForSequence() {
        const correct = this.correctValue;
        const factor = this.selectedFactor;
        const options = new Set([correct]);
        
        // Believable offset distractors (nearby skip numbers or off by 1-2 factors)
        const distractors = [
            correct + factor,
            correct - factor,
            correct + 1,
            correct - 1,
            correct + 2,
            correct - 2,
            correct * 2,
            correct + 10
        ].filter(v => v > 0 && v !== correct);
        
        distractors.sort(() => 0.5 - Math.random());
        for (const val of distractors) {
            options.add(val);
            if (options.size === 4) break;
        }
        
        // Final fallback fills
        let offset = 2;
        while (options.size < 4) {
            options.add(correct + offset);
            options.add(Math.max(1, correct - offset));
            offset++;
        }
        
        this.choices = Array.from(options).sort(() => 0.5 - Math.random());
    }

    renderSequenceScreen() {
        const factor = this.selectedFactor;
        const jumps = this.targetIndex + 1; // Jumps up to the active target bubble

        this.container.innerHTML = `
            <div class="practice-card glass-panel animate-pop">
                <div class="skip-active-container">
                    <button id="skip-back-btn" class="secondary-btn" style="align-self: flex-start; padding: 6px 12px; font-size: 12px;">
                        ← Choose Another
                    </button>
                    
                    <h2 class="skip-prompt-title">
                        Skip counting by <span style="color: var(--color-accent); font-family: 'Fredoka', sans-serif;">${factor}s</span>!
                    </h2>
                    
                    <!-- Bubble chain sequence -->
                    <div class="skip-chain">
                        ${this.activeSequence.map((item, idx) => {
                            if (item.isBlank) {
                                return `<div class="skip-bubble active-target" id="bubble-target">?</div>`;
                            } else {
                                // Light up already solved elements, or show static numbers
                                const isBeforeTarget = idx < this.targetIndex;
                                return `
                                    <div class="skip-bubble ${isBeforeTarget ? 'filled' : ''}">
                                        ${item.val}
                                    </div>
                                `;
                            }
                        }).join(' ➔ ')}
                    </div>

                    <!-- Visual Dot Matrix Array (Connecting skip counting to multiplication grid) -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%;">
                        <div class="skip-visual-array" id="skip-array-box">
                            <!-- Populated with dots representing (factor x jumps) -->
                        </div>
                        <span style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase;">
                            Visual representation of: <strong>${factor} × ${jumps}</strong>
                        </span>
                    </div>

                    <!-- Input Controls -->
                    <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 16px;">
                        ${this.activityType === 'type' ? `
                            <!-- Typing Box Activity -->
                            <div class="skip-input-wrapper">
                                <input type="number" pattern="[0-9]*" inputmode="numeric" id="skip-typed-input" class="skip-input-box" placeholder="?">
                                <button id="skip-submit-btn" class="skip-submit-btn ripple-btn">Submit ➔</button>
                            </div>
                        ` : `
                            <!-- Multiple Choice Selection Activity -->
                            <div class="choices-grid">
                                ${this.choices.map(choice => `
                                    <button class="choice-btn ripple-btn skip-choice" data-val="${choice}">
                                        ${choice}
                                    </button>
                                `).join('')}
                            </div>
                        `}
                    </div>

                    <div class="feedback-box" id="skip-feedback">
                        Fill in the missing skip counting bubble to grow the dot grid!
                    </div>
                </div>
            </div>
        `;

        this.renderArrayDots(jumps);
        this.setupActiveSequenceListeners();
    }

    renderArrayDots(jumps) {
        const factor = this.selectedFactor;
        const totalDots = factor * jumps;
        const arrayBox = this.container.querySelector('#skip-array-box');
        
        // CSS Grid setup on matrix to perfectly align columns
        arrayBox.style.display = 'grid';
        arrayBox.style.gridTemplateColumns = `repeat(${jumps}, 14px)`;
        arrayBox.style.gridTemplateRows = `repeat(${factor}, 14px)`;
        arrayBox.style.gap = '6px';
        arrayBox.style.width = 'auto';
        arrayBox.style.justifyContent = 'center';
        
        arrayBox.innerHTML = '';
        
        // Add dots column by column to show grouped columns representing skip additions!
        for (let row = 0; row < factor; row++) {
            for (let col = 0; col < jumps; col++) {
                const dot = document.createElement('div');
                dot.className = 'array-dot active';
                // Delay animation based on columns to visually demonstrate skip steps!
                dot.style.transitionDelay = `${col * 0.1}s`;
                arrayBox.appendChild(dot);
            }
        }
    }

    setupActiveSequenceListeners() {
        const backBtn = this.container.querySelector('#skip-back-btn');
        const feedbackBox = this.container.querySelector('#skip-feedback');
        const targetBubble = this.container.querySelector('#bubble-target');
        
        backBtn.addEventListener('click', () => {
            this.renderSetup();
        });

        const checkAnswer = (val) => {
            if (val === this.correctValue) {
                // Correct Answer!
                this.solvedSteps += 1;
                targetBubble.innerText = this.correctValue;
                targetBubble.className = 'skip-bubble completed-success';
                
                // Award 1 XP for skip counting step completed
                let xpDetails = awardXP(1);
                
                // Record skip counting completion in storage introProgress!
                const certDetails = recordSkipCountingIntro(this.selectedFactor);
                if (certDetails.newlyCertified) {
                    xpDetails.newlyCertified = true;
                    xpDetails.factorCertified = this.selectedFactor;
                }
                
                this.onStatsUpdated(xpDetails);
                
                // Trigger floaty text
                const rect = targetBubble.getBoundingClientRect();
                const popup = document.createElement('div');
                popup.className = 'xp-popup';
                popup.innerText = '+1 XP';
                popup.style.left = `${rect.left + rect.width / 2}px`;
                popup.style.top = `${rect.top - 20}px`;
                document.body.appendChild(popup);
                setTimeout(() => popup.remove(), 1000);

                // bridge skip counting to multiplication
                const jumps = this.targetIndex + 1;
                feedbackBox.innerHTML = `
                    <div class="skip-summary-explain animate-pop">
                        🎉 Correct! <strong>${jumps}</strong> jumps of <strong>${this.selectedFactor}</strong> is <strong>${this.correctValue}</strong>.
                        <br>
                        This is the exact same as: <strong>${this.selectedFactor} × ${jumps} = ${this.correctValue}</strong>!
                    </div>
                `;

                // disable options
                if (this.activityType === 'type') {
                    const submitBtn = this.container.querySelector('#skip-submit-btn');
                    const inputField = this.container.querySelector('#skip-typed-input');
                    if (submitBtn) submitBtn.disabled = true;
                    if (inputField) inputField.disabled = true;
                } else {
                    const choiceBtns = this.container.querySelectorAll('.skip-choice');
                    choiceBtns.forEach(b => {
                        b.disabled = true;
                        if (parseInt(b.getAttribute('data-val'), 10) === this.correctValue) {
                            b.classList.add('correct');
                        } else {
                            b.classList.add('muted');
                        }
                    });
                }

                // Wait 3.5 seconds to read the educational tooltip, then generate new sequence!
                setTimeout(() => {
                    const activeTab = document.querySelector('.nav-tab.active')?.getAttribute('data-tab');
                    if (activeTab === 'skip') {
                        this.generateNewSequence();
                    }
                }, 3500);

            } else {
                // Incorrect Answer
                feedbackBox.innerHTML = `<span class="incorrect">Not quite. Try skip counting by ${this.selectedFactor}s again! 🌟</span>`;
                targetBubble.classList.add('animate-shake');
                setTimeout(() => targetBubble.classList.remove('animate-shake'), 500);
            }
        };

        // Listeners for typing activity
        if (this.activityType === 'type') {
            const submitBtn = this.container.querySelector('#skip-submit-btn');
            const inputField = this.container.querySelector('#skip-typed-input');
            
            submitBtn.addEventListener('click', () => {
                const val = parseInt(inputField.value, 10);
                checkAnswer(val);
            });

            inputField.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    const val = parseInt(inputField.value, 10);
                    checkAnswer(val);
                }
            });
        } else {
            // Choice button clicks
            const choiceBtns = this.container.querySelectorAll('.skip-choice');
            choiceBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const val = parseInt(btn.getAttribute('data-val'), 10);
                    checkAnswer(val);
                });
            });
        }
    }
}
