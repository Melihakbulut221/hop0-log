/* Hop-0 site, vehicle page: the vehicle taken apart. A section of the CAD model (research/cad, v0.3) that comes
 * apart as you scroll, one subsystem per step. Motion is kept only where it shows a mechanism: the explode itself,
 * the gimbal sweep, the pump rotors and the leg stroke. Geometry is simplified; heights follow the CAD. No dependencies. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, a, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in a) e.setAttribute(k, a[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  /* ================================================================== exploded view */
  var svg = document.getElementById("xp-svg");
  if (svg) (function () {
    var S = 300, CX = 350, VB_H = 1110;
    var X = function (r) { return CX + r * S; };
    var Y = function (z) { return VB_H - 20 - (z + 0.45) * S; };
    var rect = function (r0, r1, z0, z1, cls, parent, extra) {
      var a = { x: X(Math.min(r0, r1)), y: Y(Math.max(z0, z1)), width: Math.abs(r1 - r0) * S, height: Math.abs(z1 - z0) * S, class: cls };
      for (var k in extra || {}) a[k] = extra[k];
      return el("rect", a, parent);
    };
    var line = function (r0, z0, r1, z1, cls, parent) { return el("line", { x1: X(r0), y1: Y(z0), x2: X(r1), y2: Y(z1), class: cls }, parent); };
    var capsule = function (zc0, zc1, h) {       // tank: cylinder zc0..zc1 with 2:1 elliptical domes of height h
      var rx = 0.225 * S, ry = h * S;
      return "M" + X(-0.225) + " " + Y(zc0) + " L" + X(-0.225) + " " + Y(zc1) + " A" + rx + " " + ry + " 0 0 1 " + X(0.225) + " " + Y(zc1) +
        " L" + X(0.225) + " " + Y(zc0) + " A" + rx + " " + ry + " 0 0 1 " + X(-0.225) + " " + Y(zc0) + " Z";
    };

    // ground and a faint grid
    var defs = el("defs", {}, svg);
    var pat = el("pattern", { id: "xp-grid", width: 30, height: 30, patternUnits: "userSpaceOnUse" }, defs);
    el("path", { d: "M30 0 L0 0 0 30", class: "xp-gridline" }, pat);
    el("rect", { x: 0, y: 0, width: 700, height: VB_H, fill: "url(#xp-grid)" }, svg);
    line(-1.15, -0.45, 1.15, -0.45, "xp-ground", svg);

    var G = {};       // group id -> { g, dx, dz }
    function group(id, dx, dz) { var g = el("g", { class: "xp-g", "data-g": id }, svg); G[id] = { g: g, dx: dx, dz: dz }; return g; }

    // ---- structure: aft skirt, frames, thrust structure, doublers (stays put)
    var aft = group("aft", 0, 0);
    [-1, 1].forEach(function (s) {
      rect(s * 0.217, s * 0.225, 0, 0.652, "xp-skin", aft);
      rect(s * 0.225, s * 0.17, 0, 0.016, "xp-frame", aft);              // base frame
      rect(s * 0.225, s * 0.19, 0.44, 0.462, "xp-frame", aft);           // leg / thrust ring frame
      rect(s * 0.217, s * 0.195, 0.205, 0.245, "xp-doubler", aft);       // leg doubler plates
    });
    rect(-0.212, 0.212, 0.40, 0.43, "xp-beam", aft);                     // crossed box beams
    rect(-0.08, 0.08, 0.392, 0.442, "xp-plate", aft);                    // centre plate
    var loads = el("g", { class: "xp-anim xp-loads" }, aft);             // load-path arrows (structure step)
    [-0.15, 0.15].forEach(function (r) {
      el("path", { d: "M" + X(r) + " " + Y(0.39) + " L" + X(r * 1.4) + " " + Y(0.30) + " L" + X(r * 1.4) + " " + Y(0.12), class: "xp-load" }, loads);
    });

    // ---- legs (two subgroups so each can move outward)
    function leg(s) {
      var g = group(s < 0 ? "legL" : "legR", s * 0.12, 0);
      g.setAttribute("data-set", "legs");
      var A = [s * 0.241, 0.45], F = [s * 0.9, -0.43], B = [s * 0.225, 0.02], B2 = [s * 0.205, 0.03];
      line(B[0], B[1], F[0], F[1], "xp-strut2", g);
      line(B2[0], B2[1], F[0] - s * 0.02, F[1] + 0.01, "xp-strut2", g);
      line(A[0], A[1], F[0], F[1], "xp-strut", g);
      var u = 0.42, Sx = A[0] + (F[0] - A[0]) * u, Sz = A[1] + (F[1] - A[1]) * u;
      line(A[0], A[1], Sx, Sz, "xp-shock", g);                           // coil-over + honeycomb cartridge
      var piston = line(Sx, Sz, Sx + (F[0] - A[0]) * 0.12, Sz + (F[1] - A[1]) * 0.12, "xp-piston", g);
      rect(F[0] - 0.09, F[0] + 0.09, -0.45, -0.432, "xp-foot", g);
      var sw = el("circle", { cx: X(F[0]), cy: Y(-0.41), r: 4, class: "xp-switch" }, g);
      [A, B].forEach(function (p) { el("circle", { cx: X(p[0]), cy: Y(p[1]), r: 4.5, class: "xp-clevis" }, g); });
      el("circle", { cx: X(F[0] - s * 0.03), cy: Y(-0.39), r: 3.5, class: "xp-clevis" }, g);
      G[s < 0 ? "legL" : "legR"].anim = { piston: piston, sw: sw, A: A, F: F, Sx: Sx, Sz: Sz };
    }
    leg(-1); leg(1);

    // ---- engine: chamber, injector, igniter, gimbal, TVC
    var eng = group("engine", 0, -0.2);
    var gim = el("g", {}, eng);
    var plume = el("path", { d: "M" + X(-0.05) + " " + Y(0) + " Q" + X(0) + " " + Y(-0.22) + " " + X(0.05) + " " + Y(0) + " Z", class: "xp-plume xp-anim" }, gim);
    // the engine is a generic schematic, not drawn from the engine design
    el("path", { d: "M" + X(-0.065) + " " + Y(0.23) + " L" + X(-0.065) + " " + Y(0.13) + " L" + X(-0.035) + " " + Y(0.085) +
      " Q" + X(-0.04) + " " + Y(0.035) + " " + X(-0.06) + " " + Y(0) + " L" + X(0.06) + " " + Y(0) + " Q" + X(0.04) + " " + Y(0.035) + " " + X(0.035) + " " + Y(0.085) +
      " L" + X(0.065) + " " + Y(0.13) + " L" + X(0.065) + " " + Y(0.23) + " Z", class: "xp-chamber" }, gim);
    rect(-0.07, 0.07, 0.23, 0.26, "xp-inj", gim);
    el("path", { d: "M" + X(-0.05) + " " + Y(0.255) + " A" + 0.05 * S + " " + 0.035 * S + " 0 0 1 " + X(0.05) + " " + Y(0.255) + " Z", class: "xp-inj" }, gim);
    rect(0.07, 0.1, 0.225, 0.25, "xp-ign", gim);
    rect(-0.06, 0.06, 0.29, 0.335, "xp-yoke", gim);
    rect(-0.085, 0.085, 0.16, 0.18, "xp-ring", gim);
    rect(-0.016, 0.016, 0.335, 0.365, "xp-cross", eng);                  // cardan cross + pins
    rect(-0.075, 0.075, 0.365, 0.39, "xp-yoke", eng);                   // upper yoke + plate
    var PIV = [0, 0.35];
    var emaEls = [-1, 1].map(function (s) {
      rect(s * 0.19, s * 0.215, 0.372, 0.392, "xp-bracket", eng);
      return { s: s, body: el("line", { class: "xp-ema" }, eng), rod: el("line", { class: "xp-emarod" }, eng) };
    });
    function setGimbal(deg) {
      gim.setAttribute("transform", "rotate(" + (-deg).toFixed(2) + " " + X(PIV[0]) + " " + Y(PIV[1]) + ")");
      var a = deg * Math.PI / 180;
      emaEls.forEach(function (e) {
        var r0 = e.s * 0.085 - PIV[0], z0 = 0.17 - PIV[1];
        var rr = PIV[0] + r0 * Math.cos(a) - z0 * Math.sin(a), zz = PIV[1] + r0 * Math.sin(a) + z0 * Math.cos(a);
        var top = [e.s * 0.2, 0.38], mid = [top[0] + (rr - top[0]) * 0.55, top[1] + (zz - top[1]) * 0.55];
        e.body.setAttribute("x1", X(top[0])); e.body.setAttribute("y1", Y(top[1])); e.body.setAttribute("x2", X(mid[0])); e.body.setAttribute("y2", Y(mid[1]));
        e.rod.setAttribute("x1", X(mid[0])); e.rod.setAttribute("y1", Y(mid[1])); e.rod.setAttribute("x2", X(rr)); e.rod.setAttribute("y2", Y(zz));
      });
    }
    setGimbal(0);

    // ---- feed: e-pumps, valves, hoses, fill QD
    var feed = group("feed", -0.62, 0.32);
    var impellers = [];
    [[-1, "lox"], [1, "rp1"]].forEach(function (p) {
      var s = p[0];
      rect(s * 0.09, s * 0.16, 0.30, 0.385, "xp-pump", feed);
      el("circle", { cx: X(s * 0.125), cy: Y(0.41), r: 0.03 * S, class: "xp-pump" }, feed);
      impellers.push(el("line", { x1: X(s * 0.125), y1: Y(0.41) - 7, x2: X(s * 0.125), y2: Y(0.41) + 7, class: "xp-imp" }, feed));
      el("path", { d: "M" + X(s * 0.125) + " " + Y(0.458) + " l7 7 l-7 7 l-7 -7 Z", class: "xp-valve" }, feed);   // pre-valve
      rect(s * 0.105, s * 0.145, 0.255, 0.285, "xp-valve", feed);                                             // main valve
      el("path", { d: "M" + X(s * 0.125) + " " + Y(0.255) + " C" + X(s * 0.125) + " " + Y(0.15) + " " + X(s * 0.03) + " " + Y(0.12) + " " + X(s * 0.05) + " " + Y(0.24),
        class: "xp-hose xp-flow" }, feed);
    });
    el("circle", { cx: X(-0.2), cy: Y(0.535), r: 5, class: "xp-qd" }, feed);
    line(-0.2, 0.535, -0.16, 0.535, "xp-line", feed);

    // ---- power: LiPo pack, two inverters, PDU, radar altimeter
    var pwr = group("power", 0.5, 0.3);
    rect(0.13, 0.205, 0.05, 0.235, "xp-batt", pwr);
    for (var c = 0; c < 6; c++) line(0.13, 0.07 + c * 0.028, 0.205, 0.07 + c * 0.028, "xp-cell", pwr);
    [0.10, 0.165].forEach(function (z) {
      rect(-0.205, -0.13, z, z + 0.05, "xp-inv", pwr);
      for (var f = 0; f < 4; f++) line(-0.205 + 0.015 + f * 0.017, z + 0.05, -0.205 + 0.015 + f * 0.017, z + 0.062, "xp-fin", pwr);
    });
    rect(0.06, 0.115, 0.045, 0.09, "xp-pdu", pwr);
    rect(-0.12, -0.065, 0.02, 0.05, "xp-radar", pwr);
    var beam = el("path", { d: "M" + X(-0.1) + " " + Y(0.02) + " L" + X(-0.16) + " " + Y(-0.12) + " M" + X(-0.085) + " " + Y(0.02) + " L" + X(-0.025) + " " + Y(-0.12), class: "xp-beamline xp-anim" }, pwr);
    el("path", { d: "M" + X(0.13) + " " + Y(0.14) + " L" + X(0.115) + " " + Y(0.07) + " M" + X(0.06) + " " + Y(0.07) + " L" + X(-0.13) + " " + Y(0.125) + " M" + X(0.06) + " " + Y(0.08) + " L" + X(-0.13) + " " + Y(0.19),
      class: "xp-current xp-flow" }, pwr);

    // ---- tanks
    var lox = group("lox", 0, 0.30), rp1 = group("rp1", 0, 0.58);
    function tank(g, zc0, zc1, cls, liqCls, id) {
      var d = capsule(zc0, zc1, 0.11);
      var cp = el("clipPath", { id: id }, defs); el("path", { d: d }, cp);
      el("path", { d: d, class: cls }, g);
      var liq = el("rect", { x: X(-0.23), width: 0.46 * S, y: Y(zc1), height: (zc1 - zc0 + 0.22) * S, class: liqCls, "clip-path": "url(#" + id + ")" }, g);
      [-1, 1].forEach(function (s) {
        [zc0 - 0.008, zc1 + 0.014].forEach(function (z) { el("path", { d: "M" + X(s * 0.225) + " " + Y(z) + " l" + (-s * 9) + " -5 l0 10 Z", class: "xp-yring" }, g); });
      });
      el("path", { d: d, class: "xp-tankline" }, g);
      return { liq: liq, z0: zc0 - 0.11, z1: zc1 + 0.11 };
    }
    var tLox = tank(lox, 0.66, 0.94, "xp-tank", "xp-liq-lox", "cp-lox");
    [-1, 1].forEach(function (s) { line(s * 0.225, 0.70, s * 0.19, 0.70, "xp-baffle", lox); });
    var tRp1 = tank(rp1, 1.32, 1.445, "xp-tank", "xp-liq-rp1", "cp-rp1");
    [-1, 1].forEach(function (s) { line(s * 0.225, 1.36, s * 0.19, 1.36, "xp-baffle", rp1); });

    // ---- intertank: skin, external raceway, pressurisation line
    var it = group("inter", 0, 0.44);
    [-1, 1].forEach(function (s) { rect(s * 0.217, s * 0.225, 0.955, 1.31, "xp-skin", it); });
    rect(0.226, 0.252, 0.32, 1.47, "xp-raceway", it);
    line(0.06, 0.96, 0.06, 1.30, "xp-heline", it);

    // ---- forward bay: skin, ribbed deck, ring frame
    var fwd = group("fwd", 0, 0.78);
    [-1, 1].forEach(function (s) { rect(s * 0.217, s * 0.225, 1.457, 1.78, "xp-skin", fwd); rect(s * 0.225, s * 0.195, 1.715, 1.73, "xp-frame", fwd); });
    rect(-0.217, 0.217, 1.586, 1.606, "xp-deck", fwd);
    for (var rb = -3; rb <= 3; rb++) line(rb * 0.06, 1.586, rb * 0.06, 1.574, "xp-rib", fwd);

    // ---- avionics on the deck
    var av = group("avio", 0.42, 0.86);
    rect(-0.19, -0.07, 1.606, 1.642, "xp-box xp-fc", av);
    var led = el("circle", { cx: X(-0.08), cy: Y(1.632), r: 3, class: "xp-led" }, av);
    rect(-0.06, -0.022, 1.606, 1.626, "xp-box", av);       // GNSS receiver
    rect(0.02, 0.115, 1.606, 1.672, "xp-box xp-fts", av);  // FTS unit + battery
    var led2 = el("circle", { cx: X(0.105), cy: Y(1.66), r: 3, class: "xp-led" }, av);
    rect(0.125, 0.175, 1.606, 1.64, "xp-box", av);         // telemetry radio
    rect(-0.05, 0.0, 1.552, 1.584, "xp-box xp-imu", av);   // IMU under the deck
    rect(0.05, 0.155, 1.546, 1.584, "xp-box", av);         // avionics battery

    // ---- pressurant: COPV, ring, band, regulator
    var cp = group("copv", 0, 0.98);
    [-1, 1].forEach(function (s) { line(s * 0.105, 1.726, s * 0.217, 1.726, "xp-strutthin", cp); });
    el("circle", { cx: X(0), cy: Y(1.726), r: 0.103 * S, class: "xp-copv" }, cp);
    line(-0.103, 1.726, 0.103, 1.726, "xp-band", cp);
    rect(-0.08, 0.08, 1.611, 1.624, "xp-frame", cp);
    rect(-0.175, -0.125, 1.645, 1.69, "xp-reg", cp);

    // ---- nose: radome + GNSS antenna
    var nose = group("nose", 0, 1.12);
    el("path", { d: "M" + X(-0.225) + " " + Y(1.78) + " A" + 0.225 * S + " " + 0.105 * S + " 0 0 1 " + X(0.225) + " " + Y(1.78) + " Z", class: "xp-radome" }, nose);
    rect(-0.04, 0.04, 1.79, 1.806, "xp-ant", nose);
    var arcs = el("g", { class: "xp-anim xp-arcs" }, nose);
    [0, 1, 2].forEach(function (i) {
      el("path", { d: "M" + X(-0.05 - i * 0.03) + " " + Y(1.86 + i * 0.035) + " Q" + X(0) + " " + Y(1.9 + i * 0.05) + " " + X(0.05 + i * 0.03) + " " + Y(1.86 + i * 0.035), class: "xp-arc", style: "animation-delay:" + (i * 0.4) + "s" }, arcs);
    });

    // ---- steps: which groups light up, and the call-outs (group, r, z, side, text)
    var STEPS = [
      { on: null, labels: [] },
      { on: ["nose", "copv"], labels: [
        ["nose", 0.17, 1.83, "r", "Glass-fibre radome"], ["nose", 0, 1.80, "l", "GNSS antenna"],
        ["copv", -0.09, 1.76, "l", "Helium COPV"], ["copv", 0.16, 1.726, "r", "Equator band and struts"],
        ["copv", -0.15, 1.668, "l", "Regulator and latch valve"], ["copv", 0.07, 1.618, "r", "COPV ring frame"]] },
      { on: ["fwd", "avio"], labels: [
        ["avio", -0.13, 1.642, "l", "Flight computer FC-0"], ["avio", -0.04, 1.626, "l", "RTK GNSS receiver"],
        ["avio", 0.07, 1.672, "r", "Flight termination unit"], ["avio", 0.15, 1.64, "r", "Telemetry radio"],
        ["avio", -0.025, 1.552, "l", "Tactical-grade IMU"], ["avio", 0.1, 1.546, "r", "Avionics battery"],
        ["fwd", -0.2, 1.596, "l", "Ribbed deck"]] },
      { on: ["lox", "rp1", "inter"], labels: [
        ["rp1", 0.12, 1.5, "r", "RP-1 tank"], ["lox", 0.12, 0.98, "r", "Liquid-oxygen tank"],
        ["rp1", -0.225, 1.31, "l", "Y-ring at each weld"], ["lox", -0.2, 0.70, "l", "Slosh baffle"],
        ["inter", 0.24, 1.2, "r", "External raceway"], ["inter", 0.06, 1.1, "l", "Pressurisation line"]] },
      { on: ["feed"], labels: [
        ["feed", -0.125, 0.41, "l", "LOX e-pump"], ["feed", 0.125, 0.41, "r", "RP-1 e-pump"],
        ["feed", -0.125, 0.47, "l", "Pre-valve"], ["feed", 0.125, 0.27, "r", "Main valve"],
        ["feed", 0.05, 0.16, "r", "Flexible hose"], ["feed", -0.2, 0.535, "l", "Fill and drain QD"]] },
      { on: ["engine"], labels: [
        ["engine", -0.05, 0.05, "l", "Regeneratively cooled chamber"], ["engine", -0.06, 0.245, "l", "Pintle injector"],
        ["engine", 0.1, 0.24, "r", "Spark-torch igniter"], ["engine", 0, 0.35, "r", "Cardan joint"],
        ["engine", 0.16, 0.29, "r", "Electromechanical actuator"], ["engine", -0.085, 0.17, "l", "Actuator ring"]] },
      { on: ["power"], labels: [
        ["power", 0.205, 0.2, "r", "LiPo pump battery"], ["power", -0.2, 0.19, "l", "Pump inverters INV-1"],
        ["power", 0.115, 0.06, "r", "Power distribution unit"], ["power", -0.1, 0.035, "l", "Radar altimeter"]] },
      { on: ["aft"], labels: [
        ["aft", -0.22, 0.6, "l", "Aft skirt"], ["aft", 0.17, 0.415, "r", "Crossed box beams"],
        ["aft", -0.06, 0.442, "l", "Centre plate"], ["aft", 0.22, 0.451, "r", "Leg and thrust-ring frame"],
        ["aft", -0.205, 0.225, "l", "Doubler plates"], ["aft", 0.2, 0.008, "r", "Base frame"]] },
      { on: ["legL", "legR"], labels: [
        ["legR", 0.4, 0.29, "r", "Coil-over shock and honeycomb"], ["legL", -0.6, -0.12, "l", "Primary strut"],
        ["legR", 0.58, -0.17, "r", "Secondary struts"], ["legL", -0.241, 0.45, "l", "Clevis"],
        ["legR", 0.9, -0.45, "r", "Foot and contact switch"], ["legL", -0.87, -0.39, "l", "Rod end"]] }
    ];
    var labG = el("g", { class: "xp-labels" }, svg);
    var step = 0, pT = 0, pV = reduce ? 0 : 0, ph = 0;

    function offs(id, p) { var g = G[id]; return [g.dx * p, g.dz * p]; }
    function place(p) {
      for (var id in G) {
        var o = offs(id, p);
        G[id].g.setAttribute("transform", "translate(" + (o[0] * S).toFixed(1) + " " + (-o[1] * S).toFixed(1) + ")");
      }
    }
    function labels(p) {
      while (labG.firstChild) labG.removeChild(labG.firstChild);
      var L = STEPS[step].labels;
      if (!L.length || p < 0.6) return;
      var items = L.map(function (l) {
        var o = offs(l[0], p);
        return { ax: X(l[1] + o[0]), ay: Y(l[2] + o[1]), side: l[3], text: l[4] };
      });
      ["l", "r"].forEach(function (side) {                // spread labels on each side so they don't collide
        var it = items.filter(function (i) { return i.side === side; }).sort(function (a, b) { return a.ay - b.ay; });
        var last = -1e9;
        it.forEach(function (i) { i.ly = Math.max(i.ay, last + 40); last = i.ly; });
        it.forEach(function (i) {
          var lx = side === "l" ? 14 : 686;
          var g = el("g", { class: "xp-lab" }, labG);
          el("path", { d: "M" + i.ax + " " + i.ay + " L" + (side === "l" ? lx + 150 : lx - 150) + " " + i.ly + " L" + (side === "l" ? lx + 6 : lx - 6) + " " + i.ly, class: "xp-leader" }, g);
          el("circle", { cx: i.ax, cy: i.ay, r: 3.5, class: "xp-dot" }, g);
          el("text", { x: lx, y: i.ly - 6, "text-anchor": side === "l" ? "start" : "end", class: "xp-ltext" }, g).textContent = i.text;
        });
      });
    }
    function highlight() {
      var on = STEPS[step].on;
      for (var id in G) G[id].g.classList.toggle("dim", !!on && on.indexOf(id) < 0);
      svg.setAttribute("data-step", step);
    }
    var lastLabP = -1;
    function frame(t) {
      pV += (pT - pV) * 0.12;
      if (Math.abs(pT - pV) < 0.002) pV = pT;
      place(pV);
      if (Math.abs(pV - lastLabP) > 0.004 || lastLabP < 0) { labels(pV); lastLabP = pV; }
      ph = t / 1000;
      var s = step;
      setGimbal(s === 5 && !reduce ? 10 * Math.sin(ph * 1.6) : 0);
      plume.style.opacity = s === 5 ? 0.85 : 0;              // steady plume while the gimbal sweeps
      impellers.forEach(function (im, i) {
        var a = s === 4 && !reduce ? (ph * 720 * (i ? -1 : 1)) % 360 : 0;
        var cx = im.getAttribute("x1");
        im.setAttribute("transform", "rotate(" + a.toFixed(1) + " " + cx + " " + ((+im.getAttribute("y1") + +im.getAttribute("y2")) / 2) + ")");
      });
      [tLox, tRp1].forEach(function (tk) {              // tanks drawn at a fixed fill (no animation)
        var ztop = tk.z0 + (tk.z1 - tk.z0) * 0.82;
        tk.liq.setAttribute("y", Y(ztop)); tk.liq.setAttribute("height", (ztop - tk.z0 + 0.01) * S);
      });
      ["legL", "legR"].forEach(function (id) {
        var a = G[id].anim, k = s === 8 && !reduce ? 0.06 + 0.06 * Math.sin(ph * 2.4) : 0.12;
        a.piston.setAttribute("x2", X(a.Sx + (a.F[0] - a.A[0]) * k)); a.piston.setAttribute("y2", Y(a.Sz + (a.F[1] - a.A[1]) * k));
        a.sw.classList.toggle("on", s === 8 && Math.sin(ph * 2.4) < -0.3);
      });
    }

    var stepEls = document.querySelectorAll(".xp-step"), xp = document.getElementById("xp");
    function onScroll() {
      var r = xp.getBoundingClientRect(), vh = window.innerHeight;
      pT = clamp((vh * 0.55 - r.top) / (vh * 0.7), 0, 1);       // comes apart over the first screen of the section
      var best = 0, bestD = 1e9;
      stepEls.forEach(function (e, i) {
        var b = e.getBoundingClientRect(), d = Math.abs(b.top + b.height / 2 - vh * 0.55);
        if (b.top < vh * 0.8 && d < bestD) { bestD = d; best = i; }
      });
      if (r.top > vh * 0.4) best = 0;
      if (best !== step) {
        step = best; highlight(); lastLabP = -1;
        stepEls.forEach(function (e, i) { e.classList.toggle("on", i === step); });
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    highlight(); onScroll(); pV = pT; place(pV); labels(pV);
    var running = false;
    if ("IntersectionObserver" in window)
      new IntersectionObserver(function (es) { running = es[0].isIntersecting; if (running) requestAnimationFrame(loop); }).observe(xp);
    else { running = true; requestAnimationFrame(loop); }
    function loop(t) { frame(t); if (running) requestAnimationFrame(loop); }
    if (/[?&]debug=1/.test(location.search))
      window.__xp = function (st, p) { step = st; pT = pV = p; highlight(); lastLabP = -1; frame(performance.now()); stepEls.forEach(function (e, i) { e.classList.toggle("on", i === step); }); return step; };
  })();
})();
