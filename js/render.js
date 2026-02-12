"use strict";

// --- Palette ---
const COL = {
    DARK:   "#000924",
    DARK2:  "#041b38",
    DEEP:   "#093659",
    OCEAN:  "#145d87",
    TEAL:   "#228399",
    MID:    "#31b0b0",
    AQUA:   "#46cfb3",
    MINT:   "#73f0c6",
    LIGHT:  "#abffd1",
    BRIGHT: "#d9ffe2"
};

const PLANET_COLORS = [COL.OCEAN, COL.TEAL, COL.MID, COL.AQUA, COL.MINT];

// --- Shared physics constants (used by render + game) ---
const ORBIT_SPEED        = 0.03;
const LAUNCH_SPEED       = 8;
const GRAVITY_STRENGTH   = 0.15;
const CAPTURE_FACTOR     = 1.8;
const ORBIT_RADIUS_RATIO = 2.2;

// --- Canvas ---
const LOGIC_W = 180;
const LOGIC_H = 320;
const ASPECT  = 9 / 16;

const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

function resize() {
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    let dw, dh;
    if (winW / winH < ASPECT) { dw = winW; dh = winW / ASPECT; }
    else { dh = winH; dw = winH * ASPECT; }
    canvas.width  = LOGIC_W;
    canvas.height = LOGIC_H;
    canvas.style.width  = Math.floor(dw) + "px";
    canvas.style.height = Math.floor(dh) + "px";
    ctx.imageSmoothingEnabled = false;
}
window.addEventListener("resize", resize);
resize();

// --- Utilities ---
const rand    = (a, b) => Math.random() * (b - a) + a;
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const dist    = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
const lerp    = (a, b, t) => a + (b - a) * t;
const fl      = (v) => v | 0;

// --- Bitmap Font 5x5 ---
const GLYPH = {
    'A':['01110','10001','11111','10001','10001'],
    'B':['11110','10001','11110','10001','11110'],
    'C':['01111','10000','10000','10000','01111'],
    'D':['11110','10001','10001','10001','11110'],
    'E':['11111','10000','11110','10000','11111'],
    'F':['11111','10000','11110','10000','10000'],
    'G':['01111','10000','10011','10001','01111'],
    'H':['10001','10001','11111','10001','10001'],
    'I':['11111','00100','00100','00100','11111'],
    'J':['11111','00010','00010','10010','01100'],
    'K':['10001','10010','11100','10010','10001'],
    'L':['10000','10000','10000','10000','11111'],
    'M':['10001','11011','10101','10001','10001'],
    'N':['10001','11001','10101','10011','10001'],
    'O':['01110','10001','10001','10001','01110'],
    'P':['11110','10001','11110','10000','10000'],
    'Q':['01110','10001','10101','10010','01101'],
    'R':['11110','10001','11110','10010','10001'],
    'S':['01111','10000','01110','00001','11110'],
    'T':['11111','00100','00100','00100','00100'],
    'U':['10001','10001','10001','10001','01110'],
    'V':['10001','10001','10001','01010','00100'],
    'W':['10001','10001','10101','11011','10001'],
    'X':['10001','01010','00100','01010','10001'],
    'Y':['10001','01010','00100','00100','00100'],
    'Z':['11111','00010','00100','01000','11111'],
    '0':['01110','10011','10101','11001','01110'],
    '1':['00100','01100','00100','00100','11111'],
    '2':['01110','10001','00110','01000','11111'],
    '3':['11110','00001','01110','00001','11110'],
    '4':['10001','10001','11111','00001','00001'],
    '5':['11111','10000','11110','00001','11110'],
    '6':['01111','10000','11110','10001','01110'],
    '7':['11111','00001','00010','00100','00100'],
    '8':['01110','10001','01110','10001','01110'],
    '9':['01110','10001','01111','00001','11110'],
    ' ':['00000','00000','00000','00000','00000'],
    '!':['00100','00100','00100','00000','00100'],
    '[':['01100','01000','01000','01000','01100'],
    ']':['00110','00010','00010','00010','00110'],
    '.':['00000','00000','00000','00000','00100'],
    ':':['00000','00100','00000','00100','00000'],
    '-':['00000','00000','01110','00000','00000'],
    '#':['01010','11111','01010','11111','01010'],
    '/':['00001','00010','00100','01000','10000'],
    '_':['00000','00000','00000','00000','11111'],
};

