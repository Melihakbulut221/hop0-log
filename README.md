# Hop-0 project site

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

## Publish

Published from this repository (github.com/Melihakbulut221/hop0-log) with GitHub Pages on `main`, path `/`:
https://melihakbulut221.github.io/hop0-log/ . Push to `main` and Pages rebuilds in a minute or two.

## Sources of the sections

| Section | Source |
|---|---|
| HIL numbers, before/after, timeline | `research/plantfix/README.md` |
| Take it apart, boards, wiring | `research/cad`, `research/avionics`, `research/ecu_board`, `research/pdu_board` (board_outline / site JSON files) |
| Mechanical design | `research/cad`, `research/legs_v2`, `research/legs_v3`, `research/tvc_v2` |
| What each flight costs | `research/life/out/life_report.json` |
| The first orbital product | `research/leo_min/site_summary.json` |
