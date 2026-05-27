/* ==========================================================================
   MAIN APPLICATION COORDINATOR (js/app.js)
   Initializes page layout, renders views, manages state synchronizations,
   ambient canvas backgrounds, and level-up congratulations triggers.
   ========================================================================== */

import { AppNavigation } from './components/navigation.js';
import { MCQPracticeMode } from './components/multipleChoice.js';
import { SkipCountingMode } from './components/skipCounting.js';
import { TimedChallengeMode } from './components/timedChallenge.js';
import { FlashcardMode } from './components/flashcards.js';
import { ProgressDashboard } from './components/dashboard.js';

class ApplicationController {
    constructor() {
        this.nav = null;
        this.currentModeComponent = null;
        
        // Ambient background animation
        this.ambientCanvas = null;
        this.ambientCtx = null;
        this.ambientParticles = [];
        
        // Reward Confetti animation
        this.confettiCanvas = null;
        this.confettiCtx = null;
        this.confettiParticles = [];
        this.confettiActive = false;
        this.confettiAnimationId = null;
    }

    init() {
        // Initialize floating navigation
        this.nav = new AppNavigation('app-header', (targetMode) => {
            this.switchMode(targetMode);
        });
        
        this.nav.render();

        // Load Default practice mode (Multiple Choice)
        this.switchMode('mcq');

        // Setup dynamic modals
        this.setupModalEvents();

        // Boot canvas visual loops
        this.initAmbientCanvas();
        this.initConfettiCanvas();
    }

    switchMode(modeId) {
        // Clean up any running timed challenge timers if user changes tab
        if (this.currentModeComponent && typeof this.currentModeComponent.endGame === 'function') {
            this.currentModeComponent.endGame();
        }
        
        // General modular cleanup hook (e.g. stops MCQ burndown timer intervals)
        if (this.currentModeComponent && typeof this.currentModeComponent.cleanup === 'function') {
            this.currentModeComponent.cleanup();
        }

        // Clean containers
        const container = document.getElementById('mode-container');
        container.innerHTML = `<div id="active-mode-slot" style="width: 100%; display: flex; justify-content: center;"></div>`;

        // Instantiates corresponding components
        const callbackOnStatsUpdate = (xpDetails) => {
            // Re-render header numbers (XP / Streaks / Levels) in real time!
            this.nav.updateHeaderStats();
            
            // Check for level-up celebration overlays!
            if (xpDetails && xpDetails.levelUp) {
                this.triggerLevelUpCelebration(xpDetails.newLevel, xpDetails.unlockedFactor);
            }
            
            // Check for new factor certifications celebration overlays!
            if (xpDetails && xpDetails.newlyCertified) {
                this.triggerCertificationCelebration(xpDetails.factorCertified);
            }
        };

        switch (modeId) {
            case 'mcq':
                this.currentModeComponent = new MCQPracticeMode('active-mode-slot', callbackOnStatsUpdate);
                break;
            case 'skip':
                this.currentModeComponent = new SkipCountingMode('active-mode-slot', callbackOnStatsUpdate);
                break;
            case 'timed':
                this.currentModeComponent = new TimedChallengeMode('active-mode-slot', callbackOnStatsUpdate);
                break;
            case 'flashcard':
                this.currentModeComponent = new FlashcardMode('active-mode-slot', callbackOnStatsUpdate);
                break;
            case 'dashboard':
                this.currentModeComponent = new ProgressDashboard('active-mode-slot');
                break;
            default:
                this.currentModeComponent = new MCQPracticeMode('active-mode-slot', callbackOnStatsUpdate);
        }

        this.currentModeComponent.render();
    }

