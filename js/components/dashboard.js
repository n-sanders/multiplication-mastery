/* ==========================================================================
   STUDENT PROGRESS DASHBOARD & 15x15 GRID (js/components/dashboard.js)
   Renders student analytics, achievements badge display, and the massive
   interactive color-coded $15 \times 15$ multiplication mastery matrix.
   ========================================================================== */

import { loadProfile, loadFactData, getUnlockedFactors, BADGE_LIST, resetAllData, isFactorCertified } from '../storage.js';

export class ProgressDashboard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.selectedCellDetails = null; // tracks active tapped grid cell details
    }

    render() {
        const profile = loadProfile();
        const factData = loadFactData();
        const unlockedFactors = getUnlockedFactors(profile.level);
        
        // Compute overall and factor metrics
        const metrics = this.calculateDashboardMetrics(unlockedFactors, factData);

        this.container.innerHTML = `
            <div class="dashboard-grid-container animate-pop">
                
                <!-- Left Column: The 15x15 Interactive Mastery Grid -->
                <div class="glass-panel grid-panel-card" style="grid-column: 1 / -1;">
                    <div class="grid-header-row">
                        <div class="grid-title-info">
                            <span class="grid-title">🎯 15×15 Mastery Matrix</span>
                            <span style="font-size: 12px; color: var(--text-secondary);">
                                Touch cells to view details. Complete Intro Phase goals (📖) to certfy factors!
                            </span>
                        </div>
                        
                        <!-- Legend keys -->
                        <div class="grid-legend" style="flex-wrap: wrap; gap: 8px 12px;">
                            <div class="legend-item">
                                <span class="legend-color" style="background: rgba(251, 191, 36, 0.6); border: 1px solid #fbbf24;"></span> Mastered (≥80%)
                            </div>
                            <div class="legend-item">
                                <span class="legend-color" style="background: rgba(59, 130, 246, 0.4); border: 1px solid #3b82f6;"></span> Improving (40-79%)
                            </div>
                            <div class="legend-item">
                                <span class="legend-color" style="background: rgba(244, 63, 94, 0.3); border: 1px solid #f43f5e;"></span> Needs Practice (&lt;40%)
                            </div>
                            <div class="legend-item">
                                <span class="legend-color" style="background: rgba(6, 182, 212, 0.1); border: 1px dashed rgba(6, 182, 212, 0.7);"></span> Intro Phase 📖
                            </div>
                            <div class="legend-item">
                                <span class="legend-color" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);"></span> Locked 🔒
                            </div>
                        </div>
                    </div>

                    <!-- Scrollable table container -->
                    <div class="matrix-wrapper">
                        <div class="multiplication-table-grid" id="mastery-grid-element">
                            <!-- Populated with dynamic grid cells -->
                        </div>
                    </div>

                    <!-- Active Cell Detail Card (Shown when clicked) -->
                    <div id="grid-cell-details" class="fact-detail-tooltip" style="visibility: hidden; opacity: 0; transition: opacity var(--transition-normal);">
                        Select a grid square to inspect your performance stats!
                    </div>
                </div>

                <!-- Right Column - Top: Stats Dashboard Overview -->
                <div class="glass-panel dashboard-summary-card">
                    <div class="summary-item">
                        <span class="summary-val">${metrics.masteredCount}</span>
                        <span class="summary-lbl">Facts Mastered 🥇</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-val">${metrics.overallMasteryPercent}%</span>
                        <span class="summary-lbl">Overall Mastery 📈</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-val">${profile.totalProblemsSolved}</span>
                        <span class="summary-lbl">Total Answered 📝</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-val">${profile.highestStreak}</span>
                        <span class="summary-lbl">Highest Streak 🔥</span>
                    </div>
                    <div class="summary-item" style="grid-column: 1 / -1;">
                        <span class="summary-val" style="color: var(--color-success);">${metrics.accuracy}%</span>
                        <span class="summary-lbl">Practice Accuracy Score 🎯</span>
                    </div>
                </div>

                <!-- Right Column - Bottom: Badge Sticker Room -->
                <div class="glass-panel dashboard-badges-card">
                    <h3 class="badges-title">🏆 Your Badge Stickers (${profile.unlockedBadges.length} / ${BADGE_LIST.length})</h3>
                    <div class="badges-grid">
                        ${BADGE_LIST.map(badge => {
                            const isUnlocked = profile.unlockedBadges.includes(badge.id);
                            return `
                                <div class="badge-item ${isUnlocked ? 'unlocked' : ''}">
                                    <span class="badge-icon">${badge.emoji}</span>
                                    <span style="font-size: 8px; font-weight: 600; display: block; margin-top: 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 100%;">
                                        ${badge.name}
                                    </span>
                                    <div class="badge-tooltip">
                                        <strong>${badge.name}</strong><br>
                                        ${badge.desc}<br>
                                        <span style="color: var(--color-warning);">${isUnlocked ? '🔓 UNLOCKED!' : '🔒 Locked'}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Dashboard bottom: Strongest vs Weakest lists -->
                <div class="glass-panel extremes-card" style="grid-column: 1 / -1;">
                    <!-- Strongest -->
                    <div class="extremes-col">
                        <h4 class="extremes-title" style="color: var(--color-warning);">🌟 Top 5 Strongest Facts</h4>
                        <div class="extremes-list">
                            ${metrics.strongest.length > 0 ? metrics.strongest.map(item => `
                                <div class="extreme-item">
                                    <span class="extreme-eq">${item.a} × ${item.b} = ${item.a * item.b}</span>
                                    <span class="extreme-val strong">${item.mastery}%</span>
                                </div>
                            `).join('') : '<span style="font-size: 12px; color: var(--text-secondary);">No mastered facts yet. Keep practicing!</span>'}
                        </div>
                    </div>
                    
                    <!-- Weakest -->
                    <div class="extremes-col">
                        <h4 class="extremes-title" style="color: var(--color-danger);">🎯 Top 5 Focus Targets</h4>
                        <div class="extremes-list">
                            ${metrics.weakest.length > 0 ? metrics.weakest.map(item => `
                                <div class="extreme-item">
                                    <span class="extreme-eq">${item.a} × ${item.b} = ${item.a * item.b}</span>
                                    <span class="extreme-val weak">${item.mastery}%</span>
                                </div>
                            `).join('') : '<span style="font-size: 12px; color: var(--text-secondary);">All unlocked facts are fully mastered! Splendid!</span>'}
                        </div>
                    </div>
                </div>

                <!-- Reset button at absolute bottom -->
                <div style="grid-column: 1 / -1; display: flex; justify-content: center; margin-top: 8px;">
                    <button id="dashboard-reset-btn" class="secondary-btn" 
                            style="border-color: rgba(244,63,94,0.3); color: var(--color-danger); font-size: 11px; padding: 6px 12px;">
                        ⚠️ Reset Profile & Progress Data
                    </button>
                </div>
            </div>
        `;

        this.render15x15Grid(unlockedFactors, factData);
        this.setupDashboardListeners();
    }

    calculateDashboardMetrics(unlockedFactors, factData) {
        let totalCertifiedCount = 0;
        let sumMastery = 0;
        let masteredCount = 0;
        const allUnlockedFacts = [];

        // Traverse all unlocked facts to gather lists
        for (let i = 1; i <= 15; i++) {
            for (let j = 1; j <= 15; j++) {
                const isUnlocked = unlockedFactors.includes(i) && unlockedFactors.includes(j);
                if (isUnlocked) {
                    const key = `${i}x${j}`;
                    const mastery = factData[key]?.mastery || 0;
                    
                    // We only count certified facts in the high metrics
                    const isCertified = isFactorCertified(i) && isFactorCertified(j);
                    if (isCertified) {
                        totalCertifiedCount++;
                        sumMastery += mastery;
                        if (mastery >= 80) masteredCount++;
                    }
                    
                    allUnlockedFacts.push({ a: i, b: j, key, mastery, isCertified });
                }
            }
        }

        const overallMasteryPercent = totalCertifiedCount > 0 
            ? Math.round(sumMastery / totalCertifiedCount) 
            : 0;

        // Sort to find strongest and weakest of certified pool
        const certifiedFacts = allUnlockedFacts.filter(f => f.isCertified);
        const practicedFacts = certifiedFacts.filter(f => factData[f.key]?.correctCount > 0 || factData[f.key]?.incorrectCount > 0);
        
        const strongest = [...practicedFacts]
            .sort((x, y) => y.mastery - x.mastery)
            .slice(0, 5);

        const weakest = [...certifiedFacts]
            .sort((x, y) => x.mastery - y.mastery)
            .slice(0, 5);

        const profile = loadProfile();
        const accuracy = profile.totalProblemsSolved > 0 
            ? Math.round((profile.totalCorrect / profile.totalProblemsSolved) * 100) 
            : 0;

        return {
            overallMasteryPercent,
            masteredCount,
            strongest,
            weakest,
            accuracy
        };
    }

    render15x15Grid(unlockedFactors, factData) {
        const gridElement = this.container.querySelector('#mastery-grid-element');
        if (!gridElement) return;

        gridElement.innerHTML = '';

        // Add 16x16 grid cells (including headers)
        for (let row = 0; row <= 15; row++) {
            for (let col = 0; col <= 15; col++) {
                const cell = document.createElement('div');
                
                if (row === 0 && col === 0) {
                    // Corner Header cell
                    cell.className = 'table-cell corner-cell';
                    cell.innerText = '×';
                } else if (row === 0) {
                    // Column labels
                    cell.className = 'table-cell label-cell';
                    cell.innerText = col;
                } else if (col === 0) {
                    // Row labels
                    cell.className = 'table-cell label-cell';
                    cell.innerText = row;
                } else {
                    // Fact interactive Cell
                    const key = `${row}x${col}`;
                    const isUnlocked = unlockedFactors.includes(row) && unlockedFactors.includes(col);
                    
                    if (!isUnlocked) {
                        cell.className = 'table-cell cell-locked';
                        cell.innerText = '';
                    } else {
                        // Check if certified
                        const isCertified = isFactorCertified(row) && isFactorCertified(col);
                        cell.innerText = row * col;
                        
                        if (!isCertified) {
                            cell.className = 'table-cell cell-intro-phase';
                        } else {
                            const mastery = factData[key]?.mastery || 0;
                            
                            if (mastery >= 80) {
                                cell.className = 'table-cell cell-mastered';
                            } else if (mastery >= 40) {
                                cell.className = 'table-cell cell-improving';
                            } else {
                                cell.className = 'table-cell cell-needs-practice';
                            }
                        }
                    }

                    cell.setAttribute('data-row', row);
                    cell.setAttribute('data-col', col);
                    cell.setAttribute('data-unlocked', isUnlocked ? 'true' : 'false');
                }
                
                gridElement.appendChild(cell);
            }
        }
    }

    setupDashboardListeners() {
        const gridElement = this.container.querySelector('#mastery-grid-element');
        const detailCard = this.container.querySelector('#grid-cell-details');
        const resetBtn = this.container.querySelector('#dashboard-reset-btn');

        // Tap cell handler
        gridElement.addEventListener('click', (e) => {
            const cell = e.target.closest('.table-cell');
            if (!cell || cell.classList.contains('label-cell') || cell.classList.contains('corner-cell')) return;

            // Remove highlight on past selected cells
            gridElement.querySelectorAll('.table-cell').forEach(c => c.classList.remove('active-highlight'));
            
            cell.classList.add('active-highlight');

            const row = parseInt(cell.getAttribute('data-row'), 10);
            const col = parseInt(cell.getAttribute('data-col'), 10);
            const isUnlocked = cell.getAttribute('data-unlocked') === 'true';

            this.showCellInspectionDetails(row, col, isUnlocked, detailCard);
        });

        // Reset click handler
        resetBtn.addEventListener('click', () => {
            const confirmReset = confirm('⚠️ WARNING: This will completely erase your levels, high scores, streaks, and all multiplication history! Are you absolutely sure you want to start over?');
            if (confirmReset) {
                resetAllData();
            }
        });
    }

    showCellInspectionDetails(row, col, isUnlocked, detailElement) {
        detailElement.style.visibility = 'visible';
        detailElement.style.opacity = 1;

        if (!isUnlocked) {
            // Find which XP/Level threshold unlocks this cell!
            // Fact requires BOTH row and col to be unlocked.
            const requiredLevel = this.getLevelRequiredForFact(row, col);
            
            detailElement.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div class="tooltip-eq">🔒 Fact Locked: ${row} × ${col}</div>
                    <div class="tooltip-stats">
                        This fact requires <strong>Level ${requiredLevel}</strong> to unlock!
                        <br>
                        Keep practicing unlocked facts to earn XP and level up!
                    </div>
                </div>
            `;
        } else {
            // Check if BOTH factors are certified
            const isCertified = isFactorCertified(row) && isFactorCertified(col);
            
            if (!isCertified) {
                // CONCEPT PHASE DISPLAY: Renders detailed requirements for the uncertified factors!
                const profile = loadProfile();
                const uncertifiedFactors = [];
                if (!isFactorCertified(row)) uncertifiedFactors.push(row);
                if (!isFactorCertified(col) && col !== row) uncertifiedFactors.push(col);

                detailElement.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
                        <div class="tooltip-eq" style="color: #06b6d4;">📖 Concept Phase: ${row} × ${col} = ${row * col}</div>
                        <div class="tooltip-stats" style="font-size: 12px; line-height: 1.4;">
                            To certify this fact and mix it into MCQ Practice/Timed Challenges, complete introductory goals for:
                            <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px;">
                                ${uncertifiedFactors.map(f => {
                                    const progressObj = profile.introProgress?.[f] || { skipCountingCount: 0, flashcardsCorrectCount: 0 };
                                    return `
                                        <div style="background: rgba(6, 182, 212, 0.08); border: 1px dashed rgba(6, 182, 212, 0.3); padding: 6px 12px; border-radius: 8px;">
                                            <strong>${f}s Table Progress:</strong><br>
                                            ➔ Skip Counting: <span style="color: var(--color-warning);">${progressObj.skipCountingCount} / 3 sessions done</span> ${progressObj.skipCountingCount >= 3 ? '✅' : ''}<br>
                                            ➔ Targeted Flashcards: <span style="color: var(--color-warning);">${progressObj.flashcardsCorrectCount} / 15 cards solved</span> ${progressObj.flashcardsCorrectCount >= 15 ? '✅' : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Certified Fact Stats Inspection
                const factData = loadFactData();
                const key = `${row}x${col}`;
                const data = factData[key] || { mastery: 0, correctCount: 0, incorrectCount: 0, averageResponseTimeMs: 0 };
                
                const totalPracticed = data.correctCount + data.incorrectCount;
                const accuracy = totalPracticed > 0 
                    ? Math.round((data.correctCount / totalPracticed) * 100) 
                    : 0;
                const speedSec = data.averageResponseTimeMs > 0 
                    ? `${(data.averageResponseTimeMs / 1000).toFixed(1)} seconds` 
                    : 'Not recorded';

                detailElement.innerHTML = `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <div class="tooltip-eq">${row} × ${col} = ${row * col}</div>
                            <div class="tooltip-stats" style="margin-top: 4px;">
                                Mastery Score: <strong style="color: var(--color-warning);">${data.mastery}%</strong>
                            </div>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); border-left: 1px solid rgba(255,255,255,0.1); padding-left: 12px;">
                            📊 Solved: ${totalPracticed} times<br>
                            🎯 Accuracy: ${accuracy}% (${data.correctCount} correct, ${data.incorrectCount} wrong)<br>
                            ⚡ Speed: ${speedSec}
                        </div>
                    </div>
                `;
            }
        }
    }

    getLevelRequiredForFact(a, b) {
        const getFactorIntroLevel = (n) => {
            if (n >= 1 && n <= 5) return 1;
            if (n === 10) return 2;
            if (n === 9) return 3;
            if (n === 6) return 4;
            if (n === 7) return 5;
            if (n === 8) return 6;
            if (n === 11) return 7;
            if (n === 12) return 8;
            if (n === 13) return 9;
            if (n === 14) return 10;
            if (n === 15) return 11;
            return 1;
        };

        // Fact requires both to be unlocked, so it requires the MAX level of the two!
        return Math.max(getFactorIntroLevel(a), getFactorIntroLevel(b));
    }
}
