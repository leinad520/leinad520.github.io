// Matrix effects: ambient code rain, the name "decode" on load, and the
// hidden red-pill mode (sound on + heavier rain).
document.addEventListener("DOMContentLoaded", function () {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const glyphs =
        "アカサタナハマヤラワイキシチニヒミリウクスツヌフムユルエケセテネヘメレオコソトノホモヨロ0123456789";

    // ---------- Code rain ----------
    const canvas = document.createElement("canvas");
    canvas.id = "matrix";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const fontSize = 16;
    // Ambient: steady and moderately bright. Red pill: every column, faster, brightest.
    const modes = {
        ambient: { step: 80, density: 0.75, color: "rgba(0, 255, 140, 0.55)", fade: "rgba(0, 0, 0, 0.06)" },
        // Red pill adds near-white leading characters, like the film.
        redPill: { step: 45, density: 1, color: "rgba(0, 255, 149, 0.85)", fade: "rgba(0, 0, 0, 0.05)", head: "rgba(220, 255, 235, 0.95)" },
    };
    let mode = modes.ambient;
    let columns = [];

    function makeColumn() {
        return {
            y: -Math.floor(Math.random() * 60),
            active: Math.random() < mode.density,
        };
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const count = Math.floor(canvas.width / fontSize);
        columns = Array.from({ length: count }, (_, i) => columns[i] || makeColumn());
    }

    function draw() {
        ctx.fillStyle = mode.fade;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = mode.color;
        ctx.font = `${fontSize}px monospace`;

        columns.forEach((col, i) => {
            if (col.active && col.y >= 0) {
                const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
                if (mode.head) {
                    // Repaint the previous head in green, then draw the new bright head.
                    ctx.fillStyle = mode.color;
                    ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * fontSize, (col.y - 1) * fontSize);
                    ctx.fillStyle = mode.head;
                }
                ctx.fillText(ch, i * fontSize, col.y * fontSize);
                if (mode.head) ctx.fillStyle = mode.color;
            }
            col.y += 1;
            if (col.y * fontSize > canvas.height && Math.random() > 0.97) {
                col.y = -Math.floor(Math.random() * 20);
                col.active = Math.random() < mode.density;
            }
        });
    }

    let timer = null;

    function tick() {
        // Pause only while the tab is in the background.
        if (!document.hidden) draw();
        timer = setTimeout(tick, mode.step);
    }

    function start() {
        if (timer !== null) return;
        timer = setTimeout(tick, mode.step);
    }

    function stop() {
        clearTimeout(timer);
        timer = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function applyMotionPreference() {
        if (reduceMotion.matches) stop();
        else start();
    }

    resize();
    window.addEventListener("resize", resize);
    reduceMotion.addEventListener("change", applyMotionPreference);
    applyMotionPreference();

    // ---------- Name decode ----------
    const name = document.getElementById("name");
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

    // The pill quotes wait for the decode to finish before typing.
    // A safety timer releases them even if the decode never runs.
    function releaseQuotes() {
        document.body.classList.add("name-decoded");
    }
    setTimeout(releaseQuotes, 5000);

    // Wait for the Matrix font so each letter's measured width is final.
    if (name && !reduceMotion.matches) fontsReady.then(decodeName);
    else releaseQuotes();

    function decodeName() {
        const finalText = name.textContent.trim();
        name.setAttribute("aria-label", finalText);
        name.textContent = "";

        const spans = [];
        for (const ch of finalText) {
            if (ch === " ") {
                name.appendChild(document.createTextNode(" "));
                continue;
            }
            const span = document.createElement("span");
            span.className = "decode-char";
            span.setAttribute("aria-hidden", "true");
            span.textContent = ch;
            name.appendChild(span);
            spans.push({ el: span, ch });
        }

        // Lock each letter's width so the line doesn't jump while scrambling.
        spans.forEach((s) => (s.el.style.width = s.el.getBoundingClientRect().width + "px"));
        spans.forEach((s) => {
            s.el.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
            s.el.classList.add("scrambling");
        });

        const startDelay = 700; // let the header fade in first
        const perLetter = 60;
        const begin = performance.now() + startDelay;

        const tick = setInterval(() => {
            const now = performance.now();
            let done = true;
            spans.forEach((s, i) => {
                if (now >= begin + 250 + i * perLetter) {
                    if (s.el.classList.contains("scrambling")) {
                        s.el.textContent = s.ch;
                        s.el.classList.remove("scrambling");
                    }
                } else {
                    done = false;
                    s.el.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
                }
            });
            if (done) {
                clearInterval(tick);
                spans.forEach((s) => (s.el.style.width = ""));
                setTimeout(releaseQuotes, 300);
            }
        }, 50);
    }

    // ---------- Red pill: sound + heavier rain ----------
    const toggle = document.getElementById("sound-toggle");
    const player = document.getElementById("player");
    if (toggle && player) {
        const icon = toggle.querySelector(".speaker");
        const circle = toggle.closest(".logo");

        // Start buffering the track as soon as someone shows intent to click,
        // so sound starts right away without every visitor downloading it.
        let warmed = false;
        function warmUp() {
            if (warmed) return;
            warmed = true;
            player.preload = "auto";
            player.load();
        }
        ["pointerenter", "touchstart", "focus"].forEach((type) =>
            toggle.addEventListener(type, warmUp, { passive: true })
        );

        // After a click, hold off the hover preview until the mouse leaves
        // and comes back, so the new color is what you see.
        toggle.addEventListener("pointerleave", () => toggle.classList.remove("just-toggled"));

        toggle.addEventListener("click", () => {
            toggle.classList.add("just-toggled");
            const on = toggle.getAttribute("aria-pressed") !== "true";
            toggle.setAttribute("aria-pressed", String(on));
            toggle.setAttribute("aria-label", on ? "Back to the blue pill (turns off sound)" : "Take the red pill (turns on sound)");
            toggle.title = on ? "Back to the blue pill" : "Take the red pill";
            icon.className = (on ? "fas fa-volume-high" : "fas fa-volume-xmark") + " speaker";
            // The invitation pulse stops for good once the pill has been taken.
            if (circle) circle.classList.add("pill-taken");
            document.body.classList.toggle("red-pill-mode", on);
            mode = on ? modes.redPill : modes.ambient;
            columns.forEach((c) => {
                c.active = Math.random() < mode.density;
                // Taking the red pill drops a wall of rain from the top at once.
                if (on) c.y = -Math.floor(Math.random() * 6);
            });
            if (on) player.play();
            else player.pause();
        });
    }
});
