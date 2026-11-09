# Hop-0 project site (draft)

Static, dependency-free page for GitHub Pages: `index.html` + `assets/`. No build step.

## Preview locally

```bash
python3 -m http.server 8777 --directory site
```

## Regenerate the figures

```bash
cd site && ../.venv/bin/python make_figures.py
```

Numbers are copied from the HIL tables in `research/plantfix/README.md`; update `make_figures.py` and the table in
`index.html` together when they change. `assets/cfd_flow_slices.png` is a copy of `research/cfd/plots/flow_slices.png`.

## Publish (not done yet)

As its own repository (recommended: the main project repository stays private):

```bash
cd site && git init && git add . && git commit -m "Site draft"
gh repo create <name> --public --source . --push
gh api -X POST repos/<owner>/<name>/pages -f "source[branch]=main" -f "source[path]=/"
```

The site is then at `https://<owner>.github.io/<name>/`.

## Before publishing

- Read every number against `research/plantfix/README.md`.
- Export control: the page stays at method and result level. It has no engine design values, TVC specification or
  code; keep it that way unless that has been checked.
- The CAD renders in `research/cad/renders` are not used: they are labelled in Turkish and still show the leg
  fairings that were rejected.

## To do

- Vehicle render without fairings, English labels.
- English version of the interactive replay (`gui/fsw.html`) with current flight-software data.
- Narrow-screen versions of the wide figures (they are legible but small on phones).
- Social preview image (`og:image`) and a short "about the author" block.
