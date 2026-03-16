/**
 * RNA Data Model
 * Manages RNA sequence, structure, nodes, backbone links, and base pairs.
 * Handles dot-bracket parsing, Watson-Crick validation, and structure analysis.
 */
window.RNAModel = (function () {

    // Watson-Crick and wobble pair classification
    const PAIR_TYPES = {
        'A-U': 'watson-crick', 'U-A': 'watson-crick',
        'G-C': 'watson-crick', 'C-G': 'watson-crick',
        'G-U': 'wobble',       'U-G': 'wobble'
    };

    const BASE_COLORS = {
        'A': '#E74C3C', // Red
        'U': '#3498DB', // Blue
        'G': '#2ECC71', // Green
        'C': '#F1C40F', // Yellow
        'X': '#95A5A6', // Gray
        'Y': '#9B59B6'  // Purple
    };

    const PAIR_COLORS = {
        'watson-crick': '#2ECC71',
        'wobble': '#F39C12',
        'non-canonical': '#E74C3C'
    };

    class Model {
        constructor() {
            this.sequence = '';
            this.dotBracket = '';
            this.nodes = [];
            this.backboneLinks = [];
            this.basePairs = [];
        }

        /**
         * Initialize model from sequence and optional dot-bracket notation
         */
        setFromInput(sequence, dotBracket) {
            this.sequence = sequence.toUpperCase().trim();
            this.dotBracket = (dotBracket || '').trim();
            this.nodes = [];
            this.backboneLinks = [];
            this.basePairs = [];

            // Create nodes
            for (let i = 0; i < this.sequence.length; i++) {
                this.nodes.push({
                    index: i,
                    base: this.sequence[i],
                    x: 0,
                    y: 0,
                    pairedWith: null
                });
            }

            // Create backbone links (sequential connections)
            for (let i = 0; i < this.nodes.length - 1; i++) {
                this.backboneLinks.push({
                    source: i,
                    target: i + 1,
                    type: 'backbone'
                });
            }

            // Parse dot-bracket if provided
            if (this.dotBracket.length > 0) {
                this._parseDotBracket();
            }
        }

        /**
         * Parse dot-bracket notation into base pairs
         */
        _parseDotBracket() {
            const stack = [];
            for (let i = 0; i < this.dotBracket.length; i++) {
                const ch = this.dotBracket[i];
                if (ch === '(') {
                    stack.push(i);
                } else if (ch === ')') {
                    if (stack.length === 0) {
                        throw new Error(`Unmatched ')' at position ${i + 1}`);
                    }
                    const j = stack.pop();
                    this._createBasePair(j, i);
                }
                // '.' means unpaired — do nothing
            }
            if (stack.length > 0) {
                throw new Error(`Unmatched '(' at position ${stack[stack.length - 1] + 1}`);
            }
        }

        /**
         * Create a base pair between two positions
         */
        _createBasePair(i, j) {
            this.nodes[i].pairedWith = j;
            this.nodes[j].pairedWith = i;

            const pairKey = this.nodes[i].base + '-' + this.nodes[j].base;
            const pairType = PAIR_TYPES[pairKey] || 'non-canonical';

            this.basePairs.push({
                source: i,
                target: j,
                type: 'basepair',
                pairType: pairType,
                bases: pairKey
            });
        }

        /**
         * Manually add a base pair (for bond mode)
         * Returns {success, message, pairType}
         */
        addBasePair(i, j) {
            // Validation
            if (i === j) return { success: false, message: 'Cannot pair a base with itself' };
            if (Math.abs(i - j) < 4) return { success: false, message: 'Pairs must be at least 4 positions apart (min hairpin loop = 3)' };
            if (this.nodes[i].pairedWith !== null) return { success: false, message: `Position ${i + 1} is already paired` };
            if (this.nodes[j].pairedWith !== null) return { success: false, message: `Position ${j + 1} is already paired` };

            // Check for crossing pairs (pseudoknots)
            for (const pair of this.basePairs) {
                const a = pair.source, b = pair.target;
                const lo = Math.min(i, j), hi = Math.max(i, j);
                if ((a < lo && lo < b && b < hi) || (lo < a && a < hi && hi < b)) {
                    return { success: false, message: `Would create a pseudoknot (crossing pair with ${a + 1}-${b + 1})` };
                }
            }

            const pairKey = this.nodes[i].base + '-' + this.nodes[j].base;
            const pairType = PAIR_TYPES[pairKey] || 'non-canonical';

            this._createBasePair(Math.min(i, j), Math.max(i, j));
            this._regenerateDotBracket();

            return {
                success: true,
                message: `Paired ${this.nodes[i].base}(${i + 1}) — ${this.nodes[j].base}(${j + 1})`,
                pairType: pairType
            };
        }

        /**
         * Remove a base pair involving position i
         */
        removeBasePair(i) {
            const pairIdx = this.basePairs.findIndex(
                p => p.source === i || p.target === i
            );
            if (pairIdx === -1) return false;

            const pair = this.basePairs[pairIdx];
            this.nodes[pair.source].pairedWith = null;
            this.nodes[pair.target].pairedWith = null;
            this.basePairs.splice(pairIdx, 1);
            this._regenerateDotBracket();
            return true;
        }

        /**
         * Regenerate dot-bracket from current base pairs
         */
        _regenerateDotBracket() {
            const db = new Array(this.sequence.length).fill('.');
            for (const pair of this.basePairs) {
                db[pair.source] = '(';
                db[pair.target] = ')';
            }
            this.dotBracket = db.join('');
        }

        /**
         * Generate dot-bracket from current state
         */
        getDotBracket() {
            if (!this.dotBracket && this.basePairs.length > 0) {
                this._regenerateDotBracket();
            }
            return this.dotBracket || '.'.repeat(this.sequence.length);
        }

        /**
         * Classify a base pair
         */
        static classifyPair(base1, base2) {
            const key = base1 + '-' + base2;
            return PAIR_TYPES[key] || 'non-canonical';
        }

        /**
         * Validate the entire structure, return array of issues
         */
        validateStructure() {
            const issues = [];

            // Check each base pair type
            for (const pair of this.basePairs) {
                if (pair.pairType === 'non-canonical') {
                    issues.push({
                        type: 'warning',
                        message: `Non-canonical pair: ${pair.bases} at positions ${pair.source + 1}–${pair.target + 1}`
                    });
                } else if (pair.pairType === 'wobble') {
                    issues.push({
                        type: 'info',
                        message: `Wobble pair: ${pair.bases} at positions ${pair.source + 1}–${pair.target + 1}`
                    });
                }
            }

            // Check hairpin loop sizes (minimum 3 unpaired bases)
            for (const pair of this.basePairs) {
                const loopSize = pair.target - pair.source - 1;
                // Check if this is an innermost pair (hairpin)
                const isHairpin = !this.basePairs.some(
                    p => p.source > pair.source && p.target < pair.target
                );
                if (isHairpin && loopSize < 3) {
                    issues.push({
                        type: 'error',
                        message: `Hairpin loop too small (${loopSize} bases) at positions ${pair.source + 1}–${pair.target + 1}. Minimum is 3.`
                    });
                }
            }

            // Check for isolated pairs (single pair not part of a stem)
            for (const pair of this.basePairs) {
                const hasNeighbor = this.basePairs.some(p =>
                    (p.source === pair.source + 1 && p.target === pair.target - 1) ||
                    (p.source === pair.source - 1 && p.target === pair.target + 1)
                );
                if (!hasNeighbor && this.basePairs.length > 1) {
                    issues.push({
                        type: 'info',
                        message: `Isolated pair at ${pair.source + 1}–${pair.target + 1} (not part of a stem)`
                    });
                }
            }

            if (issues.length === 0) {
                issues.push({ type: 'success', message: 'All base pairs are canonical Watson-Crick pairs ✓' });
            }

            return issues;
        }

        /**
         * Get sequence statistics
         */
        getStats() {
            const len = this.sequence.length;
            if (len === 0) return null;

            const counts = { A: 0, U: 0, G: 0, C: 0, X: 0, Y: 0 };
            for (const base of this.sequence) {
                if (counts.hasOwnProperty(base)) counts[base]++;
            }

            const gcContent = ((counts.G + counts.C) / len * 100).toFixed(1);
            const auContent = ((counts.A + counts.U) / len * 100).toFixed(1);

            return {
                length: len,
                baseCounts: counts,
                gcContent: gcContent,
                auContent: auContent,
                pairCount: this.basePairs.length,
                pairedPercent: (this.basePairs.length * 2 / len * 100).toFixed(1),
                wcPairs: this.basePairs.filter(p => p.pairType === 'watson-crick').length,
                wobblePairs: this.basePairs.filter(p => p.pairType === 'wobble').length,
                ncPairs: this.basePairs.filter(p => p.pairType === 'non-canonical').length
            };
        }

        /**
         * Deep clone the model (for undo/redo)
         */
        clone() {
            const copy = new Model();
            copy.sequence = this.sequence;
            copy.dotBracket = this.dotBracket;
            copy.nodes = this.nodes.map(n => ({ ...n }));
            copy.backboneLinks = this.backboneLinks.map(l => ({ ...l }));
            copy.basePairs = this.basePairs.map(p => ({ ...p }));
            return copy;
        }

        /**
         * Restore from a cloned state
         */
        restoreFrom(other) {
            this.sequence = other.sequence;
            this.dotBracket = other.dotBracket;
            this.nodes = other.nodes.map(n => ({ ...n }));
            this.backboneLinks = other.backboneLinks.map(l => ({ ...l }));
            this.basePairs = other.basePairs.map(p => ({ ...p }));
        }
    }

    // Static references
    Model.BASE_COLORS = BASE_COLORS;
    Model.PAIR_COLORS = PAIR_COLORS;
    Model.PAIR_TYPES = PAIR_TYPES;

    return Model;
})();
