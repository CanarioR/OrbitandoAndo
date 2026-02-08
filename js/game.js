"use strict";

// --- Spawn constants ---
const PLANET_SPAWN_Y_MIN = -80;
const PLANET_SPAWN_Y_MAX = -160;
const PLANET_SPAWN_X_PAD = 25;
const PARTICLE_COUNT_CAPTURE = 12;
const PARTICLE_COUNT_DEATH   = 20;

// --- State machine ---
const STATE = {
    WAITING: -2, INTRO: -1, START: 0,
    PLAYING: 1, GAMEOVER: 2, TRANSITION: 3
};

let gameState      = STATE.WAITING;
let score          = 0;
let highScore      = parseInt(localStorage.getItem("orbitHS")) || 0;
let planets        = [];
let cameraY        = 0;
let targetCameraY  = 0;
let shakeTimer     = 0;
let shakeIntensity = 0;
let nextPlanet     = null;

// --- Transition state ---
let transTimer     = 0;
let transPhase     = 0;
let transSpeed     = 0.025;
let transCenterX   = 0;
let transCenterY   = 0;
let transMaxRadius = 0;
let transFrom      = null;

// --- Intro state ---
let introTimer      = 0;
let introPhase      = 0;
let introShipX      = 0;
let introShipY      = 0;
let introShipVX     = 0;
let introShipVY     = 0;
let introPlanetX    = 0;
let introPlanetY    = 0;
let introPlanetR    = 14;
let introOrbitAngle = 0;
let introOrbitR     = 0;
let introTitleAlpha = 0;

// --- Satellite ---
const satellite = {
    x: 0, y: 0, vx: 0, vy: 0,
    angle: 0, orbitRadius: 0,
    orbiting: true, currentPlanet: null,
    visualAngle: 0
};

// --- Intro ---
function initIntro() {
    introTimer = 0;
    introPhase = 0;
    introPlanetX = fl(LOGIC_W / 2);
    introPlanetY = fl(LOGIC_H * 0.45);
    introPlanetR = 14;
    introOrbitR  = introPlanetR * ORBIT_RADIUS_RATIO;
    introOrbitAngle = 0;
    introTitleAlpha = 0;
    introShipX  = LOGIC_W * 0.8;
    introShipY  = LOGIC_H + 20;
    introShipVX = -0.3;
    introShipVY = -2.2;
    createStars();
    stopBGMusic();
    playSFX(SFX.llegada);
}

function updateIntro(dt) {
    introTimer += dt;

    if (introPhase === 0) {
        introShipX += introShipVX * dt;
        introShipY += introShipVY * dt;
        const d = dist(introShipX, introShipY, introPlanetX, introPlanetY);
        if (d < 100) {
            const dx = introPlanetX - introShipX;
            const dy = introPlanetY - introShipY;
            introShipVX += (dx / d) * 0.03 * dt;
            introShipVY += (dy / d) * 0.03 * dt;
        }
        if (introTimer % 2 < 1.5) {
            particles.push({
                x: introShipX, y: introShipY,
                vx: rand(-0.3, 0.3), vy: rand(0.5, 1.5),
                life: 1, decay: rand(0.03, 0.06),
                size: 1, color: COL.TEAL
            });
        }
        if (d < introOrbitR + 5) {
            introPhase = 1;
            introTimer = 0;
            introOrbitAngle = Math.atan2(introShipY - introPlanetY, introShipX - introPlanetX);
            spawnParticles(introShipX, introShipY, COL.MINT, 10, 0.8);
            stopSFX(SFX.llegada);
            playSFX(SFX.contacto);
            startBGMusic();
        }
    }
    else if (introPhase === 1) {
        introOrbitAngle -= ORBIT_SPEED * dt;
        const currentR = dist(introShipX, introShipY, introPlanetX, introPlanetY);
        const smoothR  = lerp(currentR, introOrbitR, 0.05 * dt);
        introShipX = introPlanetX + Math.cos(introOrbitAngle) * smoothR;
        introShipY = introPlanetY + Math.sin(introOrbitAngle) * smoothR;
        if (introTimer > 60) { introPhase = 2; introTimer = 0; }
    }
    else if (introPhase === 2) {
        introOrbitAngle -= ORBIT_SPEED * dt;
        introShipX = introPlanetX + Math.cos(introOrbitAngle) * introOrbitR;
        introShipY = introPlanetY + Math.sin(introOrbitAngle) * introOrbitR;
        introTitleAlpha = Math.min(1, introTitleAlpha + 0.009 * dt);
        if (introTimer > 120) { introPhase = 3; introTimer = 0; }
    }
    else if (introPhase === 3) {
        introOrbitAngle -= ORBIT_SPEED * dt;
        introShipX = introPlanetX + Math.cos(introOrbitAngle) * introOrbitR;
        introShipY = introPlanetY + Math.sin(introOrbitAngle) * introOrbitR;
        introTitleAlpha = 1;
    }
    updateParticles();
}

