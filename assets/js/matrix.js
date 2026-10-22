// Matrix intro: ambient code rain, the name "decode", the terminal-style
// typed quotes, the entry gate, and the pill toggle (sound + heavier rain).
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

    // The canvas is sized to the tallest viewport in CSS, so a phone's address
    // bar sliding in and out doesn't change it. When it does change (rotating,
    // resizing a desktop window), the rain so far is copied over, since
    // resizing a canvas wipes it.
    function resize() {
        const w = canvas.clientWidth || window.innerWidth;
        const h = canvas.clientHeight || window.innerHeight;
        if (w === canvas.width && h === canvas.height) return;
        let saved = null;
        if (canvas.width && canvas.height) {
            saved = document.createElement("canvas");
            saved.width = canvas.width;
            saved.height = canvas.height;
            saved.getContext("2d").drawImage(canvas, 0, 0);
        }
        canvas.width = w;
        canvas.height = h;
        if (saved) ctx.drawImage(saved, 0, 0);
        const count = Math.floor(canvas.width / fontSize);
        columns = Array.from({ length: count }, (_, i) => columns[i] || makeColumn());
    }

    // Reading a section always shows the calm blue-pill rain, whichever pill
    // is taken; red-pill rain returns the moment the section closes.
    function reading() {
        return document.body.classList.contains("is-article-visible");
    }
    function current() {
        return reading() ? modes.ambient : mode;
    }

    let drawn = null;
    function draw() {
        const m = current();
        if (m !== drawn) {
            // Switching look: re-pick which columns rain for the new density.
            columns.forEach((c) => (c.active = Math.random() < m.density));
            drawn = m;
        }
        ctx.fillStyle = m.fade;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = m.color;
        ctx.font = `${fontSize}px monospace`;

        columns.forEach((col, i) => {
            if (col.active && col.y >= 0) {
                const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
                if (m.head) {
                    // Repaint the previous head in green, then draw the new bright head.
                    ctx.fillStyle = m.color;
                    ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * fontSize, (col.y - 1) * fontSize);
                    ctx.fillStyle = m.head;
                }
                ctx.fillText(ch, i * fontSize, col.y * fontSize);
                if (m.head) ctx.fillStyle = m.color;
            }
            col.y += 1;
            if (col.y * fontSize > canvas.height && Math.random() > 0.97) {
                col.y = -Math.floor(Math.random() * 20);
                col.active = Math.random() < m.density;
            }
        });
    }

    let timer = null;

    // While a section is open, the rain eases to half speed (and the canvas
    // dims in CSS). Closing a section eases back in blue-pill mode, but snaps
    // straight back to full red-pill rain.
    let slow = 1;

    function tick() {
        if (reading()) slow += (2 - slow) * 0.12;
        else if (mode === modes.redPill) slow = 1;
        else slow += (1 - slow) * 0.12;
        // Pause only while the tab is in the background.
        if (!document.hidden) draw();
        timer = setTimeout(tick, current().step * slow);
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

    // Opening or closing a section takes effect right away rather than
    // waiting out a slow reading-pace frame already queued.
    let wasReading = reading();
    new MutationObserver(() => {
        const now = reading();
        if (now === wasReading) return;
        wasReading = now;
        if (timer !== null) {
            clearTimeout(timer);
            timer = setTimeout(tick, 0);
        }
    }).observe(document.body, { attributes: true, attributeFilter: ["class"] });

    resize();
    window.addEventListener("resize", resize);
    reduceMotion.addEventListener("change", applyMotionPreference);
    applyMotionPreference();

    // ---------- Entry gate ----------
    // The inline script at the top of <body> decides whether to gate.
    // The menu, social icons and footer stay hidden until the visitor takes
    // the pill, scrolls, presses a key, or simply waits.
    let revealed = !document.body.classList.contains("gated");
    const track = window.dskTrack || function () {};

    // Visitors who skip the intro still count as unlocking, at second zero.
    if (revealed) track("unlock", { method: location.hash ? "direct-link" : "reduced-motion", seconds: 0 });

    function reveal(method) {
        if (revealed) return;
        revealed = true;
        track("unlock", { method: typeof method === "string" ? method : "unknown" });
        document.body.classList.remove("gated");
        document.body.classList.add("revealing");
        setTimeout(() => document.body.classList.remove("revealing"), 2000);
    }

    // A key press opens the menu right away, so keyboard users are never stuck.
    // Shortcuts and modifier keys (Cmd+R to reload, Cmd+Tab to switch apps,
    // Shift on its own...) don't count, so only real navigation keys unlock.
    // Scrolling and swiping only start working once the quotes finish typing
    // (see onTypingDone), so nobody skips the story by accident.
    function onKey(e) {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (/^(Shift|Meta|Control|Alt|CapsLock|Fn|OS|F\d{1,2})$/.test(e.key)) return;
        window.removeEventListener("keydown", onKey);
        reveal("key");
    }
    if (!revealed) window.addEventListener("keydown", onKey);

    // ---------- Terminal-style quotes ----------
    // Every character is laid out from the start in its final, centered
    // position (wrapped rows included) but invisible. Typing reveals them one
    // by one, so nothing shifts and the frame around the intro never resizes.
    // Screen readers get each line's full text at once.
    const termLines = Array.from(document.querySelectorAll(".term-line"));
    termLines.forEach((el) => {
        const text = el.textContent.trim().replace(/\s+/g, " ");
        el.textContent = "";
        const sr = document.createElement("span");
        sr.className = "sr-only";
        sr.textContent = text;
        const chars = document.createElement("span");
        chars.className = "term-chars";
        chars.setAttribute("aria-hidden", "true");
        for (const ch of text) {
            const c = document.createElement("span");
            c.className = "term-char";
            c.textContent = ch;
            chars.appendChild(c);
        }
        el.append(sr, chars);
    });

    function onTypingDone() {
        if (revealed) return;
        window.addEventListener("wheel", () => reveal("scroll"), { once: true, passive: true });
        window.addEventListener("touchmove", () => reveal("swipe"), { once: true, passive: true });
        // If nobody has taken the pill a few seconds later, open the menu quietly.
        setTimeout(() => reveal("timer"), 3000);
    }

    // The cursor is drawn beside one character without taking up space.
    let cursorAt = null;
    function placeCursor(charEl, side) {
        if (cursorAt) cursorAt.classList.remove("cursor-after", "cursor-before");
        cursorAt = charEl;
        if (charEl) charEl.classList.add(side === "before" ? "cursor-before" : "cursor-after");
    }
    function setBlink(on) {
        document.querySelectorAll(".term-chars").forEach((c) => c.classList.toggle("blink", on));
    }

    function typeLines() {
        const visible = termLines.filter((el) => el.offsetParent !== null);
        if (reduceMotion.matches) {
            visible.forEach((el) => el.querySelectorAll(".term-char").forEach((c) => c.classList.add("shown")));
            onTypingDone();
            return;
        }
        let line = 0;
        function nextLine() {
            if (line >= visible.length) {
                setBlink(true);
                onTypingDone();
                return;
            }
            const chars = Array.from(visible[line].querySelectorAll(".term-char"));
            setBlink(false);
            placeCursor(chars[0], "before");
            let i = 0;
            (function step() {
                if (i < chars.length) {
                    const c = chars[i++];
                    c.classList.add("shown");
                    placeCursor(c, "after");
                    // A human rhythm: jittered keystrokes, longer beats at punctuation.
                    const ch = c.textContent;
                    let delay = 32 + Math.random() * 48;
                    if (ch === "," || ch === ";") delay += 170;
                    if (ch === "." || ch === "?" || ch === "!") delay += 320;
                    if (ch === "-") delay += 90;
                    setTimeout(step, delay);
                } else {
                    line++;
                    setBlink(true);
                    setTimeout(nextLine, 650);
                }
            })();
        }
        setTimeout(nextLine, 250);
    }

    // ---------- Name decode ----------
    const name = document.getElementById("name");
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

    // The quotes wait for the decode to finish before typing.
    // A safety timer starts them even if the decode never runs.
    let released = false;
    function releaseQuotes() {
        if (released) return;
        released = true;
        document.body.classList.add("name-decoded");
        typeLines();
    }
    setTimeout(releaseQuotes, 5000);

    // Wait for the fonts so each letter's measured width is final.
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

    // ---------- Section tabs: scramble on hover ----------
    // Pointing at a tab runs its letters through Matrix glyphs, which then
    // settle left to right. Mouse only, so a tap on a phone just switches.
    // Half-width katakana, as in the film, so the scramble stays narrow.
    const tabGlyphs = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";
    document.querySelectorAll(".section-tabs a").forEach((tab) => {
        const label = tab.textContent;
        // Screen readers keep the real name while the letters scramble.
        tab.setAttribute("aria-label", label);
        let timer = null;
        tab.addEventListener("pointerenter", (e) => {
            if (e.pointerType !== "mouse" || reduceMotion.matches) return;
            clearInterval(timer);
            // Hold the width so the row doesn't shift while scrambling.
            tab.textContent = label;
            tab.style.width = tab.getBoundingClientRect().width + "px";
            tab.classList.add("scrambling");
            const began = performance.now();
            timer = setInterval(() => {
                const t = performance.now() - began;
                let text = "";
                for (let i = 0; i < label.length; i++) {
                    const ch = label[i];
                    text += ch === " " || t >= 90 + i * 35 ? ch : tabGlyphs[Math.floor(Math.random() * tabGlyphs.length)];
                }
                tab.textContent = text;
                if (text === label && t >= 90 + label.length * 35) {
                    clearInterval(timer);
                    tab.style.width = "";
                    tab.classList.remove("scrambling");
                }
            }, 40);
        });
    });

    // ---------- Pill: unlock the site, sound + heavier rain ----------
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

        // Music eases in over two seconds rather than starting at full volume.
        // (iPhones ignore volume changes, so there it starts at normal volume.)
        let fade = null;
        function fadeIn() {
            clearInterval(fade);
            player.volume = 0;
            const startedAt = performance.now();
            fade = setInterval(() => {
                const t = Math.min(1, (performance.now() - startedAt) / 2000);
                player.volume = t;
                if (t >= 1) clearInterval(fade);
            }, 50);
        }

        // After a click, hold off the hover preview until the mouse leaves
        // and comes back, so the new color is what you see.
        toggle.addEventListener("pointerleave", () => toggle.classList.remove("just-toggled"));

        toggle.addEventListener("click", () => {
            reveal("pill");
            toggle.classList.add("just-toggled");
            const on = toggle.getAttribute("aria-pressed") !== "true";
            toggle.setAttribute("aria-pressed", String(on));
            toggle.setAttribute("aria-label", on ? "Back to the blue pill (turns off sound)" : "Take the red pill (turns on sound)");
            toggle.title = on ? "Back to the blue pill" : "Take the red pill";
            icon.className = (on ? "fas fa-volume-high" : "fas fa-volume-xmark") + " speaker";
            // The invitation pulse stops for good once the pill has been taken.
            if (circle) circle.classList.add("pill-taken");
            document.body.classList.toggle("red-pill-mode", on);
            track("red-pill", { state: on ? "on" : "off" });
            mode = on ? modes.redPill : modes.ambient;
            columns.forEach((c) => {
                c.active = Math.random() < mode.density;
                // Taking the red pill drops a wall of rain from the top at once.
                if (on) c.y = -Math.floor(Math.random() * 6);
            });
            if (on) {
                fadeIn();
                player.play();
            } else {
                clearInterval(fade);
                player.pause();
            }
        });
    }
});
