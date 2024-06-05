document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.createElement("canvas");
    canvas.id = "matrix";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    function initializeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    initializeCanvas();

    const matrixChars = "アカサタナハマヤラワガザダバパイキシチニヒミリヰギジヂビピウクスツヌフムユルヲグズヅブプエケセテネヘメレヱゲゼデベペオコソトノホモヨロヺゴゾドボポ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const fontSize = 14;
    let columns = Math.floor(canvas.width / fontSize);
    let drops = Array(columns).fill(0);

    function drawRain() {
        ctx.fillStyle = "rgba(0, 0, 0, 0.03)"; // Lower opacity for longer trailing effect
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "rgba(0, 255, 0, 0.3)"; // Muted green with higher transparency
        ctx.font = `${fontSize}px monospace`;

        for (let i = 0; i < drops.length; i++) {
            const text = matrixChars[Math.floor(Math.random() * matrixChars.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }

            drops[i] += 1; // Uniform speed
        }
    }

    const interval = setInterval(drawRain, 70); // Slightly slower interval for a subtle effect

    window.addEventListener("resize", () => {
        initializeCanvas();
        const newColumns = Math.floor(canvas.width / fontSize);
        const newDrops = Array(newColumns).fill(0);

        for (let i = 0; i < Math.min(columns, newColumns); i++) {
            newDrops[i] = drops[i];
        }

        columns = newColumns;
        drops = newDrops;
    });
});
