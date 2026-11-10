# Hop-0 project site

Static, dependency-free site for GitHub Pages. No build step: every page is a plain HTML file, all links are relative,
so it works at `https://melihakbulut221.github.io/hop0-log/` and on any local server.

| Page | What it holds |
|---|---|
| `index.html` | What Hop-0 is, current status, four results with their evidence, the six layers of the twin, latest log entries |
| `gnc.html` | Landing in wind: recorded flights, the wind/filter story, every change measured, current numbers and definitions, simulators, mistakes, open problems |
| `vehicle.html` | How the vehicle is modelled, exploded CAD section, mechanical design (mass, mass properties, structure, legs, deck, gimbal) |
| `avionics.html` | Flight software, hardware-in-the-loop, the five boards, wiring |
| `life.html` | Life twin: wear account and remaining life |
| `orbit.html` | The first orbital product (minimum-launcher study) |
| `log.html` | Dated engineering log: what changed, what was measured, what did not work |

`assets/site.css` is the only stylesheet (tokens for colour, type scale and spacing at the top). `assets/js/boot.js` is
the only script a page loads directly; an element with `data-module="name"` makes it load `assets/js/name.js` when the
element comes near the viewport. Old single-page anchors (`index.html#numbers` and so on) are forwarded by `boot.js`.

Header and footer are repeated in every page and must stay identical; the checks verify it.

## Preview locally

```bash
python3 -m http.server 8777 --directory site
```

## Regenerate the figures

```bash
cd site && ../.venv/bin/python make_figures.py
```

`before_after.png` and `hil_timeline.png` are the no-JavaScript fallbacks of the two HIL charts on `gnc.html`.
`assets/cfd_flow_slices.png` is a copy of `research/cfd/plots/flow_slices.png`.

## Updating numbers

| Numbers | Where they live on the site | Source |
|---|---|---|
| HIL tables, before/after, timeline (sets A and B) | `gnc.html#numbers`, `assets/js/hilcharts.js` (`BA`, `TL`) | `research/plantfix/README.md` |
| Log entries | `log.html` (one `<li class="entry" id="e-MMDD-name">` per entry; the timeline links to these ids) | `research/plantfix/README.md`, `research/ARGE_DURUM.md` |
| Boards and wiring | `avionics.html`, `assets/js/boards.js`, `assets/js/wiring.js` | `research/avionics`, `research/ecu_board`, `research/pdu_board` |
| Mechanical design | `vehicle.html` (`#mech-data` JSON block) | `research/cad`, `research/legs_v2`, `research/legs_v3`, `research/tvc_v2` |
| Life twin | `life.html` (`#life-data`) | `research/life/out/life_report.json` |
| Orbital product | `orbit.html` (`#leo-data`) | `research/leo_min/site_summary.json` |

When a headline number changes, also update the home page (`index.html#status`, `#results`) and add a log entry.

## Publish

Published from this repository (github.com/Melihakbulut221/hop0-log) with GitHub Pages on `main`, path `/`.
Push to `main` and Pages rebuilds in a minute or two.
