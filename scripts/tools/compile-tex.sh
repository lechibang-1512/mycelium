#!/usr/bin/env bash
set -euo pipefail

# Compile baocaotonghiep.tex to PDF in docs/baocaototnghiep
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
DOC_DIR="${ROOT_DIR}/docs/baocaototnghiep"
MAIN_TEX="${DOC_DIR}/baocaotonghiep.tex"
OUT_DIR="${DOC_DIR}"

if [ ! -f "$MAIN_TEX" ]; then
  echo "Error: TeX file not found at $MAIN_TEX"
  exit 1
fi

# Choose available compiler
if command -v latexmk >/dev/null 2>&1; then
  echo "Using latexmk to compile..."
  (cd "$DOC_DIR" && latexmk -pdf -interaction=nonstopmode -jobname=baocaotonghiep baocaotonghiep.tex)
elif command -v pdflatex >/dev/null 2>&1; then
  echo "latexmk not found, falling back to pdflatex (runs pdflatex twice)..."
  (cd "$DOC_DIR" && pdflatex -interaction=nonstopmode -halt-on-error -output-directory="$OUT_DIR" "$MAIN_TEX" )
  (cd "$DOC_DIR" && pdflatex -interaction=nonstopmode -halt-on-error -output-directory="$OUT_DIR" "$MAIN_TEX" )
else
  echo "Error: No LaTeX compiler found. Please install 'latexmk' (recommended) or 'pdflatex'."
  echo "On Debian/Ubuntu: sudo apt update && sudo apt install -y latexmk texlive-latex-extra texlive-fonts-recommended"
  exit 2
fi

echo "PDF generated at: ${OUT_DIR}/baocaotonghiep.pdf"