function drawIntro() {
    ctx.save();
    ctx.fillStyle = COL.DARK;
    ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
    drawStars(0);

    drawPlanet({
        x: introPlanetX, y: introPlanetY,
        radius: introPlanetR, color: COL.TEAL,
        pattern: 2, hasRing: true
    }, 0);

    if (introPhase >= 1) {
        pxCircleDash(introPlanetX, introPlanetY, fl(introOrbitR), COL.OCEAN, 3);
    }

    drawParticles(0);

    var sx = fl(introShipX), sy = fl(introShipY);
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const v = SAT_SPRITE[r][c];
            if (v === 0) continue;
            ctx.fillStyle = v === 1 ? COL.BRIGHT : COL.TEAL;
            ctx.fillRect(sx - 2 + c, sy - 2 + r, 1, 1);
        }
    }

    if (introTitleAlpha > 0) {
        const cx = LOGIC_W / 2;
        const ty = fl(LOGIC_H * 0.12);
        const revealH = fl(introTitleAlpha * 36);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, ty - 2, LOGIC_W, revealH);
        ctx.clip();
        pxText("ORBITANDO", cx, ty, COL.BRIGHT, 2, "center");
        pxText("ANDO", cx, ty + 14, COL.BRIGHT, 2, "center");
        ctx.restore();

        if (introTitleAlpha > 0.6) {
            const lineW = fl((introTitleAlpha - 0.6) / 0.4 * 70);
            ctx.fillStyle = COL.TEAL;
            ctx.fillRect(cx - fl(lineW / 2), ty + 28, lineW, 1);
        }
        if (introTitleAlpha > 0.8) {
            const credAlpha = (introTitleAlpha - 0.8) / 0.2;
            const credRevealW = fl(credAlpha * 64);
            ctx.save();
            ctx.beginPath();
            ctx.rect(cx - fl(credRevealW / 2), ty + 31, credRevealW, 10);
            ctx.clip();
            pxText("CANARIO", cx, ty + 33, COL.AQUA, 1, "center");
            ctx.restore();
        }
    }

    if (introPhase >= 3) {
        const cx = LOGIC_W / 2;
        if (Math.sin(Date.now() * 0.004) > 0) {
            pxText("[TOCA PARA JUGAR]", cx, fl(LOGIC_H * 0.88), COL.LIGHT, 1, "center");
        }
        if (highScore > 0) {
            pxText("RECORD " + highScore, cx, fl(LOGIC_H * 0.82), COL.TEAL, 1, "center");
        }
    }
    ctx.restore();
}

// --- Transition ---
function startTransition(cx, cy) {
    transFrom = gameState;
    gameState = STATE.TRANSITION;
    transPhase = 0;
    transTimer = 0;
    transCenterX = fl(cx);
    transCenterY = fl(cy);
    transMaxRadius = fl(Math.sqrt(
        Math.max(cx, LOGIC_W - cx) ** 2 +
        Math.max(cy, LOGIC_H - cy) ** 2
    )) + 5;
    playSFX(SFX.transicion);
}

function updateTransition(dt) {
    transTimer += transSpeed * dt;
    if (transPhase === 0) {
        if (transTimer >= 1) {
            transTimer = 0;
            transPhase = 1;
            if (transFrom === STATE.INTRO) initGameFromIntro();
            else initGame();
            gameState = STATE.TRANSITION;
        }
    } else {
        if (transTimer >= 1) gameState = STATE.PLAYING;
    }
}

