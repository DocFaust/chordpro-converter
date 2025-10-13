// convertToChordPro.js

const isChordLine = (line) =>
    /^([A-G][#b]?[a-zA-Z0-9]*(\*?)|\|)(\s+([A-G][#b]?[a-zA-Z0-9]*(\*?)|\|))*$/.test(line.trim());
const mergeChordAndText = (chords, text) => {
    let combined = "";
    let textIndex = 0;

    const parts = chords.split(/(\s+)/);
    parts.forEach((part) => {
        const length = part.length;
        if (part.trim() === "") {
            combined += text.slice(textIndex, textIndex + length);
            textIndex += length;
        } else {
            combined += `[${part.trim()}]`;
        }
    });

    combined += text.slice(textIndex);
    return combined;
};

export function convertToChordPro({ title, artist, capo, key, input }) {
    const lines = input.split("\n");
    lines.push("\n"); // Dummy-Zeile zum Verarbeiten am Ende
    let result = [];

    // Zusätzliche Felder in ChordPro-Syntax am Anfang hinzufügen
    if (title) result.push(`{title: ${title}}`);
    if (artist) result.push(`{artist: ${artist}}`);
    if (capo && /^[1-9]$|^1[0-1]$/.test(capo)) result.push(`{capo: ${capo}}`);
    if (key && /^[A-G]#?(m)?$/.test(key)) result.push(`{key: ${key}}`);
    result.push("");

    let buffer = "";

    for (let line of lines) {
        const trimmedLine = line.trim();

        if (isChordLine(trimmedLine)) {
            buffer = line;
            continue;
        }

        if (trimmedLine === "" && buffer === "") {
            result.push("");
            continue;
        }

        if (trimmedLine === "") {
            const formattedChords = buffer
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .map((chord) => `[${chord}]`)
                .join(" ");
            result.push(formattedChords);
            result.push("");
            buffer = "";
            continue;
        }
        if (/^\[(Chorus|Refrain)[^\]]*\]/i.test(trimmedLine)) {
            const match = trimmedLine.match(/^\[([^\]]+)\]\s*(.*)/i);
            if (match) {
                result.push(`{soc: ${match[1].trim()}}`);
                if (match[2]) result.push(match[2]);
            }
            continue;
        }

        if (/^\[(Verse|Strophe|Vers)[^\]]*\]/i.test(trimmedLine)) {
            const match = trimmedLine.match(/^\[([^\]]+)\]\s*(.*)/i);
            if (match) {
                result.push(`{sov: ${match[1].trim()}}`);
                if (match[2]) result.push(match[2]);
            }
            continue;
        }

        if (trimmedLine.startsWith("[") && trimmedLine.endsWith("]")) {
            const sectionName = trimmedLine.slice(1, -1).trim();
            result.push(`{c: ${sectionName}}`);
            continue;
        }

        if (buffer === "") {
            result.push(trimmedLine);
        } else {
            result.push(mergeChordAndText(buffer, trimmedLine));
            buffer = "";
        }
    }

    return result.join("\n");
}
