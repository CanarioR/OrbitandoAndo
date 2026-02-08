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

// --- Background music: double buffer for gapless loop ---
const BG_VOL = 0.4;
const bgA = new Audio("audio/bg_music.wav");
const bgB = new Audio("audio/bg_music.wav");
bgA.volume = BG_VOL;
bgB.volume = BG_VOL;
let bgMusicPlaying = false;
let bgCurrent = bgA;

function bgScheduleNext(current, next) {
    current.ontimeupdate = function() {
        if (current.duration && current.currentTime >= current.duration - 0.30) {
            current.ontimeupdate = null;
            next.currentTime = 0;
            next.play().catch(function() {});
            bgCurrent = next;
            bgScheduleNext(next, current);
        }
    };
}

function initAudioContext() {
    bgA.load();
    bgB.load();
}

function startBGMusic() {
    if (bgMusicPlaying) return;
    bgMusicPlaying = true;
    bgCurrent = bgA;
    bgA.currentTime = 0;
    bgA.play().then(function() {
        bgScheduleNext(bgA, bgB);
    }).catch(function() {
        bgMusicPlaying = false;
        setTimeout(startBGMusic, 500);
    });
}

function stopBGMusic() {
    if (!bgMusicPlaying) return;
    bgMusicPlaying = false;
    bgA.ontimeupdate = null;
    bgB.ontimeupdate = null;
    bgA.pause(); bgA.currentTime = 0;
    bgB.pause(); bgB.currentTime = 0;
}
