// import React from "react";
import {Button} from "react-bootstrap";

function ButtonGroup({onConvert, onCopy, onDownload, onClear}) {
    return (
        <div className="d-flex gap-2">
            <Button variant="primary" onClick={onConvert}>
                Umwandeln
            </Button>
            <Button variant="secondary" onClick={onCopy}>
                In Zwischenablage kopieren
            </Button>
            <Button onClick={onDownload}>
                Download als Datei
            </Button>
            <Button variant="outline-danger" onClick={onClear}>
                Löschen
            </Button>
        </div>
    );
}

export default ButtonGroup;
