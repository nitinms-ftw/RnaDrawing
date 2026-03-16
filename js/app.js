/**
 * RNA Playground — Main Application
 * Integrates: Model + Renderer + Nussinov Predictor + Algorithm Viz + Challenges
 */
(function () {
    'use strict';

    // ── Examples ─────────────────────────────────────────────────
    const EXAMPLES = {
        hairpin: {
            name: 'Simple Hairpin', sequence: 'GGCGCAUUUUGCGCCAAAAA', dotBracket: '(((((.....))))).....', 
        },
        twoStems: {
            name: 'Two Hairpins', sequence: 'GCGCAUUUGCGCGCGCAUUUGCGCAAAAAA', dotBracket: '((((....))))((((....))))......',
        },
        internalLoop: {
            name: 'Internal Loop', sequence: 'GCAUAAAGGCUAUUUUAGCCAAAAUGC', dotBracket: '((((...((((.....))))...))))',
        },
        pseudoFree: {
            name: 'Free Sequence', sequence: 'AUGCGAUUCCGAAUCGCAUUAGCUA', dotBracket: '',
        }
    };

    // ── State ────────────────────────────────────────────────────
    let model = new RNAModel();
    let renderer = null;
    let predictor = null;
    let algoViz = null;
    let challengeMode = null;
    let onboarding = null;
    let bondMode = false;
    let bondFirstNode = null;
    let undoStack = [];
    let redoStack = [];

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);
    const dom = {};

    // ── Init ─────────────────────────────────────────────────────
    function init() {
        cacheDom();
        bindEvents();
        initAlgoViz();
        initChallenge();
        loadExample('hairpin');

        // Onboarding — show on first visit
        onboarding = new Onboarding();
        onboarding.showIfFirstVisit();
    }

    function cacheDom() {
        dom.seqInput = $('#sequence-input');
        dom.structInput = $('#structure-input');
        dom.visualizeBtn = $('#visualize-btn');
        dom.predictBtn = $('#predict-btn');
        dom.bondModeBtn = $('#bond-mode-btn');
        dom.undoBtn = $('#undo-btn');
        dom.redoBtn = $('#redo-btn');
        dom.validateBtn = $('#validate-btn');
        dom.exportSvgBtn = $('#export-svg-btn');
        dom.exportPngBtn = $('#export-png-btn');
        dom.zoomInBtn = $('#zoom-in-btn');
        dom.zoomOutBtn = $('#zoom-out-btn');
        dom.zoomResetBtn = $('#zoom-reset-btn');
        dom.colorScheme = $('#color-scheme');
        dom.canvas = $('#rna-canvas');
        dom.stats = $('#stats-panel');
        dom.dotBracket = $('#dotbracket-display');
        dom.validation = $('#validation-panel');
        dom.messageBar = $('#message-bar');
        dom.inputError = $('#input-error');
        dom.bondStatus = $('#bond-status');
        dom.legend = $('#legend-panel');
        dom.energyPanel = $('#energy-panel');
        dom.energyWrapper = $('#energy-panel-wrapper');

        // Algorithm tab
        dom.algoPlayBtn = $('#algo-play-btn');
        dom.algoPauseBtn = $('#algo-pause-btn');
        dom.algoStepBtn = $('#algo-step-btn');
        dom.algoSkipBtn = $('#algo-skip-btn');
        dom.algoResetBtn = $('#algo-reset-btn');
        dom.algoSpeedSlider = $('#algo-speed-slider');
        dom.algoSpeedLabel = $('#algo-speed-label');
        dom.algoInfoBar = $('#algo-info-bar');
        dom.algoStepDetail = $('#algo-step-detail');
        dom.algoMatrixContainer = $('#algo-matrix-container');
    }

    function bindEvents() {
        dom.visualizeBtn.addEventListener('click', handleVisualize);
        dom.predictBtn.addEventListener('click', handlePredict);
        dom.bondModeBtn.addEventListener('click', toggleBondMode);
        dom.undoBtn.addEventListener('click', undo);
        dom.redoBtn.addEventListener('click', redo);
        dom.validateBtn.addEventListener('click', () => updateValidation());
        dom.exportSvgBtn.addEventListener('click', exportSVG);
        dom.exportPngBtn.addEventListener('click', exportPNG);
        dom.zoomInBtn.addEventListener('click', () => renderer && renderer.zoomIn());
        dom.zoomOutBtn.addEventListener('click', () => renderer && renderer.zoomOut());
        dom.zoomResetBtn.addEventListener('click', () => renderer && renderer.resetZoom());
        dom.colorScheme.addEventListener('change', () => renderer && renderer.setColorScheme(dom.colorScheme.value));

        $$('.example-btn').forEach(btn => btn.addEventListener('click', () => loadExample(btn.dataset.example)));
        $$('.canvas-tab').forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

        // Algorithm controls
        dom.algoPlayBtn.addEventListener('click', () => algoViz && algoViz.play());
        dom.algoPauseBtn.addEventListener('click', () => algoViz && algoViz.pause());
        dom.algoStepBtn.addEventListener('click', () => algoViz && algoViz.stepForward());
        dom.algoSkipBtn.addEventListener('click', () => algoViz && algoViz.showComplete());
        dom.algoResetBtn.addEventListener('click', () => algoViz && algoViz.reset());
        dom.algoSpeedSlider.addEventListener('input', () => {
            const v = dom.algoSpeedSlider.value;
            dom.algoSpeedLabel.textContent = v + 'ms';
            if (algoViz) algoViz.setSpeed(parseInt(v));
        });

        dom.seqInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handlePredict(); } });
        dom.structInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleVisualize(); } });
        dom.seqInput.addEventListener('input', liveValidate);
        dom.structInput.addEventListener('input', liveValidate);
        document.addEventListener('keydown', handleKeyboard);

        // Help button reopens onboarding
        document.getElementById('help-btn').addEventListener('click', () => {
            if (onboarding) onboarding.show();
        });
    }

    // ── Tab Switching ────────────────────────────────────────────
    function switchTab(tabName) {
        $$('.canvas-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        $$('.tab-content').forEach(tc => tc.classList.toggle('active', tc.id === 'tab-' + tabName));
    }

    // ── Load Example ─────────────────────────────────────────────
    function loadExample(name) {
        const ex = EXAMPLES[name];
        if (!ex) return;
        dom.seqInput.value = ex.sequence;
        dom.structInput.value = ex.dotBracket;
        dom.inputError.textContent = '';
        dom.inputError.classList.remove('visible');
        $$('.example-btn').forEach(b => b.classList.toggle('active', b.dataset.example === name));
        msg(`Loaded: ${ex.name}`, 'info');
        handleVisualize();
    }

    // ── Predict (Nussinov) ───────────────────────────────────────
    function handlePredict() {
        const seq = dom.seqInput.value.trim().toUpperCase();
        const err = validateSeqOnly(seq);
        if (err) { showError(err); return; }
        clearError();

        // Run Nussinov
        const t0 = performance.now();
        predictor = new NussinovPredictor(seq);
        const result = predictor.predict();
        const ms = (performance.now() - t0).toFixed(1);

        // Fill structure input with predicted dot-bracket
        dom.structInput.value = result.dotBracket;
        msg(`🔮 Predicted in ${ms}ms — Score: ${result.score}, Pairs: ${result.pairs.length}, Energy: ${result.energy.total} kcal/mol`, 'success');

        // Visualize the prediction
        buildAndRender(seq, result.dotBracket);

        // Update energy panel
        updateEnergy(result.energy);

        // Setup algorithm visualization
        setupAlgoViz();

        // Switch to structure tab
        switchTab('structure');
    }

    // ── Visualize (manual) ───────────────────────────────────────
    function handleVisualize() {
        const seq = dom.seqInput.value.trim().toUpperCase();
        const db = dom.structInput.value.trim();
        const err = validateInput(seq, db);
        if (err) { showError(err); return; }
        clearError();

        buildAndRender(seq, db);

        // If we have a sequence, also run predictor in background for algo viz
        if (seq.length >= 5 && seq.length <= 200) {
            predictor = new NussinovPredictor(seq);
            predictor.predict();
            setupAlgoViz();
        }

        msg('Structure visualized! Drag nodes to rearrange.', 'success');
        switchTab('structure');
    }

    // ── Build Model & Render ─────────────────────────────────────
    function buildAndRender(seq, db) {
        bondMode = false;
        bondFirstNode = null;
        dom.bondModeBtn.classList.remove('active');
        dom.bondStatus.textContent = '';
        undoStack = [];
        redoStack = [];
        updateUndoRedo();

        try {
            model = new RNAModel();
            model.setFromInput(seq, db);
        } catch (e) {
            showError(e.message);
            return;
        }

        if (renderer) renderer.destroy();
        renderer = new RNARenderer('rna-canvas', model);
        renderer.setColorScheme(dom.colorScheme.value);
        renderer.onNodeClick(handleNodeClick);
        renderer.render();

        updateStats();
        updateDotBracket();
        updateValidation();
        updateLegend();
    }

    // ── Algorithm Visualization Setup ────────────────────────────
    function initAlgoViz() {
        algoViz = new AlgorithmViz('algo-matrix-container');

        dom.algoMatrixContainer.addEventListener('algoviz:step', (e) => {
            const step = e.detail;
            dom.algoStepDetail.textContent = step.explanation;
            const total = predictor ? predictor.fillSteps.length : 0;
            const current = algoViz.currentStep + 1;
            dom.algoInfoBar.innerHTML = `Step <strong>${current}</strong> / ${total} · Span: ${step.span} · Cell (${step.i + 1}, ${step.j + 1}) = <strong>${step.value}</strong>`;
        });

        dom.algoMatrixContainer.addEventListener('algoviz:animationComplete', () => {
            dom.algoInfoBar.innerHTML = `✓ Complete! Score: <strong>${predictor.score}</strong> · Pairs: <strong>${predictor.pairs.length}</strong> · <span style="color:var(--success)">Traceback shown in green/red</span>`;
            dom.algoStepDetail.textContent = 'Traceback complete. Green = paired bases. Red = traceback path. Hover cells for details.';
        });

        dom.algoMatrixContainer.addEventListener('algoviz:reset', () => {
            dom.algoInfoBar.innerHTML = '<span class="muted">Ready. Click Play or Step to begin.</span>';
            dom.algoStepDetail.textContent = '';
        });
    }

    function setupAlgoViz() {
        if (!predictor || !algoViz) return;
        const ok = algoViz.init(predictor);
        if (ok) {
            dom.algoInfoBar.innerHTML = `Matrix: ${predictor.n}×${predictor.n} · ${predictor.fillSteps.length} steps · <span class="muted">Click Play to animate</span>`;
            dom.algoStepDetail.textContent = '';
        } else {
            dom.algoInfoBar.innerHTML = `Sequence too long for matrix display (${predictor.n} > ${AlgorithmViz.MAX_MATRIX_SIZE})`;
        }
    }

    // ── Challenge Mode ───────────────────────────────────────────
    function initChallenge() {
        challengeMode = new ChallengeMode('challenge-container');
        challengeMode.onStructurePredicted = (seq, db) => {
            dom.seqInput.value = seq;
            dom.structInput.value = db;
            buildAndRender(seq, db);
        };
        challengeMode.renderList();
    }

    // ── Energy Panel ─────────────────────────────────────────────
    function updateEnergy(energy) {
        if (!energy || energy.pairCount === 0) {
            dom.energyWrapper.style.display = 'none';
            return;
        }
        dom.energyWrapper.style.display = '';

        const favorable = energy.total < 0;
        let html = `<div class="energy-total ${favorable ? 'favorable' : 'unfavorable'}">${energy.total > 0 ? '+' : ''}${energy.total} kcal/mol</div>`;
        html += `<div class="energy-breakdown">`;

        for (const item of energy.breakdown.slice(0, 12)) { // Show first 12
            const isNeg = item.energy < 0;
            html += `<div class="energy-row">
                <span class="e-desc">${item.description}</span>
            </div>`;
        }
        if (energy.breakdown.length > 12) {
            html += `<div class="energy-row"><span class="muted">...and ${energy.breakdown.length - 12} more</span></div>`;
        }
        html += '</div>';
        dom.energyPanel.innerHTML = html;
    }

    // ── Bond Mode ────────────────────────────────────────────────
    function toggleBondMode() {
        bondMode = !bondMode;
        bondFirstNode = null;
        dom.bondModeBtn.classList.toggle('active', bondMode);
        if (renderer) renderer.clearHighlights();
        dom.bondStatus.textContent = bondMode ? 'Click a nucleotide to start pairing...' : '';
        dom.bondStatus.className = bondMode ? 'bond-status info' : 'bond-status';
        msg(bondMode ? 'Bond Mode ON — Click two nucleotides to pair' : 'Bond Mode OFF', 'info');
    }

    function handleNodeClick(node) {
        if (!bondMode || !node) return;
        if (bondFirstNode === null) {
            bondFirstNode = node;
            renderer.highlightNode(node.index);
            dom.bondStatus.textContent = `Selected ${node.base}(${node.index + 1}). Click another to pair.`;
            dom.bondStatus.className = 'bond-status info';
        } else if (bondFirstNode.index === node.index) {
            bondFirstNode = null;
            renderer.clearHighlights();
            dom.bondStatus.textContent = 'Cleared. Click a nucleotide.';
            dom.bondStatus.className = 'bond-status info';
        } else {
            renderer.highlightNode(node.index);
            pushUndo();
            const result = model.addBasePair(bondFirstNode.index, node.index);
            if (result.success) {
                dom.bondStatus.textContent = `✓ ${result.message} [${result.pairType}]`;
                dom.bondStatus.className = 'bond-status success';
                renderer.reheat();
                renderer.onNodeClick(handleNodeClick);
                updateStats(); updateDotBracket(); updateValidation();
            } else {
                undoStack.pop();
                dom.bondStatus.textContent = `✗ ${result.message}`;
                dom.bondStatus.className = 'bond-status error';
            }
            bondFirstNode = null;
            renderer.clearHighlights();
        }
    }

    // ── Undo / Redo ──────────────────────────────────────────────
    function pushUndo() { undoStack.push(model.clone()); if (undoStack.length > 50) undoStack.shift(); redoStack = []; updateUndoRedo(); }
    function undo() {
        if (!undoStack.length) return;
        redoStack.push(model.clone());
        model.restoreFrom(undoStack.pop());
        renderer.reheat(); renderer.onNodeClick(handleNodeClick);
        updateStats(); updateDotBracket(); updateValidation(); updateUndoRedo();
    }
    function redo() {
        if (!redoStack.length) return;
        undoStack.push(model.clone());
        model.restoreFrom(redoStack.pop());
        renderer.reheat(); renderer.onNodeClick(handleNodeClick);
        updateStats(); updateDotBracket(); updateValidation(); updateUndoRedo();
    }
    function updateUndoRedo() {
        dom.undoBtn.disabled = !undoStack.length;
        dom.redoBtn.disabled = !redoStack.length;
    }

    // ── Validation ───────────────────────────────────────────────
    function validateSeqOnly(seq) {
        if (!seq) return 'Enter an RNA sequence';
        if (seq.length < 5) return 'Sequence must be ≥ 5 nucleotides';
        if (seq.length > 500) return 'Sequence must be ≤ 500 nucleotides';
        if (!/^[ACGUXYT]+$/.test(seq)) return 'Only A, C, G, U, X, Y, T allowed';
        return null;
    }

    function validateInput(seq, db) {
        const seqErr = validateSeqOnly(seq ? seq.toUpperCase() : '');
        if (seqErr) return seqErr;
        if (db) {
            if (db.length !== seq.length) return `Structure length (${db.length}) ≠ sequence length (${seq.length})`;
            if (!/^[.()]+$/.test(db)) return 'Structure: only . ( ) allowed';
            let d = 0;
            for (let i = 0; i < db.length; i++) {
                if (db[i] === '(') d++; else if (db[i] === ')') d--;
                if (d < 0) return `Unmatched ) at position ${i + 1}`;
            }
            if (d !== 0) return `${d} unmatched (`;
        }
        return null;
    }

    function liveValidate() {
        const seq = dom.seqInput.value.trim().toUpperCase();
        const db = dom.structInput.value.trim();
        const err = validateInput(seq, db);
        if (err && (seq.length > 0 || db.length > 0)) showError(err); else clearError();
    }

    function showError(msg) { dom.inputError.textContent = msg; dom.inputError.classList.add('visible'); }
    function clearError() { dom.inputError.textContent = ''; dom.inputError.classList.remove('visible'); }

    // ── Panel Updates ────────────────────────────────────────────
    function updateStats() {
        const s = model.getStats();
        if (!s) { dom.stats.innerHTML = '<p class="muted">No sequence</p>'; return; }
        dom.stats.innerHTML = `
            <div class="stat-row"><span class="stat-label">Length</span><span class="stat-value">${s.length} nt</span></div>
            <div class="stat-row"><span class="stat-label">GC Content</span><span class="stat-value">${s.gcContent}%</span></div>
            <div class="stat-row"><span class="stat-label">Base Pairs</span><span class="stat-value">${s.pairCount}</span></div>
            <div class="stat-row"><span class="stat-label">Paired</span><span class="stat-value">${s.pairedPercent}%</span></div>
            <div class="stat-row"><span class="stat-label">W-C</span><span class="stat-value wc">${s.wcPairs}</span></div>
            <div class="stat-row"><span class="stat-label">Wobble</span><span class="stat-value wobble">${s.wobblePairs}</span></div>
            <div class="stat-row"><span class="stat-label">Non-canonical</span><span class="stat-value nc">${s.ncPairs}</span></div>
            <div class="stat-row base-counts">
                <span class="base-chip a">A:${s.baseCounts.A}</span>
                <span class="base-chip u">U:${s.baseCounts.U}</span>
                <span class="base-chip g">G:${s.baseCounts.G}</span>
                <span class="base-chip c">C:${s.baseCounts.C}</span>
            </div>`;
    }

    function updateDotBracket() {
        const db = model.getDotBracket();
        if (!db) { dom.dotBracket.innerHTML = '<p class="muted">No structure</p>'; return; }
        let h = '<div class="db-sequence">';
        for (let i = 0; i < model.sequence.length; i++) {
            const c = RNAModel.BASE_COLORS[model.sequence[i]] || '#95A5A6';
            h += `<span style="color:${c}">${model.sequence[i]}</span>`;
        }
        h += '</div><div class="db-structure">';
        for (let i = 0; i < db.length; i++) h += `<span>${db[i]}</span>`;
        h += '</div>';
        dom.dotBracket.innerHTML = h;
    }

    function updateValidation() {
        const issues = model.validateStructure();
        let h = '';
        for (const iss of issues) {
            const icon = iss.type === 'success' ? '✓' : iss.type === 'error' ? '✗' : iss.type === 'warning' ? '⚠' : 'ℹ';
            h += `<div class="validation-item ${iss.type}"><span class="v-icon">${icon}</span><span>${iss.message}</span></div>`;
        }
        dom.validation.innerHTML = h;
    }

    function updateLegend() {
        dom.legend.innerHTML = `
            <div class="legend-section"><div class="legend-title">Bases</div><div class="legend-items">
                <span class="legend-item"><span class="legend-dot" style="background:#E74C3C"></span>A (Adenine)</span>
                <span class="legend-item"><span class="legend-dot" style="background:#3498DB"></span>U (Uracil)</span>
                <span class="legend-item"><span class="legend-dot" style="background:#2ECC71"></span>G (Guanine)</span>
                <span class="legend-item"><span class="legend-dot" style="background:#F1C40F"></span>C (Cytosine)</span>
            </div></div>
            <div class="legend-section"><div class="legend-title">Bonds</div><div class="legend-items">
                <span class="legend-item"><span class="legend-line wc"></span>Watson-Crick</span>
                <span class="legend-item"><span class="legend-line wobble"></span>Wobble (G-U)</span>
                <span class="legend-item"><span class="legend-line nc"></span>Non-canonical</span>
                <span class="legend-item"><span class="legend-line backbone"></span>Backbone</span>
            </div></div>`;
    }

    // ── Export ────────────────────────────────────────────────────
    function exportSVG() {
        if (!renderer) return;
        const blob = new Blob([renderer.exportSVG()], { type: 'image/svg+xml' });
        const a = document.createElement('a'); a.download = 'rna-structure.svg'; a.href = URL.createObjectURL(blob); a.click();
        msg('Exported SVG', 'success');
    }
    function exportPNG() {
        if (!renderer) return;
        renderer.exportPNG(2).then(url => { const a = document.createElement('a'); a.download = 'rna-structure.png'; a.href = url; a.click(); });
        msg('Exported PNG', 'success');
    }

    // ── Keyboard ─────────────────────────────────────────────────
    function handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
        if (e.key === 'b' || e.key === 'B') toggleBondMode();
        if (e.key === '+' || e.key === '=') renderer && renderer.zoomIn();
        if (e.key === '-') renderer && renderer.zoomOut();
        if (e.key === '0') renderer && renderer.resetZoom();
    }

    // ── Messages ─────────────────────────────────────────────────
    function msg(text, type) {
        dom.messageBar.textContent = text;
        dom.messageBar.className = `message-bar ${type || ''}`;
        clearTimeout(dom.messageBar._t);
        dom.messageBar._t = setTimeout(() => { dom.messageBar.className = 'message-bar'; }, 5000);
    }

    // ── Boot ─────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', init);
})();
