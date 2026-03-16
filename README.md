# 🧬 RNA Playground

**An interactive, educational tool for visualizing and exploring RNA secondary structures.**

RNA Playground helps students, educators, and researchers understand RNA structure by providing an intuitive, visual interface for building and analyzing RNA base-pairing patterns.

![RNA Playground](https://img.shields.io/badge/D3.js-v7-orange) ![License](https://img.shields.io/badge/license-MIT-blue) ![Status](https://img.shields.io/badge/status-active-brightgreen)

## ✨ Features

### 🔬 Visualization
- **Force-directed layout** — D3.js v7 physics simulation automatically arranges RNA structures into readable layouts
- **Color coding** — Color nodes by base type (A/U/G/C), sequence position, or structural role (paired/unpaired)
- **Interactive drag** — Drag any nucleotide to rearrange the layout; the simulation responds naturally
- **Zoom & pan** — Scroll to zoom, drag the canvas to pan; explore large structures with ease

### 🧮 Standard Notation
- **Dot-bracket input** — Enter structures in the standard bioinformatics format: `(((...)))` for stems, `.` for unpaired bases
- **Live dot-bracket output** — See the dot-bracket notation update in real time as you add or remove bonds
- **Color-coded sequence display** — Each base in the notation panel is colored by type for quick identification

### 🔗 Interactive Editing
- **Bond Mode** — Click any two nucleotides to create a base pair. Watson-Crick rules are validated in real time
- **Undo/Redo** — Full history with Ctrl+Z / Ctrl+Shift+Z support
- **Validation** — Automatic checking for canonical pairing (A-U, G-C), wobble pairs (G-U), non-canonical pairs, and hairpin loop size constraints

### 📊 Analysis
- **Sequence statistics** — Length, GC content, AU content, base counts
- **Pair analysis** — Watson-Crick, wobble, and non-canonical pair counts
- **Structure validation** — Warnings for non-canonical pairs, errors for impossible structures (e.g., hairpin loops < 3 bases)

### 📥 Export
- **SVG export** — Publication-quality vector graphics
- **PNG export** — High-resolution raster images (2× scale)

### 📚 Educational Examples
- **Simple Hairpin** — The most fundamental RNA structural motif
- **Two Hairpins** — Independent stem-loops, common in regulatory RNAs
- **Internal Loop** — Unpaired bases within a helix, found in ribosomal RNA
- **Free Sequence** — Start from scratch and build your own structure

## 🚀 Getting Started

### Option 1: Just Open It
```bash
# Clone the repo
git clone https://github.com/nitinms-ftw/RnaDrawing.git
cd RnaDrawing

# Open in browser (works directly for most browsers)
open index.html
```

### Option 2: Local Server (recommended for full features)
```bash
# Python
python -m http.server 8000

# Node.js
npx serve .

# Then open http://localhost:8000
```

## 🎮 How to Use

1. **Enter a sequence** — Type an RNA sequence (A, C, G, U characters) in the input field
2. **Add structure** *(optional)* — Enter dot-bracket notation to define base pairs
3. **Click Visualize** — The force-directed graph will animate into a natural layout
4. **Explore** — Drag nodes, zoom in/out, hover for details
5. **Bond Mode** — Press `B` or click the Bond Mode button, then click two nucleotides to pair them
6. **Validate** — Click Validate to check if all pairs follow Watson-Crick rules
7. **Export** — Download your structure as SVG or PNG

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `B` | Toggle Bond Mode |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `0` | Reset zoom |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |

## 🧬 Biology Background

### What is RNA Secondary Structure?
RNA is a single-stranded molecule that folds back on itself to form **base pairs**. The pattern of these pairs is called the **secondary structure**. Understanding RNA structure is critical for:
- **Drug design** — RNA is a target for antibiotics and antivirals
- **Gene regulation** — mRNA structure controls translation efficiency
- **Ribozymes** — RNA enzymes whose function depends on structure
- **CRISPR** — Guide RNA structure determines targeting specificity

### Base Pairing Rules
| Pair | Type | Strength |
|------|------|----------|
| A—U | Watson-Crick | Standard |
| G—C | Watson-Crick | Strong (3 hydrogen bonds) |
| G—U | Wobble | Common, weaker |
| Others | Non-canonical | Rare, flagged as warnings |

### Dot-Bracket Notation
The standard way to represent RNA secondary structure in text:
- `(` — opening of a base pair (pairs with a matching `)`)
- `)` — closing of a base pair
- `.` — unpaired nucleotide

Example: `(((...)))` means positions 1-3 pair with positions 7-9, and positions 4-6 are in a loop.

## 🛠 Tech Stack

- **D3.js v7** — Force-directed graph layout and SVG rendering
- **Vanilla JavaScript** — No frameworks, no build tools, no dependencies beyond D3
- **CSS Grid + Flexbox** — Responsive layout
- **Inter + JetBrains Mono** — Clean typography

## 🤝 Who Is This For?

| Audience | Use Case |
|----------|----------|
| **Students** | Learn RNA structure concepts interactively |
| **Educators** | Demonstrate base pairing, stem-loops, and structural motifs in class |
| **Researchers** | Quick structural sketches and visualization of small RNAs |
| **Developers** | Reference implementation for D3 force-directed biological visualization |

## 📄 License

MIT License — free to use, modify, and distribute.

## 🙏 Acknowledgments

- [D3.js](https://d3js.org/) by Mike Bostock
- Inspired by [forna](http://rna.tbi.univie.ac.at/forna/) (ViennaRNA), [RNAcanvas](https://rnacanvas.app/), and the RNA bioinformatics community
- Original project by [nitinms-ftw](https://github.com/nitinms-ftw)