function pxText(text, x, y, color, sz, align) {
    sz = sz || 1;
    text = text.toUpperCase();
    const charW = 6 * sz;
    const totalW = text.length * charW - sz;
    let ox = x;
    if (align === "center") ox = x - (totalW >> 1);
    else if (align === "right") ox = x - totalW;
    ctx.fillStyle = color;
    for (let c = 0; c < text.length; c++) {
        const g = GLYPH[text[c]];
        if (!g) continue;
        const bx = (ox + c * charW) | 0;
        for (let r = 0; r < 5; r++) {
            const row = g[r];
            for (let k = 0; k < 5; k++) {
                if (row[k] === '1') {
                    ctx.fillRect(bx + k * sz, (y | 0) + r * sz, sz, sz);
                }
            }
        }
    }
}

// --- Pixel Primitives ---
function pxCircle(cx, cy, r, color) {
    cx = fl(cx); cy = fl(cy); r = fl(r);
    ctx.fillStyle = color;
    for (let y = -r; y <= r; y++) {
        const hw = Math.floor(Math.sqrt(r * r - y * y));
        ctx.fillRect(cx - hw, cy + y, hw * 2 + 1, 1);
    }
}

function pxCircleStroke(cx, cy, r, color) {
    cx = fl(cx); cy = fl(cy); r = fl(r);
    ctx.fillStyle = color;
    let x = r, y = 0, d = 1 - r;
    while (x >= y) {
        ctx.fillRect(cx+x,cy+y,1,1); ctx.fillRect(cx-x,cy+y,1,1);
        ctx.fillRect(cx+x,cy-y,1,1); ctx.fillRect(cx-x,cy-y,1,1);
        ctx.fillRect(cx+y,cy+x,1,1); ctx.fillRect(cx-y,cy+x,1,1);
        ctx.fillRect(cx+y,cy-x,1,1); ctx.fillRect(cx-y,cy-x,1,1);
        y++;
        if (d < 0) d += 2*y+1;
        else { x--; d += 2*(y-x)+1; }
    }
}

function pxCircleDash(cx, cy, r, color, dashLen) {
    cx = fl(cx); cy = fl(cy); r = fl(r);
    dashLen = dashLen || 3;
    ctx.fillStyle = color;
    const circ = Math.floor(2 * Math.PI * r);
    for (let i = 0; i < circ; i++) {
        if (((i / dashLen) | 0) % 2 === 0) {
            const a = (i / circ) * Math.PI * 2;
            ctx.fillRect(fl(cx + Math.cos(a) * r), fl(cy + Math.sin(a) * r), 1, 1);
        }
    }
}

function pxLineDash(x0, y0, x1, y1, color, gap) {
    x0=fl(x0); y0=fl(y0); x1=fl(x1); y1=fl(y1);
    gap = gap || 2;
    ctx.fillStyle = color;
    const dx = Math.abs(x1-x0), dy = Math.abs(y1-y0);
    const sx = x0<x1?1:-1, sy = y0<y1?1:-1;
    let err = dx-dy, step = 0;
    while (true) {
        if (step % (gap*2) < gap) ctx.fillRect(x0,y0,1,1);
        if (x0===x1 && y0===y1) break;
        const e2 = 2*err;
        if (e2 > -dy) { err-=dy; x0+=sx; }
        if (e2 < dx)  { err+=dx; y0+=sy; }
        step++;
    }
}

// --- Stars ---
const STAR_COUNT = 55;
const stars = [];

function createStars() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: randInt(0, LOGIC_W - 1),
            y: randInt(0, LOGIC_H * 3),
            color: Math.random() > 0.5 ? COL.TEAL : (Math.random() > 0.5 ? COL.DEEP : COL.MID),
            speed: rand(0.1, 0.3),
            phase: rand(0, 6.28)
        });
    }
}

function drawStars(camY) {
    for (const s of stars) {
        let sy = fl((s.y - camY * s.speed) % (LOGIC_H * 2));
        if (sy < 0) sy += LOGIC_H * 2;
        if (sy >= LOGIC_H) continue;
        if (Math.sin(Date.now() * 0.0012 + s.phase) > -0.3) {
            ctx.fillStyle = s.color;
            ctx.fillRect(s.x, sy, 1, 1);
        }
    }
}

