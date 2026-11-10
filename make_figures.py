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
        ("Harsh + 200 ms + 15% loss", 159, 299, 300),
        ("No radar, 1 Hz GNSS", 192, 299, 300),
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
    d = json.load(open(os.path.join(OUT, "flights.json")))
    bg, fg, fg2, trail = "#111b2b", "#f3f2ee", "#b9c3d3", "#6da7ec"
    fig = plt.figure(figsize=(12, 6.3), dpi=100)
    fig.patch.set_facecolor(bg)
    ax = fig.add_axes([0.5, 0.08, 0.47, 0.84]); ax.set_facecolor(bg)
    for f in d["flights"]:
        ax.plot(f["s"], f["z"], color=trail, lw=1.2, alpha=0.55)
    ax.plot([-70, 45], [0, 0], color=fg2, lw=1.5)
    ax.scatter([0], [0], s=60, color=fg, zorder=3)
    ax.set_xlim(-70, 45); ax.set_ylim(-8, 240); ax.axis("off")
    fig.text(0.05, 0.78, "Hop-0", fontsize=54, fontweight="bold", color=fg)
    fig.text(0.05, 0.69, "engineering log", fontsize=26, color=fg2)
    fig.text(0.05, 0.47, "A small reusable-rocket testbed,\nbuilt in simulation first", fontsize=20, color=fg,
             linespacing=1.35)
    fig.text(0.05, 0.30, "Hardest HIL scenario: 53% → 99.7%", fontsize=18, color=trail, fontweight="bold")
    fig.text(0.05, 0.205, "landings on the same seeds, before and after the filter\nand guidance work", fontsize=14, color=fg2)
    fig.text(0.05, 0.07, "18 replayed landings from the flight software; simulation only", fontsize=11, color=fg2)
    fig.savefig(os.path.join(OUT, "og.png"), facecolor=bg)
    plt.close(fig)


if __name__ == "__main__":
    og_image()
