# ChordPro Converter

Webbasiertes Tool zum Umwandeln von Akkordblättern in das [ChordPro](https://www.chordpro.org/)-Format — ursprünglich für Tabs von [Ultimate Guitar](https://www.ultimate-guitar.com/). Die Anwendung erkennt Akkordzeilen, verknüpft sie mit Liedtexten und wandelt Abschnittsüberschriften in ChordPro-Direktiven um.

## Funktionen

- Metadaten (Titel, Interpret, Capo, Tonart) als ChordPro-Header
- Akkordzeilen erkennen und mit Liedtext zusammenführen
- Abschnittsüberschriften in ChordPro-Direktiven umwandeln
- Ausgabe kopieren oder als `.chord`-Datei herunterladen
- Alle Felder mit einem Klick löschen, um ein neues Lied zu konvertieren
- Upload nach Nextcloud per WebDAV (mit lokaler Credential-Speicherung)

## Dokumentation

- [Eingabeformat](docs/input-format.md) — Ultimate-Guitar-Tabs kopieren, bereinigen und konvertieren
- [Architektur](docs/architecture.md) — Schichten, Datenfluss, Projektstruktur und CI/CD
- [Nextcloud-Upload](docs/nextcloud-upload.md) — Einrichtung, Upload und Fehlerbehebung

## Voraussetzungen

- [Node.js](https://nodejs.org/) 24 LTS (Entwicklung und CI)
- npm

## Installation und Entwicklung

```bash
npm ci
npm run dev
```

Die Anwendung ist anschließend unter `http://localhost:5173` erreichbar. Die Umwandlung nach ChordPro braucht keine Anmeldung.

Für Einrichtung und Anmeldung zusätzlich das Backend starten. Das Frontend leitet `/api` an `http://127.0.0.1:3000` weiter und behält dabei den Host der Seite, damit die Origin-Prüfung greift.

### Backend

Das Backend startet unabhängig vom Vite-Frontend:

```bash
npm run server
```

Es lauscht standardmäßig auf `http://127.0.0.1:3000`. `GET /api/health` prüft die Erreichbarkeit und liefert keine Fachdaten.

Die SQLite-Datei liegt unter `data/cpc.sqlite`. Ein anderer Pfad wird mit der Umgebungsvariable `DATABASE_PATH` gesetzt. `HOST` und `PORT` ändern die Bind-Adresse. Die Datenbankdatei wird nicht versioniert.

### Konten

Es gibt keine Selbstregistrierung und keinen E-Mail-Versand. Das erste Administratorkonto entsteht einmalig über den Einrichtungsdialog. Dafür setzt der Betreiber `SETUP_TOKEN` in der Umgebung des Serverprozesses. Der Wert gehört nicht in das Frontend, in Logs oder in diese Datei. Weitere Passwörter, auch temporäre nach einem Zurücksetzen, teilt der Administrator persönlich mit.

Das Sitzungs-Cookie `cpc_session` ist HTTP-only und `SameSite=Strict`. Es wird mit einer Lebensdauer von 400 Tagen gesetzt. Das ist eine bewusste technische Entscheidung, damit die Anmeldung auf Tablets einen Browserneustart übersteht. 400 Tage entsprechen der üblichen Obergrenze, die Browser für Cookie-Lebensdauern akzeptieren. Eine fachliche Sitzungsdauer gibt es nicht: der Server speichert kein Ablaufdatum und kann jede Sitzung sofort widerrufen.

`COOKIE_SECURE=true` setzen, wenn TLS vor dem Prozess endet, etwa an einem Reverse Proxy. Dann erwartet die Anwendung für schreibende Anfragen die Origin `https://<Host>` und markiert das Cookie als `Secure`. Weitergeleitete Proxy-Header wie `X-Forwarded-Proto` oder `X-Forwarded-For` werden nicht ausgewertet. Ohne `COOKIE_SECURE` gilt das Schema der direkten Verbindung.

Schreibende Anfragen brauchen `Content-Type: application/json`, den Header `X-CPC-Request: 1` und eine Origin, die zu Schema und Host passt. Es wird kein CORS-Zugriff für fremde Origins freigegeben.

| Antwortcode | Bedeutung |
| --- | --- |
| `origin_missing` | Schreibende Anfrage ohne Origin. Browser senden den Header automatisch. |
| `origin_mismatch` | Origin passt nicht zu Schema und Host. Bei TLS-Terminierung am Proxy `COOKIE_SECURE=true` setzen. |

### Produktions-Build

```bash
npm run build
npm run preview
```

Der Build landet im Verzeichnis `dist/`.

## NPM-Skripte

| Skript | Beschreibung |
|--------|--------------|
| `npm run dev` | Frontend-Entwicklungsserver mit Hot Module Replacement |
| `npm run server` | Backend unabhängig vom Frontend starten |
| `npm run build` | Produktions-Build erstellen |
| `npm run preview` | Lokalen Preview des Builds starten |
| `npm run test` | Tests einmalig ausführen |
| `npm run test:watch` | Tests im Watch-Modus |
| `npm run test:ci` | Tests mit Coverage (für CI) |
| `npm run lint` | ESLint mit Checkstyle-Report |
| `npm run lint:ci` | ESLint mit Checkstyle-Report (XML) |
| `npm run lint:sonar` | ESLint mit JSON-Report für SonarCloud |
| `npm run sonar` | SonarCloud-Analyse lokal ausführen |
| `npm run owasp` | OWASP Dependency-Check auf Basis von `package.json` und `package-lock.json` (benötigt `NVDAPIKEY`) |

## Nextcloud-Upload

ChordPro-Dateien können per WebDAV auf Nextcloud hochgeladen werden. Server-URL, Benutzername, App-Passwort und Zielordner werden in der App konfiguriert und lokal im Browser gespeichert.

Einrichtung und Fehlerbehebung: [Nextcloud-Upload](docs/nextcloud-upload.md)

## Tests

```bash
npm run test
```
