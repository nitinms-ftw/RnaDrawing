/**
 * RNA Renderer
 * D3 v7 force-directed graph renderer for RNA secondary structures.
 * Handles SVG rendering, force simulation, zoom/pan, drag, tooltips, and export.
 */
window.RNARenderer = (function () {

    const DEFAULTS = {
        backboneDistance: 28,
        backboneStrength: 1.0,
        basepairDistance: 60,
        basepairStrength: 0.4,
        chargeStrength: -180,
        collisionRadius: 14,
        nodeRadius: 12,
        fontSize: 11,
        backboneColor: '#BDC3C7',
        backboneWidth: 2,
        basepairWidth: 2.5
    };

    class Renderer {
        constructor(containerId, model) {
            this.container = document.getElementById(containerId);
            this.model = model;
            this.simulation = null;
            this.svg = null;
            this.g = null; // main group (for zoom/pan)
            this.colorScheme = 'base'; // 'base', 'position', 'structure'
            this.onNodeClickCallback = null;
            this.highlightedNodes = new Set();
            this._width = 0;
            this._height = 0;
            this._init();
        }

        _init() {
            // Clear container
            this.container.innerHTML = '';

            this._width = this.container.clientWidth;
            this._height = this.container.clientHeight;

            this.svg = d3.select(this.container)
                .append('svg')
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('viewBox', `0 0 ${this._width} ${this._height}`)
                .attr('class', 'rna-svg');

            // Defs for arrowheads, filters, etc.
            const defs = this.svg.append('defs');
            defs.append('filter')
                .attr('id', 'glow')
                .append('feGaussianBlur')
                .attr('stdDeviation', '3')
                .attr('result', 'coloredBlur');

            // Background rect for click-to-deselect
            this.svg.append('rect')
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('fill', 'transparent')
                .on('click', () => {
                    this.clearHighlights();
                    if (this.onNodeClickCallback) {
                        this.onNodeClickCallback(null);
                    }
                });

            // Main group for zoom/pan
            this.g = this.svg.append('g').attr('class', 'rna-main-group');

            // Layer ordering: basepairs → backbone → nodes
            this.g.append('g').attr('class', 'layer-basepairs');
            this.g.append('g').attr('class', 'layer-backbone');
            this.g.append('g').attr('class', 'layer-nodes');

            // Tooltip
            this.tooltip = d3.select(this.container)
                .append('div')
                .attr('class', 'rna-tooltip')
                .style('opacity', 0);

            // Zoom behavior
            const zoom = d3.zoom()
                .scaleExtent([0.1, 10])
                .on('zoom', (event) => {
                    this.g.attr('transform', event.transform);
                });

            this.svg.call(zoom);
            this._zoom = zoom;
        }

        /**
         * Apply initial layout (circular) and start force simulation
         */
        render() {
            this._applyCircularLayout();
            this._buildSimulation();
            this._drawAll();
        }

        /**
         * Circular initial layout
         */
        _applyCircularLayout() {
            const cx = this._width / 2;
            const cy = this._height / 2;
            const n = this.model.nodes.length;
            const radius = Math.min(this._width, this._height) * 0.35;

            this.model.nodes.forEach((node, i) => {
                const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
                node.x = cx + radius * Math.cos(angle);
                node.y = cy + radius * Math.sin(angle);
            });
        }

        /**
         * Build D3 force simulation
         */
        _buildSimulation() {
            if (this.simulation) this.simulation.stop();

            // Clone links with node references for D3
            const backboneLinks = this.model.backboneLinks.map(l => ({
                source: l.source,
                target: l.target,
                type: 'backbone'
            }));

            const basepairLinks = this.model.basePairs.map(l => ({
                source: l.source,
                target: l.target,
                type: 'basepair',
                pairType: l.pairType
            }));

            const allLinks = [...backboneLinks, ...basepairLinks];

            this.simulation = d3.forceSimulation(this.model.nodes)
                .force('backbone', d3.forceLink(backboneLinks)
                    .id((d, i) => i)
                    .distance(DEFAULTS.backboneDistance)
                    .strength(DEFAULTS.backboneStrength))
                .force('basepair', d3.forceLink(basepairLinks)
                    .id((d, i) => i)
                    .distance(DEFAULTS.basepairDistance)
                    .strength(DEFAULTS.basepairStrength))
                .force('charge', d3.forceManyBody()
                    .strength(DEFAULTS.chargeStrength))
                .force('center', d3.forceCenter(this._width / 2, this._height / 2)
                    .strength(0.05))
                .force('collide', d3.forceCollide(DEFAULTS.collisionRadius))
                .alphaDecay(0.02)
                .on('tick', () => this._tick());

            // Store links for tick updates
            this._allLinks = allLinks;
            this._backboneLinks = backboneLinks;
            this._basepairLinks = basepairLinks;
        }

        /**
         * Draw all SVG elements
         */
        _drawAll() {
            this._drawBackbone();
            this._drawBasePairs();
            this._drawNodes();
        }

        /**
         * Draw backbone links
         */
        _drawBackbone() {
            const layer = this.g.select('.layer-backbone');
            layer.selectAll('*').remove();

            this._backboneElements = layer.selectAll('line.backbone')
                .data(this._backboneLinks)
                .enter()
                .append('line')
                .attr('class', 'backbone')
                .attr('stroke', DEFAULTS.backboneColor)
                .attr('stroke-width', DEFAULTS.backboneWidth)
                .attr('stroke-linecap', 'round');
        }

        /**
         * Draw base pair links
         */
        _drawBasePairs() {
            const layer = this.g.select('.layer-basepairs');
            layer.selectAll('*').remove();

            this._basepairElements = layer.selectAll('line.basepair')
                .data(this._basepairLinks)
                .enter()
                .append('line')
                .attr('class', d => `basepair ${d.pairType}`)
                .attr('stroke', d => RNAModel.PAIR_COLORS[d.pairType] || RNAModel.PAIR_COLORS['non-canonical'])
                .attr('stroke-width', DEFAULTS.basepairWidth)
                .attr('stroke-dasharray', d => d.pairType === 'wobble' ? '6,3' : (d.pairType === 'non-canonical' ? '3,3' : 'none'))
                .attr('stroke-linecap', 'round')
                .attr('opacity', 0.8);
        }

        /**
         * Draw nucleotide nodes
         */
        _drawNodes() {
            const layer = this.g.select('.layer-nodes');
            layer.selectAll('*').remove();
            const self = this;

            // Drag behavior
            const drag = d3.drag()
                .on('start', (event, d) => {
                    if (!event.active) self.simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on('end', (event, d) => {
                    if (!event.active) self.simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                });

            const nodeGroups = layer.selectAll('g.node')
                .data(this.model.nodes)
                .enter()
                .append('g')
                .attr('class', 'node')
                .call(drag)
                .on('click', (event, d) => {
                    event.stopPropagation();
                    if (self.onNodeClickCallback) {
                        self.onNodeClickCallback(d);
                    }
                })
                .on('mouseover', (event, d) => {
                    self._showTooltip(event, d);
                })
                .on('mouseout', () => {
                    self._hideTooltip();
                });

            // Circle background
            nodeGroups.append('circle')
                .attr('r', DEFAULTS.nodeRadius)
                .attr('fill', d => this._getNodeColor(d))
                .attr('stroke', '#2C3E50')
                .attr('stroke-width', 1.5)
                .attr('class', 'node-circle');

            // Base letter
            nodeGroups.append('text')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .attr('font-size', DEFAULTS.fontSize)
                .attr('font-weight', '600')
                .attr('font-family', "'JetBrains Mono', 'Fira Code', monospace")
                .attr('fill', '#2C3E50')
                .attr('pointer-events', 'none')
                .text(d => d.base);

            // Position label (small, below)
            nodeGroups.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', DEFAULTS.nodeRadius + 12)
                .attr('font-size', 8)
                .attr('fill', '#7F8C8D')
                .attr('pointer-events', 'none')
                .attr('class', 'position-label')
                .text(d => d.index + 1);

            this._nodeGroups = nodeGroups;
        }

        /**
         * Get node color based on current scheme
         */
        _getNodeColor(d) {
            if (this.colorScheme === 'base') {
                return RNAModel.BASE_COLORS[d.base] || '#95A5A6';
            } else if (this.colorScheme === 'position') {
                const t = d.index / Math.max(1, this.model.nodes.length - 1);
                return d3.interpolateViridis(t);
            } else if (this.colorScheme === 'structure') {
                return d.pairedWith !== null ? '#3498DB' : '#E0E0E0';
            }
            return '#95A5A6';
        }

        /**
         * Update positions on each simulation tick
         */
        _tick() {
            if (this._backboneElements) {
                this._backboneElements
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
            }

            if (this._basepairElements) {
                this._basepairElements
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
            }

            if (this._nodeGroups) {
                this._nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`);
            }
        }

        /**
         * Show tooltip on hover
         */
        _showTooltip(event, d) {
            const pairInfo = d.pairedWith !== null
                ? `Paired with: ${d.pairedWith + 1} (${this.model.nodes[d.pairedWith].base})`
                : 'Unpaired';

            const pairType = d.pairedWith !== null
                ? RNAModel.classifyPair(d.base, this.model.nodes[d.pairedWith].base)
                : '';

            const pairLabel = pairType ? ` [${pairType}]` : '';

            this.tooltip
                .html(`
                    <strong>${d.base}</strong> — Position ${d.index + 1}<br>
                    ${pairInfo}${pairLabel}
                `)
                .style('left', (event.offsetX + 15) + 'px')
                .style('top', (event.offsetY - 10) + 'px')
                .transition().duration(150)
                .style('opacity', 1);
        }

        _hideTooltip() {
            this.tooltip.transition().duration(200).style('opacity', 0);
        }

        /**
         * Highlight a node (for bond mode)
         */
        highlightNode(index) {
            this.highlightedNodes.add(index);
            this._updateHighlights();
        }

        clearHighlights() {
            this.highlightedNodes.clear();
            this._updateHighlights();
        }

        _updateHighlights() {
            const highlighted = this.highlightedNodes;
            if (this._nodeGroups) {
                this._nodeGroups.select('.node-circle')
                    .attr('stroke', d => highlighted.has(d.index) ? '#E74C3C' : '#2C3E50')
                    .attr('stroke-width', d => highlighted.has(d.index) ? 3 : 1.5)
                    .attr('r', d => highlighted.has(d.index) ? DEFAULTS.nodeRadius + 2 : DEFAULTS.nodeRadius);
            }
        }

        /**
         * Set color scheme and re-color nodes
         */
        setColorScheme(scheme) {
            this.colorScheme = scheme;
            if (this._nodeGroups) {
                this._nodeGroups.select('.node-circle')
                    .transition().duration(300)
                    .attr('fill', d => this._getNodeColor(d));
            }
        }

        /**
         * Set click callback
         */
        onNodeClick(callback) {
            this.onNodeClickCallback = callback;
        }

        /**
         * Zoom controls
         */
        zoomIn() {
            this.svg.transition().duration(300).call(this._zoom.scaleBy, 1.3);
        }

        zoomOut() {
            this.svg.transition().duration(300).call(this._zoom.scaleBy, 0.7);
        }

        resetZoom() {
            this.svg.transition().duration(500).call(
                this._zoom.transform,
                d3.zoomIdentity
            );
        }

        /**
         * Reheat simulation (after adding/removing bonds)
         */
        reheat() {
            this._buildSimulation();
            this._drawBasePairs();
            this._drawBackbone();
            this._drawNodes();
            this.simulation.alpha(0.8).restart();
        }

        /**
         * Export as SVG string
         */
        exportSVG() {
            // Clone SVG for export
            const clone = this.svg.node().cloneNode(true);
            // Remove tooltip-related elements
            clone.querySelector('rect')?.remove();

            // Set explicit dimensions
            clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            clone.setAttribute('width', this._width);
            clone.setAttribute('height', this._height);

            // Add inline styles for export
            const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            style.textContent = `
                .node-circle { cursor: grab; }
                text { font-family: 'Helvetica Neue', Arial, sans-serif; }
                .backbone { stroke: ${DEFAULTS.backboneColor}; }
            `;
            clone.insertBefore(style, clone.firstChild);

            const serializer = new XMLSerializer();
            return serializer.serializeToString(clone);
        }

        /**
         * Export as PNG (returns a Promise that resolves to a data URL)
         */
        exportPNG(scale = 2) {
            return new Promise((resolve) => {
                const svgString = this.exportSVG();
                const canvas = document.createElement('canvas');
                canvas.width = this._width * scale;
                canvas.height = this._height * scale;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const img = new Image();
                img.onload = function () {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
            });
        }

        /**
         * Clean up
         */
        destroy() {
            if (this.simulation) this.simulation.stop();
            this.container.innerHTML = '';
        }
    }

    return Renderer;
})();
