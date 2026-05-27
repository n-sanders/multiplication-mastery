/* ==========================================================================
   STORAGE MODULE (js/storage.js)
   Handles student profile, facts mastery data, achievements, and themes.
   ========================================================================== */

const STORAGE_KEYS = {
    PROFILE: 'multiplication_mastery_student_profile',
    FACT_DATA: 'multiplication_mastery_fact_data',
    TIMED_RECORDS: 'multiplication_mastery_timed_records',
    THEME: 'multiplication_mastery_theme'
};

// Default profile values
const DEFAULT_PROFILE = {
    xp: 0,
    level: 1,
    totalProblemsSolved: 0,
    totalCorrect: 0,
    currentStreak: 0,
    highestStreak: 0,
    lastActiveDate: '',
    unlockedBadges: [],
    certifiedFactors: [1, 2, 3, 4, 5],
    introProgress: {}
};

// XP progression definitions & factors unlocked at each level
export const LEVEL_THRESHOLDS = [
    { level: 1, xp: 0, unlocked: [1, 2, 3, 4, 5], newFactor: '1-5' },
    { level: 2, xp: 200, unlocked: [1, 2, 3, 4, 5, 10], newFactor: '10' },
    { level: 3, xp: 500, unlocked: [1, 2, 3, 4, 5, 9, 10], newFactor: '9' },
    { level: 4, xp: 1000, unlocked: [1, 2, 3, 4, 5, 6, 9, 10], newFactor: '6' },
    { level: 5, xp: 1800, unlocked: [1, 2, 3, 4, 5, 6, 7, 9, 10], newFactor: '7' },
    { level: 6, xp: 2800, unlocked: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], newFactor: '8' },
    { level: 7, xp: 4000, unlocked: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], newFactor: '11' },
    { level: 8, xp: 5500, unlocked: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], newFactor: '12' },
    { level: 9, xp: 7500, unlocked: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], newFactor: '13' },
    { level: 10, xp: 10000, unlocked: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], newFactor: '14' },
    { level: 11, xp: 13000, unlocked: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], newFactor: '15' }
];

// Badge Metadata
export const BADGE_LIST = [
    { id: 'first_steps', emoji: '🌱', name: 'First Steps', desc: 'Solve your first problem!' },
    { id: 'streak_5', emoji: '🔥', name: 'Streak Star', desc: 'Get a 5-problem correct streak' },
    { id: 'streak_15', emoji: '⚡', name: 'Super Charged', desc: 'Get a 15-problem correct streak' },
    { id: 'speed_demon', emoji: '⚡', name: 'Speed Demon', desc: 'Answer a fact correctly in under 1.5 seconds' },
    { id: 'level_5', emoji: '🎓', name: 'Rising Star', desc: 'Reach Level 5!' },
    { id: 'level_11', emoji: '👑', name: 'Math Emperor', desc: 'Reach Level 11 and unlock the full 15x15 table!' },
    { id: 'master_10', emoji: '🥇', name: 'Decathlon', desc: 'Master 10 individual multiplication facts' },
    { id: 'master_50', emoji: '🏆', name: 'Centurion', desc: 'Master 50 individual multiplication facts' }
];

export function loadProfile() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
        if (!stored) return { ...DEFAULT_PROFILE };
        const profile = JSON.parse(stored);
        
        // Ensure all keys exist in case of future extension
        return { ...DEFAULT_PROFILE, ...profile };
    } catch (e) {
        console.error('Failed to load profile, using defaults', e);
        return { ...DEFAULT_PROFILE };
    }
}

export function saveProfile(profile) {
    try {
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
        console.error('Failed to save profile', e);
    }
}

export function loadFactData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.FACT_DATA);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error('Failed to load fact data', e);
        return {};
    }
}

export function saveFactData(factData) {
    try {
        localStorage.setItem(STORAGE_KEYS.FACT_DATA, JSON.stringify(factData));
    } catch (e) {
        console.error('Failed to save fact data', e);
    }
}

export function loadTimedRecords() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.TIMED_RECORDS);
        return stored ? JSON.parse(stored) : {
            '1min': { highScore: 0, accuracy: 0 },
            '3min': { highScore: 0, accuracy: 0 },
            'endless': { highScore: 0, accuracy: 0 }
        };
    } catch (e) {
        console.error('Failed to load timed records', e);
        return {};
    }
}

