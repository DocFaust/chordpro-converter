//import React from "react";
import { Row, Col, FloatingLabel, Form } from "react-bootstrap";

function InputFields({ title, setTitle, artist, setArtist, capo, setCapo, keyValue, setKey }) {
    return (
        <Row className="mb-3">
            <Col md={8}>
                <FloatingLabel controlId="title" label="Titel" className="mb-3">
                    <Form.Control
                        type="text"
                        maxLength="30"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Titel"
                    />
                </FloatingLabel>
                <FloatingLabel controlId="artist" label="Interpret">
                    <Form.Control
                        type="text"
                        maxLength="30"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        placeholder="Interpret"
                    />
                </FloatingLabel>
            </Col>
            <Col md={4}>
                <FloatingLabel controlId="capo" label="Capo" className="mb-3">
                    <Form.Control
                        type="number"
                        min="1"
                        max="11"
                        value={capo}
                        onChange={(e) => setCapo(e.target.value)}
                        placeholder="Capo"
                    />
                </FloatingLabel>
                <FloatingLabel controlId="key" label="Tonart">
                    <Form.Control
                        type="text"
                        maxLength="3"
                        value={keyValue}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="Tonart"
                    />
                </FloatingLabel>
            </Col>
        </Row>
    );
}

export default InputFields;
