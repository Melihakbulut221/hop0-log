"""
Figures for the project site (English). Numbers come from the HIL tables in research/plantfix/README.md
(C flight software, lockstep HIL, same random seeds per scenario).

  ../.venv/bin/python make_figures.py      -> assets/before_after.png, assets/hil_timeline.png
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "assets")

SURFACE = "#fcfcfb"
INK = "#0b0b0b"
INK2 = "#52514e"
GRID = "#e1e0d9"
BEFORE = "#86b6ef"     # blue step 250 (ordinal pair validated with the dataviz validator)
AFTER = "#184f95"      # blue step 600
LINE = "#2a78d6"       # single series

plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 13})


def pct(x):
    s = f"{x:.1f}"
    return (s[:-2] if s.endswith(".0") else s) + "%"


def before_after():
    rows = [  # label, before landed, after landed, episodes
        ("COTS sensors", 75, 100, 100),
        ("COTS + 5% sensor faults", 75, 100, 100),
        ("COTS + 15% packet loss", 72, 100, 100),
        ("Harsh sensors", 72, 100, 100),
        ("Harsh + 200 ms latency", 57, 100, 100),
        ("Harsh + 200 ms + 15% loss", 159, 300, 300),
        ("No radar, 1 Hz GNSS", 192, 298, 300),
    ]
    fig, ax = plt.subplots(figsize=(12, 7.2), dpi=150)
    fig.patch.set_facecolor(SURFACE); ax.set_facecolor(SURFACE)
    n = len(rows)
    for i, (lab, b, a, ep) in enumerate(rows):
        y = n - 1 - i
        pb, pa = 100.0 * b / ep, 100.0 * a / ep
        ax.plot([pb, pa], [y, y], color=GRID, lw=6, solid_capstyle="round", zorder=1)
        ax.scatter([pb], [y], s=140, color=BEFORE, edgecolor=SURFACE, linewidth=2, zorder=3)
        ax.scatter([pa], [y], s=140, color=AFTER, edgecolor=SURFACE, linewidth=2, zorder=3)
        ax.text(pb - 1.6, y, pct(pb), ha="right", va="center", color=INK2, fontsize=12)
        ax.text(pa + 1.6, y, pct(pa), ha="left", va="center", color=INK, fontsize=12, fontweight="bold")
    ax.set_yticks(range(n)); ax.set_yticklabels([r[0] for r in rows][::-1], color=INK, fontsize=13)
    ax.set_xlim(40, 108)
    ticks = [40, 50, 60, 70, 80, 90, 100]
    ax.set_xticks(ticks); ax.set_xticklabels([f"{t}%" for t in ticks], color=INK2, fontsize=11)
    ax.xaxis.grid(True, color=GRID, lw=0.8); ax.set_axisbelow(True)
    for s in ("top", "right", "left"):
        ax.spines[s].set_visible(False)
    ax.spines["bottom"].set_color(GRID); ax.tick_params(length=0)
    fig.text(0.02, 0.955, "Landing success in winds up to 12 m/s: before and after", fontsize=20, fontweight="bold",
             color=INK)
    fig.text(0.02, 0.905, "C flight software in hardware-in-the-loop simulation, same random seeds per scenario",
             fontsize=12.5, color=INK2)
    handles = [Line2D([0], [0], marker="o", ls="", markersize=11, markerfacecolor=BEFORE, markeredgecolor=SURFACE,
                      label="Before: when the CFD aerodynamics went in"),
               Line2D([0], [0], marker="o", ls="", markersize=11, markerfacecolor=AFTER, markeredgecolor=SURFACE,
                      label="After: current flight software (filter and guidance changes)")]
    fig.legend(handles=handles, loc="upper left", bbox_to_anchor=(0.012, 0.885), ncol=2, frameon=False, fontsize=12,
               handletextpad=0.3, columnspacing=2.0, labelcolor=INK)
    fig.text(0.02, 0.018, "Simulation and HIL only; the vehicle has not flown. 100 or 300 episodes per scenario. "
             "'After' also has a ±10° gimbal instead of ±7°\n(small effect on its own); the gain comes from the "
             "navigation filter and the guidance.", fontsize=10.5, color=INK2)
    fig.subplots_adjust(left=0.25, right=0.97, top=0.81, bottom=0.115)
    fig.savefig(os.path.join(OUT, "before_after.png"), facecolor=SURFACE)
    plt.close(fig)


def hil_timeline():
    # harsh sensors + 150/50 ms latency + 10 % drop + 5 % corruption, wind <= 12 m/s, seeds 1100000/1400000/1500000
    steps = [
        ("Simple aero model (before CFD)", 293),
        ("CFD aerodynamics added", 159),
        ("Angular-disturbance state in the nav filter", 266),
        ("Terminal tilt limits", 271),
        ("Divert-feasibility sink limit", 276),
        ("Terminal velocity law", 287),
        ("Smoother braking feed-forward", 285),
        ("Higher terminal gate", 289),
        ("Filter gain in accelerometer mode", 294),
        ("Predictive terminal guidance (LQR)", 296),
        ("Stiffer attitude loop at 50 Hz", 299),
        ("Filter models the whole vehicle (plant v5)", 300),
    ]
    fig, ax = plt.subplots(figsize=(12, 7.0), dpi=150)
    fig.patch.set_facecolor(SURFACE); ax.set_facecolor(SURFACE)
    n = len(steps)
    yy = [n - 1 - i for i in range(n)]
    xx = [100.0 * v / 300 for _, v in steps]
    ax.plot(xx, yy, color=LINE, lw=2, zorder=2)
    ax.scatter(xx, yy, s=90, color=LINE, edgecolor=SURFACE, linewidth=2, zorder=3)
    for x, y, (lab, v) in zip(xx, yy, steps):
        left = x < 70          # the line leaves this point to the right: label on the left
        ax.text(x - 1.2 if left else x + 1.2, y, f"{v}/300", ha="right" if left else "left", va="center", color=INK,
                fontsize=11)
    ax.set_yticks(yy); ax.set_yticklabels([f"{i + 1}. {s[0]}" for i, s in enumerate(steps)], color=INK, fontsize=12)
    ax.set_xlim(40, 108)
    ticks = [40, 50, 60, 70, 80, 90, 100]
    ax.set_xticks(ticks); ax.set_xticklabels([f"{t}%" for t in ticks], color=INK2, fontsize=11)
    ax.xaxis.grid(True, color=GRID, lw=0.8); ax.set_axisbelow(True)
    for s in ("top", "right", "left"):
        ax.spines[s].set_visible(False)
    ax.spines["bottom"].set_color(GRID); ax.tick_params(length=0)
    fig.text(0.02, 0.95, "Every change, measured in HIL", fontsize=20, fontweight="bold", color=INK)
    fig.text(0.02, 0.9, "Hardest scenario: harsh sensors, 200 ms latency, 15% packet loss, wind up to 12 m/s. "
             "Same 300 episodes at every step.", fontsize=12.5, color=INK2)
    fig.text(0.02, 0.018, "Landing success, in order of the changes. Steps that did not change this scenario (for "
             "example a fix that only affected COTS sensors)\nare left out. Changes that did not hold up in HIL were "
             "reverted and are not shown.", fontsize=10.5, color=INK2)
    fig.subplots_adjust(left=0.33, right=0.97, top=0.85, bottom=0.12)
    fig.savefig(os.path.join(OUT, "hil_timeline.png"), facecolor=SURFACE)
    plt.close(fig)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    before_after()
    hil_timeline()
    print(OUT)


def og_image():
    """1200 x 630 social preview: the replayed landing trajectories (real flights from assets/flights.json)"""
    import json
    from matplotlib import font_manager
    sans = "Fira Sans" if any("Fira Sans" == f.name for f in font_manager.fontManager.ttflist) else "DejaVu Sans"
    mono = "Fira Mono" if any("Fira Mono" == f.name for f in font_manager.fontManager.ttflist) else "DejaVu Sans Mono"
    d = json.load(open(os.path.join(OUT, "flights.json")))
    bg, fg, fg2, trail, acc, hud = "#080b10", "#f3f5f8", "#a3acb9", "#4aa3ff", "#ff6a2b", "#9fd3ff"
    fig = plt.figure(figsize=(12, 6.3), dpi=100)
    fig.patch.set_facecolor(bg)
    g = fig.add_axes([0, 0, 1, 1]); g.set_xlim(0, 1200); g.set_ylim(0, 630); g.axis("off")
    for x in range(0, 1201, 48):
        g.plot([x, x], [0, 630], color="#82c4ff", alpha=0.05, lw=0.8)
    for y in range(6, 631, 48):
        g.plot([0, 1200], [y, y], color="#82c4ff", alpha=0.05, lw=0.8)
    ax = fig.add_axes([0.665, 0.1, 0.32, 0.8]); ax.set_facecolor("none")
    for f in d["flights"]:
        ax.plot(f["s"], f["z"], color=trail, lw=1.3, alpha=0.6)
        ax.scatter([f["s"][-1]], [0], s=10, color=acc, zorder=3)
    for m in (50, 100, 150, 200):
        ax.plot([-70, 45], [m, m], color=hud, lw=0.6, alpha=0.18)
        ax.text(-68, m + 3, "%d m" % m, color=hud, alpha=0.55, fontsize=9, family=mono)
    ax.plot([-70, 45], [0, 0], color=fg2, lw=1.5)
    ax.set_xlim(-70, 45); ax.set_ylim(-8, 240); ax.axis("off")
    fig.text(0.05, 0.84, "HOP-0  \u00b7  REUSABLE ROCKET DIGITAL TWIN", fontsize=14, color=acc, family=mono)
    fig.text(0.05, 0.62, "Flown 4,400 times.", fontsize=52, fontweight="bold", color=fg, family=sans)
    fig.text(0.05, 0.47, "Not built yet.", fontsize=52, fontweight="bold", color=acc, family=sans)
    fig.text(0.05, 0.27, "CFD aerodynamics, structure, wear, five circuit boards\nand the real C flight code, flown in the loop\nbefore a single part is cut.",
             fontsize=17, color=fg2, family=sans, linespacing=1.4)
    fig.text(0.05, 0.165, "4,400 HIL FLIGHTS, NO LOSS   \u00b7   0 PARTS BUILT",
             fontsize=12.5, color=hud, family=mono)
    fig.text(0.05, 0.065, "melihakbulut221.github.io/hop0-log  \u00b7  simulation only", fontsize=12, color=fg2, family=mono)
    fig.savefig(os.path.join(OUT, "og.png"), facecolor=bg)
    plt.close(fig)


if __name__ == "__main__":
    og_image()
