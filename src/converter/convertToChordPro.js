// src/convertToChordPro.js
import { isChordLine, splitChordLinePreserveSpaces } from "./chords.js";
import { parseLabeledLine, labelToDirective } from "./sections.js";

// Verbindet Akkordzeile mit Textzeile (Spaltenposition → Textindex)
export function mergeChordAndText(chords, text) {
    const placements = [];
    let column = 0;
    for (const part of splitChordLinePreserveSpaces(chords)) {
        if (part.trim()) {
            placements.push({ column, chord: part.trim() });
        }
        column += part.length;
    }

    let result = "";
    let placementIndex = 0;
    for (let i = 0; i <= text.length; i++) {
        while (placementIndex < placements.length && placements[placementIndex].column === i) {
            result += `[${placements[placementIndex].chord}]`;
            placementIndex++;
        }
        if (i < text.length) {
            result += text[i];
        }
    }
    while (placementIndex < placements.length) {
        result += `[${placements[placementIndex].chord}]`;
        placementIndex++;
    }
    return result;
}

export function formatChordOnlyLine(chordBuffer) {
    const parts = chordBuffer.trim().split(/\s+/).filter(Boolean);
    return parts.map(tok => `[${tok}]`).join(" ");
}

export function headerDirectives({ title, artist, capo, key }) {
    const out = [];
    if (title) out.push(`{title: ${title}}`);
    if (artist) out.push(`{artist: ${artist}}`);
    if (capo && /^(?:[1-9]|1[0-1])$/.test(String(capo))) out.push(`{capo: ${capo}}`);
    if (key && /^[A-GH][#b]?(?:m)?$/.test(String(key))) out.push(`{key: ${key}}`);
    return out;
}

export function convertToChordPro({ title, artist, capo, key, input }) {
    const lines = input.split("\n");
    lines.push(""); // Sentinel

    const result = [];
    result.push(...headerDirectives({ title, artist, capo, key }));
    if (result.length) result.push("");

    let chordBuffer = "";

    for (const raw of lines) {
        const line = raw;
        const trimmed = line.trim();

        // ---- NEU: Mehrere Akkordzeilen hintereinander korrekt ausgeben ----
        if (isChordLine(trimmed) && trimmed !== "") {
            if (chordBuffer) {
                // Vorherige Akkordzeile als reine ChordPro-Zeile ausgeben (ohne Leerzeile)
                result.push(formatChordOnlyLine(chordBuffer));
            }
            chordBuffer = line;
            continue;
        }

        // Leerzeile
        if (trimmed === "") {
            if (chordBuffer) {
                // Letzte gepufferte Akkordzeile flushen und Absatz öffnen
                result.push(formatChordOnlyLine(chordBuffer));
                result.push("");
                chordBuffer = "";
            } else {
                result.push("");
            }
            continue;
        }

        // Abschnittsüberschrift
        const parsed = parseLabeledLine(trimmed);
        if (parsed) {
            const { label, rest } = parsed;
            const { directive } = labelToDirective(label);
            result.push(`{${directive}: ${label}}`);
            if (rest) result.push(rest);
            continue;
        }

        // Normale Textzeile
        if (!chordBuffer) {
            result.push(trimmed);
        } else {
            result.push(mergeChordAndText(chordBuffer, line));
            chordBuffer = "";
        }
    }

    return result.join("\n");
}

export default convertToChordPro;
