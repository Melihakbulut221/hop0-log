/* Hop-0 site: shared drawing of recorded flights (used by the home replay and the flight cards).
 * assets/flights.json: 18 landings of the Python reference flight software (step-equivalent to the C port) in the
 * MuJoCo plant with CFD aerodynamics, 50 Hz, downsampled to 10 Hz; throttle rounded to 0.1, no gimbal channel.
 * Vehicles are drawn larger than scale.
 * Exposes window.HopFlight. No dependencies. */
(function () {
  "use strict";
  var cache = null;
  function load() {
    if (!cache) {
      var base = (window.HOP_BASE || "") + "assets/flights.json";
      cache = fetch(base).then(function (r) { if (!r.ok) throw new Error("flights.json " + r.status); return r.json(); });
    }
    return cache;
  }
  function sample(f, t) {               // linear interpolation of the 10 Hz record
    var k = t / f.dt, i = Math.max(0, Math.min(f.s.length - 2, Math.floor(k))), u = Math.max(0, Math.min(1, k - i));
    function g(a) { return a[i] + (a[i + 1] - a[i]) * u; }
    return { s: g(f.s), z: g(f.z), tilt: g(f.tilt), thr: g(f.thr), end: k >= f.s.length - 1 };
  }
  function flightLen(f) { return f.dt * (f.s.length - 1); }
  // plume length follows the recorded throttle (0.1 steps); nozzle and plume are drawn straight along the body
  function drawRocket(c, px, py, tiltDeg, thr, alpha, size) {
    var L = 36, R = 5;
    c.save(); c.globalAlpha = alpha;
    c.translate(px, py); c.scale(size, size); c.rotate(tiltDeg * Math.PI / 180);
    if (thr > 0.02) {
      c.save();
      var len = 10 + 34 * thr;
      var pg = c.createLinearGradient(0, 0, 0, len);
      pg.addColorStop(0, "rgba(255,244,214,0.95)"); pg.addColorStop(0.35, "rgba(255,170,70,0.8)");
      pg.addColorStop(1, "rgba(255,90,30,0)");
      c.fillStyle = pg; c.beginPath();
      c.moveTo(-3.2, 0); c.quadraticCurveTo(0, len * 1.05, 3.2, 0); c.closePath(); c.fill();
      c.restore();
    }
    c.strokeStyle = "#8d97a8"; c.lineWidth = 1.6;   // legs (inverted tripod seen from the side), body, nose
    c.beginPath(); c.moveTo(-R + 1, -9); c.lineTo(-R - 8, 1); c.moveTo(R - 1, -9); c.lineTo(R + 8, 1);
    c.moveTo(-R + 1, -1); c.lineTo(-R - 8, 1); c.moveTo(R - 1, -1); c.lineTo(R + 8, 1); c.stroke();
    var bg = c.createLinearGradient(-R, 0, R, 0);
    bg.addColorStop(0, "#b9c1cd"); bg.addColorStop(0.45, "#f4f6f8"); bg.addColorStop(1, "#9aa3b1");
    c.fillStyle = bg; c.fillRect(-R, -L, 2 * R, L - 1);
    c.fillStyle = "#e8e2cf"; c.beginPath(); c.ellipse(0, -L, R, 3.4, 0, Math.PI, 0); c.fill();
    c.fillStyle = "#c8693a"; c.fillRect(-2, -1.5, 4, 2.5);
    c.restore();
  }
  function drawPad(c, cx, gy, lit, w) {
    c.fillStyle = "#33445e"; c.fillRect(cx - w, gy - 2, 2 * w, 4);
    c.fillStyle = lit ? "#5fd39a" : "#e0a03c";
    c.fillRect(cx - w - 2, gy - 4, 4, 3); c.fillRect(cx + w - 2, gy - 4, 4, 3);
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function mmss(t) { t = Math.round(t); return (t < 600 ? "0" : "") + Math.floor(t / 60) + ":" + (t % 60 < 10 ? "0" : "") + (t % 60); }
  window.HopFlight = { load: load, sample: sample, flightLen: flightLen, drawRocket: drawRocket, drawPad: drawPad,
    cap: cap, mmss: mmss, SPEED: 4 };
})();