    setupModalEvents() {
        const closeBtn = document.getElementById('level-up-close-btn');
        const modal = document.getElementById('level-up-modal');

        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            this.stopConfetti();
        });

        // Certification modal close button bindings
        const certCloseBtn = document.getElementById('certification-close-btn');
        const certModal = document.getElementById('certification-modal');

        certCloseBtn.addEventListener('click', () => {
            certModal.classList.add('hidden');
            this.stopConfetti();
        });
    }

    triggerLevelUpCelebration(newLvl, unlockedFactor) {
        const modal = document.getElementById('level-up-modal');
        const lvlSpan = document.getElementById('level-up-num');
        const factorBadge = document.getElementById('unlocked-factor-badge');

        lvlSpan.innerText = newLvl;
        factorBadge.innerText = `×${unlockedFactor}`;
        
        modal.classList.remove('hidden');

        // Spawns exciting reward confetti canvas
        this.startConfetti();
    }

    triggerCertificationCelebration(factor) {
        const modal = document.getElementById('certification-modal');
        const numSpan = document.getElementById('certified-factor-num');
        const badgeSpan = document.getElementById('certified-factor-badge');

        numSpan.innerText = `${factor}s`;
        badgeSpan.innerText = `x${factor}`;

        modal.classList.remove('hidden');

        // Spawns exciting reward confetti canvas
        this.startConfetti();
    }

    /* ==========================================================================
       CANVAS AMBIENT COSMIC BACKGROUND SYSTEM
       ========================================================================== */
    initAmbientCanvas() {
        this.ambientCanvas = document.getElementById('ambient-canvas');
        this.ambientCtx = this.ambientCanvas.getContext('2d');

        const resize = () => {
            this.ambientCanvas.width = window.innerWidth;
            this.ambientCanvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Spawn base ambient slow drift bubbles
        const count = Math.min(25, Math.floor(window.innerWidth / 50));
        for (let i = 0; i < count; i++) {
            this.ambientParticles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                radius: Math.random() * 60 + 20,
                speedY: -(Math.random() * 0.2 + 0.05),
                alpha: Math.random() * 0.15 + 0.05,
                color: Math.random() > 0.5 ? 'rgba(139, 92, 246, 0.08)' : 'rgba(16, 185, 129, 0.08)'
            });
        }

        const animate = () => {
            this.ambientCtx.clearRect(0, 0, this.ambientCanvas.width, this.ambientCanvas.height);
            
            // Render ambient items
            for (const p of this.ambientParticles) {
                p.y += p.speedY;
                if (p.y + p.radius < 0) {
                    p.y = this.ambientCanvas.height + p.radius;
                    p.x = Math.random() * this.ambientCanvas.width;
                }

                this.ambientCtx.beginPath();
                this.ambientCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ambientCtx.fillStyle = p.color;
                this.ambientCtx.globalAlpha = p.alpha;
                this.ambientCtx.fill();
            }
            requestAnimationFrame(animate);
        };
        animate();
    }

    /* ==========================================================================
       HTML5 HIGH PERFORMANCE CONFETTI REWARD ENGINE
       ========================================================================== */
    initConfettiCanvas() {
        this.confettiCanvas = document.getElementById('confetti-canvas');
        this.confettiCtx = this.confettiCanvas.getContext('2d');

        const resize = () => {
            this.confettiCanvas.width = window.innerWidth;
            this.confettiCanvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);
    }

    startConfetti() {
        this.confettiActive = true;
        this.confettiParticles = [];
        
        const colors = [
            '#fbbf24', '#f43f5e', '#3b82f6', '#10b981', 
            '#a855f7', '#ff7849', '#ffc82c'
        ];

        // Spawn 120 confetti pieces above frame
        for (let i = 0; i < 140; i++) {
            this.confettiParticles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * -window.innerHeight - 20,
                radius: Math.random() * 6 + 4,
                width: Math.random() * 8 + 6,
                height: Math.random() * 12 + 8,
                speedY: Math.random() * 4 + 3,
                speedX: Math.random() * 2 - 1,
                wiggle: Math.random() * 2,
                wiggleSpeed: Math.random() * 0.05 + 0.02,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * Math.PI,
                rotationSpeed: Math.random() * 0.04 - 0.02
            });
        }

        const loop = () => {
            if (!this.confettiActive) return;

            this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);

            let activePieces = 0;

            for (const p of this.confettiParticles) {
                p.y += p.speedY;
                p.x += p.speedX + Math.sin(p.wiggle) * 0.5;
                p.wiggle += p.wiggleSpeed;
                p.rotation += p.rotationSpeed;

                if (p.y < window.innerHeight) {
                    activePieces++;
                }

                this.confettiCtx.save();
                this.confettiCtx.translate(p.x, p.y);
                this.confettiCtx.rotate(p.rotation);
                this.confettiCtx.fillStyle = p.color;
                this.confettiCtx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
                this.confettiCtx.restore();
                
                // Recycle particles to loop falling
                if (p.y > window.innerHeight) {
                    p.y = -20;
                    p.x = Math.random() * window.innerWidth;
                }
            }

            if (activePieces > 0 && this.confettiActive) {
                this.confettiAnimationId = requestAnimationFrame(loop);
            }
        };
        loop();
    }

    stopConfetti() {
        this.confettiActive = false;
        if (this.confettiAnimationId) {
            cancelAnimationFrame(this.confettiAnimationId);
            this.confettiAnimationId = null;
        }
        if (this.confettiCtx) {
            this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
        }
    }
}

// Instantiate application on window loaded
window.addEventListener('DOMContentLoaded', () => {
    const app = new ApplicationController();
    app.init();
});
