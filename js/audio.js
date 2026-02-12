"use strict";

const SFX = {
    llegada:    new Audio("audio/llegada.mp3"),
    contacto:   new Audio("audio/contacto.mp3"),
    explosion:  new Audio("audio/explosion.mp3"),
    transicion: new Audio("audio/transicion.mp3"),
    gameOver:   new Audio("audio/game_over.wav")
};

SFX.llegada.volume    = 0.7;
SFX.contacto.volume   = 0.6;
SFX.explosion.volume  = 0.7;
SFX.transicion.volume = 0.7;
SFX.gameOver.volume   = 0.6;

function playSFX(audio) {
    audio.currentTime = 0;
    audio.play().catch(function() {});
}

function stopSFX(audio) {
    audio.pause();
    audio.currentTime = 0;
}

// --- Background music: gapless loop ---
const BG_VOL = 0.4;
let bgCtx = null;
let bgBuffer = null;
let bgSource = null;
let bgGain = null;
let bgMusic = null;
let bgMusicPlaying = false;
let audioUnlocked = false;
const canFetch = location.protocol !== "file:";

function createBgAudioElement() {
    if (bgMusic) return;
    bgMusic = new Audio("audio/bg_music.wav");
    bgMusic.loop = true;
    bgMusic.volume = BG_VOL;
    bgMusic.preload = "auto";
}

function initAudioContext() {
    // Siempre crear el elemento HTML5 como respaldo
    createBgAudioElement();

    // Solo intentar Web Audio API si podemos usar fetch (no file://)
    if (canFetch && !bgCtx) {
        try {
            bgCtx = new (window.AudioContext || window.webkitAudioContext)();
            bgGain = bgCtx.createGain();
            bgGain.gain.value = BG_VOL;
            bgGain.connect(bgCtx.destination);
        } catch (e) {
            bgCtx = null;
        }
    }
    if (bgCtx && bgCtx.state === "suspended") {
        bgCtx.resume();
    }
    // Cargar buffer para Web Audio (gapless) solo si fetch funciona
    if (canFetch && bgCtx && !bgBuffer) {
        fetch("audio/bg_music.wav")
            .then(function(r) {
                if (!r.ok) throw new Error("HTTP " + r.status);
                return r.arrayBuffer();
            })
            .then(function(buf) { return bgCtx.decodeAudioData(buf); })
            .then(function(decoded) {
                bgBuffer = decoded;
            })
            .catch(function() {});
    }
    // Desbloquear Audio HTML5 en móviles
    if (!audioUnlocked) {
        audioUnlocked = true;
        var toUnlock = [bgMusic].concat(Object.values(SFX));
        toUnlock.forEach(function(a) {
            var p = a.play();
            if (p) p.then(function() { a.pause(); a.currentTime = 0; }).catch(function() {});
        });
    }
}

function startBGMusic() {
    if (bgMusicPlaying) return;
    bgMusicPlaying = true;
    // Intentar Web Audio API (gapless)
    if (bgCtx && bgBuffer) {
        if (bgCtx.state === "suspended") bgCtx.resume();
        bgSource = bgCtx.createBufferSource();
        bgSource.buffer = bgBuffer;
        bgSource.loop = true;
        bgSource.connect(bgGain);
        bgSource.start(0);
        return;
    }
    // Buffer aún cargando - reintentar brevemente
    if (canFetch && bgCtx && !bgBuffer) {
        bgMusicPlaying = false;
        setTimeout(startBGMusic, 200);
        return;
    }
    // HTML5 Audio con loop nativo
    if (bgMusic) {
        bgMusic.currentTime = 0;
        bgMusic.play().catch(function() {
            bgMusicPlaying = false;
        });
    }
}

function stopBGMusic() {
    if (!bgMusicPlaying) return;
    bgMusicPlaying = false;
    if (bgSource) {
        try { bgSource.stop(); } catch (e) {}
        bgSource.disconnect();
        bgSource = null;
    }
    if (bgMusic) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
    }
}
