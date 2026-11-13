/* Hop-0 site: the only script every page loads.
 * - site menu on narrow screens
 * - loads a page's modules only when their element comes near the viewport: <div data-module="boards"> loads
 *   assets/js/boards.js (and its dependencies) once. data-eager loads it straight away.
 * - old single-page anchors (index.html#numbers etc.) are forwarded to the page that now holds the section.
 * No dependencies, no build step. Paths are relative, so the site works under any sub-path. */
(function () {
  "use strict";
  var me = document.currentScript, base = me ? me.src.replace(/[^\/]*$/, "") : "assets/js/";
  var DEPS = { hero: ["flightdraw"], flights: ["flightdraw"] };
  var loaded = {};

  function script(name) {
    if (!loaded[name]) loaded[name] = new Promise(function (ok, fail) {
      var s = document.createElement("script");
      s.src = base + name + ".js"; s.async = false;
      s.onload = ok; s.onerror = function () { fail(new Error("could not load " + name)); };
      document.head.appendChild(s);
    });
    return loaded[name];
  }
  function load(name) {
    var deps = DEPS[name] || [];
    return Promise.all(deps.map(script)).then(function () { return script(name); });
  }

  /* ---------------------------------------------------------------- forward old anchors */
  var MOVED = { layers: "index.html#twin", parts: "vehicle.html#apart", mechanical: "vehicle.html#mechanical",
    boards: "avionics.html#boards", wiring: "avionics.html#wiring", flights: "gnc.html#flights", life: "life.html",
    filter: "gnc.html#wind", timeline: "gnc.html#timeline", stack: "vehicle.html#model", wind: "gnc.html#wind",
    tools: "gnc.html#tools", mistakes: "gnc.html#mistakes", numbers: "gnc.html#numbers", open: "gnc.html#open",
    orbit: "orbit.html", twin: "index.html#twin", top: "index.html" };
  var h = location.hash.slice(1);
  if (document.body.getAttribute("data-page") === "home" && MOVED[h] && !document.getElementById(h)) {
    location.replace(MOVED[h]);
    return;
  }

  /* ---------------------------------------------------------------- menu (narrow screens) */
  var btn = document.getElementById("menu-btn"), nav = document.getElementById("site-nav");
  if (btn && nav) {
    document.documentElement.classList.add("nav-js");   // the narrow-screen nav collapses only once the button works
    btn.hidden = false;
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      nav.classList.toggle("open", open);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { btn.click(); btn.focus(); }
    });
  }

  /* ---------------------------------------------------------------- theme toggle (dark is the default) */
  var tb = document.getElementById("theme-btn"), root = document.documentElement;
  function themeLabel() {
    var light = root.getAttribute("data-theme") === "light";
    tb.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
    tb.setAttribute("aria-pressed", light ? "true" : "false");
  }
  if (tb) {
    tb.hidden = false; themeLabel();
    tb.addEventListener("click", function () {
      var t = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", t);
      try { localStorage.setItem("hop0-theme", t); } catch (e) {}
      themeLabel();
      window.dispatchEvent(new Event("themechange"));
    });
  }

  /* ---------------------------------------------------------------- reveal on scroll (skipped for reduced motion) */
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!still && "IntersectionObserver" in window && !location.hash) {
    var rv = Array.prototype.slice.call(document.querySelectorAll(
      ".sec > h2, .sec > .lede, .result, .broke article, .pagelist li, .status > *, .entry, .page-head > *"));
    root.classList.add("rv-on");
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    rv.forEach(function (n, i) {
      n.classList.add("rv");
      var sib = n.parentNode ? Array.prototype.indexOf.call(n.parentNode.children, n) : 0;
      n.style.transitionDelay = Math.min(sib, 6) * 60 + "ms";
      ro.observe(n);
    });
  }

  /* ---------------------------------------------------------------- modules */
  var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-module]"));
  function go(n) {
    n.getAttribute("data-module").split(/\s+/).forEach(function (m) {
      load(m).catch(function (e) { if (window.console) console.warn(e.message); });
    });
  }
  // a deep link (page.html#section) loads everything at once, so content above the target does not shift it
  if (!("IntersectionObserver" in window) || location.hash) {
    nodes.forEach(go);
    if (location.hash) Promise.all(Object.keys(loaded).map(function (k) { return loaded[k]; })).then(function () {
      var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView();
    }, function () {});
    return;
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); go(e.target); } });
  }, { rootMargin: "100% 0px 100% 0px" });
  nodes.forEach(function (n) { if (n.hasAttribute("data-eager")) go(n); else io.observe(n); });
})();
