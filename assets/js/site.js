/* DOCHIMERA.com shared scripts. Every feature checks that its elements exist,
   so this one file can be loaded on every page. */
(function () {
  "use strict";

  function storage(type) {
    try {
      var s = window[type];
      s.setItem("dochimera-test", "1");
      s.removeItem("dochimera-test");
      return s;
    } catch (e) {
      return null;
    }
  }
  var session = storage("sessionStorage");
  var local = storage("localStorage");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Footer year
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // The clover: spins in the first time it's on screen; poke it for a squish,
  // a ripple and sparkles. It tilts toward the pointer.
  var clover = document.getElementById("clover");
  if (clover) {
    var spot = clover.parentNode;
    var body = clover.querySelector(".clover-body");
    var squash = clover.querySelector(".clover-squash");

    var settle = function () { spot.classList.add("is-settled"); };
    if (reduceMotion || !("IntersectionObserver" in window)) {
      spot.classList.add("is-in");
      settle();
    } else {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { spot.classList.add("is-in"); io.disconnect(); }
      }, { threshold: 0.4 });
      io.observe(spot);
      clover.addEventListener("animationend", function (e) {
        if (e.animationName === "clover-spin") settle();
      });
    }

    clover.addEventListener("pointermove", function (e) {
      if (reduceMotion || e.pointerType === "touch") return;
      var r = clover.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      body.style.setProperty("--ry", (x * 22).toFixed(1) + "deg");
      body.style.setProperty("--rx", (-y * 18).toFixed(1) + "deg");
    });
    clover.addEventListener("pointerleave", function () {
      body.style.setProperty("--rx", "0deg");
      body.style.setProperty("--ry", "0deg");
    });

    clover.addEventListener("click", function (e) {
      var r = clover.getBoundingClientRect();
      // keyboard presses (detail 0) poke the middle of the clover
      var px = e.detail ? e.clientX - r.left : r.width / 2;
      var py = e.detail ? e.clientY - r.top : r.height / 2;

      squash.classList.remove("poked");
      void squash.offsetWidth;
      squash.classList.add("poked");
      if (reduceMotion) return;

      var offsetY = clover.offsetTop;
      var ring = document.createElement("span");
      ring.className = "clover-ripple";
      ring.setAttribute("aria-hidden", "true");
      ring.style.left = px + "px";
      ring.style.top = offsetY + py + "px";
      spot.appendChild(ring);
      ring.addEventListener("animationend", function () { this.remove(); });

      var shapes = ["♣", "★", "♪", "✦"];
      for (var i = 0; i < 8; i++) {
        var sp = document.createElement("span");
        var a = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
        var dist = 45 + Math.random() * 30;
        sp.className = "sparkle";
        sp.setAttribute("aria-hidden", "true");
        sp.textContent = shapes[i % shapes.length];
        sp.style.left = px + "px";
        sp.style.top = offsetY + py + "px";
        sp.style.setProperty("--dx", Math.cos(a) * dist + "px");
        sp.style.setProperty("--dy", Math.sin(a) * dist + "px");
        spot.appendChild(sp);
        sp.addEventListener("animationend", function () { this.remove(); });
      }
    });
  }

  // Visitor counter (Abacus, a free counting API). Each browser session is
  // counted once; later page views in the same session only read the total.
  var counter = document.getElementById("counter");
  if (counter) {
    var API = "https://abacus.jasoncameron.dev";
    var COUNTER = "dochimera-com/visits";
    var status = document.getElementById("counter-status");
    var counted = session && session.getItem("dochimera-counted") === "1";

    var show = function (value) {
      var digits = String(value).padStart(6, "0").split("");
      counter.innerHTML = digits.map(function (d) { return "<span>" + d + "</span>"; }).join("");
      counter.setAttribute("aria-label", value + " visitors");
    };

    var cached = local && parseInt(local.getItem("dochimera-count"), 10);
    if (cached > 0) show(cached);

    fetch(API + (counted ? "/get/" : "/hit/") + COUNTER, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var value = Number(data.value);
        if (!isFinite(value)) throw new Error("No count");
        show(value);
        if (session) session.setItem("dochimera-counted", "1");
        if (local) local.setItem("dochimera-count", String(value));
      })
      .catch(function () {
        if (status) status.textContent = "The counter's taking a nap! Check back soon.";
      });
  }

  // Pickers: thumbnails on the left, details on the right, CLOSE to go back
  // to the overview.
  document.querySelectorAll("[data-picker]").forEach(function (picker) {
    var tabs = Array.prototype.slice.call(picker.querySelectorAll("[role=tab]"));
    var panels = Array.prototype.slice.call(picker.querySelectorAll(".picker-panel"));
    var overview = picker.querySelector(".picker-panel[data-overview]");
    var close = picker.querySelector(".close-x");
    var stage = picker.querySelector(".picker-stage");

    function panelFor(id) {
      for (var i = 0; i < panels.length; i++) if (panels[i].id === id) return panels[i];
      return null;
    }

    function select(id, opts) {
      opts = opts || {};
      var panel = panelFor(id) || overview;
      panels.forEach(function (p) { p.hidden = p !== panel; });
      var anySelected = false;
      tabs.forEach(function (t) {
        var on = t.getAttribute("aria-controls") === panel.id;
        if (on) anySelected = true;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
      });
      if (!anySelected && tabs[0]) tabs[0].tabIndex = 0;
      if (close) close.hidden = panel === overview;
      if (opts.updateHash) {
        history.replaceState(null, "", panel === overview ? location.pathname : "#" + panel.id);
      }
      if (opts.scroll) {
        var rect = stage.getBoundingClientRect();
        if (rect.top < 0 || rect.top > window.innerHeight * 0.6) {
          stage.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }
      }
      if (opts.focusPanel) {
        var heading = panel.querySelector("h2");
        if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      }
    }

    picker.addEventListener("click", function (e) {
      // let Ctrl/Cmd/Shift-clicks and middle-clicks open links normally
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var link = e.target.closest("a[href^='#']");
      if (!link || !panelFor(link.getAttribute("href").slice(1))) return;
      e.preventDefault();
      select(link.getAttribute("href").slice(1), { updateHash: true, scroll: true, focusPanel: !link.matches("[role=tab]") });
    });

    picker.addEventListener("keydown", function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var next = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === "Home") next = tabs[0];
      if (e.key === "End") next = tabs[tabs.length - 1];
      if (!next) return;
      e.preventDefault();
      next.focus();
      select(next.getAttribute("aria-controls"), { updateHash: true });
    });

    if (close) {
      close.addEventListener("click", function () {
        select(overview.id, { updateHash: true, focusPanel: true });
      });
    }

    window.addEventListener("hashchange", function () {
      // ignore other in-page anchors (e.g. the skip link's #content)
      var id = location.hash.slice(1);
      if (!id || panelFor(id)) select(id);
    });

    picker.classList.add("is-ready");
    select(location.hash.slice(1));
  });

  // Copy-to-clipboard buttons (Contact page)
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    var out = document.getElementById(btn.getAttribute("aria-describedby"));
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function (msg) { if (out) out.textContent = msg; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { done("Copied! Lucky you!"); },
          function () { done("Couldn't copy it. Here it is: " + text); }
        );
      } else {
        done("Couldn't copy it. Here it is: " + text);
      }
    });
  });
})();
