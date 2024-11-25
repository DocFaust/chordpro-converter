const { testdata } = require("./testdata");

const convertToChordPro = () => {
    const lines = input.split("\n");
    lines.push("\n");
    let result = [];
    let buffer = "";

    const isChordLine = (line) =>
        /^[A-G][#b]?(m|M|dim|aug|\d+)?(\s+[A-G][#b]?(m|M|dim|aug|\d+)?)*$/.test(line.trim());

    for (let line of lines) {
        const trimmedLine = line.trim();

        // Chordline
        if(isChordLine(trimmedLine)) {
            buffer = line;
            continue;
        }

        // EmptyLine
        if (trimmedLine === "" && buffer === "") {
            result.push("");
            continue;
        }

        // Single Chords
        if (trimmedLine === "") {
            const formattedChords = buffer
                .split(/\s+/)
                .map((chord) => `[${chord}]`)
                .join(" ");
            result.push(formattedChords);
            buffer = "";
            continue;
        }

        // Title
        if(trimmedLine.startsWith("[")&&trimmedLine.endsWith("]")) {
            const sectionName = trimmedLine.slice(1, -1);
            result.push(`{c:${sectionName}}`);
            continue;
        }

        // Normale Zeile ohne was
        if(buffer === "") {
            result.push(trimmedLine);
            continue;
        } else {
            result.push(mergeChordAndText(buffer, trimmedLine));
            buffer = "";
            continue;
        }
    }
    setOutput(result.join("\n"));
}

const mergeChordAndText = (chords, text) => {
    let combined = "";
    let textIndex = 0;

    let parts = chords.split(/(\s+)/);
    parts.forEach((part) => {
        let l = part.length;
        if(part.trim()===""){
            combined += text.slice(textIndex, textIndex + l);
            textIndex += l;
        } else {
            combined += `[${part}]`;
        }
    });
    combined += text.slice(textIndex);
    return combined;
};

console.log(convert().join("\n"));