// --- Game init ---
function initGameFromIntro() {
    score = 0;
    planets = [];
    particles.length = 0;
    trail.length = 0;
    shakeTimer = 0;

    const first = createPlanet(fl(introPlanetX), fl(introPlanetY), introPlanetR, COL.TEAL);
    planets.push(first);
    satellite.currentPlanet = first;
    satellite.orbitRadius   = first.radius * ORBIT_RADIUS_RATIO;
    satellite.angle         = introOrbitAngle;
    satellite.orbiting      = true;
    satellite.vx = satellite.vy = 0;
    updateOrbitPos();
    targetCameraY = satellite.y - LOGIC_H * 0.65;
    cameraY       = targetCameraY;
    for (let i = 0; i < 3; i++) spawnNext();
    nextPlanet = planets[1];
}

function initGame() {
    score = 0;
    planets = [];
    particles.length = 0;
    trail.length = 0;
    cameraY = 0;
    targetCameraY = 0;
    shakeTimer = 0;

    const first = createPlanet(fl(LOGIC_W / 2), fl(LOGIC_H * 0.7), 14, COL.TEAL);
    planets.push(first);
    satellite.currentPlanet = first;
    satellite.orbitRadius   = first.radius * ORBIT_RADIUS_RATIO;
    satellite.angle         = -Math.PI / 2;
    satellite.orbiting      = true;
    satellite.vx = satellite.vy = 0;
    updateOrbitPos();
    for (let i = 0; i < 3; i++) spawnNext();
    nextPlanet = planets[1];
    createStars();
}

function spawnNext() {
    const last = planets[planets.length - 1];
    const r = randInt(PLANET_RADIUS_MIN, PLANET_RADIUS_MAX);
    const x = randInt(PLANET_SPAWN_X_PAD + r, LOGIC_W - PLANET_SPAWN_X_PAD - r);
    const y = fl(last.y + rand(PLANET_SPAWN_Y_MIN, PLANET_SPAWN_Y_MAX));
    planets.push(createPlanet(x, y, r));
}

function updateOrbitPos() {
    const p = satellite.currentPlanet;
    satellite.x = p.x + satellite.orbitRadius * Math.cos(satellite.angle);
    satellite.y = p.y + satellite.orbitRadius * Math.sin(satellite.angle);
}

function launch() {
    if (!satellite.orbiting) return;
    satellite.orbiting = false;
    const ta = satellite.angle - Math.PI / 2;
    satellite.vx = Math.cos(ta) * LAUNCH_SPEED;
    satellite.vy = Math.sin(ta) * LAUNCH_SPEED;
    spawnParticles(satellite.x, satellite.y, COL.MINT, 6, 0.7);
}

function capture(planet) {
    satellite.orbiting      = true;
    satellite.currentPlanet = planet;
    satellite.orbitRadius   = planet.radius * ORBIT_RADIUS_RATIO;
    satellite.angle = Math.atan2(satellite.y - planet.y, satellite.x - planet.x);
    score++;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("orbitHS", highScore);
    }
    spawnParticles(satellite.x, satellite.y, planet.color, PARTICLE_COUNT_CAPTURE, 1);
    shakeTimer = 1; shakeIntensity = 2;
    trail.length = 0;
    playSFX(SFX.contacto);
    const idx = planets.indexOf(planet);
    if (idx < planets.length - 1) nextPlanet = planets[idx + 1];
    while (planets[planets.length - 1].y > cameraY - LOGIC_H * 1.5) spawnNext();
}

function die() {
    gameState = STATE.GAMEOVER;
    spawnParticles(satellite.x, satellite.y, COL.BRIGHT, PARTICLE_COUNT_DEATH, 1.5);
    spawnParticles(satellite.x, satellite.y, COL.AQUA, 10, 1);
    shakeTimer = 1; shakeIntensity = 4;
    playSFX(SFX.explosion);
    stopBGMusic();
    playSFX(SFX.gameOver);
}

// --- Input ---
let inputLock = false;

function handleInput() {
    if (gameState === STATE.WAITING) {
        initAudioContext();
        gameState = STATE.INTRO;
        initIntro();
        return;
    }
    if (gameState === STATE.TRANSITION) return;
    if (gameState === STATE.INTRO) {
        startTransition(introPlanetX, introPlanetY);
        return;
    }
    if (gameState === STATE.START) { gameState = STATE.PLAYING; initGame(); return; }
    if (gameState === STATE.GAMEOVER) { gameState = STATE.INTRO; shakeTimer = 0; initIntro(); return; }
    if (gameState === STATE.PLAYING) launch();
}

