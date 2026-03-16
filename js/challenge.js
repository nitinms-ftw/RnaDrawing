/**
 * Challenge Mode
 * RNA structure design puzzles inspired by EteRNA.
 * Given a target structure (dot-bracket), the student must design
 * a sequence that folds into it. The Nussinov algorithm checks their answer.
 */
window.ChallengeMode = (function () {

    const CHALLENGES = [
        {
            id: 'tiny-hairpin',
            name: 'Tiny Hairpin',
            difficulty: 1,
            icon: '🌱',
            description: 'Create the simplest RNA structural motif: a hairpin loop. Place complementary bases in the stem positions.',
            targetDB: '(((....)))',
            hint: 'Positions 1-3 must pair with 10-8. Try G-C pairs for the stem — they\'re the strongest! Loop bases (4-7) can be anything.',
            teach: 'Hairpin loops are the most common RNA motif. The stem is held together by Watson-Crick base pairs (G-C or A-U), while the loop is single-stranded.'
        },
        {
            id: 'strong-stem',
            name: 'Strong Stem',
            difficulty: 1,
            icon: '💪',
            description: 'Build a longer stem-loop. Longer stems are more thermodynamically stable.',
            targetDB: '(((((.....)))))',
            hint: 'You need 5 base pairs. G-C pairs give the highest score (3 points each). The 5 loop bases can be anything.',
            teach: 'Stem length determines stability. Each additional base pair adds stability through hydrogen bonding and base stacking.'
        },
        {
            id: 'double-trouble',
            name: 'Double Trouble',
            difficulty: 2,
            icon: '🔀',
            description: 'Design a sequence with TWO independent hairpin loops. The key challenge: your sequence must not prefer to fold into a single long stem instead.',
            targetDB: '(((...)))(((...)))',
            hint: 'Each stem needs complementary pairs. Make sure the bases between the two stems don\'t accidentally pair with each other!',
            teach: 'Many functional RNAs have multiple stem-loops. Riboswitches, tRNAs, and mRNA regulatory elements all use multi-stem architectures.'
        },
        {
            id: 'internal-loop',
            name: 'The Nested Loop',
            difficulty: 2,
            icon: '🎯',
            description: 'Create a structure with a stem inside another stem, separated by an internal loop. This requires careful planning!',
            targetDB: '(((..(((...)))..)))',
            hint: 'The outer stem (positions 1-3 pairing with 16-18) and inner stem (positions 6-8 pairing with 12-14) must both have valid pairs. The internal loop bases (4-5 and 15-16) should NOT be able to pair.',
            teach: 'Internal loops are unpaired regions within a helix. They\'re crucial for protein binding sites in ribosomal RNA and for the tertiary folding of large RNAs.'
        },
        {
            id: 'gc-master',
            name: 'GC Master',
            difficulty: 3,
            icon: '⚡',
            description: 'Maximize the prediction SCORE (not just structure). Use the strongest possible base pairs. Target score: 30+',
            targetDB: '(((((((....)))))))',
            hint: 'G-C pairs score 3 points each (vs 2 for A-U). A perfect GC stem of 7 pairs = 21 points base + stacking bonuses. Can you reach 30?',
            teach: 'G-C base pairs have 3 hydrogen bonds vs 2 for A-U. This makes GC-rich stems significantly more stable — important for thermophilic organisms that live in extreme heat.'
        },
        {
            id: 'wobble-room',
            name: 'Wobble Challenge',
            difficulty: 3,
            icon: '🌊',
            description: 'Design a hairpin using at least 2 G-U wobble pairs in the stem. The Nussinov predictor must still fold it correctly!',
            targetDB: '((((((....))))))',
            hint: 'G-U wobble pairs score only 1 point. You need the overall structure to be favorable enough that the predictor still chooses it. Mix G-U with strong G-C pairs.',
            teach: 'G-U wobble pairs are the third most common base pair in RNA (after G-C and A-U). They\'re essential in tRNA, ribosomal RNA, and are recognized by specific proteins.'
        },
        {
            id: 'free-design',
            name: 'Free Design',
            difficulty: 3,
            icon: '🎨',
            description: 'No target structure — maximize the number of base pairs in a 25-base sequence! How many pairs can you achieve?',
            targetDB: null,
            length: 25,
            hint: 'Think about what structure would have the most pairs for 25 bases. Long stems are efficient, but you can also use multiple stems.',
            teach: 'RNA molecules naturally fold to minimize free energy, which generally means maximizing favorable base pair interactions while avoiding strain in loops.'
        }
    ];

    const BASE_CYCLE = ['A', 'U', 'G', 'C'];

    class Challenge {
        constructor(containerId) {
            this.container = document.getElementById(containerId);
            this.currentChallenge = null;
            this.currentIndex = -1;
            this.userSequence = [];
            this.solved = this._loadProgress();
            this.onStructurePredicted = null; // Callback to visualize result
        }

        /**
         * Render the challenge list
         */
        renderList() {
            let html = '<div class="challenge-list">';

            CHALLENGES.forEach((ch, idx) => {
                const isSolved = this.solved.has(ch.id);
                const isLocked = idx > 0 && !this.solved.has(CHALLENGES[idx - 1].id) && idx > 1;
                const stars = '★'.repeat(ch.difficulty) + '☆'.repeat(3 - ch.difficulty);

                html += `
                    <button class="challenge-card ${isSolved ? 'solved' : ''} ${isLocked ? 'locked' : ''}"
                            data-index="${idx}" ${isLocked ? 'disabled' : ''}>
                        <span class="challenge-card-icon">${ch.icon}</span>
                        <div class="challenge-card-info">
                            <div class="challenge-card-name">${ch.name} ${isSolved ? '✅' : ''}</div>
                            <div class="challenge-card-stars">${stars}</div>
                        </div>
                        ${isLocked ? '<span class="challenge-lock">🔒</span>' : ''}
                    </button>
                `;
            });

            html += '</div>';
            this.container.innerHTML = html;

            // Bind clicks
            this.container.querySelectorAll('.challenge-card:not(.locked)').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.loadChallenge(parseInt(btn.dataset.index));
                });
            });
        }

        /**
         * Load a specific challenge
         */
        loadChallenge(index) {
            this.currentIndex = index;
            this.currentChallenge = CHALLENGES[index];
            const ch = this.currentChallenge;
            const len = ch.targetDB ? ch.targetDB.trim().length : ch.length;

            // Initialize user sequence
            this.userSequence = new Array(len).fill('A');

            this._renderPuzzle();
        }

        /**
         * Render the puzzle interface
         */
        _renderPuzzle() {
            const ch = this.currentChallenge;
            const len = this.userSequence.length;
            const targetDB = ch.targetDB ? ch.targetDB.trim() : null;

            let html = `
                <div class="challenge-puzzle">
                    <div class="challenge-puzzle-header">
                        <button class="btn btn-sm btn-outline challenge-back-btn">← Back</button>
                        <h3>${ch.icon} ${ch.name}</h3>
                        <span class="challenge-difficulty">${'★'.repeat(ch.difficulty)}${'☆'.repeat(3 - ch.difficulty)}</span>
                    </div>
                    <p class="challenge-desc">${ch.description}</p>
            `;

            // Target structure display
            if (targetDB) {
                html += `<div class="challenge-target">
                    <div class="challenge-target-label">Target Structure:</div>
                    <div class="challenge-target-db">`;

                // Arc diagram for target structure
                html += `<div class="challenge-arcs" id="challenge-arcs"></div>`;
                html += `<div class="challenge-db-row">`;
                for (let i = 0; i < len; i++) {
                    html += `<span class="db-char ${targetDB[i] === '(' ? 'open' : targetDB[i] === ')' ? 'close' : 'dot'}">${targetDB[i]}</span>`;
                }
                html += `</div></div></div>`;
            } else {
                html += `<div class="challenge-target">
                    <div class="challenge-target-label">Maximize base pairs in ${len} bases!</div>
                </div>`;
            }

            // Sequence input (clickable cells)
            html += `<div class="challenge-input-area">
                <div class="challenge-input-label">Your Sequence (click to change base):</div>
                <div class="challenge-seq-row">`;

            for (let i = 0; i < len; i++) {
                const base = this.userSequence[i];
                const baseClass = base.toLowerCase();
                const role = targetDB ? (targetDB[i] === '(' ? 'stem-open' : targetDB[i] === ')' ? 'stem-close' : 'loop') : '';
                html += `<div class="challenge-base-cell ${baseClass} ${role}" data-index="${i}" title="Position ${i + 1} ${role ? '(' + role + ')' : ''}">${base}</div>`;
            }

            html += `</div>
                <div class="challenge-pos-row">`;
            for (let i = 0; i < len; i++) {
                html += `<span class="challenge-pos-num">${i + 1}</span>`;
            }
            html += `</div></div>`;

            // Quick fill buttons
            html += `<div class="challenge-quick-fill">
                <span class="quick-fill-label">Quick fill:</span>
                <button class="btn btn-sm btn-outline quick-fill-btn" data-fill="random">🎲 Random</button>
                <button class="btn btn-sm btn-outline quick-fill-btn" data-fill="gc">G-C Stems</button>
                <button class="btn btn-sm btn-outline quick-fill-btn" data-fill="au">A-U Stems</button>
                <button class="btn btn-sm btn-outline quick-fill-btn" data-fill="clear">Clear</button>
            </div>`;

            // Actions
            html += `<div class="challenge-actions">
                <button class="btn btn-primary challenge-check-btn">🧪 Fold & Check</button>
                <button class="btn btn-outline challenge-hint-btn">💡 Hint</button>
            </div>`;

            // Result area
            html += `<div class="challenge-result" id="challenge-result"></div>`;

            // Teaching moment
            html += `<div class="challenge-teach" id="challenge-teach"></div>`;

            html += `</div>`;

            this.container.innerHTML = html;

            // Draw arcs for target structure
            if (targetDB) {
                this._drawTargetArcs(targetDB);
            }

            // Bind events
            this.container.querySelectorAll('.challenge-base-cell').forEach(cell => {
                cell.addEventListener('click', () => this._cycleBase(cell));
            });

            this.container.querySelector('.challenge-check-btn')
                .addEventListener('click', () => this._checkAnswer());

            this.container.querySelector('.challenge-hint-btn')
                .addEventListener('click', () => this._showHint());

            this.container.querySelector('.challenge-back-btn')
                .addEventListener('click', () => this.renderList());

            this.container.querySelectorAll('.quick-fill-btn').forEach(btn => {
                btn.addEventListener('click', () => this._quickFill(btn.dataset.fill));
            });
        }

        /**
         * Draw arc diagram for target structure
         */
        _drawTargetArcs(db) {
            const arcsContainer = this.container.querySelector('#challenge-arcs');
            if (!arcsContainer) return;

            // Parse pairs
            const pairs = [];
            const stack = [];
            for (let i = 0; i < db.length; i++) {
                if (db[i] === '(') stack.push(i);
                else if (db[i] === ')' && stack.length > 0) {
                    pairs.push([stack.pop(), i]);
                }
            }

            if (pairs.length === 0) return;

            const cellWidth = 28;
            const svgWidth = db.length * cellWidth;
            const maxSpan = Math.max(...pairs.map(p => p[1] - p[0]));
            const svgHeight = Math.min(maxSpan * 3 + 10, 80);

            let svg = `<svg width="${svgWidth}" height="${svgHeight}" class="arc-svg">`;

            for (const [i, j] of pairs) {
                const x1 = i * cellWidth + cellWidth / 2;
                const x2 = j * cellWidth + cellWidth / 2;
                const cx = (x1 + x2) / 2;
                const ry = Math.min((x2 - x1) * 0.4, svgHeight - 5);

                svg += `<path d="M ${x1} ${svgHeight} A ${(x2 - x1) / 2} ${ry} 0 0 1 ${x2} ${svgHeight}"
                         fill="none" stroke="#3498DB" stroke-width="1.5" opacity="0.5"/>`;
            }

            svg += '</svg>';
            arcsContainer.innerHTML = svg;
        }

        /**
         * Cycle through bases when clicking a cell
         */
        _cycleBase(cell) {
            const idx = parseInt(cell.dataset.index);
            const current = this.userSequence[idx];
            const nextIdx = (BASE_CYCLE.indexOf(current) + 1) % BASE_CYCLE.length;
            const nextBase = BASE_CYCLE[nextIdx];

            this.userSequence[idx] = nextBase;
            cell.textContent = nextBase;
            cell.className = `challenge-base-cell ${nextBase.toLowerCase()} ${cell.className.split(' ').filter(c => c.startsWith('stem-') || c === 'loop').join(' ')}`;
        }

        /**
         * Quick fill patterns
         */
        _quickFill(type) {
            const ch = this.currentChallenge;
            const db = ch.targetDB ? ch.targetDB.trim() : null;
            const len = this.userSequence.length;

            if (type === 'random') {
                for (let i = 0; i < len; i++) {
                    this.userSequence[i] = BASE_CYCLE[Math.floor(Math.random() * 4)];
                }
            } else if (type === 'gc' && db) {
                this._fillStemsWithPair(db, 'G', 'C');
            } else if (type === 'au' && db) {
                this._fillStemsWithPair(db, 'A', 'U');
            } else if (type === 'clear') {
                this.userSequence.fill('A');
            }

            // Update display
            this.container.querySelectorAll('.challenge-base-cell').forEach((cell, i) => {
                cell.textContent = this.userSequence[i];
                const base = this.userSequence[i].toLowerCase();
                const roleClasses = Array.from(cell.classList).filter(c => c.startsWith('stem-') || c === 'loop');
                cell.className = `challenge-base-cell ${base} ${roleClasses.join(' ')}`;
            });
        }

        _fillStemsWithPair(db, open, close) {
            // Parse pairs
            const stack = [];
            const pairs = [];
            for (let i = 0; i < db.length; i++) {
                if (db[i] === '(') stack.push(i);
                else if (db[i] === ')') pairs.push([stack.pop(), i]);
            }

            // Fill stems
            for (const [i, j] of pairs) {
                this.userSequence[i] = open;
                this.userSequence[j] = close;
            }

            // Fill loops with random
            for (let i = 0; i < db.length; i++) {
                if (db[i] === '.') {
                    this.userSequence[i] = BASE_CYCLE[Math.floor(Math.random() * 4)];
                }
            }
        }

        /**
         * Check the user's answer by running Nussinov
         */
        _checkAnswer() {
            const sequence = this.userSequence.join('');
            const predictor = new NussinovPredictor(sequence);
            const result = predictor.predict();

            const ch = this.currentChallenge;
            const targetDB = ch.targetDB ? ch.targetDB.trim() : null;
            const resultArea = this.container.querySelector('#challenge-result');
            const teachArea = this.container.querySelector('#challenge-teach');

            if (ch.id === 'free-design') {
                // Score by number of pairs
                const pairCount = result.pairs.length;
                const maxPossible = Math.floor(ch.length / 2);
                const percentage = Math.round((pairCount / maxPossible) * 100);

                let grade, emoji;
                if (percentage >= 80) { grade = 'Excellent!'; emoji = '🌟'; this._markSolved(ch.id); }
                else if (percentage >= 60) { grade = 'Good!'; emoji = '👍'; }
                else { grade = 'Keep trying!'; emoji = '🤔'; }

                resultArea.innerHTML = `
                    <div class="result-card ${percentage >= 80 ? 'success' : percentage >= 60 ? 'good' : 'retry'}">
                        <div class="result-emoji">${emoji}</div>
                        <div class="result-grade">${grade}</div>
                        <div class="result-detail">
                            Base pairs: <strong>${pairCount}</strong> / ${maxPossible} possible (${percentage}%)
                        </div>
                        <div class="result-structure">
                            Predicted: <code>${result.dotBracket}</code>
                        </div>
                        <div class="result-score">Score: ${result.score}</div>
                    </div>
                `;
            } else {
                // Compare predicted structure to target
                let matchCount = 0;
                for (let i = 0; i < targetDB.length; i++) {
                    if (result.dotBracket[i] === targetDB[i]) matchCount++;
                }
                const matchPct = Math.round((matchCount / targetDB.length) * 100);

                let grade, emoji;
                if (matchPct === 100) { grade = 'Perfect! 🎉'; emoji = '🌟'; this._markSolved(ch.id); }
                else if (matchPct >= 80) { grade = 'Almost there!'; emoji = '👍'; }
                else if (matchPct >= 50) { grade = 'Getting closer...'; emoji = '🤔'; }
                else { grade = 'Keep trying!'; emoji = '💭'; }

                // Color-coded comparison
                let comparisonHtml = '<div class="result-comparison">';
                comparisonHtml += '<div class="comp-row"><span class="comp-label">Target: </span>';
                for (let i = 0; i < targetDB.length; i++) {
                    const match = result.dotBracket[i] === targetDB[i];
                    comparisonHtml += `<span class="comp-char ${match ? 'match' : 'mismatch'}">${targetDB[i]}</span>`;
                }
                comparisonHtml += '</div>';
                comparisonHtml += '<div class="comp-row"><span class="comp-label">Yours:&nbsp; </span>';
                for (let i = 0; i < result.dotBracket.length; i++) {
                    const match = result.dotBracket[i] === targetDB[i];
                    comparisonHtml += `<span class="comp-char ${match ? 'match' : 'mismatch'}">${result.dotBracket[i]}</span>`;
                }
                comparisonHtml += '</div></div>';

                resultArea.innerHTML = `
                    <div class="result-card ${matchPct === 100 ? 'success' : matchPct >= 80 ? 'good' : 'retry'}">
                        <div class="result-emoji">${emoji}</div>
                        <div class="result-grade">${grade}</div>
                        <div class="result-detail">Match: <strong>${matchPct}%</strong> (${matchCount}/${targetDB.length} positions)</div>
                        ${comparisonHtml}
                        <div class="result-score">Nussinov score: ${result.score}</div>
                    </div>
                `;
            }

            // Show teaching moment
            teachArea.innerHTML = `
                <div class="teach-card">
                    <div class="teach-icon">📖</div>
                    <div class="teach-text">${ch.teach}</div>
                </div>
            `;

            // Callback to visualize the predicted structure
            if (this.onStructurePredicted) {
                this.onStructurePredicted(sequence, result.dotBracket);
            }
        }

        /**
         * Show hint
         */
        _showHint() {
            const ch = this.currentChallenge;
            const resultArea = this.container.querySelector('#challenge-result');
            resultArea.innerHTML = `
                <div class="result-card hint">
                    <div class="result-emoji">💡</div>
                    <div class="result-grade">Hint</div>
                    <div class="result-detail">${ch.hint}</div>
                </div>
            `;
        }

        /**
         * Progress persistence
         */
        _markSolved(id) {
            this.solved.add(id);
            try { localStorage.setItem('rna-challenges', JSON.stringify([...this.solved])); } catch (e) {}
        }

        _loadProgress() {
            try {
                const data = localStorage.getItem('rna-challenges');
                return data ? new Set(JSON.parse(data)) : new Set();
            } catch (e) {
                return new Set();
            }
        }
    }

    Challenge.CHALLENGES = CHALLENGES;

    return Challenge;
})();
