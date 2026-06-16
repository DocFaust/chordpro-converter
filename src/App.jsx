import {useState} from "react";
import {convertToChordPro} from "./converter/convertToChordPro";
import InputFields from "./components/InputFields";
import TextArea from "./components/TextArea";
import ButtonGroup from "./components/ButtonGroup";
import NextcloudSettingsModal from "./components/NextcloudSettingsModal";
import {sanitizeFileName, uploadFile} from "./nextcloud/client.js";
import {hasValidSettings, loadSettings} from "./nextcloud/settings.js";
import {Container} from "react-bootstrap";

function App() {
    const [input, setInput] = useState("");
    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [capo, setCapo] = useState("");
    const [key, setKey] = useState("");
    const [output, setOutput] = useState("");
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleConvert = () => {
        setOutput(convertToChordPro({title, artist, capo, key, input}));
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(output).then(() => {
            alert("Ausgabe in die Zwischenablage kopiert!");
        });
    };

    const handleClear = () => {
        setInput("");
        setTitle("");
        setArtist("");
        setCapo("");
        setKey("");
        setOutput("");
    };

    const downloadChordProFile = () => {
        const blob = new Blob([output], {type: "text/plain"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const fileName = sanitizeFileName(title);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleNextcloudUpload = async () => {
        const settings = loadSettings();
        if (!hasValidSettings(settings)) {
            setShowSettingsModal(true);
            return;
        }
        if (!output.trim()) {
            alert("Bitte zuerst ein Lied umwandeln.");
            return;
        }

        const fileName = sanitizeFileName(title);
        const confirmed = window.confirm(
            `"${fileName}" nach Nextcloud hochladen?\n\nZielordner: ${settings.folderPath}`
        );
        if (!confirmed) {
            return;
        }

        setUploading(true);
        try {
            await uploadFile(settings, settings.folderPath, fileName, output);
            alert(`"${fileName}" wurde hochgeladen!`);
        } catch (error) {
            alert(`Upload fehlgeschlagen:\n${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleNextcloudSettings = () => {
        setShowSettingsModal(true);
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
                onClear={handleClear}
                onNextcloudUpload={handleNextcloudUpload}
                onNextcloudSettings={handleNextcloudSettings}
                uploadDisabled={!output.trim() || uploading}
            />
            <h2 className="mt-4">ChordPro Ausgabe:</h2>
            <TextArea rows="10" value={output} readOnly/>
            <NextcloudSettingsModal
                show={showSettingsModal}
                onHide={() => setShowSettingsModal(false)}
            />
        </Container>
    );
}

export default App;
