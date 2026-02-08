"use strict";

let lastTime = 0;

function loop(ts) {
    const rawDt = ts - lastTime;
    lastTime = ts;
    const dt = Math.min(rawDt / 16.667, 3);
    update(dt);
    draw();
    requestAnimationFrame(loop);
}

createStars();
requestAnimationFrame(function first(ts) {
    lastTime = ts;
    loop(ts);
});
