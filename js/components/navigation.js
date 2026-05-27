/* ==========================================================================
   NAVIGATION COMPONENT (js/components/navigation.js)
   Renders and manages the application header: levels, XP bars, streak counts,
   navigation tabs, and color themes.
   ========================================================================== */

import { loadProfile, LEVEL_THRESHOLDS, getActiveTheme, setActiveTheme, BADGE_LIST } from '../storage.js';

export class AppNavigation {
    constructor(containerId, onTabChangeCallback) {
        this.container = document.getElementById(containerId);
        this.onTabChange = onTabChangeCallback;
        this.currentTab = 'mcq'; // default mode
        
        // Apply saved theme on boot
        const theme = getActiveTheme();
        setActiveTheme(theme);
    }

    render() {
        const profile = loadProfile();
        const activeTheme = getActiveTheme();
        
        // Calculate XP bounds for the current level's bar
        const { currentLevelMin, nextLevelMax, progressPercent } = this.getXpProgressDetails(profile.xp, profile.level);
        
        // Define tab array
        const tabs = [
            { id: 'mcq', label: 'MCQ Practice', emoji: '📝' },
            { id: 'skip', label: 'Skip Counting', emoji: '🔢' },
            { id: 'timed', label: 'Timed Challenge', emoji: '⚡' },
            { id: 'flashcard', label: 'Flashcards', emoji: '🎴' },
            { id: 'dashboard', label: 'Dashboard', emoji: '📊' }
        ];

        this.container.innerHTML = `
            <div class="header-wrapper">
                <!-- Left: Profile Summary -->
                <div class="profile-summary">
                    <div class="level-badge" title="Your Math Level! Unlock facts by earning XP.">
                        ${profile.level}
                    </div>
                    <div class="xp-container">
                        <div class="xp-label">XP: ${profile.xp} / ${nextLevelMax}</div>
                        <div class="xp-bar-bg" title="${profile.xp - currentLevelMin} XP earned in this level. Need ${nextLevelMax - profile.xp} XP more to Level Up!">
                            <div class="xp-bar-fill" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                    
                    <!-- Streak Flame -->
                    <div class="streak-indicator ${profile.currentStreak > 0 ? 'active' : ''}" 
                         title="Your active correct answer streak! Keep it burning!">
                        <span class="streak-flame">🔥</span>
                        <span class="streak-count">${profile.currentStreak}</span>
                    </div>
                </div>

                <!-- Center: Navigation Tabs -->
                <nav class="nav-menu">
                    ${tabs.map(tab => `
                        <button class="nav-tab ${this.currentTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">
                            <span>${tab.emoji}</span>
                            <span>${tab.label}</span>
                        </button>
                    `).join('')}
                </nav>

                <!-- Right: Theme Switcher -->
                <div class="theme-selector">
                    <button id="theme-dropdown-btn" class="theme-btn" title="Change Color Theme 🎨">🎨</button>
                    <div id="theme-dropdown-menu" class="theme-dropdown">
                        <button class="theme-opt ${activeTheme === 'default' ? 'active' : ''}" data-theme="default">
                            <span class="theme-dot dot-default"></span> Cosmic Explorer
                        </button>
                        <button class="theme-opt ${activeTheme === 'blue-green' ? 'active' : ''}" data-theme="blue-green">
                            <span class="theme-dot dot-blue-green"></span> Ocean Breeze
                        </button>
                        <button class="theme-opt ${activeTheme === 'black-red' ? 'active' : ''}" data-theme="black-red">
                            <span class="theme-dot dot-black-red"></span> Cyber Racer
                        </button>
                        <button class="theme-opt ${activeTheme === 'pink-purple' ? 'active' : ''}" data-theme="pink-purple">
                            <span class="theme-dot dot-pink-purple"></span> Candy Land
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    /**
     * Calculates XP details for visual display of progress inside a level
     */
    getXpProgressDetails(xp, level) {
        let currentLevelMin = 0;
        let nextLevelMax = 200;
        
        const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === level);
        const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === level + 1);
        
        if (currentThreshold) {
            currentLevelMin = currentThreshold.xp;
        }
        
        if (nextThreshold) {
            nextLevelMax = nextThreshold.xp;
        } else {
            // Leveling past max threshold (Level 11: 13,000 XP)
            // Each level takes 3000 XP
            const baseMax = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].xp;
            const extraLevels = level - LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].level;
            currentLevelMin = baseMax + extraLevels * 3000;
            nextLevelMax = currentLevelMin + 3000;
        }
        
        const earnedInLevel = xp - currentLevelMin;
        const totalInLevel = nextLevelMax - currentLevelMin;
        let progressPercent = Math.round((earnedInLevel / totalInLevel) * 100);
        progressPercent = Math.max(0, Math.min(100, progressPercent));
        
        return { currentLevelMin, nextLevelMax, progressPercent };
    }

    setupEventListeners() {
        // Tab click handling
        const tabs = this.container.querySelectorAll('.nav-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                if (this.currentTab !== targetTab) {
                    this.currentTab = targetTab;
                    this.render(); // update visual menu selection
                    this.onTabChange(targetTab); // trigger app module rendering
                }
            });
        });

        // Theme selector click handling
        const dropdownBtn = this.container.querySelector('#theme-dropdown-btn');
        const dropdownMenu = this.container.querySelector('#theme-dropdown-menu');

        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            if (dropdownMenu) dropdownMenu.classList.remove('show');
        });

        // Choose Theme selection
        const themeOpts = this.container.querySelectorAll('.theme-opt');
        themeOpts.forEach(opt => {
            opt.addEventListener('click', () => {
                const selectedTheme = opt.getAttribute('data-theme');
                setActiveTheme(selectedTheme);
                this.render(); // updates highlights
            });
        });
    }

    // Refresh XP levels and active streaks dynamically without reloading navigation
    updateHeaderStats() {
        this.render();
    }
}
