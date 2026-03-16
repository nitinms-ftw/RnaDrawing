/**
 * Algorithm Visualization
 * Renders the Nussinov DP matrix as an interactive, animated canvas.
 * Students can watch the matrix fill in step-by-step, see the recurrence
 * relation at each cell, and follow the traceback to the final structure.
 */
window.AlgorithmViz = (function () {

    const MAX_MATRIX_SIZE = 50; // Max sequence length for matrix display

    const COLORS = {
        empty:      '#F8F9FA',
        diagonal:   '#E8E8E8',
        fill:       '#3498DB',   // Blue scale for filled cells
        fillMax:    '#1A237E',   // Dark blue for high scores
        current:    '#F39C12',   // Yellow for current cell
        traceback:  '#E74C3C',   // Red for traceback path
        traceText:  '#FFFFFF',
        pair:       '#2ECC71',   // Green for paired cells in traceback
        header:     '#2C3E50',
        headerText: '#FFFFFF',
        gridLine:   '#DEE2E6',
        text:       '#2C3E50'
    };

    class Viz {
        constructor(containerId) {
            this.container = document.getElementById(containerId);
            this.predictor = null;
            this.canvas = null;
            this.ctx = null;
            this.cellSize = 0;
            this.margin = { top: 40, left: 40 };
            this.animationFrame = null;
            this.currentStep = -1;
            this.isPlaying = false;
            this.speed = 50; // ms per step
            this.filledCells = new Set(); // Track which cells are filled
            this.tracebackCells = new Set();
            this.currentCell = null;
            this._tooltip = null;
            this._hoveredCell = null;
        }

        /**
         * Initialize with a predictor that has already run predict()
         */
        init(predictor) {
            this.predictor = predictor;
            this.currentStep = -1;
            this.isPlaying = false;
            this.filledCells = new Set();
            this.tracebackCells = new Set();
            this.currentCell = null;

            if (predictor.n > MAX_MATRIX_SIZE) {
                this._renderTooLarge();
                return false;
            }

            this._createCanvas();
            this._createTooltip();
            this._drawEmpty();
            return true;
        }

        _renderTooLarge() {
            this.container.innerHTML = `
                <div class="algo-too-large">
                    <div class="algo-too-large-icon">📊</div>
                    <h3>Sequence too long for matrix display</h3>
                    <p>The DP matrix for ${this.predictor.n} bases would be ${this.predictor.n}×${this.predictor.n} = ${(this.predictor.n * this.predictor.n).toLocaleString()} cells.</p>
                    <p>Matrix visualization is available for sequences ≤ ${MAX_MATRIX_SIZE} bases.</p>
                    <div class="algo-result-summary">
                        <div class="algo-result-row">
                            <span>Predicted structure:</span>
                            <code>${this.predictor.dotBracket}</code>
                        </div>
                        <div class="algo-result-row">
                            <span>Optimal score:</span>
                            <strong>${this.predictor.score}</strong>
                        </div>
                        <div class="algo-result-row">
                            <span>Base pairs found:</span>
                            <strong>${this.predictor.pairs.length}</strong>
                        </div>
                    </div>
                </div>
            `;
        }

        _createCanvas() {
            this.container.innerHTML = '';

            const n = this.predictor.n;
            this.cellSize = Math.min(
                Math.floor((this.container.clientWidth - this.margin.left - 20) / (n + 1)),
                Math.floor((this.container.clientHeight - this.margin.top - 100) / (n + 1)),
                24
            );
            this.cellSize = Math.max(this.cellSize, 10);

            const totalW = this.margin.left + n * this.cellSize + 20;
            const totalH = this.margin.top + n * this.cellSize + 20;

            this.canvas = document.createElement('canvas');
            this.canvas.width = totalW * 2;  // 2x for retina
            this.canvas.height = totalH * 2;
            this.canvas.style.width = totalW + 'px';
            this.canvas.style.height = totalH + 'px';
            this.canvas.className = 'algo-canvas';

            this.ctx = this.canvas.getContext('2d');
            this.ctx.scale(2, 2);

            this.container.appendChild(this.canvas);

            // Mouse tracking for tooltips
            this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
            this.canvas.addEventListener('mouseleave', () => this._hideTooltip());
        }

        _createTooltip() {
            if (this._tooltip) this._tooltip.remove();
            this._tooltip = document.createElement('div');
            this._tooltip.className = 'algo-tooltip';
            this._tooltip.style.display = 'none';
            this.container.appendChild(this._tooltip);
        }

        /**
         * Draw the empty matrix grid with headers
         */
        _drawEmpty() {
            const ctx = this.ctx;
            const n = this.predictor.n;
            const cs = this.cellSize;
            const mx = this.margin.left;
            const my = this.margin.top;

            // Clear
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Column headers (j)
            ctx.font = `bold ${Math.min(cs - 2, 11)}px 'JetBrains Mono', monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            for (let j = 0; j < n; j++) {
                const x = mx + j * cs + cs / 2;

                // Base letter
                ctx.fillStyle = this._getBaseColor(this.predictor.sequence[j]);
                ctx.fillRect(mx + j * cs, 0, cs, my - 2);
                ctx.fillStyle = '#FFF';
                ctx.fillText(this.predictor.sequence[j], x, my / 2 - 6);

                // Index
                ctx.fillStyle = COLORS.text;
                ctx.font = `${Math.min(cs - 4, 8)}px 'JetBrains Mono', monospace`;
                ctx.fillText(j + 1, x, my / 2 + 8);
                ctx.font = `bold ${Math.min(cs - 2, 11)}px 'JetBrains Mono', monospace`;
            }

            // Row headers (i)
            for (let i = 0; i < n; i++) {
                const y = my + i * cs + cs / 2;

                ctx.fillStyle = this._getBaseColor(this.predictor.sequence[i]);
                ctx.fillRect(0, my + i * cs, mx - 2, cs);
                ctx.fillStyle = '#FFF';
                ctx.textAlign = 'center';
                ctx.fillText(this.predictor.sequence[i], mx / 2 - 6, y);

                ctx.fillStyle = COLORS.text;
                ctx.font = `${Math.min(cs - 4, 8)}px 'JetBrains Mono', monospace`;
                ctx.fillText(i + 1, mx / 2 + 8, y);
                ctx.font = `bold ${Math.min(cs - 2, 11)}px 'JetBrains Mono', monospace`;
            }

            // Grid cells (draw all as empty)
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    const x = mx + j * cs;
                    const y = my + i * cs;

                    if (j < i) {
                        // Lower triangle - gray out
                        ctx.fillStyle = '#F0F0F0';
                    } else if (j === i) {
                        ctx.fillStyle = COLORS.diagonal;
                    } else {
                        ctx.fillStyle = COLORS.empty;
                    }
                    ctx.fillRect(x, y, cs, cs);
                    ctx.strokeStyle = COLORS.gridLine;
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(x, y, cs, cs);
                }
            }
        }

        /**
         * Draw a single cell with a value
         */
        _drawCell(i, j, value, color, textColor) {
            const ctx = this.ctx;
            const cs = this.cellSize;
            const x = this.margin.left + j * cs;
            const y = this.margin.top + i * cs;

            ctx.fillStyle = color;
            ctx.fillRect(x + 0.5, y + 0.5, cs - 1, cs - 1);

            if (value > 0 && cs >= 14) {
                ctx.fillStyle = textColor || COLORS.text;
                ctx.font = `bold ${Math.min(cs - 4, 10)}px 'JetBrains Mono', monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(value, x + cs / 2, y + cs / 2);
            }
        }

        /**
         * Get color for a score value (0 to maxScore)
         */
        _getScoreColor(value) {
            if (value <= 0) return COLORS.empty;
            const maxScore = this.predictor.getMaxScore() || 1;
            const t = Math.min(value / maxScore, 1);
            // Interpolate from light blue to dark blue
            const r = Math.round(200 - t * 170);
            const g = Math.round(220 - t * 185);
            const b = Math.round(255 - t * 130);
            return `rgb(${r},${g},${b})`;
        }

        _getBaseColor(base) {
            const colors = { 'A': '#E74C3C', 'U': '#3498DB', 'G': '#2ECC71', 'C': '#F1C40F', 'X': '#95A5A6', 'Y': '#9B59B6' };
            return colors[base] || '#95A5A6';
        }

        // ── Animation Controls ────────────────────────────────

        /**
         * Show the complete filled matrix (skip animation)
         */
        showComplete() {
            this.pause();
            this._drawEmpty();
            this.filledCells.clear();

            const steps = this.predictor.fillSteps;
            for (const step of steps) {
                const color = this._getScoreColor(step.value);
                const textColor = step.value > this.predictor.getMaxScore() * 0.5 ? '#FFF' : COLORS.text;
                this._drawCell(step.i, step.j, step.value, color, textColor);
                this.filledCells.add(`${step.i},${step.j}`);
            }

            this.currentStep = steps.length - 1;
            this._highlightTraceback();
        }

        /**
         * Highlight the traceback path on the matrix
         */
        _highlightTraceback() {
            this.tracebackCells.clear();
            for (const step of this.predictor.traceSteps) {
                this.tracebackCells.add(`${step.i},${step.j}`);

                let color = COLORS.traceback;
                let textColor = COLORS.traceText;
                if (step.action === 'pair') {
                    color = COLORS.pair;
                }

                const value = this.predictor.matrix[step.i][step.j];
                this._drawCell(step.i, step.j, value, color, textColor);
            }
        }

        /**
         * Start animation from beginning or current position
         */
        play() {
            if (this.isPlaying) return;
            this.isPlaying = true;

            if (this.currentStep < 0) {
                this._drawEmpty();
                this.filledCells.clear();
            }

            this._animateNext();
        }

        _animateNext() {
            if (!this.isPlaying) return;

            const steps = this.predictor.fillSteps;
            this.currentStep++;

            if (this.currentStep >= steps.length) {
                // Fill complete, show traceback
                this._highlightTraceback();
                this.isPlaying = false;
                this._dispatchEvent('animationComplete');
                return;
            }

            const step = steps[this.currentStep];

            // Draw the cell
            const color = this._getScoreColor(step.value);
            const textColor = step.value > this.predictor.getMaxScore() * 0.5 ? '#FFF' : COLORS.text;

            // Clear previous highlight
            if (this.currentCell) {
                const prev = steps[this.currentStep - 1];
                if (prev) {
                    const pc = this._getScoreColor(prev.value);
                    const ptc = prev.value > this.predictor.getMaxScore() * 0.5 ? '#FFF' : COLORS.text;
                    this._drawCell(prev.i, prev.j, prev.value, pc, ptc);
                }
            }

            // Draw current cell with highlight
            this._drawCell(step.i, step.j, step.value, COLORS.current, COLORS.text);
            this.currentCell = step;
            this.filledCells.add(`${step.i},${step.j}`);

            // Dispatch step event
            this._dispatchEvent('step', step);

            // Schedule next
            this.animationFrame = setTimeout(() => this._animateNext(), this.speed);
        }

        /**
         * Pause animation
         */
        pause() {
            this.isPlaying = false;
            if (this.animationFrame) {
                clearTimeout(this.animationFrame);
                this.animationFrame = null;
            }
        }

        /**
         * Step forward one cell
         */
        stepForward() {
            this.pause();
            const steps = this.predictor.fillSteps;
            if (this.currentStep >= steps.length - 1) {
                this._highlightTraceback();
                return;
            }

            if (this.currentStep < 0) {
                this._drawEmpty();
                this.filledCells.clear();
            }

            this.currentStep++;
            const step = steps[this.currentStep];
            const color = this._getScoreColor(step.value);
            const textColor = step.value > this.predictor.getMaxScore() * 0.5 ? '#FFF' : COLORS.text;

            // Redraw previous current as normal
            if (this.currentStep > 0) {
                const prev = steps[this.currentStep - 1];
                const pc = this._getScoreColor(prev.value);
                const ptc = prev.value > this.predictor.getMaxScore() * 0.5 ? '#FFF' : COLORS.text;
                this._drawCell(prev.i, prev.j, prev.value, pc, ptc);
            }

            this._drawCell(step.i, step.j, step.value, COLORS.current, COLORS.text);
            this.currentCell = step;
            this.filledCells.add(`${step.i},${step.j}`);
            this._dispatchEvent('step', step);
        }

        /**
         * Reset to beginning
         */
        reset() {
            this.pause();
            this.currentStep = -1;
            this.filledCells.clear();
            this.tracebackCells.clear();
            this.currentCell = null;
            this._drawEmpty();
            this._dispatchEvent('reset');
        }

        /**
         * Set animation speed
         */
        setSpeed(ms) {
            this.speed = ms;
        }

        // ── Tooltip / Hover ────────────────────────────────────

        _onMouseMove(e) {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / 2 / rect.width;
            const scaleY = this.canvas.height / 2 / rect.height;

            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;

            const j = Math.floor((mx - this.margin.left) / this.cellSize);
            const i = Math.floor((my - this.margin.top) / this.cellSize);

            if (i >= 0 && i < this.predictor.n && j >= i && j < this.predictor.n) {
                const key = `${i},${j}`;
                if (this._hoveredCell !== key && this.filledCells.has(key)) {
                    this._hoveredCell = key;
                    this._showTooltip(e, i, j);
                }
            } else {
                this._hideTooltip();
            }
        }

        _showTooltip(event, i, j) {
            if (!this._tooltip) return;
            const value = this.predictor.matrix[i][j];
            const step = this.predictor.fillSteps.find(s => s.i === i && s.j === j);

            let html = `<strong>M[${i + 1}][${j + 1}]</strong> = ${value}`;
            html += `<br><span class="algo-tooltip-bases">${this.predictor.sequence[i]}(${i + 1}) → ${this.predictor.sequence[j]}(${j + 1})</span>`;

            if (step) {
                html += `<hr>`;
                html += `<div class="algo-tooltip-explanation">${step.explanation}</div>`;

                if (step.candidates && step.candidates.length > 0) {
                    html += `<div class="algo-tooltip-candidates">`;
                    for (const c of step.candidates) {
                        const isBest = c.value === value;
                        html += `<div class="${isBest ? 'best' : ''}">${isBest ? '→ ' : '&nbsp;&nbsp;'}${c.name}: ${c.value}</div>`;
                    }
                    html += `</div>`;
                }
            }

            this._tooltip.innerHTML = html;
            this._tooltip.style.display = 'block';

            // Position tooltip near mouse
            const containerRect = this.container.getBoundingClientRect();
            let left = event.clientX - containerRect.left + 15;
            let top = event.clientY - containerRect.top - 10;

            // Keep tooltip in bounds
            if (left + 250 > containerRect.width) left = left - 270;
            if (top + 150 > containerRect.height) top = top - 100;

            this._tooltip.style.left = left + 'px';
            this._tooltip.style.top = top + 'px';
        }

        _hideTooltip() {
            this._hoveredCell = null;
            if (this._tooltip) this._tooltip.style.display = 'none';
        }

        _dispatchEvent(name, detail) {
            this.container.dispatchEvent(new CustomEvent('algoviz:' + name, { detail }));
        }

        destroy() {
            this.pause();
            this.container.innerHTML = '';
        }
    }

    Viz.MAX_MATRIX_SIZE = MAX_MATRIX_SIZE;

    return Viz;
})();