export function saveTimedRecords(records) {
    try {
        localStorage.setItem(STORAGE_KEYS.TIMED_RECORDS, JSON.stringify(records));
    } catch (e) {
        console.error('Failed to save timed records', e);
    }
}

export function getActiveTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'default';
}

export function setActiveTheme(themeName) {
    localStorage.setItem(STORAGE_KEYS.THEME, themeName);
    // Apply theme class to body
    document.body.className = `theme-${themeName}`;
}

export function resetAllData() {
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.FACT_DATA);
    localStorage.removeItem(STORAGE_KEYS.TIMED_RECORDS);
    localStorage.removeItem(STORAGE_KEYS.THEME);
    window.location.reload();
}

/**
 * Maps XP to Level based on LEVEL_THRESHOLDS.
 * Supports infinite leveling past Level 11.
 */
export function calculateLevel(xp) {
    // Find highest threshold achieved
    let currentLvl = 1;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (xp >= LEVEL_THRESHOLDS[i].xp) {
            currentLvl = LEVEL_THRESHOLDS[i].level;
        } else {
            break;
        }
    }
    
    // Leveling up past max threshold (Level 11: 13,000 XP)
    const maxThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    if (xp > maxThreshold.xp) {
        const extraXp = xp - maxThreshold.xp;
        const levelsPastMax = Math.floor(extraXp / 3000);
        currentLvl = maxThreshold.level + levelsPastMax;
    }
    
    return currentLvl;
}

/**
 * Returns list of unlocked numbers for a given level
 */
export function getUnlockedFactors(level) {
    const matched = LEVEL_THRESHOLDS.find(t => t.level === level);
    if (matched) return matched.unlocked;
    
    // If level is past 11, everything is unlocked
    return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].unlocked;
}

/**
 * Award XP to the student profile.
 * Automatically checks for level-ups and handles achievements.
 * Returns { levelUp: boolean, unlockedFactor: string | null }
 */
export function awardXP(amount) {
    const profile = loadProfile();
    const oldLevel = profile.level;
    
    profile.xp += amount;
    
    // Calculate new level
    const newLevel = calculateLevel(profile.xp);
    profile.level = newLevel;
    
    let levelUp = false;
    let unlockedFactor = null;
    
    if (newLevel > oldLevel) {
        levelUp = true;
        // See if we unlocked a new factor
        const thresholdObj = LEVEL_THRESHOLDS.find(t => t.level === newLevel);
        if (thresholdObj) {
            unlockedFactor = thresholdObj.newFactor;
        }
    }
    
    // Streak tracking calculations
    // Update highest streak
    if (profile.currentStreak > profile.highestStreak) {
        profile.highestStreak = profile.currentStreak;
    }
    
    // Check and save badges
    const newlyUnlockedBadges = checkBadges(profile);
    if (newlyUnlockedBadges.length > profile.unlockedBadges.length) {
        profile.unlockedBadges = newlyUnlockedBadges;
    }
    
    saveProfile(profile);
    
    return { levelUp, newLevel, unlockedFactor };
}

/**
 * Helper to update streak stats
 */
export function updateStreak(isCorrect) {
    const profile = loadProfile();
    
    // Today's date check for daily streak maintenance
    const todayStr = new Date().toISOString().split('T')[0];
    const lastActive = profile.lastActiveDate;
    
    if (isCorrect) {
        profile.currentStreak += 1;
        profile.totalProblemsSolved += 1;
        profile.totalCorrect += 1;
    } else {
        profile.currentStreak = 0;
        profile.totalProblemsSolved += 1;
    }
    
    profile.lastActiveDate = todayStr;
    
    if (profile.currentStreak > profile.highestStreak) {
        profile.highestStreak = profile.currentStreak;
    }
    
    saveProfile(profile);
}

/**
 * Run rules to check if any new badges are unlocked
 */
