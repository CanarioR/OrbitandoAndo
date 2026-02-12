"use strict";

const SUPABASE_URL = "https://mqodzrvqfyrtlnawtvjs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xb2R6cnZxZnlydGxuYXd0dmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NjM4NjUsImV4cCI6MjA4NjQzOTg2NX0.3kernwkNL480FfqEqdFt0yxTuS_eT6RUWkIgTVRhGoU";

let supabaseClient = null;

function initSupabase() {
    if (typeof supabase !== "undefined" && supabase.createClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.warn("Supabase SDK no cargado. El leaderboard no funcionará.");
    }
}

// --- Nombre del jugador ---
let playerName = localStorage.getItem("orbitPlayerName") || "";

function setPlayerName(name) {
    playerName = name.trim().toUpperCase().substring(0, 12);
    localStorage.setItem("orbitPlayerName", playerName);
}

function getPlayerName() {
    return playerName;
}

// --- Guardar puntaje (solo si es mayor al existente) ---
async function saveScore(name, scoreVal) {
    if (!supabaseClient) return;
    if (!name || scoreVal <= 0) return;
    try {
        // Consultar puntaje actual del jugador
        const { data: existing } = await supabaseClient
            .from("scores")
            .select("score")
            .eq("player_name", name)
            .single();

        // Solo guardar si es nuevo récord
        if (existing && existing.score >= scoreVal) return;

        await supabaseClient
            .from("scores")
            .upsert(
                { player_name: name, score: scoreVal, created_at: new Date().toISOString() },
                { onConflict: "player_name" }
            );
    } catch (e) {
        console.error("Error guardando puntaje:", e);
    }
}

// --- Obtener leaderboard (top 10) ---
let leaderboardData = [];
let leaderboardLoading = false;

async function fetchLeaderboard() {
    if (!supabaseClient) return;
    leaderboardLoading = true;
    try {
        const { data, error } = await supabaseClient
            .from("scores")
            .select("player_name, score")
            .order("score", { ascending: false })
            .limit(10);
        if (!error && data) {
            leaderboardData = data;
        }
    } catch (e) {
        console.error("Error obteniendo leaderboard:", e);
    }
    leaderboardLoading = false;
}

// --- Obtener historial personal ---
let personalHistory = [];

async function fetchPersonalHistory(name) {
    if (!supabaseClient || !name) return;
    try {
        const { data, error } = await supabaseClient
            .from("scores")
            .select("score, created_at")
            .eq("player_name", name)
            .order("score", { ascending: false })
            .limit(5);
        if (!error && data) {
            personalHistory = data;
        }
    } catch (e) {
        console.error("Error obteniendo historial:", e);
    }
}
