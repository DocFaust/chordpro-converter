//import React from "react";
import { Form } from "react-bootstrap";
import "./textArea.css";

function TextArea({ rows, placeholder, value, onChange, readOnly = false }) {
    return (
        <Form.Group className="mb-3">
            <Form.Control
                as="textarea"
                className="chordpro-editor"
                rows={rows}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                readOnly={readOnly}
            />
        </Form.Group>
    );
}

export default TextArea;