function checkBadges(profile) {
    const unlocked = [...profile.unlockedBadges];
    const factData = loadFactData();
    
    // Helper to add if not exists
    const addBadge = (id) => {
        if (!unlocked.includes(id)) {
            unlocked.push(id);
        }
    };
    
    // Rule 1: First Steps
    if (profile.totalProblemsSolved >= 1) {
        addBadge('first_steps');
    }
    
    // Rule 2: Streak 5
    if (profile.highestStreak >= 5) {
        addBadge('streak_5');
    }
    
    // Rule 3: Streak 15
    if (profile.highestStreak >= 15) {
        addBadge('streak_15');
    }
    
    // Rule 4: Level 5
    if (profile.level >= 5) {
        addBadge('level_5');
    }
    
    // Rule 5: Level 11
    if (profile.level >= 11) {
        addBadge('level_11');
    }
    
    // Rule 6: Masters (mastery >= 80)
    let masteredCount = 0;
    for (const key in factData) {
        if (factData[key].mastery >= 80) {
            masteredCount++;
        }
    }
    
    if (masteredCount >= 10) {
        addBadge('master_10');
    }
    if (masteredCount >= 50) {
        addBadge('master_50');
    }
    
    return unlocked;
}

/* --- Certification Advancement Functions --- */

/**
 * Checks if a factor is certified (fluent) for MCQ and Timed Challenge pools.
 */
export function isFactorCertified(factor) {
    const profile = loadProfile();
    const num = parseInt(factor, 10);
    // Factors 1..5 are certified by default
    if (num >= 1 && num <= 5) return true;
    
    if (!profile.certifiedFactors) {
        return false;
    }
    return profile.certifiedFactors.includes(num);
}

/**
 * Helper to initialize introProgress dictionary securely
 */
function initIntroProgress(profile, factor) {
    const key = String(factor);
    if (!profile.introProgress) profile.introProgress = {};
    if (!profile.introProgress[key]) {
        profile.introProgress[key] = {
            skipCountingCount: 0,
            flashcardsCorrectCount: 0
        };
    }
}

/**
 * Record a completed skip counting session for factor N.
 * Target: 3 times.
 * Returns { certified, newlyCertified, progress }
 */
export function recordSkipCountingIntro(factor) {
    const profile = loadProfile();
    const num = parseInt(factor, 10);
    if (isFactorCertified(num)) return { certified: true, newlyCertified: false };
    
    initIntroProgress(profile, num);
    const key = String(num);
    
    profile.introProgress[key].skipCountingCount += 1;
    
    const newlyCertified = checkAndCertify(profile, num);
    saveProfile(profile);
    
    return {
        certified: profile.certifiedFactors.includes(num),
        newlyCertified,
        skipCountingCount: profile.introProgress[key].skipCountingCount,
        flashcardsCorrectCount: profile.introProgress[key].flashcardsCorrectCount
    };
}

/**
 * Record a correct flashcard answer for factor N.
 * Target: 15 times.
 * Returns { certified, newlyCertified, progress }
 */
export function recordFlashcardIntro(factor) {
    const profile = loadProfile();
    const num = parseInt(factor, 10);
    if (isFactorCertified(num)) return { certified: true, newlyCertified: false };
    
    initIntroProgress(profile, num);
    const key = String(num);
    
    profile.introProgress[key].flashcardsCorrectCount += 1;
    
    const newlyCertified = checkAndCertify(profile, num);
    saveProfile(profile);
    
    return {
        certified: profile.certifiedFactors.includes(num),
        newlyCertified,
        skipCountingCount: profile.introProgress[key].skipCountingCount,
        flashcardsCorrectCount: profile.introProgress[key].flashcardsCorrectCount
    };
}

/**
 * Check if the intro goals (3 skip counts AND 15 flashcards solved) are met,
 * certifying the factor if true.
 */
function checkAndCertify(profile, factor) {
    const num = parseInt(factor, 10);
    initIntroProgress(profile, num);
    const key = String(num);
    const progress = profile.introProgress[key];
    
    if (progress.skipCountingCount >= 3 && progress.flashcardsCorrectCount >= 15) {
        if (!profile.certifiedFactors) {
            profile.certifiedFactors = [1, 2, 3, 4, 5];
        }
        if (!profile.certifiedFactors.includes(num)) {
            profile.certifiedFactors.push(num);
            return true; // Newly Certified!
        }
    }
    return false;
}

