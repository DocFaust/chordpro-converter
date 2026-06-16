import {Button} from "react-bootstrap";

function ButtonGroup({
    onConvert,
    onCopy,
    onDownload,
    onClear,
    onNextcloudUpload,
    onNextcloudSettings,
    uploadDisabled,
}) {
    return (
        <div className="d-flex flex-wrap gap-2">
            <Button variant="primary" onClick={onConvert}>
                Umwandeln
            </Button>
            <Button variant="secondary" onClick={onCopy}>
                In Zwischenablage kopieren
            </Button>
            <Button onClick={onDownload}>
                Download als Datei
            </Button>
            <Button variant="success" onClick={onNextcloudUpload} disabled={uploadDisabled}>
                Zu Nextcloud hochladen
            </Button>
            <Button variant="outline-secondary" onClick={onNextcloudSettings}>
                Nextcloud-Einstellungen
            </Button>
            <Button variant="outline-danger" onClick={onClear}>
                Löschen
            </Button>
        </div>
    );
}

export default ButtonGroup;
