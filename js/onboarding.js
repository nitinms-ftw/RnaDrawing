/**
 * Onboarding Guide
 * Multi-step walkthrough for first-time users.
 * Explains RNA basics + how to use each feature.
 * Shows once, remembers via localStorage.
 */
window.Onboarding = (function () {

    const STORAGE_KEY = 'rna-playground-onboarded';

    const STEPS = [
        {
            icon: '🧬',
            title: 'Welcome to RNA Playground!',
            body: `
                <p>This tool helps you <strong>understand RNA secondary structure</strong> — how RNA molecules fold by forming base pairs.</p>
                <p>Whether you're a biology student, a bioinformatics learner, or just curious — this guide will walk you through everything.</p>
                <div class="onboard-highlight">
                    <strong>No installation. No login. Everything runs in your browser.</strong>
                </div>
            `,
            visual: `
                <div class="onboard-visual-rna">
                    <span class="onboard-base a">A</span><span class="onboard-bond">─</span><span class="onboard-base u">U</span>
                    &nbsp;&nbsp;
                    <span class="onboard-base g">G</span><span class="onboard-bond">═</span><span class="onboard-base c">C</span>
                    &nbsp;&nbsp;
                    <span class="onboard-base g">G</span><span class="onboard-bond">~</span><span class="onboard-base u">U</span>
                </div>
                <div class="onboard-visual-caption">A pairs with U · G pairs with C · G wobbles with U</div>
            `
        },
        {
            icon: '🔤',
            title: 'What is RNA?',
            body: `
                <p>RNA is a molecule made of 4 building blocks called <strong>nucleotides</strong>:</p>
                <div class="onboard-bases-grid">
                    <div class="onboard-base-card a"><span class="big">A</span><span>Adenine</span></div>
                    <div class="onboard-base-card u"><span class="big">U</span><span>Uracil</span></div>
                    <div class="onboard-base-card g"><span class="big">G</span><span>Guanine</span></div>
                    <div class="onboard-base-card c"><span class="big">C</span><span>Cytosine</span></div>
                </div>
                <p>RNA folds back on itself when bases form <strong>pairs</strong>: A pairs with U, and G pairs with C. The pattern of these pairs is called <strong>secondary structure</strong>.</p>
            `,
        },
        {
            icon: '🧮',
            title: 'What is Dot-Bracket Notation?',
            body: `
                <p>Scientists write RNA structure as a string of <strong>dots and parentheses</strong>:</p>
                <div class="onboard-notation-example">
                    <div class="onboard-notation-row">
                        <span class="label">Sequence:</span>
                        <span class="bases"><span class="a">G</span><span class="g">G</span><span class="a">C</span><span class="u">A</span><span class="u">U</span><span class="u">U</span><span class="c">G</span><span class="c">C</span><span class="c">C</span></span>
                    </div>
                    <div class="onboard-notation-row">
                        <span class="label">Structure:</span>
                        <span class="structure">( ( ( . . . ) ) )</span>
                    </div>
                </div>
                <ul class="onboard-list">
                    <li><code>(</code> — this base pairs with a matching <code>)</code></li>
                    <li><code>)</code> — closes a pair opened by <code>(</code></li>
                    <li><code>.</code> — unpaired (in a loop)</li>
                </ul>
                <p>So <code>(((...)))</code> means bases 1-3 pair with bases 7-9, and bases 4-6 are in a loop. This forms a <strong>hairpin</strong>!</p>
            `,
        },
        {
            icon: '🔮',
            title: 'Predict Structure',
            body: `
                <p>The <strong>Predict</strong> button is the star feature:</p>
                <ol class="onboard-list">
                    <li>Type an RNA sequence (like <code>GGCGCAUUUUGCGCC</code>)</li>
                    <li>Click <strong class="purple">🔮 Predict</strong></li>
                    <li>The <strong>Nussinov algorithm</strong> figures out the best structure</li>
                    <li>You see the structure as a colorful, interactive graph</li>
                </ol>
                <div class="onboard-highlight">
                    This runs <strong>entirely in your browser</strong> — no server needed. You're running a real bioinformatics algorithm right here!
                </div>
            `,
            pointer: '#predict-btn'
        },
        {
            icon: '📖',
            title: 'Watch the Algorithm Work',
            body: `
                <p>Click the <strong>📖 Algorithm</strong> tab to see <em>how</em> the prediction works:</p>
                <ul class="onboard-list">
                    <li>A <strong>matrix</strong> fills in step-by-step</li>
                    <li>Each cell shows the best score for a subsequence</li>
                    <li><strong>Hover</strong> any cell to see why it got that value</li>
                    <li>Watch the <strong>traceback</strong> highlight the final structure</li>
                </ul>
                <p>This is the <strong>Nussinov dynamic programming algorithm</strong> — the same one taught in every computational biology course.</p>
            `,
            pointer: '[data-tab="algorithm"]'
        },
        {
            icon: '🎮',
            title: 'Challenge Mode',
            body: `
                <p>Click the <strong>🎮 Challenge</strong> tab to test your understanding:</p>
                <ul class="onboard-list">
                    <li>You're given a <strong>target structure</strong> (dot-bracket)</li>
                    <li>You <strong>design the sequence</strong> — pick A, U, G, or C for each position</li>
                    <li>Click <strong>Fold & Check</strong> — the algorithm predicts what your sequence actually folds into</li>
                    <li>If your prediction matches the target → you win! 🌟</li>
                </ul>
                <p>Start with "Tiny Hairpin" and work your way up. Can you beat all 7 challenges?</p>
            `,
            pointer: '[data-tab="challenge"]'
        },
        {
            icon: '🔗',
            title: 'Bond Mode & Other Tools',
            body: `
                <p>More things you can do:</p>
                <ul class="onboard-list">
                    <li><strong>🔗 Bond Mode</strong> — Click two bases to manually pair them. Great for exploring "what if I pair these?"</li>
                    <li><strong>Drag</strong> any node to rearrange the layout</li>
                    <li><strong>Scroll</strong> to zoom in/out</li>
                    <li><strong>Color schemes</strong> — Switch between coloring by base type, position, or paired/unpaired</li>
                    <li><strong>Export</strong> — Download your structure as SVG or PNG for assignments</li>
                </ul>
                <div class="onboard-shortcuts">
                    <span><kbd>B</kbd> Bond mode</span>
                    <span><kbd>+</kbd><kbd>−</kbd> Zoom</span>
                    <span><kbd>Ctrl+Z</kbd> Undo</span>
                </div>
            `,
        },
        {
            icon: '🚀',
            title: 'You\'re Ready!',
            body: `
                <p>Here's how to get started right now:</p>
                <ol class="onboard-list">
                    <li>Try the <strong>Hairpin</strong> example (already loaded)</li>
                    <li>Click <strong class="purple">🔮 Predict</strong> to see it fold</li>
                    <li>Switch to <strong>📖 Algorithm</strong> tab and press Play</li>
                    <li>Try a <strong>🎮 Challenge</strong> when you're ready</li>
                </ol>
                <div class="onboard-highlight">
                    You can reopen this guide anytime from the <strong>❓ Help</strong> button in the header.
                </div>
            `,
        }
    ];

    class OnboardingGuide {
        constructor() {
            this.currentStep = 0;
            this.overlay = null;
            this.isOpen = false;
        }

        /**
         * Show onboarding if first visit
         */
        showIfFirstVisit() {
            try {
                if (localStorage.getItem(STORAGE_KEY)) return;
            } catch (e) {}
            this.show();
        }

        /**
         * Force show (from Help button)
         */
        show() {
            this.currentStep = 0;
            this._createOverlay();
            this._renderStep();
            this.isOpen = true;
        }

        _createOverlay() {
            // Remove existing
            if (this.overlay) this.overlay.remove();

            this.overlay = document.createElement('div');
            this.overlay.className = 'onboard-overlay';
            this.overlay.innerHTML = `
                <div class="onboard-modal">
                    <div class="onboard-progress" id="onboard-progress"></div>
                    <div class="onboard-content" id="onboard-content"></div>
                    <div class="onboard-footer">
                        <div class="onboard-footer-left">
                            <label class="onboard-dismiss-label" id="onboard-dismiss-wrap" style="display:none">
                                <input type="checkbox" id="onboard-dismiss-check"> Don't show again
                            </label>
                        </div>
                        <div class="onboard-footer-right">
                            <button class="btn btn-outline btn-sm" id="onboard-skip-btn">Skip</button>
                            <button class="btn btn-outline btn-sm" id="onboard-prev-btn">← Back</button>
                            <button class="btn btn-primary btn-sm" id="onboard-next-btn">Next →</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(this.overlay);

            // Bind buttons
            this.overlay.querySelector('#onboard-next-btn').addEventListener('click', () => this._next());
            this.overlay.querySelector('#onboard-prev-btn').addEventListener('click', () => this._prev());
            this.overlay.querySelector('#onboard-skip-btn').addEventListener('click', () => this._close());

            // Close on overlay click (outside modal)
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this._close();
            });

            // ESC to close
            this._escHandler = (e) => { if (e.key === 'Escape') this._close(); };
            document.addEventListener('keydown', this._escHandler);
        }

        _renderStep() {
            const step = STEPS[this.currentStep];
            const total = STEPS.length;
            const isFirst = this.currentStep === 0;
            const isLast = this.currentStep === total - 1;

            // Progress dots
            const progressEl = this.overlay.querySelector('#onboard-progress');
            let dots = '';
            for (let i = 0; i < total; i++) {
                dots += `<span class="onboard-dot ${i === this.currentStep ? 'active' : ''} ${i < this.currentStep ? 'done' : ''}"></span>`;
            }
            progressEl.innerHTML = dots;

            // Content
            const contentEl = this.overlay.querySelector('#onboard-content');
            contentEl.innerHTML = `
                <div class="onboard-icon">${step.icon}</div>
                <h2 class="onboard-title">${step.title}</h2>
                <div class="onboard-body">${step.body}</div>
                ${step.visual ? `<div class="onboard-visual">${step.visual}</div>` : ''}
            `;

            // Buttons
            this.overlay.querySelector('#onboard-prev-btn').style.display = isFirst ? 'none' : '';
            this.overlay.querySelector('#onboard-next-btn').textContent = isLast ? 'Get Started! 🚀' : 'Next →';
            this.overlay.querySelector('#onboard-skip-btn').style.display = isLast ? 'none' : '';
            this.overlay.querySelector('#onboard-dismiss-wrap').style.display = isLast ? 'flex' : 'none';
        }

        _next() {
            if (this.currentStep < STEPS.length - 1) {
                this.currentStep++;
                this._renderStep();
            } else {
                this._close();
            }
        }

        _prev() {
            if (this.currentStep > 0) {
                this.currentStep--;
                this._renderStep();
            }
        }

        _close() {
            // Check "don't show again"
            const checkbox = this.overlay.querySelector('#onboard-dismiss-check');
            if (checkbox && checkbox.checked) {
                try { localStorage.setItem(STORAGE_KEY, 'true'); } catch (e) {}
            }
            // Also mark as seen on first close (they completed or skipped)
            try { localStorage.setItem(STORAGE_KEY, 'true'); } catch (e) {}

            this.overlay.classList.add('closing');
            setTimeout(() => {
                this.overlay.remove();
                this.overlay = null;
                this.isOpen = false;
            }, 200);

            document.removeEventListener('keydown', this._escHandler);
        }
    }

    return OnboardingGuide;
})();
