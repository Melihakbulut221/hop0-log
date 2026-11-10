/* Hop-0 site, avionics page: how the boards, sensors, actuators and power connect, with the connector on each end.
 * Static diagram; hover or tap a link; the same links are listed as a table below it. No dependencies. */
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

  /* ================================================================== wiring */
  var wsvg = document.getElementById("wire-svg");
  if (wsvg) (function () {
    var N = {   // id: [x, y, w, h, label, kind]
      gnss: [20, 30, 150, 44, "GNSS antenna", "dev"], radar: [20, 92, 150, 44, "Radar altimeter", "dev"],
      tlm: [20, 154, 150, 44, "Telemetry radio", "dev"], imu: [20, 216, 150, 44, "External IMU", "dev"],
      legs: [20, 278, 150, 44, "Legs and arm plug", "dev"], fts: [240, 30, 190, 44, "Flight termination", "dev"],
      fc: [240, 150, 190, 120, "FC-0 flight computer", "board"], abat: [240, 330, 190, 44, "Avionics battery", "pwr"],
      tvc: [240, 430, 190, 44, "Gimbal actuators, RCS", "dev"], bench: [20, 352, 172, 44, "Bench: Ethernet, USB", "bench"],
      ecu: [510, 150, 200, 120, "ECU-1 engine controller", "board"], sens: [510, 30, 200, 44, "Pressure, temp. sensors", "dev"],
      flame: [510, 330, 200, 44, "Flame sensor", "dev"], valves: [510, 430, 200, 44, "Valves, igniter", "dev"],
      invl: [790, 120, 170, 64, "INV-1 LOX pump", "board"], invr: [790, 236, 170, 64, "INV-1 RP-1 pump", "board"],
      pmp: [790, 30, 170, 44, "Pump motors ×2", "dev"], pdu: [790, 360, 170, 44, "PDU-1 + CB-1 ×2", "pwr"],
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
      ["fc", "ecu", "safe", "Flight-computer arm vote", "FC-0 J16 to ECU-1 J7, JST GH 2-pin: a fail-safe discrete gated by the watchdog"],
      ["ecu", "invl", "can", "Inverter harness", "ECU-1 J5 to INV-1 J6, JST GH 6-pin: CAN-FD at 1 kHz, 12 V, enable, fault"],
      ["ecu", "invr", "can", "Inverter harness", "ECU-1 J6 to INV-1 J6, JST GH 6-pin: CAN-FD at 1 kHz, 12 V, enable, fault"],
      ["invl", "pmp", "power", "Motor phases", "INV-1 J3–J5, M5 studs; hall sensors and temperature on J8, JST GH 7-pin"],
      ["invr", "pmp", "power", "Motor phases", "INV-1 J3–J5, M5 studs; hall sensors and temperature on J8, JST GH 7-pin"],
      ["pack", "pdu", "power", "Pack to PDU-1", "PDU-1 J1 / J6, M8 and M6 studs; fuse and current shunt on the board, contactor off the board"],
      ["pdu", "invr", "power", "DC bus", "PDU-1 J5 / J9 to CB-1 J1 / J2, then CB-1 J3 / J4 to INV-1 J1 / J2 through conductive spacers"],
      ["pdu", "invl", "power", "DC bus", "PDU-1 J4 / J8 to CB-1 J1 / J2, then CB-1 J3 / J4 to INV-1 J1 / J2 through conductive spacers"],
      ["ecu", "pdu", "disc", "Pre-charge and contactor", "ECU-1 J10 pins 5-8 to PDU-1 J10, Micro-Fit 3.0; status back on PDU-1 J13 (ECU-1 has no input for it yet)"]
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
      var hit = el("path", { d: d, class: "w-hit" }, gE);
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
    [["fc", "J1–J16 · 120 × 90 mm"], ["ecu", "J1–J17 · 150 × 110 mm"], ["invl", "J1–J8"], ["invr", "J1–J8"]].forEach(function (x) {
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
    edges.forEach(function (ed) {                    // markers of the CAN-FD and data links, evenly spaced, static
      ed.dots.forEach(function (dt, j) {
        var pt = ed.p.getPointAtLength(ed.L * (j + 1) / (ed.dots.length + 1));
        dt.setAttribute("cx", pt.x.toFixed(1)); dt.setAttribute("cy", pt.y.toFixed(1));
      });
    });
    // the same links as a table, for keyboard and screen-reader use
    var tb = document.getElementById("wire-table");
    if (tb) {
      var KIND = { can: "CAN-FD", data: "serial, SPI, analog", rf: "RF coax", safe: "safety and arming", power: "power", disc: "discrete", bench: "bench only" };
      E.forEach(function (e) {
        var tr = document.createElement("tr");
        [e[3], N[e[0]][4] + " \u2192 " + N[e[1]][4], KIND[e[2]] || e[2], e[4]].forEach(function (v) {
          var td = document.createElement("td"); td.textContent = v; tr.appendChild(td);
        });
        tb.appendChild(tr);
      });
    }
  })();
})();
