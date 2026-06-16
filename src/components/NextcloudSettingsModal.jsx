import {useState} from "react";
import {Alert, Breadcrumb, Button, Form, ListGroup, Modal} from "react-bootstrap";
import {listFolders} from "../nextcloud/client.js";
import {loadSettings, saveSettings} from "../nextcloud/settings.js";

function readInitialSettings() {
    const settings = loadSettings();
    return {
        baseUrl: settings?.baseUrl ?? "",
        username: settings?.username ?? "",
        password: settings?.password ?? "",
        folderPath: settings?.folderPath ?? "",
    };
}

function NextcloudSettingsForm({onHide}) {
    const initialSettings = readInitialSettings();
    const [baseUrl, setBaseUrl] = useState(initialSettings.baseUrl);
    const [username, setUsername] = useState(initialSettings.username);
    const [password, setPassword] = useState(initialSettings.password);
    const [folderPath, setFolderPath] = useState(initialSettings.folderPath);
    const [currentPath, setCurrentPath] = useState("");
    const [folders, setFolders] = useState([]);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [browseActive, setBrowseActive] = useState(false);

    const getConfig = () => ({
        baseUrl: baseUrl.trim(),
        username: username.trim(),
        password,
    });

    const loadFolderList = async (path) => {
        setLoading(true);
        setStatus(null);
        try {
            const folderList = await listFolders(getConfig(), path);
            setFolders(folderList);
            setCurrentPath(path);
            setBrowseActive(true);
        } catch (error) {
            setFolders([]);
            setStatus({variant: "danger", message: error.message});
        } finally {
            setLoading(false);
        }
    };

    const handleTestConnection = async () => {
        await loadFolderList("");
    };

    const handleSelectFolder = (path) => {
        setFolderPath(path);
        setStatus({
            variant: "success",
            message: `Zielordner gesetzt: ${path || "Root"}`,
        });
    };

    const handleEnterFolder = async (folderName) => {
        const nextPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        await loadFolderList(nextPath);
    };

    const handleSave = () => {
        if (!folderPath.trim()) {
            setStatus({variant: "danger", message: "Bitte einen Zielordner wählen oder eintragen"});
            return;
        }
        saveSettings({
            baseUrl: baseUrl.trim(),
            username: username.trim(),
            password,
            folderPath: folderPath.trim(),
        });
        alert("Nextcloud-Einstellungen gespeichert!");
        onHide();
    };

    const pathSegments = currentPath ? currentPath.split("/").filter(Boolean) : [];

    return (
        <>
            <Modal.Header closeButton>
                <Modal.Title>Nextcloud-Einstellungen</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group className="mb-3" controlId="nextcloud-base-url">
                        <Form.Label>Server-URL</Form.Label>
                        <Form.Control
                            type="url"
                            placeholder="https://nextcloud.docfaust.de"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="nextcloud-username">
                        <Form.Label>Benutzername</Form.Label>
                        <Form.Control
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="nextcloud-password">
                        <Form.Label>App-Passwort</Form.Label>
                        <Form.Control
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Form.Text>Nutze ein Nextcloud App-Passwort, nicht dein Hauptpasswort.</Form.Text>
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="nextcloud-folder-path">
                        <Form.Label>Zielordner</Form.Label>
                        <Form.Control
                            placeholder="z. B. Band/ChordPro (leer = Root)"
                            value={folderPath}
                            onChange={(e) => setFolderPath(e.target.value)}
                        />
                        <Form.Text>Pfad manuell eintragen oder unten aus der Liste wählen.</Form.Text>
                    </Form.Group>
                </Form>

                <div className="d-flex flex-wrap gap-2 mb-3">
                    <Button type="button" variant="secondary" onClick={handleTestConnection} disabled={loading}>
                        {loading ? "Lädt…" : "Ordner anzeigen"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline-primary"
                        onClick={() => handleSelectFolder(currentPath)}
                        disabled={loading || !browseActive}
                    >
                        Aktuellen Ordner übernehmen
                    </Button>
                </div>

                {status && <Alert variant={status.variant}>{status.message}</Alert>}

                {browseActive && (
                    <>
                        <p className="text-muted mb-2">
                            Klicke <strong>Auswählen</strong> neben einem Ordner, oder <strong>Öffnen</strong> zum Navigieren.
                        </p>
                        <Breadcrumb>
                            <Breadcrumb.Item
                                active={currentPath === ""}
                                onClick={() => loadFolderList("")}
                                style={{cursor: "pointer"}}
                            >
                                Root
                            </Breadcrumb.Item>
                            {pathSegments.map((segment, index) => {
                                const path = pathSegments.slice(0, index + 1).join("/");
                                const isLast = index === pathSegments.length - 1;
                                return (
                                    <Breadcrumb.Item
                                        key={path}
                                        active={isLast}
                                        onClick={() => !isLast && loadFolderList(path)}
                                        style={{cursor: isLast ? "default" : "pointer"}}
                                    >
                                        {segment}
                                    </Breadcrumb.Item>
                                );
                            })}
                        </Breadcrumb>
                        <ListGroup className="mb-2">
                            {folders.map((folder) => {
                                const fullPath = currentPath ? `${currentPath}/${folder}` : folder;
                                return (
                                    <ListGroup.Item key={folder} className="d-flex justify-content-between align-items-center">
                                        <span>{folder}</span>
                                        <span className="d-flex gap-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="success"
                                                onClick={() => handleSelectFolder(fullPath)}
                                            >
                                                Auswählen
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline-secondary"
                                                onClick={() => handleEnterFolder(folder)}
                                            >
                                                Öffnen
                                            </Button>
                                        </span>
                                    </ListGroup.Item>
                                );
                            })}
                            {!loading && folders.length === 0 && (
                                <ListGroup.Item>
                                    Keine Unterordner — „Aktuellen Ordner übernehmen“ nutzen
                                </ListGroup.Item>
                            )}
                        </ListGroup>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button type="button" variant="secondary" onClick={onHide}>Abbrechen</Button>
                <Button type="button" variant="primary" onClick={handleSave}>Speichern</Button>
            </Modal.Footer>
        </>
    );
}

function NextcloudSettingsModal({show, onHide}) {
    return (
        <Modal show={show} onHide={onHide} size="lg" enforceFocus={false} restoreFocus={false}>
            {show && <NextcloudSettingsForm onHide={onHide} />}
        </Modal>
    );
}

export default NextcloudSettingsModal;