window.addEventListener("keydown", function(e) {
    if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (!inputLock) { inputLock = true; handleInput(); }
    }
});
window.addEventListener("keyup", function(e) {
    if (e.code === "Space" || e.code === "Enter") inputLock = false;
});
canvas.addEventListener("pointerdown", function(e) { e.preventDefault(); handleInput(); });

// --- Camera ---
function updateCamera() {
    targetCameraY = satellite.y - LOGIC_H * 0.65;
    cameraY = lerp(cameraY, targetCameraY, 0.06);
}

// --- Update ---
function update(dt) {
    if (shakeTimer > 0) shakeTimer -= dt * 0.05;
    if (shakeTimer < 0) shakeTimer = 0;

    if (gameState === STATE.WAITING) return;
    if (gameState === STATE.INTRO) { updateIntro(dt); return; }
    if (gameState === STATE.TRANSITION) { updateTransition(dt); return; }
    if (gameState !== STATE.PLAYING) return;

    if (satellite.orbiting) {
        satellite.angle -= ORBIT_SPEED * dt;
        updateOrbitPos();
        satellite.visualAngle = satellite.angle - Math.PI / 2;
    } else {
        for (const p of planets) {
            const d = dist(satellite.x, satellite.y, p.x, p.y);
            const capR = p.radius * CAPTURE_FACTOR;
            if (d < capR * 3 && d > p.radius * 0.5) {
                const f = GRAVITY_STRENGTH * (p.radius / d) * dt;
                satellite.vx += ((p.x - satellite.x) / d) * f;
                satellite.vy += ((p.y - satellite.y) / d) * f;
            }
            if (d < capR && p !== satellite.currentPlanet) { capture(p); break; }
            if (d < p.radius * 0.6) { die(); return; }
        }
        satellite.x += satellite.vx * dt;
        satellite.y += satellite.vy * dt;
        satellite.visualAngle = Math.atan2(satellite.vy, satellite.vx);
        addTrail(satellite.x, satellite.y);

        const m = 50;
        const deadZoneY = satellite.currentPlanet
            ? satellite.currentPlanet.y + LOGIC_H * 0.8
            : cameraY + LOGIC_H + m * 2;
        if (satellite.x < -m || satellite.x > LOGIC_W + m ||
            satellite.y > deadZoneY ||
            satellite.y < cameraY - LOGIC_H) { die(); return; }
    }

    updateCamera();
    updateParticles();
    updateTrail();

    while (planets.length > 1 && planets[0].y > cameraY + LOGIC_H + 100) {
        if (planets[0] !== satellite.currentPlanet) planets.shift();
        else break;
    }
    if (planets[planets.length - 1].y > cameraY - LOGIC_H) spawnNext();
}

// --- Draw ---
function draw() {
    if (gameState === STATE.WAITING) {
        ctx.fillStyle = COL.DARK;
        ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
        drawStars(0);
        const cx = LOGIC_W / 2;
        pxText("ORBITANDO", cx, fl(LOGIC_H * 0.3), COL.BRIGHT, 2, "center");
        pxText("ANDO", cx, fl(LOGIC_H * 0.3) + 14, COL.BRIGHT, 2, "center");
        if (Math.sin(Date.now() * 0.004) > 0)
            pxText("[TOCA PARA JUGAR]", cx, fl(LOGIC_H * 0.55), COL.LIGHT, 1, "center");
        pxText("CANARIO", cx, fl(LOGIC_H * 0.88), COL.AQUA, 1, "center");
        return;
    }

    if (gameState === STATE.INTRO) { drawIntro(); return; }

    if (gameState === STATE.TRANSITION) {
        if (transPhase === 0) drawIntro();
        else drawGameScene();
        drawTransitionOverlay(transCenterX, transCenterY, transTimer, transPhase, transMaxRadius);
        return;
    }

    drawGameScene();
}

