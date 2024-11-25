import { useState } from "react";
import { convertToChordPro } from "./convertToChordPro";
import InputFields from "./components/InputFields";
import TextArea from "./components/TextArea";
import ButtonGroup from "./components/ButtonGroup";
import {saveFile} from "./saveToOwncloud.js";
import { Container, Row, Col } from "react-bootstrap";

function App() {
    const [input, setInput] = useState("");
    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [capo, setCapo] = useState("");
    const [key, setKey] = useState("");
    const [output, setOutput] = useState("");

    const handleConvert = () => {
        setOutput(convertToChordPro({ title, artist, capo, key, input }));
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(output).then(() => {
            alert("Ausgabe in die Zwischenablage kopiert!");
        });
    };

    const saveToOwnCloud = () => {
        let file = title + ".cho";
        let content = output;

        saveFile(file, content)
            .then(() => {alert("Datei wurde gespeichert!")})
            .catch((error) => {alert("Fehler beim Speichern: " + error)});
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
            <ButtonGroup onConvert={handleConvert} onCopy={copyToClipboard} onOwnCloud={saveToOwnCloud}/>
            <h2 className="mt-4">ChordPro Ausgabe:</h2>
            <TextArea rows="10" value={output} readOnly />
        </Container>
    );
}

export default App;
