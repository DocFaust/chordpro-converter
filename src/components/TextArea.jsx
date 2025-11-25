//import React from "react";
import { Form } from "react-bootstrap";

function TextArea({ rows, placeholder, value, onChange, readOnly = false }) {
    return (
        <Form.Group className="mb-3">
            <Form.Control
                as="textarea"
                rows={rows}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                readOnly={readOnly}
                style={{
                    fontFamily: "monospace",
                    whiteSpace: "pre",
                    fontSize: "0.95rem"
                }}
            />
        </Form.Group>
    );
}

export default TextArea;
