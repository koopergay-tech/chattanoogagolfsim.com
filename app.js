/* Chattanooga Golf Sim Co. — site behaviour */
(function () {
  "use strict";

  /* ---- sticky header state ---- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    header.classList.toggle("scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- mobile nav ---- */
  var toggle = document.querySelector(".nav-toggle");
  toggle.addEventListener("click", function () {
    document.body.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", document.body.classList.contains("nav-open"));
  });
  document.querySelectorAll(".main-nav a").forEach(function (a) {
    a.addEventListener("click", function () { document.body.classList.remove("nav-open"); });
  });

  /* ---- scroll reveals ---- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

  /* ---- service-area map: hover a town chip to find it on the map (and back) ---- */
  document.querySelectorAll("[data-town]").forEach(function (el) {
    var key = el.getAttribute("data-town");
    var peers = document.querySelectorAll('[data-town="' + key + '"]');
    el.addEventListener("mouseenter", function () {
      peers.forEach(function (p) { p.classList.add("town-active"); });
    });
    el.addEventListener("mouseleave", function () {
      peers.forEach(function (p) { p.classList.remove("town-active"); });
    });
  });

  /* ---- booking forms (home + corporate page) ---- */
  /*
   * LIVE: both forms POST via AJAX to the Formspree endpoint below.
   * The _subject field tells them apart in the inbox
   * ("New Booking Request — …" vs "New Corporate Inquiry — …").
   * If the POST ever fails, the error message offers a mailto fallback
   * to BOOKING_EMAIL so no lead is lost.
   */
  var FORMSPREE_ENDPOINT = "https://formspree.io/f/xwlezbvl";
  /* Feeds the mailto fallback and status messages — keep it in sync with
   * the recipient set on the Formspree form (Formspree dashboard setting,
   * not in this file). */
  var BOOKING_EMAIL = "hello@chattanoogagolfsim.com";

  /* dynamic copyright year in the footer */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* no past dates on any date picker */
  var today = new Date();
  var pad = function (n) { return String(n).padStart(2, "0"); };
  var minDate = today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());
  document.querySelectorAll('input[type="date"]').forEach(function (d) { d.min = minDate; });

  /* package card buttons pre-select the matching package in the form */
  document.querySelectorAll("[data-package],[data-corp-package]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var want = btn.getAttribute("data-package") || btn.getAttribute("data-corp-package");
      var sel = btn.hasAttribute("data-corp-package")
        ? document.getElementById("corp-package")
        : document.getElementById("package");
      if (!sel) return;
      var key = want.split("—")[0].split("(")[0].trim();
      Array.prototype.forEach.call(sel.options, function (opt) {
        if (opt.text.indexOf(key) !== -1) sel.value = opt.text;
      });
    });
  });

  function showStatus(statusEl, kind, html) {
    statusEl.className = "form-status " + kind;
    statusEl.innerHTML = html;
  }

  document.querySelectorAll("form[data-booking]").forEach(function (form) {
    var status = form.querySelector(".form-status");
    var isCorporateForm = form.getAttribute("data-inquiry") === "corporate";
    var defaultLabel = isCorporateForm ? "Check Availability" : "Request Your Date";

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!form.reportValidity()) return;

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });

      /* label corporate inquiries — same inbox, clear subject */
      var corporate = isCorporateForm || (data["Package"] || "").indexOf("Corporate") !== -1;
      data["Inquiry type"] = corporate ? "Corporate inquiry" : "Party / event booking";

      /* Formspree special fields: useful subject line + direct reply-to */
      if (corporate) {
        data._subject = "New Corporate Inquiry — " + (data["Company"] || data["Name"] || "Unknown");
      } else {
        data._subject = "New Booking Request — " + (data["Name"] || "Unknown") +
          " — " + (data["Preferred date"] || "date TBD");
      }
      data._replyto = data["Email"] || "";

      /* pre-filled mailto fallback — used if the POST ever fails, so no lead is lost */
      var mailBody = Object.keys(data)
        .filter(function (k) { return k.charAt(0) !== "_"; })
        .map(function (k) { return k + ": " + data[k]; }).join("\n");
      var mailtoHref = "mailto:" + BOOKING_EMAIL +
        "?subject=" + encodeURIComponent(data._subject) +
        "&body=" + encodeURIComponent(mailBody);

      var submitBtn = form.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";

      fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (res.ok) {
          form.reset();
          showStatus(status, "ok",
            "Thanks — we'll confirm your date within 24 hours at the email you provided. " +
            "Prefer email? <a href='" + mailtoHref + "'>Click here</a>.");
        } else {
          throw new Error("Form service error");
        }
      }).catch(function () {
        showStatus(status, "err",
          "Something hiccuped on our end — your request wasn't sent. No lead lost: " +
          "<a href='" + mailtoHref + "'>click here to email it to us directly</a> " +
          "(" + BOOKING_EMAIL + ") and we'll lock your date.");
      }).finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = defaultLabel;
      });
    });
  });
})();