// --- Particles ---
const particles = [];

function spawnParticles(x, y, color, count, speedMult) {
    speedMult = speedMult || 1;
    for (let i = 0; i < count; i++) {
        const a = rand(0, 6.28);
        const spd = rand(0.5, 2.5) * speedMult;
        particles.push({
            x, y,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
            life: 1, decay: rand(0.02, 0.05),
            size: randInt(1, 2), color
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.96; p.vy *= 0.96;
        p.life -= p.decay;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles(camY) {
    for (const p of particles) {
        if (p.life <= 0) continue;
        let c = p.color;
        if (p.life < 0.25) c = COL.DARK2;
        else if (p.life < 0.5) c = COL.DEEP;
        else if (p.life < 0.7) c = COL.TEAL;
        const py = fl(p.y - camY);
        if (py < -4 || py > LOGIC_H + 4) continue;
        ctx.fillStyle = c;
        ctx.fillRect(fl(p.x), py, p.size, p.size);
    }
}

// --- Trail ---
const trail = [];
const TRAIL_MAX = 18;

function addTrail(x, y) {
    trail.push({ x: fl(x), y: fl(y), life: 1 });
    if (trail.length > TRAIL_MAX) trail.shift();
}

function updateTrail() {
    for (let i = trail.length - 1; i >= 0; i--) {
        trail[i].life -= 0.06;
        if (trail[i].life <= 0) trail.splice(i, 1);
    }
}

function drawTrail(camY) {
    for (const t of trail) {
        const py = t.y - fl(camY);
        if (py < -2 || py > LOGIC_H + 2) continue;
        ctx.fillStyle = t.life > 0.6 ? COL.MINT : (t.life > 0.3 ? COL.TEAL : COL.DEEP);
        ctx.fillRect(t.x, py, 1, 1);
    }
}

// --- Planet ---
const PLANET_RADIUS_MIN = 8;
const PLANET_RADIUS_MAX = 16;

function createPlanet(x, y, radius, color) {
    return {
        x, y,
        radius: radius || randInt(PLANET_RADIUS_MIN, PLANET_RADIUS_MAX),
        color: color || PLANET_COLORS[randInt(0, PLANET_COLORS.length - 1)],
        pattern: randInt(0, 3),
        hasRing: Math.random() > 0.55
    };
}

function drawPlanet(planet, camY) {
    const sx = fl(planet.x);
    const sy = fl(planet.y - camY);
    const r  = planet.radius;

    pxCircleDash(sx, sy, fl(r * CAPTURE_FACTOR), COL.DEEP, 3);

    if (planet.hasRing) {
        const rx = fl(r * 1.8), ry = fl(r * 0.35);
        for (let a = 0; a < 6.28; a += 0.1) {
            if (((a * 8) | 0) % 2 === 0) {
                ctx.fillStyle = COL.TEAL;
                ctx.fillRect(fl(sx + Math.cos(a) * rx), fl(sy + Math.sin(a) * ry), 1, 1);
            }
        }
    }

    pxCircle(sx, sy, r, planet.color);

    if (planet.pattern === 0) {
        for (let dy = -r + 2; dy < r; dy += 3) {
            const hw = Math.floor(Math.sqrt(r*r - dy*dy));
            if (hw > 1) {
                ctx.fillStyle = COL.DARK2;
                ctx.fillRect(sx - hw + 1, sy + dy, hw * 2 - 1, 1);
            }
        }
    } else if (planet.pattern === 1) {
        const seed = fl(planet.x * 100 + planet.y * 7);
        for (let i = 0; i < r; i++) {
            const cx2 = sx + ((seed * (i+1) * 37) % (r*2)) - r;
            const cy2 = sy + ((seed * (i+1) * 53) % (r*2)) - r;
            if (dist(cx2, cy2, sx, sy) < r - 1) {
                ctx.fillStyle = COL.DARK2;
                ctx.fillRect(cx2, cy2, 2, 2);
            }
        }
    } else if (planet.pattern === 2) {
        for (let dy = -r + 1; dy < r; dy++) {
            const hw = Math.floor(Math.sqrt(r*r - dy*dy));
            if (hw > 2) {
                ctx.fillStyle = COL.BRIGHT;
                ctx.fillRect(sx - hw + 1, sy + dy, fl(hw * 0.4), 1);
            }
        }
    } else {
        for (let dy = -r + 2; dy < r; dy += 4)
            for (let dx = -r + 2; dx < r; dx += 4)
                if (dist(sx+dx, sy+dy, sx, sy) < r - 1) {
                    ctx.fillStyle = COL.DARK2;
                    ctx.fillRect(sx+dx, sy+dy, 1, 1);
                }
    }

    pxCircleStroke(sx, sy, r, COL.LIGHT);

    if (r > 5) {
        ctx.fillStyle = COL.BRIGHT;
        ctx.fillRect(sx - fl(r * 0.5), sy - fl(r * 0.5), 2, 1);
        ctx.fillRect(sx - fl(r * 0.5), sy - fl(r * 0.5) + 1, 1, 1);
    }
}

// --- Satellite Sprite 5x5 ---
const SAT_SPRITE = [
    [0,2,1,2,0],
    [2,1,1,1,2],
    [0,0,1,0,0],
    [2,1,1,1,2],
    [0,2,1,2,0],
];

function drawSatellite(sat, camY) {
    const sx = fl(sat.x);
    const sy = fl(sat.y - camY);
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const v = SAT_SPRITE[r][c];
            if (v === 0) continue;
            ctx.fillStyle = v === 1 ? COL.BRIGHT : COL.TEAL;
            ctx.fillRect(sx - 2 + c, sy - 2 + r, 1, 1);
        }
    }
    if (sat.orbiting) {
        const ta = sat.angle - Math.PI / 2;
        ctx.fillStyle = COL.LIGHT;
        ctx.fillRect(sx + fl(Math.cos(ta) * 4), sy + fl(Math.sin(ta) * 4), 1, 1);
        ctx.fillRect(sx + fl(Math.cos(ta) * 5), sy + fl(Math.sin(ta) * 5), 1, 1);
    }
}

function drawOrbitPath(planet, radius, camY) {
    pxCircleDash(fl(planet.x), fl(planet.y - camY), fl(radius), COL.OCEAN, 3);
}

function drawLaunchIndicator(sat, camY) {
    if (!sat.orbiting) return;
    const ta = sat.angle - Math.PI / 2;
    const sx = fl(sat.x), sy = fl(sat.y - camY);
    const ex = fl(sx + Math.cos(ta) * 15);
    const ey = fl(sy + Math.sin(ta) * 15);
    pxLineDash(sx, sy, ex, ey, COL.TEAL, 2);
}

function drawArrow(nextPlanet, camY) {
    const ny = nextPlanet.y - camY;
    if (ny < 12) {
        const nx = Math.max(6, Math.min(LOGIC_W - 6, fl(nextPlanet.x)));
        ctx.fillStyle = COL.MINT;
        ctx.fillRect(nx, 3, 1, 1);
        ctx.fillRect(nx-1, 4, 3, 1);
        ctx.fillRect(nx, 5, 1, 2);
    }
}

function drawHUD(score) {
    pxText(score + "", LOGIC_W / 2, 5, COL.BRIGHT, 2, "center");
    pxText("PLANETAS RECORRIDOS", LOGIC_W / 2, 18, COL.TEAL, 1, "center");
}

function drawTransitionOverlay(transCenterX, transCenterY, transTimer, transPhase, transMaxRadius) {
    let holeR;
    if (transPhase === 0) holeR = fl((1 - transTimer) * transMaxRadius);
    else holeR = fl(transTimer * transMaxRadius);

    if (holeR <= 0) {
        ctx.fillStyle = COL.DARK;
        ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
        return;
    }

    ctx.fillStyle = COL.DARK;
    const cx = transCenterX, cy = transCenterY;
    const r2 = holeR * holeR;
    for (let y = 0; y < LOGIC_H; y++) {
        const dy = y - cy;
        const dy2 = dy * dy;
        if (dy2 >= r2) {
            ctx.fillRect(0, y, LOGIC_W, 1);
        } else {
            const halfW = fl(Math.sqrt(r2 - dy2));
            const left  = cx - halfW;
            const right = cx + halfW;
            if (left > 0) ctx.fillRect(0, y, left, 1);
            if (right < LOGIC_W) ctx.fillRect(right, y, LOGIC_W - right, 1);
        }
    }
}
