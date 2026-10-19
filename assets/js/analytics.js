// Privacy-friendly analytics through Umami (https://umami.is). No cookies.
//
// Nothing loads or is sent until a website ID is set in index.html
// (window.DSK_UMAMI_ID). Umami records page views on its own; this file adds
// custom events for how visitors unlock the site and what they click.
//
// Events sent:
//   unlock         how the visitor got past the intro, and after how long
//                  { method: pill | scroll | swipe | key | timer | direct-link | reduced-motion, seconds }
//   left-early     visitor left while still on the intro, never unlocking
//                  { seconds }
//   red-pill       sound/red-pill mode switched { state: on | off, seconds }
//   open-section   a section was opened { section, seconds }
//   link-click     a link or button inside the site was clicked
//                  { label, href, section }
//   contact-sent   the contact form was submitted
//
// The same events also go to a Google Sheet (window.DSK_SHEET_URL), which
// keeps one simple row per visit. A visit gets a random ID that lives only
// in memory for that page load: no cookies, nothing stored on the device.
(function () {
    var id = window.DSK_UMAMI_ID;
    var sheetUrl = window.DSK_SHEET_URL;
    var queue = [];
    var visit = Math.random().toString(36).slice(2, 12);
    var device = /iPad|Tablet/i.test(navigator.userAgent)
        ? "Tablet"
        : /Mobi|Android|iPhone/i.test(navigator.userAgent)
        ? "Phone"
        : "Desktop";
    var from = "direct";
    try {
        if (document.referrer) from = new URL(document.referrer).hostname;
    } catch (e) {}

    function toSheet(name, data) {
        if (!sheetUrl) return;
        var body = JSON.stringify({ visit: visit, event: name, data: data || {}, device: device, from: from });
        try {
            // sendBeacon survives the tab closing, which matters for "left-early".
            if (navigator.sendBeacon && navigator.sendBeacon(sheetUrl, new Blob([body], { type: "text/plain" }))) return;
            fetch(sheetUrl, { method: "POST", mode: "no-cors", keepalive: true, body: body });
        } catch (e) {}
    }

    function seconds() {
        return Math.round(performance.now() / 100) / 10;
    }

    // Events can fire before Umami's script finishes loading, so queue them.
    function flush() {
        if (!window.umami || typeof window.umami.track !== "function") return false;
        while (queue.length) {
            var e = queue.shift();
            window.umami.track(e[0], e[1]);
        }
        return true;
    }

    window.dskTrack = function (name, data) {
        if (!id && !sheetUrl) return;
        var payload = data || {};
        if (payload.seconds === undefined) payload.seconds = seconds();
        toSheet(name, payload);
        if (!id) return;
        queue.push([name, payload]);
        flush();
    };

    if (!id && !sheetUrl) return;

    // Start the visit's row in the sheet as soon as the page loads.
    toSheet("land", { seconds: 0 });

    if (id) loadUmami();
    document.addEventListener("DOMContentLoaded", wireUpEvents);

    function loadUmami() {
        var s = document.createElement("script");
        s.defer = true;
        s.src = "https://cloud.umami.is/script.js";
        s.setAttribute("data-website-id", id);
        s.onload = function () {
            var tries = 0;
            var t = setInterval(function () {
                if (flush() || ++tries > 50) clearInterval(t);
            }, 100);
        };
        document.head.appendChild(s);
    }

    function wireUpEvents() {
        // Sections open through the address (#about-me, #library, ...).
        function trackSection() {
            var section = location.hash.slice(1);
            if (section && document.getElementById(section)) {
                window.dskTrack("open-section", { section: section });
            }
        }
        window.addEventListener("hashchange", trackSection);
        if (location.hash) trackSection();

        // Clicks on links and buttons, labelled by their text. Menu links
        // are already covered by open-section, so in-page links are skipped.
        // Listens in the capture phase because the theme stops clicks inside
        // sections from bubbling up.
        document.addEventListener("click", function (ev) {
            var a = ev.target.closest && ev.target.closest("a[href]");
            if (!a) return;
            var href = a.getAttribute("href");
            if (!href || href.charAt(0) === "#") return;
            var article = a.closest("article");
            // Cards (posts, videos, playlists) contain a date and summary too;
            // use just their title. Otherwise the link's first line of text.
            var titled = a.querySelector(".post-title, .video-title, .project-title");
            var text = (titled ? titled.innerText : a.innerText) || a.getAttribute("aria-label") || "";
            window.dskTrack("link-click", {
                label: text.split("\n")[0].replace(/\s+/g, " ").trim().slice(0, 60),
                href: href.split("?")[0].slice(0, 200),
                section: article ? article.id : "header",
            });
        }, true);

        var form = document.querySelector("#contact form");
        if (form) {
            form.addEventListener("submit", function () {
                window.dskTrack("contact-sent");
            });
        }

        // Visitors who leave while still on the intro.
        window.addEventListener("pagehide", function () {
            if (document.body.classList.contains("gated")) {
                window.dskTrack("left-early");
            }
        });
    }
})();
