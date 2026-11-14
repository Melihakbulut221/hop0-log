/* Hop-0 site, avionics page: the five PCBs drawn from their KiCad layouts (connector and IC positions in mm);
 * connectors explained on hover or keyboard focus of the connector list. No dependencies. */
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
  reduce = true;   // boards are drawn in their final state: the draw-in animation carried no information
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
        ["J15", 84, 30, [7, 7], "Debug (SWD)", "Cortex 10-pin, 1.27 mm"],
        ["J16", 4.5, 26, GH(2), "Arm vote to the engine controller: fail-safe discrete (mates ECU-1 J7)", "JST GH 2-pin"]] },
    ecu: { w: 150, h: 110, holes: [[4, 4], [146, 4], [4, 106], [146, 106]],
      zones: [[4, 16, 50, 80, "Power and protection"], [96, 22, 45, 81, "Valve and igniter drivers ×8, return-valve driver"], [12, 86, 100, 14, "Pressure, thermocouple and RTD front ends"]],
      ics: [[68, 54, 14, 14, "MCU", "STM32G474"], [36, 18.5, 4.9, 3.9, "CAN", "CAN-FD transceiver"], [50, 18.5, 4.9, 3.9, "CAN", "CAN-FD transceiver"], [66, 18.5, 4.9, 3.9, "CAN", "CAN-FD transceiver"]],
      conns: [
        ["J1", 5.6, 24, MF(2), "Power in, 18–32 V vehicle bus", "Molex Micro-Fit 3.0, 2×2"],
        ["J2", 50, 34, [7, 7], "Debug (SWD)", "Cortex 10-pin, 1.27 mm"],
        ["J3", 36, 4.5, GH(3), "CAN-FD to the flight computer (FC-0 J2)", "JST GH 3-pin"],
        ["J4", 49, 4.5, GH(3), "CAN-FD to the test stand", "JST GH 3-pin"],
        ["J5", 64, 4.5, GH(6), "LOX pump inverter: CAN-FD, 12 V, enable, fault (enable, fault and supply protected against a harness short to the battery)", "JST GH 6-pin"],
        ["J6", 80, 4.5, GH(6), "RP-1 pump inverter: CAN-FD, 12 V, enable, fault (enable, fault and supply protected against a harness short to the battery)", "JST GH 6-pin"],
        ["J7", 98, 4.5, GH(8), "Arming chain: arm plug, flight termination, flight-computer arm vote (protected against a harness short to the battery)", "JST GH 8-pin"],
        ["J18", 134, 4.5, GH(8), "Power-distribution status: pre-charge done, contactor closed, fault latch, bus voltage, pack voltage and bus current (mates PDU-1 J13)", "JST GH 8-pin"],
        ["J8", 116, 4.5, GH(3), "Optical flame sensor", "JST GH 3-pin"],
        ["J9", 144, 34, MF(4), "Valves 1–4 (armed supply + low-side switch)", "Molex Micro-Fit 3.0, 2×4"],
        ["J10", 144, 72, MF(4), "Valves 5–8, igniter spark unit, PDU pre-charge and contactor", "Molex Micro-Fit 3.0, 2×4"],
        ["J17", 144, 93, MF(4), "Proportional coolant-return valve", "Molex Micro-Fit 3.0, 2×4"],
        ["J11", 20, 105.5, GH(12), "Pressure sensors 1–4", "JST GH 12-pin"],
        ["J12", 42, 105.5, GH(12), "Pressure sensors 5–8", "JST GH 12-pin"],
        ["J13", 60, 105.5, GH(6), "Pressure sensors 9–10", "JST GH 6-pin"],
        ["J14", 78, 105.5, GH(8), "Four thermocouples", "JST GH 8-pin"],
        ["J15", 98, 105.5, GH(8), "Two RTDs, 4-wire", "JST GH 8-pin"],
        ["J16", 114, 105.5, GH(6), "Valve position switches (wetted from the 12 V rail, protected against a harness short to the battery)", "JST GH 6-pin"]] },
    inv: { w: 150, h: 105, holes: [[4, 4], [146, 4], [4, 101], [146, 101]],
      zones: [[18.5, 1, 40.5, 66, "Phase A"], [60.5, 1, 41, 66, "Phase B"], [102.5, 1, 41, 66, "Phase C"], [1, 9, 17, 28, "DC bus studs and DC-link shunt"], [2, 69, 146, 34, "Logic: MCU, CAN, sensing"]],
      ics: [[56, 90, 10, 10, "MCU", "STM32G474"], [13.7, 44.2, 15.6, 18.7, "OC", "DC-link forward / reverse comparators, latch and current-sense amplifier"], [35.2, 74.1, 12.0, 12.3, "OC", "leg A low-side shunt comparator with blanking"], [77.2, 74.1, 12.0, 12.3, "OC", "leg B low-side shunt comparator with blanking"], [117.4, 74.0, 15.6, 11.8, "OC", "leg C low-side shunt comparator with blanking"], [31.0, 32.4, 10, 12, "Q", "MOSFET 150 V"], [31.0, 47.8, 10, 12, "Q", "MOSFET 150 V"], [47.0, 32.4, 10, 12, "Q", "MOSFET 150 V"], [47.0, 47.8, 10, 12, "Q", "MOSFET 150 V"], [39.0, 61.1, 5.6, 10.6, "Rs", "phase shunt"], [39.0, 17.35, 31, 12, "C", "20 ceramic DC-link capacitors (top and bottom side)"], [32.9, 5.5, 25, 7, "RC", "DC-link damper: ceramic capacitors in series with power resistors"], [23.35, 48, 3, 22, "G", "gate networks of the outer switches"], [39.0, 45, 5, 20, "G", "gate networks of the inner switches"], [73.0, 32.4, 10, 12, "Q", "MOSFET 150 V"], [73.0, 47.8, 10, 12, "Q", "MOSFET 150 V"], [89.0, 32.4, 10, 12, "Q", "MOSFET 150 V"], [89.0, 47.8, 10, 12, "Q", "MOSFET 150 V"], [81.0, 61.1, 5.6, 10.6, "Rs", "phase shunt"], [81.0, 17.35, 31, 12, "C", "20 ceramic DC-link capacitors (top and bottom side)"], [74.9, 5.5, 25, 7, "RC", "DC-link damper: ceramic capacitors in series with power resistors"], [65.35, 48, 3, 22, "G", "gate networks of the outer switches"], [81.0, 45, 5, 20, "G", "gate networks of the inner switches"], [115.0, 32.4, 10, 12, "Q", "MOSFET 150 V"], [115.0, 47.8, 10, 12, "Q", "MOSFET 150 V"], [131.0, 32.4, 10, 12, "Q", "MOSFET 150 V"], [131.0, 47.8, 10, 12, "Q", "MOSFET 150 V"], [123.0, 61.1, 5.6, 10.6, "Rs", "phase shunt"], [123.0, 17.35, 31, 12, "C", "20 ceramic DC-link capacitors (top and bottom side)"], [116.9, 5.5, 25, 7, "RC", "DC-link damper: ceramic capacitors in series with power resistors"], [107.35, 48, 3, 22, "G", "gate networks of the outer switches"], [123.0, 45, 5, 20, "G", "gate networks of the inner switches"], [19.5, 29.5, 10.6, 5.6, "Rs", "DC-bus shunt"], [39.0, 45.15, 4, 4, "Drv", "half-bridge gate driver, 180 V (leg A)"], [81.0, 45.15, 4, 4, "Drv", "half-bridge gate driver, 180 V (leg B)"], [123.0, 45.15, 4, 4, "Drv", "half-bridge gate driver, 180 V (leg C)"]],
      conns: [
        ["J1", 8, 16, "stud", "DC+ from the capacitor board CB-1 (12 mm from J2)", "M5 press-fit stud"],
        ["J2", 8, 28, "stud", "DC- (return) from the capacitor board CB-1", "M5 press-fit stud"],
        ["J3", 59, 40.1, "stud", "Motor phase A", "M5 press-fit stud"],
        ["J4", 101, 40.1, "stud", "Motor phase B", "M5 press-fit stud"],
        ["J5", 143, 40.1, "stud", "Motor phase C", "M5 press-fit stud"],
        ["J6", 104, 100.5, GH(6), "Engine-controller harness: CAN-FD, 12 V, enable, fault (mates ECU-1 J5 or J6)", "JST GH 6-pin"],
        ["J7", 30, 92, [7, 7], "Debug (SWD)", "Cortex 10-pin, 1.27 mm"],
        ["J8", 124, 100.5, GH(7), "Motor: three hall sensors, 5 V, temperature sensor", "JST GH 7-pin"]] },
    pdu: {"w": 185.0, "h": 110.0, "holes": [[4.0, 4.0], [4.0, 106.0], [181.0, 4.0], [181.0, 106.0]], "zones": [[1, 1, 54.5, 108, "Logic, vehicle-bus side"], [55.5, 1, 7, 108, "Isolation barrier"], [63.5, 22, 66, 24, "Pre-charge"], [63.5, 47, 66, 19, "Active discharge"], [63.5, 66, 66, 42, "Isolated sensing"], [130, 22, 54, 86, "DC bus studs and copper planes"]], "ics": [[44.0, 29.9, 5.5, 3.5, "Logic", "Hardware interlock: pre-charge window, over-current latch, contactor enable"], [112.5, 12.0, 54.1, 30.1, "Fuse", "Main fuse, bolted between two studs"], [113.0, 98.0, 85.1, 20.1, "Shunt", "Bus current shunt, bolted between two studs"], [59.0, 36.0, 13.0, 6.4, "ISO", "Isolated switch driver, pre-charge"], [59.0, 55.0, 13.0, 6.4, "ISO", "Isolated switch driver, discharge"], [59.0, 67.9, 11.9, 11.0, "ISO", "Isolated 5 V supply"], [59.0, 79.0, 13.0, 6.4, "ISO", "Isolated amplifier, pack voltage"], [59.0, 89.0, 13.0, 6.4, "ISO", "Isolated amplifier, bus voltage"], [59.0, 99.0, 13.0, 6.4, "ISO", "Isolated amplifier, bus current"], [72.2, 32.2, 7.2, 5.7, "Q", "Pre-charge switch"], [72.2, 51.2, 7.2, 5.7, "Q", "Discharge switch"]], "conns": [["J1", 75.0, 12.0, "stud", "Pump battery positive in; also the fuse's first terminal", "M8 ring lug"], ["J2", 150.0, 12.0, "stud", "Fused positive, cable to the contactor", "M8 ring lug"], ["J3", 173.0, 28.0, "stud", "DC bus positive, back from the contactor", "M8 ring lug"], ["J4", 175.0, 46.0, "stud", "DC bus positive to the LOX inverter's capacitor board", "M6 ring lug"], ["J5", 175.0, 77.0, "stud", "DC bus positive to the RP-1 inverter's capacitor board", "M6 ring lug"], ["J6", 83.0, 98.0, "stud", "Pump battery negative in; also the shunt's first terminal", "M6 ring lug"], ["J7", 143.0, 98.0, "stud", "DC bus negative, after the current shunt", "Shunt tab"], ["J8", 175.0, 61.0, "stud", "DC bus negative to the LOX inverter's capacitor board", "M6 ring lug"], ["J9", 175.0, 92.0, "stud", "DC bus negative to the RP-1 inverter's capacitor board", "M6 ring lug"], ["J10", 4.0, 36.0, [9.8, 11.2], "Pre-charge and contactor commands from the engine controller", "Molex Micro-Fit 3.0, 2x2"], ["J11", 4.0, 16.0, [9.8, 11.2], "Logic power from the vehicle bus", "Molex Micro-Fit 3.0, 2x2"], ["J12", 4.0, 56.0, [9.8, 14.2], "Contactor coil and auxiliary contact", "Molex Micro-Fit 3.0, 2x3"], ["J13", 4.5, 86.0, [6.4, 14.5], "Isolated status to the engine controller: pre-charge done, contactor closed, fault latch, bus voltage and current", "JST GH 8-pin"], ["J14", 90.0, 82.0, [7.0, 6.4], "Shunt sense wires (Kelvin)", "JST GH 2-pin"]], "oriented": true},
    cb: {"w": 168.0, "h": 158.0, "holes": [[3.2, 3.2], [3.2, 154.8], [149.0, 154.8], [149.0, 3.2]], "zones": [[6, 7, 141, 147, "Film capacitor array"], [150, 3, 17, 36, "Inverter interface"]], "ics": [[158, 22, 12, 30, "Bus", "laminated bus: DC+ and DC- planes stacked 0.2 mm apart"], [24.0, 19.0, 32, 22, "C", "10 uF polypropylene film capacitor"], [59.0, 19.0, 32, 22, "C", "10 uF polypropylene film capacitor"], [94.0, 19.0, 32, 22, "C", "10 uF polypropylene film capacitor"], [129.0, 19.0, 32, 22, "C", "10 uF polypropylene film capacitor"], [24.0, 43.5, 32, 22, "C", "10 uF polypropylene film capacitor"], [59.0, 43.5, 32, 22, "C", "10 uF polypropylene film capacitor"], [94.0, 43.5, 32, 22, "C", "10 uF polypropylene film capacitor"], [129.0, 43.5, 32, 22, "C", "10 uF polypropylene film capacitor"], [24.0, 68.0, 32, 22, "C", "10 uF polypropylene film capacitor"], [59.0, 68.0, 32, 22, "C", "10 uF polypropylene film capacitor"], [94.0, 68.0, 32, 22, "C", "10 uF polypropylene film capacitor"], [129.0, 68.0, 32, 22, "C", "10 uF polypropylene film capacitor"], [24.0, 92.5, 32, 22, "C", "10 uF polypropylene film capacitor"], [59.0, 92.5, 32, 22, "C", "10 uF polypropylene film capacitor"], [94.0, 92.5, 32, 22, "C", "10 uF polypropylene film capacitor"], [129.0, 92.5, 32, 22, "C", "10 uF polypropylene film capacitor"], [24.0, 117.0, 32, 22, "C", "10 uF polypropylene film capacitor"], [59.0, 117.0, 32, 22, "C", "10 uF polypropylene film capacitor"], [94.0, 117.0, 32, 22, "C", "10 uF polypropylene film capacitor"], [129.0, 117.0, 32, 22, "C", "10 uF polypropylene film capacitor"], [24.0, 141.5, 32, 22, "C", "10 uF polypropylene film capacitor"], [59.0, 141.5, 32, 22, "C", "10 uF polypropylene film capacitor"], [94.0, 141.5, 32, 22, "C", "10 uF polypropylene film capacitor"], [129.0, 141.5, 32, 22, "C", "10 uF polypropylene film capacitor"]], "conns": [["J1", 158.0, 100.0, "stud", "DC bus positive in, from the PDU", "M6 ring lug"], ["J2", 158.0, 124.0, "stud", "DC bus negative in, from the PDU", "M6 ring lug"], ["J3", 158.0, 16.0, "stud", "DC bus positive, bolted straight onto the inverter's positive stud", "Inverter M5 stud"], ["J4", 158.0, 28.0, "stud", "DC bus negative, bolted straight onto the inverter's negative stud", "Inverter M5 stud"]], "oriented": true}
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
      var g = el("g", { class: "pcb-conn", "data-ref": c[0] }, s);
      var x = c[1], y = c[2], d;
      if (c[3] === "stud") {
        el("circle", { cx: P(x), cy: P(y), r: 4.6 * k }, g);
        el("circle", { cx: P(x), cy: P(y), r: 2.6 * k, class: "hole" }, g);
      } else {
        d = c[3].slice();
        if (!B.oriented && (x < 10 || x > B.w - 10)) d = [d[1], d[0]];     // left/right-edge connectors stand vertical
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
})();
