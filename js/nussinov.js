/**
 * Nussinov Algorithm — Client-Side RNA Structure Prediction
 * 
 * Implements the weighted Nussinov dynamic programming algorithm for
 * predicting RNA secondary structure by maximizing base pair scores.
 * Records every step for educational animation.
 *
 * This is the first browser-based implementation designed for education:
 * - Weighted scoring (G-C > A-U > G-U) teaches pair stability
 * - Step-by-step recording enables algorithm visualization
 * - Simplified energy model gives physical intuition
 */
window.NussinovPredictor = (function () {

    // Weighted pair scores (reflect hydrogen bond strength)
    const PAIR_SCORES = {
        'GC': 3, 'CG': 3,   // 3 H-bonds, strongest
        'AU': 2, 'UA': 2,   // 2 H-bonds, standard
        'GU': 1, 'UG': 1    // Wobble pair, weakest
    };

    // Simplified energy parameters (kcal/mol, approximate Turner 2004)
    const ENERGY = {
        pairEnergy:    { 'GC': -3.0, 'CG': -3.0, 'AU': -2.0, 'UA': -2.0, 'GU': -1.0, 'UG': -1.0 },
        stackBonus:    -1.5,   // Extra stabilization for consecutive stacked pairs
        hairpinInit:    4.0,   // Hairpin loop initiation penalty
        hairpinPerBase: 0.2,   // Per-base hairpin penalty
        internalInit:   2.5,   // Internal loop initiation penalty
        internalPerBase:0.15   // Per-base internal loop penalty
    };

    class Predictor {
        constructor(sequence, options = {}) {
            this.sequence = sequence.toUpperCase();
            this.n = this.sequence.length;
            this.minLoopSize = options.minLoopSize !== undefined ? options.minLoopSize : 3;
            this.matrix = [];      // DP matrix M[i][j]
            this.choice = [];      // Choice made at each cell
            this.pairs = [];       // Resulting base pairs [(i,j), ...]
            this.fillSteps = [];   // Steps for animation (fill phase)
            this.traceSteps = [];  // Steps for animation (traceback phase)
            this.dotBracket = '';
            this.score = 0;
            this._predicted = false;
        }

        /**
         * Can bases at positions i and j form a pair?
         */
        canPair(i, j) {
            if (Math.abs(i - j) <= this.minLoopSize) return false;
            const key = this.sequence[i] + this.sequence[j];
            return PAIR_SCORES.hasOwnProperty(key);
        }

        /**
         * Score for pairing bases at i and j
         */
        pairScore(i, j) {
            const key = this.sequence[i] + this.sequence[j];
            return PAIR_SCORES[key] || 0;
        }

        /**
         * Run the prediction algorithm
         * Returns { dotBracket, pairs, score }
         */
        predict() {
            const n = this.n;

            // Initialize matrices
            this.matrix = Array.from({ length: n }, () => new Array(n).fill(0));
            this.choice = Array.from({ length: n }, () => new Array(n).fill(null));
            this.fillSteps = [];
            this.traceSteps = [];
            this.pairs = [];

            // Fill DP matrix diagonally (span = j - i)
            for (let span = 1; span < n; span++) {
                for (let i = 0; i < n - span; i++) {
                    const j = i + span;

                    if (j - i <= this.minLoopSize) {
                        this.matrix[i][j] = 0;
                        this.choice[i][j] = { type: 'too_close' };
                        continue;
                    }

                    let best = -1;
                    let bestChoice = null;
                    const candidates = [];

                    // Case 1: i is unpaired
                    const val1 = this.matrix[i + 1][j];
                    candidates.push({
                        name: `${this.sequence[i]}(${i + 1}) unpaired`,
                        value: val1,
                        type: 'skip_i',
                        from: [[i + 1, j]]
                    });
                    if (val1 > best) {
                        best = val1;
                        bestChoice = { type: 'skip_i' };
                    }

                    // Case 2: j is unpaired
                    const val2 = this.matrix[i][j - 1];
                    candidates.push({
                        name: `${this.sequence[j]}(${j + 1}) unpaired`,
                        value: val2,
                        type: 'skip_j',
                        from: [[i, j - 1]]
                    });
                    if (val2 > best) {
                        best = val2;
                        bestChoice = { type: 'skip_j' };
                    }

                    // Case 3: i pairs with j
                    if (this.canPair(i, j)) {
                        const ps = this.pairScore(i, j);
                        const val3 = this.matrix[i + 1][j - 1] + ps;
                        const pairKey = this.sequence[i] + '-' + this.sequence[j];
                        candidates.push({
                            name: `Pair ${this.sequence[i]}(${i + 1})–${this.sequence[j]}(${j + 1}) [+${ps}]`,
                            value: val3,
                            type: 'pair',
                            from: [[i + 1, j - 1]],
                            pairScore: ps,
                            pairType: pairKey
                        });
                        if (val3 > best) {
                            best = val3;
                            bestChoice = { type: 'pair', score: ps };
                        }
                    }

                    // Case 4: Bifurcation — split at k
                    let bestK = -1;
                    let bestBifValue = -1;
                    for (let k = i + 1; k < j; k++) {
                        const val4 = this.matrix[i][k] + this.matrix[k + 1][j];
                        if (val4 > bestBifValue) {
                            bestBifValue = val4;
                            bestK = k;
                        }
                    }
                    if (bestK >= 0 && bestBifValue > best) {
                        candidates.push({
                            name: `Split at k=${bestK + 1}`,
                            value: bestBifValue,
                            type: 'bifurcate',
                            from: [[i, bestK], [bestK + 1, j]],
                            k: bestK
                        });
                        best = bestBifValue;
                        bestChoice = { type: 'bifurcate', k: bestK };
                    } else if (bestK >= 0) {
                        candidates.push({
                            name: `Split at k=${bestK + 1}`,
                            value: bestBifValue,
                            type: 'bifurcate',
                            from: [[i, bestK], [bestK + 1, j]],
                            k: bestK
                        });
                    }

                    this.matrix[i][j] = best;
                    this.choice[i][j] = bestChoice;

                    // Find the winning candidate
                    const winner = candidates.reduce((a, b) => a.value >= b.value ? a : b);

                    // Record step for animation
                    this.fillSteps.push({
                        phase: 'fill',
                        i: i,
                        j: j,
                        span: span,
                        value: best,
                        candidates: candidates,
                        bestChoice: bestChoice,
                        explanation: this._explainFillStep(i, j, best, winner)
                    });
                }
            }

            // Traceback
            this._traceback(0, n - 1);

            // Build result
            this.dotBracket = this._buildDotBracket();
            this.score = this.matrix[0][n - 1];
            this._predicted = true;

            return {
                dotBracket: this.dotBracket,
                pairs: this.pairs.slice(),
                score: this.score,
                energy: this.calculateEnergy()
            };
        }

        /**
         * Recursive traceback to find optimal structure
         */
        _traceback(i, j) {
            if (i >= j || j - i <= this.minLoopSize) return;

            const ch = this.choice[i][j];
            if (!ch) return;

            if (ch.type === 'skip_i') {
                this.traceSteps.push({
                    phase: 'traceback',
                    i: i, j: j,
                    action: 'skip_i',
                    explanation: `${this.sequence[i]}(${i + 1}) is unpaired → recurse on (${i + 2}, ${j + 1})`
                });
                this._traceback(i + 1, j);

            } else if (ch.type === 'skip_j') {
                this.traceSteps.push({
                    phase: 'traceback',
                    i: i, j: j,
                    action: 'skip_j',
                    explanation: `${this.sequence[j]}(${j + 1}) is unpaired → recurse on (${i + 1}, ${j})`
                });
                this._traceback(i, j - 1);

            } else if (ch.type === 'pair') {
                this.pairs.push([i, j]);
                this.traceSteps.push({
                    phase: 'traceback',
                    i: i, j: j,
                    action: 'pair',
                    pair: [i, j],
                    explanation: `✓ Pair ${this.sequence[i]}(${i + 1})–${this.sequence[j]}(${j + 1}) → recurse on (${i + 2}, ${j})`
                });
                this._traceback(i + 1, j - 1);

            } else if (ch.type === 'bifurcate') {
                const k = ch.k;
                this.traceSteps.push({
                    phase: 'traceback',
                    i: i, j: j,
                    action: 'bifurcate',
                    k: k,
                    explanation: `Split at position ${k + 1} → recurse on (${i + 1},${k + 1}) and (${k + 2},${j + 1})`
                });
                this._traceback(i, k);
                this._traceback(k + 1, j);
            }
        }

        /**
         * Build dot-bracket from pairs
         */
        _buildDotBracket() {
            const db = new Array(this.n).fill('.');
            for (const [i, j] of this.pairs) {
                db[i] = '(';
                db[j] = ')';
            }
            return db.join('');
        }

        /**
         * Generate human-readable explanation for a fill step
         */
        _explainFillStep(i, j, value, winner) {
            const bi = this.sequence[i], bj = this.sequence[j];
            let text = `M[${i + 1}][${j + 1}] (${bi}→${bj}): `;
            if (winner.type === 'pair') {
                text += `${bi} pairs with ${bj} (${winner.pairType}, +${winner.pairScore}). `;
                text += `Score = M[${i + 2}][${j}] + ${winner.pairScore} = ${value}`;
            } else if (winner.type === 'skip_i') {
                text += `${bi}(${i + 1}) unpaired. Score = M[${i + 2}][${j + 1}] = ${value}`;
            } else if (winner.type === 'skip_j') {
                text += `${bj}(${j + 1}) unpaired. Score = M[${i + 1}][${j}] = ${value}`;
            } else if (winner.type === 'bifurcate') {
                text += `Split at ${winner.k + 1}. Score = M[${i + 1}][${winner.k + 1}] + M[${winner.k + 2}][${j + 1}] = ${value}`;
            }
            return text;
        }

        /**
         * Calculate simplified free energy (kcal/mol)
         * Uses base pair energies + stacking bonuses + loop penalties
         */
        calculateEnergy() {
            if (this.pairs.length === 0) return { total: 0, breakdown: [] };

            const breakdown = [];
            let total = 0;

            // Sort pairs by opening position
            const sortedPairs = [...this.pairs].sort((a, b) => a[0] - b[0]);

            // Base pair energies
            for (const [i, j] of sortedPairs) {
                const key = this.sequence[i] + this.sequence[j];
                const e = ENERGY.pairEnergy[key] || 0;
                breakdown.push({
                    type: 'pair',
                    positions: [i, j],
                    bases: this.sequence[i] + '–' + this.sequence[j],
                    energy: e,
                    description: `${this.sequence[i]}(${i + 1})–${this.sequence[j]}(${j + 1}): ${e.toFixed(1)} kcal/mol`
                });
                total += e;
            }

            // Stacking bonuses (consecutive pairs)
            const pairSet = new Map();
            for (const [i, j] of sortedPairs) pairSet.set(i, j);

            for (const [i, j] of sortedPairs) {
                if (pairSet.has(i + 1) && pairSet.get(i + 1) === j - 1) {
                    breakdown.push({
                        type: 'stack',
                        positions: [i, j, i + 1, j - 1],
                        energy: ENERGY.stackBonus,
                        description: `Stack: (${i + 1},${j + 1})/(${i + 2},${j}): ${ENERGY.stackBonus.toFixed(1)} kcal/mol`
                    });
                    total += ENERGY.stackBonus;
                }
            }

            // Hairpin loop penalties
            const innerPairs = sortedPairs.filter(([i, j]) => {
                // A pair is innermost if no other pair is nested inside it
                return !sortedPairs.some(([a, b]) => a > i && b < j);
            });

            for (const [i, j] of innerPairs) {
                const loopSize = j - i - 1;
                const penalty = ENERGY.hairpinInit + ENERGY.hairpinPerBase * loopSize;
                breakdown.push({
                    type: 'hairpin',
                    positions: [i, j],
                    energy: penalty,
                    description: `Hairpin loop (${loopSize} bases): +${penalty.toFixed(1)} kcal/mol`
                });
                total += penalty;
            }

            return {
                total: Math.round(total * 10) / 10,
                breakdown: breakdown,
                pairCount: this.pairs.length
            };
        }

        /**
         * Get the DP matrix for visualization
         */
        getMatrix() {
            return this.matrix;
        }

        /**
         * Get max value in matrix (for color scaling)
         */
        getMaxScore() {
            let max = 0;
            for (let i = 0; i < this.n; i++) {
                for (let j = i; j < this.n; j++) {
                    if (this.matrix[i][j] > max) max = this.matrix[i][j];
                }
            }
            return max;
        }
    }

    // Expose constants
    Predictor.PAIR_SCORES = PAIR_SCORES;
    Predictor.ENERGY = ENERGY;

    return Predictor;
})();
