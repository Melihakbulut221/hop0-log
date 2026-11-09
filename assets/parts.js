/* Hop-0 site: the vehicle taken apart.
 * - exploded view: a section of the CAD model (research/cad, v0.3) that comes apart as you scroll, one subsystem per step
 * - boards: the three PCBs drawn from their KiCad layouts (connector and IC positions in mm), connectors explained on hover
 * - wiring: how the boards, sensors, actuators and power connect, with the connector on each end
 * Geometry is simplified for legibility; positions and heights follow the CAD and board files. No dependencies. */
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
      plume.style.opacity = s === 5 ? (0.7 + 0.3 * Math.sin(ph * 31)).toFixed(2) : 0;
      impellers.forEach(function (im, i) {
        var a = s === 4 && !reduce ? (ph * 720 * (i ? -1 : 1)) % 360 : 0;
        var cx = im.getAttribute("x1");
        im.setAttribute("transform", "rotate(" + a.toFixed(1) + " " + cx + " " + ((+im.getAttribute("y1") + +im.getAttribute("y2")) / 2) + ")");
      });
      [tLox, tRp1].forEach(function (tk, i) {          // tanks drain during the tank step
        var f = s === 3 && !reduce ? 0.15 + 0.75 * (0.5 + 0.5 * Math.cos(ph * 0.7 + i)) : 0.82;
        var ztop = tk.z0 + (tk.z1 - tk.z0) * f;
        tk.liq.setAttribute("y", Y(ztop)); tk.liq.setAttribute("height", (ztop - tk.z0 + 0.01) * S);
      });
      ["legL", "legR"].forEach(function (id) {
        var a = G[id].anim, k = s === 8 && !reduce ? 0.06 + 0.06 * Math.sin(ph * 2.4) : 0.12;
        a.piston.setAttribute("x2", X(a.Sx + (a.F[0] - a.A[0]) * k)); a.piston.setAttribute("y2", Y(a.Sz + (a.F[1] - a.A[1]) * k));
        a.sw.classList.toggle("on", s === 8 && Math.sin(ph * 2.4) < -0.3);
      });
      led.classList.toggle("on", s === 2 && Math.floor(ph * 2) % 2 === 0);
      led2.classList.toggle("on", s === 2 && Math.floor(ph * 2 + 1) % 2 === 0);
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

  /* ================================================================== boards */
  var GH = function (n) { return [1.25 * (n - 1) + 4.5, 5]; };      // JST GH body, mm (approx.)
  var MF = function (n) { return [3 * n + 3.5, 9]; };               // Molex Micro-Fit 3.0, 2 rows
  var BOARDS = {
    fc0: { w: 120, h: 90, holes: [[4, 4], [116, 4], [4, 86], [116, 86]],
      zones: [], ics: [
        [60, 46, 20, 20, "MCU", "STM32H723, Cortex-M7"], [102, 22, 17, 22, "GNSS", "u-blox ZED-F9P RTK"], [60, 70, 4.5, 3, "IMU", "BMI088"],
        [70, 72, 2.5, 2.5, "Baro", "LPS22DF"], [98, 58, 4, 4, "PHY", "Ethernet PHY"], [49, 75.5, 10.3, 7.5, "ISO", "ISO7741 isolator (FTS)"],
        [84, 42, 5.3, 5.3, "Log", "16 MB QSPI flash"], [84, 52, 4.9, 3.9, "FRAM", "FRAM"], [17, 46, 4.9, 3.9, "5V", "buck regulator"],
        [28, 63, 5, 4.4, "eFuse", "input eFuse"], [16, 16, 4.9, 3.9, "CAN", "CAN-FD transceiver"], [28, 16, 4.9, 3.9, "CAN", "CAN-FD transceiver"],
        [41, 16, 4.9, 3.9, "CAN", "CAN-FD transceiver"]],
      conns: [
        ["J1", 4.5, 66, MF(2), "Power in, 9–36 V from the avionics battery", "Molex Micro-Fit 3.0, 2×2"],
        ["J2", 16, 4.5, GH(3), "CAN-FD 1: propulsion bus to the engine controller", "JST GH 3-pin"],
        ["J3", 28, 4.5, GH(3), "CAN-FD 2: gimbal actuators and RCS valve driver", "JST GH 3-pin"],
        ["J4", 41, 4.5, GH(4), "CAN-FD 3: auxiliary bus + 5 V", "JST GH 4-pin"],
        ["J5", 83, 4.5, GH(6), "RS-422 for an external INS + 5 V", "JST GH 6-pin"],
        ["J6", 118, 20, [10, 6.5], "GNSS antenna, active, 3.3 V bias", "SMA, RG-316 cable"],
        ["J7", 55, 4.5, GH(6), "Telemetry radio: UART with flow control + 5 V", "JST GH 6-pin"],
        ["J8", 69, 4.5, GH(4), "Radar altimeter: UART + 5 V", "JST GH 4-pin"],
        ["J9", 24, 85.5, GH(8), "External IMU (ADIS16470): SPI + 3.3 V", "JST GH 8-pin"],
        ["J10", 38, 85.5, GH(6), "Four leg contact switches and the arm plug", "JST GH 6-pin"],
        ["J11", 52, 85.5, GH(6), "Flight termination: abort request, heartbeat, status (isolated)", "JST GH 6-pin"],
        ["J12", 66, 85.5, GH(6), "Four 0–5 V analog inputs + 5 V", "JST GH 6-pin"],
        ["J13", 80, 86.5, [9, 7], "USB-C: configuration and log download (bench)", "USB-C"],
        ["J14", 97, 78, [16, 18], "Ethernet: hardware-in-the-loop bench and ground", "RJ45"],
        ["J15", 84, 30, [7, 7], "Debug (SWD)", "Cortex 10-pin, 1.27 mm"]] },
    ecu: { w: 150, h: 110, holes: [[4, 4], [146, 4], [4, 106], [146, 106]],
      zones: [[4, 16, 50, 80, "Power input, protection, regulators"], [102, 20, 30, 84, "Valve and igniter drivers ×8"], [12, 86, 100, 14, "Pressure, thermocouple and RTD front ends"]],
      ics: [[68, 54, 14, 14, "MCU", "STM32G474"], [36, 15, 4.9, 3.9, "CAN", "CAN-FD transceiver"], [50, 15, 4.9, 3.9, "CAN", "CAN-FD transceiver"], [66, 15, 4.9, 3.9, "CAN", "CAN-FD transceiver"]],
      conns: [
        ["J1", 5, 24, MF(2), "Power in, 18–32 V vehicle bus", "Molex Micro-Fit 3.0, 2×2"],
        ["J2", 50, 34, [7, 7], "Debug (SWD)", "Cortex 10-pin, 1.27 mm"],
        ["J3", 36, 4.5, GH(3), "CAN-FD to the flight computer (FC-0 J2)", "JST GH 3-pin"],
        ["J4", 49, 4.5, GH(3), "CAN-FD to the test stand", "JST GH 3-pin"],
        ["J5", 64, 4.5, GH(6), "LOX pump inverter: CAN-FD, 12 V, enable, fault", "JST GH 6-pin"],
        ["J6", 80, 4.5, GH(6), "RP-1 pump inverter: CAN-FD, 12 V, enable, fault", "JST GH 6-pin"],
        ["J7", 98, 4.5, GH(8), "Arming chain: arm plug, flight termination, flight-computer arm", "JST GH 8-pin"],
        ["J8", 116, 4.5, GH(3), "Optical flame sensor", "JST GH 3-pin"],
        ["J9", 144, 34, MF(4), "Valves 1–4 (armed supply + low-side switch)", "Molex Micro-Fit 3.0, 2×4"],
        ["J10", 144, 72, MF(4), "Valves 5–8, igniter spark unit, PDU pre-charge and contactor", "Molex Micro-Fit 3.0, 2×4"],
        ["J17", 144, 93, MF(4), "Proportional coolant-return valve", "Molex Micro-Fit 3.0, 2×4"],
        ["J11", 20, 105.5, GH(12), "Pressure sensors 1–4", "JST GH 12-pin"],
        ["J12", 42, 105.5, GH(12), "Pressure sensors 5–8", "JST GH 12-pin"],
        ["J13", 60, 105.5, GH(6), "Pressure sensors 9–10", "JST GH 6-pin"],
        ["J14", 78, 105.5, GH(8), "Four thermocouples", "JST GH 8-pin"],
        ["J15", 98, 105.5, GH(8), "Two RTDs, 4-wire", "JST GH 8-pin"],
        ["J16", 114, 105.5, GH(6), "Valve position sensors", "JST GH 6-pin"]] },
    inv: { w: 150, h: 105, holes: [],
      zones: [[14, 4, 32, 33, "Phase A"], [54, 4, 32, 33, "Phase B"], [94, 4, 32, 33, "Phase C"], [10, 72, 135, 28, "Logic: MCU, sensing, CAN"]],
      ics: [[60, 89, 10, 10, "MCU", "STM32G474"], [50, 47, 5, 5, "Driver", "6ED2742 gate driver, 160 V"],
        [23, 12, 7, 9, "Q", "MOSFET 150 V"], [37, 12, 7, 9, "Q", "MOSFET 150 V"], [23, 29, 7, 9, "Q", "MOSFET 150 V"], [37, 29, 7, 9, "Q", "MOSFET 150 V"],
        [63, 12, 7, 9, "Q", "MOSFET 150 V"], [77, 12, 7, 9, "Q", "MOSFET 150 V"], [63, 29, 7, 9, "Q", "MOSFET 150 V"], [77, 29, 7, 9, "Q", "MOSFET 150 V"],
        [103, 12, 7, 9, "Q", "MOSFET 150 V"], [117, 12, 7, 9, "Q", "MOSFET 150 V"], [103, 29, 7, 9, "Q", "MOSFET 150 V"], [117, 29, 7, 9, "Q", "MOSFET 150 V"],
        [30, 42, 8, 3, "Rs", "phase shunt"], [70, 42, 8, 3, "Rs", "phase shunt"], [110, 42, 8, 3, "Rs", "phase shunt"], [18, 52, 8, 3, "Rs", "DC-bus shunt"]],
      conns: [
        ["J1", 9, 14, "stud", "DC+ from the laminated DC bus", "M5 stud"],
        ["J2", 9, 40, "stud", "DC− (return)", "M5 stud"],
        ["J3", 141, 14, "stud", "Motor phase A", "M5 stud"],
        ["J4", 141, 30, "stud", "Motor phase B", "M5 stud"],
        ["J5", 141, 46, "stud", "Motor phase C", "M5 stud"],
        ["J6", 96, 100.5, GH(6), "Engine-controller harness: CAN-FD, 12 V, enable, fault (mates ECU-1 J5 or J6)", "JST GH 6-pin"],
        ["J7", 30, 91, [7, 7], "Debug (SWD)", "Cortex 10-pin, 1.27 mm"],
        ["J8", 116, 100.5, GH(7), "Motor: three hall sensors, 5 V, temperature sensor", "JST GH 7-pin"]] }
  };

  function drawBoard(host, key) {
    var B = BOARDS[key], M = 8, k = 6;              // 6 px per mm in the viewBox
    var W = (B.w + 2 * M) * k, H = (B.h + 2 * M) * k;
    var s = el("svg", { viewBox: "0 0 " + W + " " + H, class: "pcb", role: "img", "aria-label": "Layout of " + key + " with connectors" }, host);
    var P = function (v) { return (v + M) * k; };
    var outline = el("rect", { x: P(0), y: P(0), width: B.w * k, height: B.h * k, rx: 2 * k, class: "pcb-board" }, s);
    var traces = el("g", { class: "pcb-traces" }, s);
    B.zones.forEach(function (z) {
      el("rect", { x: P(z[0]), y: P(z[1]), width: z[2] * k, height: z[3] * k, rx: 6, class: "pcb-zone" }, s);
      el("text", { x: P(z[0]) + 8, y: P(z[1]) + 18, class: "pcb-zlab" }, s).textContent = z[4];
    });
    B.holes.forEach(function (h) { el("circle", { cx: P(h[0]), cy: P(h[1]), r: 1.6 * k, class: "pcb-hole" }, s); });
    var mcu = B.ics[0];
    var ics = B.ics.map(function (c, i) {
      var g = el("g", { class: "pcb-ic" + (i === 0 ? " mcu" : "") }, s);
      el("rect", { x: P(c[0] - c[2] / 2), y: P(c[1] - c[3] / 2), width: c[2] * k, height: c[3] * k, rx: 2 }, g);
      if (c[2] >= 4.4 || c[4] === "Q") el("text", { x: P(c[0]), y: P(c[1]) + 5, "text-anchor": "middle" }, g).textContent = c[4] === "Q" ? "" : c[4];
      el("title", {}, g).textContent = c[5];
      return g;
    });
    var items = B.conns.map(function (c) {
      var g = el("g", { class: "pcb-conn", tabindex: 0, "data-ref": c[0] }, s);
      var x = c[1], y = c[2], d;
      if (c[3] === "stud") {
        el("circle", { cx: P(x), cy: P(y), r: 4.6 * k }, g);
        el("circle", { cx: P(x), cy: P(y), r: 2.6 * k, class: "hole" }, g);
      } else {
        d = c[3].slice();
        if (x < 10 || x > B.w - 10) d = [d[1], d[0]];     // left/right-edge connectors stand vertical
        el("rect", { x: P(x - d[0] / 2), y: P(y - d[1] / 2), width: d[0] * k, height: d[1] * k, rx: 2 }, g);
      }
      var hh = d ? d[1] : 9.2, ty = y < 10 ? P(y) + 5.5 * k + 6 : (y > B.h - 12 ? P(y) - 4.2 * k : (x < 10 || x > B.w - 10 ? P(y) + 5 : P(y) + hh / 2 * k + 18));
      var tx = x < 10 ? P(x) + 7 * k : (x > B.w - 10 ? P(x) - 7 * k : P(x));
      el("text", { x: tx, y: ty, "text-anchor": x < 10 ? "start" : (x > B.w - 10 ? "end" : "middle"), class: "pcb-ref" }, g).textContent = c[0];
      // trace to the MCU (schematic, for the draw-in animation)
      var t = el("path", { d: "M" + P(x) + " " + P(y) + " L" + P(x) + " " + P((y + mcu[1]) / 2) + " L" + P(mcu[0]) + " " + P((y + mcu[1]) / 2) + " L" + P(mcu[0]) + " " + P(mcu[1]), class: "pcb-trace" }, traces);
      return { g: g, t: t, c: c };
    });
    // draw-in when the board becomes visible
    var Lo = 2 * (B.w + B.h) * k;
    outline.style.strokeDasharray = Lo; outline.style.strokeDashoffset = reduce ? 0 : Lo;
    items.forEach(function (it) { var L = it.t.getTotalLength(); it.t.style.strokeDasharray = L; it.t.style.strokeDashoffset = reduce ? 0 : L; it.L = L; it.g.style.opacity = reduce ? 1 : 0; });
    ics.forEach(function (g) { g.style.opacity = reduce ? 1 : 0; });
    var shown = reduce;
    function play() {
      if (shown) return; shown = true;
      var t0 = performance.now();
      (function f(now) {
        var u = Math.min(1, (now - t0) / 2200);
        outline.style.strokeDashoffset = Lo * (1 - Math.min(1, u * 2.5));
        ics.forEach(function (g, i) { g.style.opacity = clamp((u - 0.25 - i * 0.012) * 6, 0, 1); });
        items.forEach(function (it, i) {
          var v = clamp((u - 0.35 - i * 0.025) * 3, 0, 1);
          it.t.style.strokeDashoffset = it.L * (1 - v); it.g.style.opacity = clamp(v * 2, 0, 1);
        });
        if (u < 1) requestAnimationFrame(f);
      })(/[?&]debug=1/.test(location.search) ? t0 + 2200 : t0);
    }
    return { svg: s, items: items, play: play };
  }

  document.querySelectorAll("[data-board]").forEach(function (panel) {
    var key = panel.getAttribute("data-board"), fig = panel.querySelector(".pcb-fig"), list = panel.querySelector(".pcb-list"),
        info = panel.querySelector(".pcb-info");
    var bd = drawBoard(fig, key);
    var def = info ? info.innerHTML : "";
    bd.items.forEach(function (it) {
      var li = document.createElement("li");
      li.innerHTML = "<b>" + it.c[0] + "</b><span>" + it.c[4] + "</span><em>" + it.c[5] + "</em>";
      li.tabIndex = 0; list.appendChild(li); it.li = li;
      function on() {
        bd.items.forEach(function (o) { o.g.classList.toggle("hl", o === it); o.li.classList.toggle("hl", o === it); o.t.classList.toggle("hl", o === it); });
        fig.classList.add("dim");
        if (info) info.innerHTML = "<b>" + it.c[0] + "</b> " + it.c[4] + " <em>" + it.c[5] + "</em>";
      }
      function off() {
        bd.items.forEach(function (o) { o.g.classList.remove("hl"); o.li.classList.remove("hl"); o.t.classList.remove("hl"); });
        fig.classList.remove("dim"); if (info) info.innerHTML = def;
      }
      [it.g, li].forEach(function (n) { n.addEventListener("mouseenter", on); n.addEventListener("focus", on); n.addEventListener("mouseleave", off); n.addEventListener("blur", off); });
    });
    panel.__play = bd.play;
    if (!panel.hidden) {
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { bd.play(); io.disconnect(); } }, { threshold: 0.3 });
        io.observe(fig);
      } else bd.play();
    }
  });
  // board tabs
  var tabs = document.querySelectorAll("#board-tabs button");
  tabs.forEach(function (b) {
    b.addEventListener("click", function () {
      tabs.forEach(function (o) { var on = o === b; o.setAttribute("aria-selected", on ? "true" : "false"); o.tabIndex = on ? 0 : -1;
        var p = document.getElementById(o.getAttribute("aria-controls")); p.hidden = !on; if (on && p.__play) p.__play(); });
    });
    b.addEventListener("keydown", function (e) {
      var i = Array.prototype.indexOf.call(tabs, b), n = null;
      if (e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length]; else if (e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (n) { e.preventDefault(); n.focus(); n.click(); }
    });
  });

  /* ================================================================== wiring */
  var wsvg = document.getElementById("wire-svg");
  if (wsvg) (function () {
    var N = {   // id: [x, y, w, h, label, kind]
      gnss: [20, 30, 150, 44, "GNSS antenna", "dev"], radar: [20, 92, 150, 44, "Radar altimeter", "dev"],
      tlm: [20, 154, 150, 44, "Telemetry radio", "dev"], imu: [20, 216, 150, 44, "External IMU", "dev"],
      legs: [20, 278, 150, 44, "Leg switches, arm plug", "dev"], fts: [250, 30, 170, 44, "Flight termination", "dev"],
      fc: [250, 150, 170, 120, "FC-0 flight computer", "board"], abat: [250, 330, 170, 44, "Avionics battery", "pwr"],
      tvc: [250, 430, 170, 44, "Gimbal actuators, RCS", "dev"], bench: [20, 430, 150, 44, "Bench: Ethernet, USB", "bench"],
      ecu: [520, 150, 170, 120, "ECU-1 engine controller", "board"], sens: [520, 30, 170, 44, "Pressure, temp. sensors", "dev"],
      flame: [520, 330, 170, 44, "Flame sensor", "dev"], valves: [520, 430, 170, 44, "Valves, igniter", "dev"],
      invl: [790, 120, 170, 64, "INV-1 LOX pump", "board"], invr: [790, 236, 170, 64, "INV-1 RP-1 pump", "board"],
      pmp: [790, 30, 170, 44, "Pump motors ×2", "dev"], pdu: [790, 360, 170, 44, "PDU + DC bus", "pwr"],
      pack: [790, 450, 170, 44, "24S pump battery", "pwr"]
    };
    // [from, to, type, title, connector detail]
    var E = [
      ["gnss", "fc", "rf", "GNSS RF", "FC-0 J6, SMA, RG-316 coax"],
      ["radar", "fc", "data", "Radar altitude", "FC-0 J8, JST GH 4-pin, UART + 5 V"],
      ["tlm", "fc", "data", "Telemetry link", "FC-0 J7, JST GH 6-pin, UART with flow control"],
      ["imu", "fc", "data", "External IMU", "FC-0 J9, JST GH 8-pin, SPI"],
      ["legs", "fc", "disc", "Touchdown and arm", "FC-0 J10, JST GH 6-pin, discrete inputs"],
      ["fts", "fc", "safe", "Flight termination", "FC-0 J11, JST GH 6-pin, galvanically isolated"],
      ["abat", "fc", "power", "Avionics power", "FC-0 J1, Molex Micro-Fit 3.0, 9–36 V"],
      ["fc", "tvc", "can", "CAN-FD 2", "FC-0 J3, JST GH 3-pin: two gimbal actuators and the RCS driver"],
      ["bench", "fc", "bench", "Bench only", "FC-0 J14 RJ45 and J13 USB-C; not connected in flight"],
      ["fc", "ecu", "can", "CAN-FD 1, propulsion bus", "FC-0 J2 to ECU-1 J3, JST GH 3-pin, end-to-end CRC and counters"],
      ["sens", "ecu", "data", "Engine sensors", "ECU-1 J11–J16, JST GH: 10 pressure, 4 thermocouple, 2 RTD, valve position"],
      ["flame", "ecu", "data", "Ignition proof", "ECU-1 J8, JST GH 3-pin"],
      ["ecu", "valves", "power", "Valves and igniter", "ECU-1 J9, J10, J17, Molex Micro-Fit 3.0 2×4, peak-and-hold drivers"],
      ["fts", "ecu", "safe", "Arming chain", "ECU-1 J7, JST GH 8-pin: arm plug AND termination unit AND flight-computer arm"],
      ["ecu", "invl", "can", "Inverter harness", "ECU-1 J5 to INV-1 J6, JST GH 6-pin: CAN-FD at 1 kHz, 12 V, enable, fault"],
      ["ecu", "invr", "can", "Inverter harness", "ECU-1 J6 to INV-1 J6, JST GH 6-pin: CAN-FD at 1 kHz, 12 V, enable, fault"],
      ["invl", "pmp", "power", "Motor phases", "INV-1 J3–J5, M5 studs; hall sensors and temperature on J8, JST GH 7-pin"],
      ["invr", "pmp", "power", "Motor phases", "INV-1 J3–J5, M5 studs; hall sensors and temperature on J8, JST GH 7-pin"],
      ["pack", "pdu", "power", "Pack to DC bus", "pre-charge resistor and contactor, switched by ECU-1"],
      ["pdu", "invr", "power", "DC bus", "INV-1 J1/J2, M5 studs, laminated bus with film capacitors"],
      ["pdu", "invl", "power", "DC bus", "INV-1 J1/J2, M5 studs"]
    ];
    var gE = el("g", {}, wsvg), gN = el("g", {}, wsvg), gP = el("g", {}, wsvg);
    function port(n, toward) {   // attachment point on the box edge facing the other node
      var b = N[n], cx = b[0] + b[2] / 2, cy = b[1] + b[3] / 2, o = N[toward], ox = o[0] + o[2] / 2, oy = o[1] + o[3] / 2;
      if (Math.abs(ox - cx) > Math.abs(oy - cy) * 1.2) return [ox > cx ? b[0] + b[2] : b[0], cy, "h"];
      return [cx, oy > cy ? b[1] + b[3] : b[1], "v"];
    }
    var edges = E.map(function (e, i) {
      var a = port(e[0], e[1]), b = port(e[1], e[0]), d;
      if (a[2] === "h" && b[2] === "h") { var mx = (a[0] + b[0]) / 2 + (i % 3 - 1) * 6; d = "M" + a[0] + " " + a[1] + " C" + mx + " " + a[1] + " " + mx + " " + b[1] + " " + b[0] + " " + b[1]; }
      else d = "M" + a[0] + " " + a[1] + " C" + a[0] + " " + (a[1] + b[1]) / 2 + " " + b[0] + " " + (a[1] + b[1]) / 2 + " " + b[0] + " " + b[1];
      var hit = el("path", { d: d, class: "w-hit", tabindex: 0 }, gE);
      var p = el("path", { d: d, class: "w-edge w-" + e[2] }, gE);
      return { p: p, hit: hit, e: e, L: 0, dots: [] };
    });
    for (var id in N) {
      var b = N[id], g = el("g", { class: "w-node w-" + b[5], "data-n": id }, gN);
      el("rect", { x: b[0], y: b[1], width: b[2], height: b[3], rx: 4 }, g);
      el("text", { x: b[0] + 12, y: b[1] + (b[3] > 60 ? 26 : b[3] / 2 + 5) }, g).textContent = b[4];
      N[id].g = g;
    }
    // board nodes list their connectors
    [["fc", "J1–J15 · 120 × 90 mm"], ["ecu", "J1–J17 · 150 × 110 mm"], ["invl", "J1–J8"], ["invr", "J1–J8"]].forEach(function (x) {
      var b = N[x[0]]; el("text", { x: b[0] + 12, y: b[1] + (b[3] > 60 ? 48 : b[3] - 12), class: "w-sub" }, b.g).textContent = x[1];
    });
    var info = document.getElementById("wire-info"), def = info ? info.innerHTML : "";
    edges.forEach(function (ed) {
      ed.L = ed.p.getTotalLength();
      if (ed.e[2] === "can" || ed.e[2] === "data") for (var j = 0; j < (ed.e[2] === "can" ? 3 : 2); j++) ed.dots.push(el("circle", { r: ed.e[2] === "can" ? 4 : 3, class: "w-pkt w-pkt-" + ed.e[2] }, gP));
      function on() {
        wsvg.classList.add("dim"); ed.p.classList.add("hl");
        N[ed.e[0]].g.classList.add("hl"); N[ed.e[1]].g.classList.add("hl");
        if (info) info.innerHTML = "<b>" + ed.e[3] + "</b> " + N[ed.e[0]][4] + " → " + N[ed.e[1]][4] + ". <em>" + ed.e[4] + "</em>";
      }
      function off() {
        wsvg.classList.remove("dim"); ed.p.classList.remove("hl");
        N[ed.e[0]].g.classList.remove("hl"); N[ed.e[1]].g.classList.remove("hl");
        if (info) info.innerHTML = def;
      }
      ed.hit.addEventListener("mouseenter", on); ed.hit.addEventListener("focus", on);
      ed.hit.addEventListener("mouseleave", off); ed.hit.addEventListener("blur", off);
      ed.hit.addEventListener("click", on);
    });
    function frame(t) {
      var s = t / 1000;
      edges.forEach(function (ed, i) {
        var sp = ed.e[2] === "can" ? 0.45 : 0.28;
        ed.dots.forEach(function (dt, j) {
          var u = ((s * sp + j / ed.dots.length + i * 0.13) % 1 + 1) % 1;
          var pt = ed.p.getPointAtLength(u * ed.L);
          dt.setAttribute("cx", pt.x.toFixed(1)); dt.setAttribute("cy", pt.y.toFixed(1));
        });
      });
    }
    if (reduce) { frame(0); return; }
    var running = false;
    function loop(t) { frame(t); if (running) requestAnimationFrame(loop); }
    if ("IntersectionObserver" in window)
      new IntersectionObserver(function (es) { running = es[0].isIntersecting; if (running) requestAnimationFrame(loop); }).observe(wsvg);
    else { running = true; requestAnimationFrame(loop); }
  })();
})();
