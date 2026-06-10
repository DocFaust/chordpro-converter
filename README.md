# ChordPro Converter

Webbasiertes Tool zum Umwandeln von Akkordblättern in das [ChordPro](https://www.chordpro.org/)-Format — ursprünglich für Tabs von [Ultimate Guitar](https://www.ultimate-guitar.com/). Die Anwendung erkennt Akkordzeilen, verknüpft sie mit Liedtexten und wandelt Abschnittsüberschriften in ChordPro-Direktiven um.

## Funktionen

- Metadaten (Titel, Interpret, Capo, Tonart) als ChordPro-Header
- Akkordzeilen erkennen und mit Liedtext zusammenführen
- Abschnittsüberschriften in ChordPro-Direktiven umwandeln
- Ausgabe kopieren oder als `.chord`-Datei herunterladen
- Alle Felder mit einem Klick löschen, um ein neues Lied zu konvertieren
- Optionaler Upload nach ownCloud per WebDAV

## Dokumentation

- [Eingabeformat](docs/input-format.md) — Ultimate-Guitar-Tabs kopieren, bereinigen und konvertieren
- [Architektur](docs/architecture.md) — Schichten, Datenfluss, Projektstruktur und CI/CD

## Voraussetzungen

- [Node.js](https://nodejs.org/) 22 (empfohlen, entspricht der CI-Konfiguration)
- npm

## Installation und Entwicklung

```bash
npm ci
npm run dev
```

Die Anwendung ist anschließend unter `http://localhost:5173` erreichbar.

### Produktions-Build

```bash
npm run build
npm run preview
```

Der Build landet im Verzeichnis `dist/`.

## NPM-Skripte

| Skript | Beschreibung |
|--------|--------------|
| `npm run dev` | Entwicklungsserver mit Hot Module Replacement |
| `npm run build` | Produktions-Build erstellen |
| `npm run preview` | Lokalen Preview des Builds starten |
| `npm run test` | Tests einmalig ausführen |
| `npm run test:watch` | Tests im Watch-Modus |
| `npm run test:ci` | Tests mit Coverage (für CI) |
| `npm run lint` | ESLint mit Checkstyle-Report |
| `npm run lint:ci` | ESLint für Jenkins |
| `npm run lint:sonar` | ESLint mit JSON-Report für SonarCloud |
| `npm run sonar` | SonarCloud-Analyse lokal ausführen |
| `npm run owasp` | OWASP Dependency-Check (benötigt `NVDAPIKEY`) |

## ownCloud-Konfiguration

Der optionale Upload in `src/saveToOwncloud.js` verwendet WebDAV mit Bearer-Token. Server-URL, Benutzerpfad und Token müssen dort an die eigene Umgebung angepasst werden, bevor der Upload genutzt wird.

## Tests

```bash
npm run test
```
