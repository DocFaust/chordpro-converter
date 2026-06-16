import {useState} from "react";
import {Alert, Button, Modal, Spinner} from "react-bootstrap";
import {uploadFile} from "../nextcloud/client.js";

function NextcloudUploadModal({show, onHide, settings, fileName, content}) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    const handleUpload = () => {
        setStatus({variant: "info", message: "Upload wird vorbereitet…"});

        if (!settings?.baseUrl || !settings?.username || !settings?.password) {
            setStatus({
                variant: "danger",
                message: "Einstellungen fehlen — bitte Nextcloud-Einstellungen öffnen und speichern",
            });
            return;
        }
        if (!content?.trim()) {
            setStatus({variant: "danger", message: "Keine ChordPro-Ausgabe zum Hochladen"});
            return;
        }

        setLoading(true);
        uploadFile(settings, settings.folderPath, fileName, content)
            .then(() => {
                setStatus({variant: "success", message: "Datei wurde hochgeladen!"});
                setTimeout(onHide, 1500);
            })
            .catch((error) => {
                setStatus({
                    variant: "danger",
                    message: error?.message || "Upload fehlgeschlagen",
                });
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const handleClose = () => {
        if (!loading) {
            setStatus(null);
            onHide();
        }
    };

    if (!show) {
        return null;
    }

    return (
        <Modal show={show} onHide={handleClose} enforceFocus={false} restoreFocus={false}>
            <Modal.Header closeButton={!loading}>
                <Modal.Title>Zu Nextcloud hochladen</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p><strong>Dateiname:</strong> {fileName}</p>
                <p><strong>Zielordner:</strong> {settings?.folderPath || "(nicht gesetzt)"}</p>
                {status && <Alert variant={status.variant}>{status.message}</Alert>}
            </Modal.Body>
            <Modal.Footer>
                <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
                    Abbrechen
                </Button>
                <Button type="button" variant="primary" onClick={handleUpload} disabled={loading}>
                    {loading ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Wird hochgeladen…
                        </>
                    ) : (
                        "Hochladen"
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default NextcloudUploadModal;