function drawGameScene() {
    ctx.save();
    if (shakeTimer > 0) {
        ctx.translate(
            fl((Math.random() - 0.5) * shakeIntensity * shakeTimer),
            fl((Math.random() - 0.5) * shakeIntensity * shakeTimer)
        );
    }
    ctx.fillStyle = COL.DARK;
    ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
    drawStars(cameraY);

    for (const p of planets) {
        const sy = p.y - cameraY;
        if (sy > -30 && sy < LOGIC_H + 30) drawPlanet(p, cameraY);
    }

    if (gameState === STATE.PLAYING || gameState === STATE.TRANSITION) {
        if (satellite.orbiting && satellite.currentPlanet)
            drawOrbitPath(satellite.currentPlanet, satellite.orbitRadius, cameraY);
        drawTrail(cameraY);
        drawLaunchIndicator(satellite, cameraY);
        drawSatellite(satellite, cameraY);
        if (nextPlanet) drawArrow(nextPlanet, cameraY);
    }

    drawParticles(cameraY);

    if (gameState === STATE.PLAYING) drawHUD(score);
    if (gameState === STATE.START) drawStartScreen();
    if (gameState === STATE.GAMEOVER) drawGameOverScreen();

    ctx.restore();
}

function drawStartScreen() {
    ctx.fillStyle = COL.DARK;
    for (let y = 0; y < LOGIC_H; y++)
        for (let x = (y % 2); x < LOGIC_W; x += 2)
            ctx.fillRect(x, y, 1, 1);

    const cx = LOGIC_W / 2;
    const ty = fl(LOGIC_H * 0.2);
    pxText("ORBITANDO", cx, ty, COL.BRIGHT, 2, "center");
    pxText("ANDO", cx, ty + 14, COL.BRIGHT, 2, "center");
    ctx.fillStyle = COL.TEAL;
    ctx.fillRect(cx - 35, ty + 28, 70, 1);

    const t = Date.now() * 0.002;
    const px = fl(cx), py = fl(LOGIC_H * 0.45), pr = 10;
    pxCircle(px, py, pr, COL.TEAL);
    pxCircleStroke(px, py, pr, COL.MINT);
    const oR = fl(pr * 2.2);
    pxCircleDash(px, py, oR, COL.OCEAN, 3);
    const satX = fl(px + Math.cos(t) * oR);
    const satY = fl(py + Math.sin(t) * oR);
    ctx.fillStyle = COL.BRIGHT;
    ctx.fillRect(satX - 1, satY - 1, 3, 3);
    ctx.fillStyle = COL.TEAL;
    ctx.fillRect(satX, satY, 1, 1);

    pxText("TOCA O PRESIONA ESPACIO", cx, fl(LOGIC_H * 0.6), COL.MID, 1, "center");
    pxText("PARA LANZAR", cx, fl(LOGIC_H * 0.6) + 8, COL.MID, 1, "center");
    if (Math.sin(Date.now() * 0.004) > 0)
        pxText("[TOCA PARA JUGAR]", cx, fl(LOGIC_H * 0.76), COL.LIGHT, 1, "center");
    if (highScore > 0)
        pxText("RECORD " + highScore, cx, fl(LOGIC_H * 0.86), COL.AQUA, 1, "center");
    pxText("V1.0", cx, LOGIC_H - 10, COL.DEEP, 1, "center");
}

function drawGameOverScreen() {
    ctx.fillStyle = COL.DARK;
    for (let y = 0; y < LOGIC_H; y++)
        for (let x = (y % 2); x < LOGIC_W; x += 2)
            ctx.fillRect(x, y, 1, 1);

    const cx = LOGIC_W / 2;
    const ty = fl(LOGIC_H * 0.22);
    pxText("PERDIDO EN", cx, ty, COL.MID, 2, "center");
    pxText("EL ESPACIO", cx, ty + 14, COL.MID, 2, "center");
    ctx.fillStyle = COL.OCEAN;
    ctx.fillRect(cx - 25, ty + 28, 50, 1);
    pxText(score + "", cx, fl(LOGIC_H * 0.44), COL.BRIGHT, 3, "center");
    pxText("PLANETAS RECORRIDOS", cx, fl(LOGIC_H * 0.44) + 20, COL.TEAL, 1, "center");

    if (score >= highScore && score > 0)
        pxText("NUEVO RECORD!", cx, fl(LOGIC_H * 0.58), COL.MINT, 1, "center");
    else
        pxText("RECORD " + highScore, cx, fl(LOGIC_H * 0.58), COL.AQUA, 1, "center");

    if (Math.sin(Date.now() * 0.004) > 0)
        pxText("[TOCA PARA REINTENTAR]", cx, fl(LOGIC_H * 0.74), COL.LIGHT, 1, "center");
}
