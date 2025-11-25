import {useState} from "react";
import {convertToChordPro} from "./converter/convertToChordPro";
import InputFields from "./components/InputFields";
import TextArea from "./components/TextArea";
import ButtonGroup from "./components/ButtonGroup";
import {saveFile} from "./saveToOwncloud.js";
import {Container} from "react-bootstrap";

function App() {
    const [input, setInput] = useState("");
    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [capo, setCapo] = useState("");
    const [key, setKey] = useState("");
    const [output, setOutput] = useState("");

    const handleConvert = () => {
        setOutput(convertToChordPro({title, artist, capo, key, input}));
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(output).then(() => {
            alert("Ausgabe in die Zwischenablage kopiert!");
        });
    };

    const saveToOwnCloud = () => {
        // let file = title + ".cho";
        // let content = output;
    }

    const downloadChordProFile = () => {
        // Blob aus dem ChordPro-Inhalt erstellen
        const blob = new Blob([output], {type: "text/plain"});
        const url = URL.createObjectURL(blob);

        // Temporären Anker erstellen und Klick auslösen
        const link = document.createElement("a");
        link.href = url;
        const fileName = title ? `${title}` : "chordpro_file";

        link.download = `${fileName}.chord`; // Dateiname mit Endung
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        saveFile(fileName, blob)
            .then(() => {
                alert("Datei wurde gespeichert!")
            })
            .catch((error) => {
                alert("Fehler beim Speichern: " + error)
            });
    };

    return (
        <Container className="mt-4">
            <h1>ChordPro Converter</h1>
            <InputFields
                title={title}
                setTitle={setTitle}
                artist={artist}
                setArtist={setArtist}
                capo={capo}
                setCapo={setCapo}
                keyValue={key}
                setKey={setKey}
            />
            <TextArea
                rows="10"
                placeholder="Füge hier deinen Text ein..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
            />
            <ButtonGroup
                onConvert={handleConvert}
                onCopy={copyToClipboard}
                onDownload={downloadChordProFile}
                onOwnCloud={saveToOwnCloud}
            />
            <h2 className="mt-4">ChordPro Ausgabe:</h2>
            <TextArea rows="10" value={output} readOnly/>
        </Container>
    );
}


export default App;
