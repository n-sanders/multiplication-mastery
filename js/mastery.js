/* ==========================================================================
   MASTERY MODULE (js/mastery.js)
   Contains the math engine, adaptive practice fact selectors, distractor
   generators, and mastery tracking rules.
   ========================================================================== */

import { loadProfile, loadFactData, saveFactData, getUnlockedFactors } from './storage.js';

/**
 * Returns a list of all unlocked multiplication facts as objects: { a, b, key }
 */
export function getUnlockedFactsList() {
    const profile = loadProfile();
    const unlockedFactors = getUnlockedFactors(profile.level);
    const list = [];
    
    // Generate all pairs from the active unlocked factors
    for (let i = 0; i < unlockedFactors.length; i++) {
        for (let j = 0; j < unlockedFactors.length; j++) {
            const a = unlockedFactors[i];
            const b = unlockedFactors[j];
            
            // To prevent duplicate keys since AxB and BxA are different facts,
            // we track them independently (as requested: "each fact has an independent mastery score")
            list.push({
                a,
                b,
                key: `${a}x${b}`
            });
        }
    }
    
    return list;
}

/**
 * Selects an active fact using an adaptive weighted probability algorithm.
 * Facts with lower mastery are significantly more likely to appear.
 */
export function selectAdaptiveFact() {
    const facts = getUnlockedFactsList();
    if (facts.length === 0) return { a: 1, b: 1, key: '1x1' };
    
    const factData = loadFactData();
    const weights = [];
    let totalWeight = 0;
    
    for (const fact of facts) {
        const data = factData[fact.key] || { mastery: 0, correctCount: 0 };
        const mastery = data.mastery;
        
        let weight = 100 - mastery; // default weight is inverse of mastery
        
        // Never practiced facts get an extra boost to explore them
        if (data.correctCount === 0 && (!data.incorrectCount || data.incorrectCount === 0)) {
            weight = 120;
        }
        
        // Fully mastered facts (mastery = 100) still get a tiny base weight so they can occasionally be reviewed
        weight = Math.max(8, weight);
        
        weights.push({ fact, weight });
        totalWeight += weight;
    }
    
    // Choose based on weighted sum
    let randomVal = Math.random() * totalWeight;
    for (const item of weights) {
        randomVal -= item.weight;
        if (randomVal <= 0) {
            return item.fact;
        }
    }
    
    // Fallback in case of rounding errors
    return facts[facts.length - 1];
}

/**
 * Generates 1 correct answer and 3 highly believable distractors for A x B.
 * Rules:
 * - Distractors are believable (common multiplication errors, nearby results).
 * - Distractors are unique and positive.
 * - Always exactly 4 choices, randomized.
 */
export function generateChoices(a, b) {
    const correctAnswer = a * b;
    const distractors = new Set();
    
    // Distractor ideas based on common student errors:
    const ideas = [
        (a + 1) * b,
        a * (b + 1),
        (a - 1) * b,
        a * (b - 1),
        a + b,                 // Additive error (e.g. 7x8 = 15)
        (a + 1) * (b + 1),
        correctAnswer + 10,    // Off-by-ten error
        correctAnswer - 10,
        correctAnswer + 2,     // Nearby even/odd errors
        correctAnswer - 2
    ];
    
    // Add variations depending on factors
    if (a > 1 && b > 1) {
        ideas.push((a - 1) * (b - 1));
    }
    
    // Add common mirror multiplication facts
    if (a !== b) {
        // nearby facts
        ideas.push((a + 1) * (b - 1));
        ideas.push((a - 1) * (b + 1));
    }
    
    // Filter out correct answers and negative/zero numbers, sort by distance to correct answer
    const validIdeas = ideas
        .filter(val => val > 0 && val !== correctAnswer)
        .sort(() => 0.5 - Math.random());
        
    // Pick 3 unique distractors
    for (const distractor of validIdeas) {
        distractors.add(distractor);
        if (distractors.size === 3) break;
    }
    
    // Fallback: If we don't have enough, generate arbitrary offsets
    let offset = 1;
    while (distractors.size < 3) {
        const up = correctAnswer + offset;
        const down = correctAnswer - offset;
        if (up > 0 && up !== correctAnswer) distractors.add(up);
        if (distractors.size === 3) break;
        if (down > 0 && down !== correctAnswer) distractors.add(down);
        offset++;
    }
    
    // Combine correct and distractors into randomized array
    const choices = [correctAnswer, ...distractors];
    return choices.sort(() => 0.5 - Math.random());
}

/**
 * Updates a fact's mastery level and statistics.
 * Rules:
 * - Mastery increases on correct answers. Speed plays a key factor:
 *   - Under 1.5 seconds (super fast): +12% mastery
 *   - Under 3.0 seconds (average fast): +8% mastery
 *   - Over 3.0 seconds (slower correct): +4% mastery
 * - Mastery decreases slightly on incorrect answers: -6% mastery
 * - Mastery is bounded in [0, 100].
 */
export function updateFactMastery(a, b, isCorrect, responseTimeMs) {
    const key = `${a}x${b}`;
    const factData = loadFactData();
    
    // Get existing data or initialize
    if (!factData[key]) {
        factData[key] = {
            mastery: 0,
            correctCount: 0,
            incorrectCount: 0,
            lastPracticed: '',
            averageResponseTimeMs: 0
        };
    }
    
    const fact = factData[key];
    fact.lastPracticed = new Date().toISOString();
    
    let change = 0;
    
    if (isCorrect) {
        fact.correctCount += 1;
        
        // Calculate new average speed
        if (fact.averageResponseTimeMs === 0) {
            fact.averageResponseTimeMs = responseTimeMs;
        } else {
            // Running average
            fact.averageResponseTimeMs = Math.round(
                (fact.averageResponseTimeMs * (fact.correctCount - 1) + responseTimeMs) / fact.correctCount
            );
        }
        
        // Speed-based mastery adjustments
        const speedSec = responseTimeMs / 1000;
        if (speedSec <= 1.5) {
            change = 12; // Speed Demon reward
        } else if (speedSec <= 3.0) {
            change = 8;
        } else {
            change = 4;
        }
    } else {
        fact.incorrectCount += 1;
        change = -6; // Penalty for mistakes
    }
    
    // Apply change with bounding
    fact.mastery = Math.min(100, Math.max(0, fact.mastery + change));
    
    saveFactData(factData);
    
    return {
        newMastery: fact.mastery,
        change,
        isSpeedDemon: isCorrect && (responseTimeMs <= 1500)
    };
}
