# Analyse für Version 2.0

Stand: 5. November 2026. Untersucht wurde der Repository-Stand der Anwendung `chordpro-converter` (Paketversion 1.1.0). Diese Unterlage bereitet die Planung vor. Sie enthält keine Implementierung. Getroffene fachliche Entscheidungen sind unten festgehalten. Weiterhin offene Punkte stehen in Abschnitt 6.

SongbookPro ist in der Herstellerdoku als „SongbookPro“ geschrieben. Gemeint ist dasselbe Produkt wie in der Planungsvorgabe.

## Rahmen, der bereits entschieden ist

Diese Punkte sind Vorgaben und werden hier nicht erneut zur Wahl gestellt:

- Frontend mit React und Vite, Backend mit Node.js und Fastify, Datenhaltung in SQLite
- Betrieb per Docker Compose auf einem Ubuntu-Server (`faustens.de`)
- Frontend und Backend auf demselben Server und unter derselben Origin
- Die Nextcloud-Integration entfällt in Version 2 vollständig. Eine automatische Migration bestehender Nextcloud-Dateien ist nicht vorgesehen. Vorhandene ChordPro-Dateien sollen später manuell importiert werden können.
- tablet-first, hauptsächlich Android, zusätzlich iPadOS
- Jeder Benutzer besitzt ein persönliches Konto. Ein Administrator legt die Konten an. Eine Selbstregistrierung ist nicht vorgesehen.
- Benutzer verwalten private Lieder. Für die Band freigegebene Lieder der „Alpspitz Buam“ sind für alle Bandmitglieder sichtbar und bearbeitbar. Alle Bandmitglieder dürfen frühere Versionen gemeinsamer Lieder wiederherstellen.
- Jede Änderung eines gemeinsamen Liedes wird versioniert. Gleichzeitige Änderungen werden nicht stillschweigend überschrieben. Vorgesehen ist optimistisches Locking.
- Speicherung und ChordPro-Export verwenden ausschließlich die internationale Akkordnotation. Internationales `B` entspricht deutschem `H`, internationales `Bb` deutschem `B`, internationales `Bm` deutschem `Hm` und internationales `Bbm` deutschem `Bm`. Dieselbe Abbildung gilt für Tonartangaben wie `{key: B}`. Quellen in deutscher Notation werden beim Import entsprechend umgewandelt. SongbookPro stellt die Akkordnamen anhand seiner eigenen Benutzereinstellungen dar. Eine Einstellung für deutsche Akkordnamen ist in dieser Anwendung nicht vorgesehen.
- Die bestehende Abschnittslogik bleibt. `{sov: …}` kennzeichnet Strophen, `{soc: …}` kennzeichnet Refrains. Deutsche Bezeichnungen wie `Strophe` und `Refrain` bleiben zulässig. Schließende `{eov}`- und `{eoc}`-Direktiven sind für diesen Anwendungsfall nicht vorgesehen. `{sov: …}` und `{soc: …}` sind mit SongbookPro praktisch bestätigt. Die allgemeine ChordPro-Konvention beschreibt Umgebungen als Paare mit schließender Direktive. Maßgeblich für diesen Anwendungsfall ist das praktisch bestätigte SongbookPro-Verhalten.
- ChordPro-Export und Rückimport aus SongbookPro
- Der Rückimport einer bearbeiteten ChordPro-Datei erfolgt mit Änderungsvorschau und ausdrücklicher Bestätigung. Eine zusätzliche Administratorfreigabe ist nicht erforderlich.
- Die bestehende Ultimate-Guitar-Konvertierung wird soweit sinnvoll weiterverwendet. Die Ausgabe der Tonbuchstaben ist an die internationale Notation anzupassen. Diese Anpassung ist hier nur beschrieben.

## 1. Ist-Architektur

### 1.1 Art der Anwendung

Version 1 ist eine Single-Page-Application ohne Backend und ohne Datenbank. Die Konvertierung läuft im Browser. Dauerhaft gespeichert wird nur die Nextcloud-Konfiguration in `localStorage`.

Der vorhandene Datenfluss:

1. Metadaten und Ultimate-Guitar-ähnlicher Rohtext werden im Formular erfasst.
2. `convertToChordPro()` erzeugt einen ChordPro-Text.
3. Der Text kann kopiert, als `.chord`-Datei heruntergeladen oder per WebDAV nach Nextcloud hochgeladen werden.

Ausführliche Beschreibung des Ist-Stands: [architecture.md](architecture.md), [input-format.md](input-format.md), [nextcloud-upload.md](nextcloud-upload.md).

### 1.2 Technologie

| Bereich | Ist-Stand |
| --- | --- |
| UI | React 19, React Bootstrap, Bootstrap 5 |
| Build | Vite 8, Auslieferung als statische Dateien in `dist/` |
| Konvertierung | frameworkfreie Module unter `src/converter/` |
| HTTP | Axios, ausschließlich für WebDAV |
| Tests | Vitest 4, Testing Library, happy-dom, Coverage-Schwelle 80 % |
| Qualität | ESLint, SonarQube, OWASP Dependency-Check, Trivy |
| Laufzeit in der CI | Node.js 24 |
| Im README genannte Laufzeit | Node.js 22 |
| `engines`-Feld | nicht gesetzt |
| Deployment | GitHub Actions, bei Versions-Tags FTP des Ordners `dist/` auf einen Netcup-Webspace |

Ein Dockerfile, eine Compose-Datei und ein API-Server sind nicht vorhanden. Die dokumentierte öffentliche App-Adresse der statischen Fassung ist `https://cpc.docfaust.de`. Ob diese Adresse dem FTP-Ziel entspricht, ist aus dem Repository nicht belegbar, weil Server und Zielverzeichnis nur als GitHub-Secrets vorliegen.

### 1.3 Modulzuschnitt

```
src/
├── main.jsx                         # React-Root, Bootstrap-CSS
├── App.jsx                          # gesamter UI-Zustand und alle Aktionen
├── App.css                          # nicht importiert
├── convertToChordPro.js             # älteres Modul, von der App nicht importiert
├── components/                      # Formular, Textflächen, Aktionen, Nextcloud-Dialog
├── converter/
│   ├── convertToChordPro.js         # von App.jsx verwendeter Algorithmus
│   ├── chords.js                    # Akkordzeilen
│   └── sections.js                  # Abschnittslabels
└── nextcloud/
    ├── client.js                    # WebDAV PROPFIND und PUT
    └── settings.js                  # localStorage
```

`App.jsx` importiert `./converter/convertToChordPro`. Die Datei `src/convertToChordPro.js` ist ein älterer, schwächerer Algorithmus (kein deutsches `H`, keine B-Vorzeichen in der Tonart, aufeinanderfolgende Akkordzeilen überschreiben sich). Vitest und Sonar schließen sie von der Coverage aus. Sie gehört nicht zum Laufzeitpfad.

`src/App.css` wird nicht eingebunden. Die sichtbare Darstellung kommt von Bootstrap und `src/components/textArea.css`. Das Paket `dotenv` steht in `package.json` und wird von keinem Modul importiert. Axios wird nur von `src/nextcloud/client.js` verwendet.

### 1.4 Konvertierung

Die fachliche Eingabe ist zeilenorientierter Plaintext: Akkorde über dem Text, Abschnitte in eckigen Klammern. Metadaten kommen aus Formularfeldern, nicht aus dem Tab-Text.

`headerDirectives()` schreibt nur gesetzte und formal gültige Werte:

| Feld | Ausgabe | Annahme durch den laufenden Code |
| --- | --- | --- |
| Titel | `{title: …}` | jeder nicht leere Text, in der UI auf 30 Zeichen begrenzt |
| Interpret | `{artist: …}` | jeder nicht leere Text, in der UI auf 30 Zeichen begrenzt |
| Capo | `{capo: …}` | nur 1 bis 11 |
| Tonart | `{key: …}` | `A`–`G` oder `H`, optional `#` oder `b`, optional `m` |

Der Zeilenlauf in `src/converter/convertToChordPro.js`:

- Eine Akkordzeile wird gepuffert. Liegt schon eine Akkordzeile im Puffer, wird die ältere sofort als reine Akkordzeile ausgegeben.
- Eine folgende Textzeile wird über Spaltenpositionen mit dem Puffer zusammengeführt. Leerzeichen in der Akkordzeile bestimmen die Zeichenposition im Text.
- Eine Akkordzeile ohne folgende Textzeile wird zu einer Zeile aus `[Akkord]`-Token mit jeweils einem Leerzeichen Abstand. Die ursprünglichen Spaltenabstände entfallen.
- Eine Zeile `[Label] optionaler Rest` wird zur Direktive. Der optionale Rest wird als eigene Textzeile angehängt.
- Text ohne Akkordpuffer wird übernommen.
- Eine leere Sentinel-Zeile am Ende leert einen offenen Akkordpuffer.

Beispiel, das der Test festschreibt:

```text
mergeChordAndText("A  B  C", "La Le Lu")
→ [A]La [B]Le [C]Lu
```

Für die in der Doku verwendete Zeile `E     H7    A` über `Keinen Tag soll es geben` erzeugt der Algorithmus deshalb eine einzige Zeile:

```text
[E]Keinen[H7] Tag s[A]oll es geben
```

Die Darstellung in [input-format.md](input-format.md), bei der die Klammern in einer eigenen Zeile über dem Text stehen, beschreibt diesen Merge-Fall nicht. Maßgeblich sind der Code und `test/convertToChordPro.test.js`.

Abschnittszuordnung in `src/converter/sections.js`:

| Label, am Anfang, ohne Groß-/Kleinschreibung | Direktive |
| --- | --- |
| `chorus`, `refrain` | `{soc: <vollständiges Label>}` |
| `verse`, `strophe`, `vers` | `{sov: <vollständiges Label>}` |
| alles andere, auch `Intro`, `Bridge`, `Solo`, `Pre-Chorus` | `{c: <vollständiges Label>}` |

Schließende Direktiven (`eoc`, `eov`, `eob`) werden nicht erzeugt. Für `{eov}` und `{eoc}` ist das die in Version 2 beibehaltene Form, siehe Abschnitt 5.2. Eine Abschnittszeile leert den Akkordpuffer nicht. Ein noch offener Puffer kann dadurch an der nächsten Textzeile hängen, obwohl dazwischen schon eine neue Abschnittsdirektive steht.

Die Akkorderkennung akzeptiert deutsches `H`, Vorzeichen, Suffixe wie `m7` und `add9`, Slash-Akkorde wie `D/F#` und den Taktstrich `|`. Der Taktstrich wird in der Ausgabe als Token `[|]` geklammert. Die Erkennung ist großzügig: Eine Zeile gilt als Akkordzeile, sobald jedes Wort wie ein Akkordtoken aussieht. Eine alleinstehende Zeile `Ein` oder `Es` fällt deshalb ebenfalls darunter.

### 1.5 Export und Nextcloud

Der lokale Export baut einen `Blob` mit `text/plain` und lädt ihn über einen temporären Anker herunter. Der Dateiname kommt aus `sanitizeFileName()`: `{Titel}.chord`, ohne Titel `chordpro_file.chord`. Die Zeichen `/ \ : * ? " < > |` werden zu `_`.

Der Nextcloud-Weg prüft die lokalen Einstellungen, fragt mit `window.confirm` nach und sendet die Datei per HTTP `PUT` an `{Server}/remote.php/dav/files/{Benutzer}/{Ordner}/{Datei}`. Die Anmeldung ist Basic Auth mit Benutzername und App-Passwort. Ordnerlisten laufen über `PROPFIND`. Server, Benutzer, Passwort und Zielordner liegen im `localStorage` unter dem Schlüssel `nextcloud-settings`. Die App spricht Nextcloud direkt aus dem Browser an; dafür ist auf der Nextcloud-Seite CORS für `https://cpc.docfaust.de` und `http://localhost:5173` dokumentiert.

### 1.6 Tests und CI

| Testdatei | Gegenstand |
| --- | --- |
| `test/chords.test.js` | Akkordzeilen, Taktstrich, Zerlegung, Klammerung mit erhaltenen Leerzeichen |
| `test/sections.test.js` | Label-Parser; `Refrain` → `soc`, `Strophe 2` → `sov`, `Intro` → `c` |
| `test/convertToChordPro.test.js` | Merge, Header inklusive `{key: H}`, End-to-End mit `{soc: Chorus}`, `{sov: Verse 1}`, `{c: Intro}` |
| `test/App.test.jsx` | Umwandeln, Löschen, Zwischenablage, Download, Upload-Erfolg, Upload-Fehler, fehlende Einstellungen |
| `test/components/*.test.jsx` | Button-Callbacks, Formularfelder, Textfläche, Einstellungsdialog |
| `test/nextcloud/*.test.js` | URL-Bau, Dateiname, XML-Ordnerliste, HTTP-Fehlerbilder, Speicherformat |

Die Tests sichern das heutige Direktivenverhalten ab. Ein automatisierter Gerätetest gegen SongbookPro ist nicht enthalten. Die praktische Prüfung von `{sov: …}` und `{soc: …}` ist ein Planungsergebnis in Abschnitt 5 und kein Test im Repository. Die Coverage-Schwelle gilt für `src/**/*.{js,jsx}` und schließt `src/main.jsx` sowie das ungenutzte `src/convertToChordPro.js` aus.

Die Workflows:

- `CI`: `npm ci`, Tests mit Coverage, ESLint, Produktions-Build; bei Tag zusätzlich FTP-Deploy
- `SonarQube`: Coverage und Lint-Report, danach Scan
- `OWASP Dependency Check`: täglich und manuell
- `Trivy`: Dateisystemscan auf hohe und kritische Befunde

## 2. Wiederverwendbare Komponenten

Die bestehende Ultimate-Guitar-Konvertierung wird soweit sinnvoll weiterverwendet. Dazu gehören die Erkennung von Akkordzeilen und das Zusammenführen von Akkord und Text an den Textpositionen. Die Ausgabe der Tonbuchstaben ist vor Speicherung und ChordPro-Export auf die internationale Notation umzustellen. Dieser Anpassungsbedarf steht in Abschnitt 5.2 und ist nicht umgesetzt.

Die Nextcloud-Integration entfällt in Version 2 vollständig. Eine automatische Migration bestehender Nextcloud-Dateien ist nicht vorgesehen. Vorhandene ChordPro-Dateien sollen später manuell importiert werden können.

Speicherung, Konten und die Bedienoberfläche der Sammlung sind neu. Die Abschnittsdirektiven der bestehenden Ausgabe bleiben.

| Bestandteil | Weiterverwendung |
| --- | --- |
| `src/converter/chords.js` | Erkennung von Akkordzeilen und positionsgetreue Zerlegung. `H`, `B` und `Bb` bleiben als Eingabe zulässig. Die Ausgabe übernimmt sie heute unverändert. Vor Speicherung und Export gilt die Abbildung deutscher Notation aus Abschnitt 5.2. Bereits internationale Namen bleiben unverändert. |
| `mergeChordAndText()` | Erzeugt die von SongbookPro dokumentierte Inline-Form `[Akkord]Text`. Der heutige Code schreibt die Tonbuchstaben unverändert in das Token. Vor Speicherung und Export sind sie nach Abschnitt 5.2 abzubilden. |
| `parseLabeledLine()` | Trennt `[Label]` und optionalen Resttext. Die anschließende Direktivenwahl in `labelToDirective()` bleibt. |
| Metadatenfelder Titel, Interpret, Capo, Tonart | Dieselben vier Angaben bleiben die bekannten ChordPro-Kopffelder. Die UI-Grenze von 30 Zeichen und die Capo-Spanne 1–11 sind fachlich noch offen. |
| `src/components/TextArea.jsx` und `textArea.css` | Monospace-Fläche für Rohtext und ChordPro. Für eine Sammlung braucht es zusätzlich Listen- und Lesedarstellung. |
| Vitest-Aufbau, ESLint, die Jobs Test/Lint/Build | Prüfen die reine Konvertierung weiter. Die FTP-Deploy-Jobdefinition bildet den Zielbetrieb nicht ab. |
| React-, Vite- und Bootstrap-Grundlage | Entspricht der Frontend-Entscheidung. Die heutige Seite ist ein einzelnes Formular, kein Sammlungsclient. |

`sanitizeFileName()` kann für heruntergeladene Dateien bestehen bleiben. Die Endung `.chord` ist in der SongbookPro-Importdoku als ChordPro-Endung aufgeführt (`Adding Songs`, abgerufen am 5. November 2026).

Diese Teile werden von Version 2 fachlich abgelöst und sollten nicht erweitert werden:

- `src/nextcloud/client.js`, `src/nextcloud/settings.js`, `src/components/NextcloudSettingsModal.jsx`
- die Upload-Aktionen in `App.jsx` und `ButtonGroup.jsx`
- Axios, solange kein anderer HTTP-Client im Browser nötig ist
- `src/convertToChordPro.js`, `src/App.css` und die ungenutzte Abhängigkeit `dotenv` als Altlasten, deren Entfernung ein späterer Aufräumschritt ist

Vorhandene Nextcloud-Dateien werden dabei nicht automatisch übernommen. Der spätere manuelle Import betrifft vorhandene ChordPro-Dateien.

Die Konvertermodule können im Browser bleiben. Ein zweites Exemplar auf dem Server ist für die beschlossenen Funktionen nicht erforderlich: Die Sammlung speichert ChordPro-Text, der Browser erzeugt die Vorschau des Rückimports und sendet erst die bestätigte Fassung an die API.

## 3. Notwendige Erweiterungen

Die folgenden Fähigkeiten existieren im Repository nicht. Sie folgen aus den bereits getroffenen Entscheidungen.

### 3.1 Server und Daten

- Fastify-Prozess, der die gebaute Oberfläche und die API unter einer Origin ausliefert
- SQLite-Datei auf einem Docker-Volume
- Docker Compose für den Ubuntu-Host
- persönliche Konten, die ein Administrator anlegt, mit serverseitiger Prüfung und einer Sitzung, die wegen der gemeinsamen Origin als Cookie geführt werden kann; eine Selbstregistrierung ist nicht vorgesehen
- Lieder mit Eigentümer und der Unterscheidung privat oder Band
- private Lieder in der Verwaltung des jeweiligen Benutzers
- für die Band freigegebene Lieder, sichtbar und bearbeitbar für alle Bandmitglieder
- vollständige Textfassungen je Version; jede Änderung eines gemeinsamen Liedes erzeugt eine Fassung; alle Bandmitglieder dürfen eine frühere Fassung eines gemeinsamen Liedes wiederherstellen
- optimistisches Locking, damit gleichzeitige Änderungen nicht stillschweigend überschrieben werden
- ChordPro-Export einer gespeicherten Fassung in internationaler Notation, mit der bestehenden Abschnittslogik
- Rückimport: Datei lesen, Unterschied zur aktuellen Fassung zeigen, erst nach ausdrücklicher Bestätigung eine neue Fassung schreiben; eine zusätzliche Administratorfreigabe ist nicht vorgesehen
- späterer manueller Import vorhandener ChordPro-Dateien, ohne Übernahme aus Nextcloud

Ein ChordPro-Parser ist nicht vorhanden. Der heutige Konverter kann eine SongbookPro-Datei nicht als Eingabe verstehen. Zeilen mit `{title: …}` oder `[D]Amazing` würden als Text durchgereicht oder falsch klassifiziert.

### 3.2 Oberfläche

- Anmeldung an einem vom Administrator angelegten Konto
- Liste der eigenen und der Bandlieder
- Anlegen, Lesen und Bearbeiten privater Lieder durch den jeweiligen Benutzer
- Lesen, Bearbeiten und Wiederherstellen der für die Band freigegebenen Lieder durch alle Bandmitglieder
- Versionsliste für gemeinsame Lieder
- Anlegen und Löschen von Bandliedern bleiben offen, siehe Abschnitt 6
- Export einer `.chord`-Datei
- Dateiauswahl für den Rückimport, Änderungsvorschau, Bestätigen und Abbrechen
- der bestehende Umwandlungsdialog als Weg, Ultimate-Guitar-Rohtext in ein neues Lied zu übernehmen
- Bedienung in Tablet-Hochformat; die heutigen `md`-Spalten, die Buttonleiste und `alert`/`confirm` sind dafür keine Sammlungssicht

### 3.3 Ausgabe für SongbookPro

Die Abschnittszuordnung in `labelToDirective()` bleibt. `{soc: …}` und `{sov: …}` ohne schließende Direktive sind mit SongbookPro praktisch bestätigt. Deutsche Labels wie `Strophe` und `Refrain` bleiben zulässig.

Die Notation der bestehenden Ausgabe ist anzupassen. `headerDirectives()` und die Akkordklammerung schreiben deutsche Tonbuchstaben unverändert, darunter `{key: H}`. Speicherung und Export verwenden die internationale Notation aus Abschnitt 5.2. Die Tests erwarten heute ausdrücklich `{soc: Chorus}`, `{sov: Verse 1}` und `{key: H}`. Die Abschnittserwartungen bleiben gültig. Die Erwartung `{key: H}` beschreibt den heutigen Code und weicht von der entschiedenen Speichernotation ab. Konvertierung und Tests sind dafür noch nicht geändert.

### 3.4 Build und Betrieb

- Image-Bau der Anwendung statt alleinigem Archiv von `dist/`
- Ablösung des FTP-Deploys für den Version-2-Betrieb
- persistentes Volume und eine Sicherung der SQLite-Datei
- TLS vor der gemeinsamen Origin; wie `faustens.de` TLS heute beendet, steht nicht im Repository

### 3.5 Bewusst nicht aus dem Ist-Stand ableitbar

Setlisten, Audio, PDF, Akkorddiagramme, Transponieren in der Web-App, Volltextsuche über die ganze Sammlung, Tempo, Takt und Dauer sind in SongbookPro teilweise vorhanden und in diesem Repository nicht. Sie gehören erst dann zum Umfang, wenn sie fachlich verlangt werden.

## 4. Technische Risiken

### 4.1 Rückimport ist kein Rundweg

SongbookPro speichert beim Export nach der eigenen Doku nicht zuverlässig jede Information (`Deleting and Sharing`: beim ChordPro-Export können Angaben verloren gehen). Die genaue Direktivenform eines Exports ist herstellerseitig nicht veröffentlicht. Zusätzlich kennt der Editor zwei Bearbeitungsarten, „Chords over Lyrics“ und „ChordPro“. Abschnittsköpfe werden je nach Art als `Verse 1:` oder als `{c: Verse 1}` geschrieben.

Ein Textvergleich der gespeicherten Fassung mit einem Export wird deshalb auch dann viele Zeilen zeigen, wenn musikalisch nichts geändert wurde: Direktivennamen, Abschnittsform, Leerzeilen, Akkordnotation und Reihenfolge der Kopffelder. Die gespeicherte Fassung verwendet die internationale Notation. Ob der Export dieselben Tonbuchstaben schreibt, gehört zum noch unbekannten Exportformat. Die Änderungsvorschau bleibt nur dann brauchbar, wenn vor dem Vergleich auf eine gemeinsame Form normalisiert wird. Welche Unterschiede dabei inhaltliche Änderungen sind und welche nur die Formatierung betreffen, ist fachlich offen.

Ohne eine echte Exportdatei aus der von der Band genutzten SongbookPro-Version lässt sich der Parser nicht seriös festlegen.

### 4.2 SQLite und gleichzeitiges Speichern

Eine SQLite-Datei trägt eine Band-Sammlung. Das ist zur Größe des Vorhabens passend. Zwei Personen können dasselbe Bandlied gleichzeitig speichern. Gleichzeitige Änderungen dürfen nicht stillschweigend überschrieben werden. Vorgesehen ist optimistisches Locking: ein Speichervorgang prüft die Fassung gegen den zuletzt gelesenen Stand und legt bei Erfolg eine eigene Fassung an. Jede Änderung eines gemeinsamen Liedes wird versioniert.

Backup und Volume liegen außerhalb der Anwendung. Ein Container-Neustart ohne Volume löscht die Sammlung.

### 4.3 Konten und Tablets

Persönliche Konten werden von einem Administrator angelegt. Eine Selbstregistrierung ist nicht vorgesehen. Wie ein Passwort neu gesetzt wird, ist offen. Geteilte Tablets behalten Sitzungen, bis Sitzungsdauer und Verhalten auf gemeinsam genutzten Tablets feststehen. Die heutige Ablage von Nextcloud-App-Passwörtern im `localStorage` entfällt zusammen mit der Nextcloud-Integration. Sie ist kein Vorbild für die neue Anmeldung.

iPadOS und Android unterscheiden sich bei Dateidownload, Dateiauswahl und Zwischenablage. Der heutige Download erzeugt den Anker per Skript und ruft `click()` auf. Ob Safari auf dem iPad die Datei speichert oder nur öffnet, ist mit diesem Repository nicht geprüft.

### 4.4 Bestehende Konverterkanten

Diese Punkte sind am Code nachgewiesen und unabhängig von SongbookPro:

- Abschnittszeilen leeren `chordBuffer` nicht (`src/converter/convertToChordPro.js`, Zweig `parseLabeledLine`).
- `formatChordOnlyLine()` macht aus `|` das Token `[|]`.
- Windows-Zeilenenden: `trim()` entfernt `\r` für die Klassifikation, der Merge hängt die Rohzeile an. Ein `\r` kann in der zusammengeführten Zeile stehen bleiben.
- Titel mit `}` oder Zeilenumbruch erzeugt eine ungültige Direktivenzeile. Es gibt kein Escaping.
- Die UI schneidet Titel und Interpret bei 30 Zeichen ab, die Konvertierung selbst tut das nicht.
- Capo `0` und Werte über 11 werden still weggelassen.
- Das README nennt Node 22, die CI verwendet Node 24.

### 4.5 Zwei Konverter und irreführende Beispieldoku

Planung und Tests müssen `src/converter/convertToChordPro.js` als Quelle nutzen. Das ältere Modul und das Merge-Beispiel in `docs/input-format.md` beschreiben ein anderes Ergebnis.

### 4.6 Deployment-Bruch

Der Tag-Deploy kopiert statische Dateien per FTP. Version 2 braucht ein Image, ein Volume und eine API. Die vorhandenen Secrets `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` und `FTP_SERVER_DIR` bedienen diesen Betrieb nicht. Die statische Instanz kann daneben weiterlaufen; ob sie das soll, ist offen.

## 5. ChordPro-Direktiven und SongbookPro

Bewertet wird die Ausgabe von `src/converter/convertToChordPro.js`, also der von der App verwendete Pfad. Herstellerseiten wurden am 5. November 2026 gelesen. `{sov: …}` und `{soc: …}` wurden praktisch mit SongbookPro geprüft. Die dabei verwendete App-Version ist in dieser Unterlage nicht festgehalten. Herstellerformulierungen, die allgemeine ChordPro-Konvention und dieses praktische Verhalten können auseinanderfallen. Für die Abschnittsdirektiven gilt der praktische Befund.

### 5.1 Was der Converter heute schreibt

```text
{title: Friede Gottes}
{artist: Trad.}
{capo: 2}
{key: E}

{soc: Chorus}
[E]Keinen[H7] Tag s[A]oll es geben

{sov: Verse 1}
[G]   [D/F#]   [Em7]   [|]   [Cadd9]
Dass du sagen musst

{c: Intro}
[E] [H7] [A] [E]
```

Die mittlere Akkordzeile ist die Merge-Form. Enthält die Akkordzeile `|`, steht in der Ausgabe `[|]`. `{eoc}` und `{eov}` werden nicht geschrieben. Bridge, Intro, Solo und Pre-Chorus werden `{c: …}`. Die Abschnittsform ist die für Version 2 beibehaltene Logik. Deutsches `H`, hier in `[H7]`, schreibt der heutige Code unverändert. Die entschiedene Speicher- und Exportnotation ist international.

### 5.2 Notation und Abschnitte

Allgemeine ChordPro-Konvention, Herstellerdoku und das praktisch bestätigte SongbookPro-Verhalten stehen hier nebeneinander. Die Abschnittslogik bleibt. Die Notationsausgabe ist noch an die Speicher- und Exportentscheidung anzupassen. Diese Anpassung ist nicht implementiert.

**1. Speicherung und Export verwenden die internationale Notation.**

SongbookPro kann Akkorde als Standard (`B`/`Bb`), Deutsch (`H`/`B`), Lateinisch oder Nashville anzeigen. Zur Notation sagt die Doku sinngemäß: Unabhängig von dieser Einstellung werden Lieder beim Import in der Standardnotation erwartet. Dieselbe Aussage steht unter [Song Display Settings](https://songbook-pro.com/docs/manual/settings/song-display/) und [General Settings](https://songbook-pro.com/docs/manual/settings/general/). Die Darstellung der Akkordnamen übernimmt SongbookPro anhand seiner eigenen Benutzereinstellungen. Eine Einstellung für deutsche Akkordnamen ist in dieser Anwendung nicht vorgesehen.

Für Speicherung und ChordPro-Export gilt ausschließlich die internationale Notation:

| Deutsche Quelle | Speicherung und Export |
| --- | --- |
| `H` | `B` |
| `B` | `Bb` |
| `Hm` | `Bm` |
| `Bm` | `Bbm` |

Dieselbe Abbildung gilt für Tonartangaben. Deutsches `{key: H}` wird `{key: B}`, deutsches `{key: Hm}` wird `{key: Bm}`, deutsches `{key: B}` wird `{key: Bb}` und deutsches `{key: Bm}` wird `{key: Bbm}`. Suffixe bleiben am umgeschriebenen Grundton, etwa `H7` als `B7` und `Hm7` als `Bm7`. In Slash-Akkorden gilt dieselbe Tabelle für Grundton und Basston, weil beide Tonbuchstaben sind.

Der laufende Converter bildet das nicht ab:

- `CHORD_ROOT_RE` in `src/converter/chords.js` lässt `H` als Grundton zu.
- `mergeChordAndText()` und `formatChordOnlyLine()` setzen das erkannte Token unverändert in eckige Klammern.
- `headerDirectives()` schreibt die Tonart unverändert, wenn sie `/^[A-GH][#b]?(?:m)?$/` entspricht, also auch `{key: H}` und `{key: Hm}`. Ein deutsches `B` bleibt dabei `B`.
- `test/convertToChordPro.test.js` erwartet `{key: H}`.

Die Ultimate-Guitar-Erkennung bleibt die Grundlage und wird soweit sinnvoll weiterverwendet. Die Ausgabe muss die Tabelle anwenden, bevor deutscher Rohtext gespeichert oder exportiert wird. Der heutige Code akzeptiert dabei nebeneinander `H`, `B` und `Bb`. Die Eingabedoku führt `H` als deutschen Grundton und `Bb` als Vorzeichen und bittet, bei deutschen Liedern `H` zu schreiben, wo Ultimate Guitar `B` zeigt. Eine Ersetzung jedes Buchstabens `B` durch `Bb` würde ein bereits internationales `B` und ein vorhandenes `Bb` verfälschen. Die Umsetzung wendet die Tabelle auf deutsche Notation an und lässt internationale Tonbuchstaben unverändert.

ChordPro-Dateien des heutigen Converters enthalten deutsches `H` und ein unverändert durchgereichtes `B`. Der spätere manuelle Import dieser Dateien muss die Tabelle korrekt anwenden. Ob ein ChordPro-Export aus SongbookPro deutsch oder international notiert ist, gehört zum offenen Exportformat in Abschnitt 6. Davon hängt ab, ob der Rückimport die Tabelle anwendet.

**2. `{soc: …}` und `{sov: …}` bleiben. Das ist mit SongbookPro praktisch bestätigt.**

Die allgemeine ChordPro-Konvention führt Umgebungen als Paare: `{start_of_chorus}` mit `{end_of_chorus}`, entsprechend `sov`/`eov` ([Environment directives](https://www.chordpro.org/chordpro/directives-env/)). Die Label-Schreibweise `{start_of_chorus: Chorus}` ist in der ChordPro-Spezifikation zulässig.

Die SongbookPro-Herstellerdoku listet `start_of_chorus` / `end_of_chorus` und `start_of_verse` / `end_of_verse` ebenfalls als Paar. [Song Display Settings](https://songbook-pro.com/docs/manual/settings/song-display/) definiert Abschnitte außerdem über `{c: …}`. Voreingestellt haben `Verse`, `Chorus` und `Bridge` eigene Formatierungsblöcke. [Editing Songs](https://songbook-pro.com/docs/manual/editor/) nennt als ChordPro-Abschnittskopf `{c: Verse 1}`. [ChordPro Syntax](https://songbook-pro.com/docs/manual/chordpro/) nennt `{c: Verse 2}` als Abschnittsüberschrift. Die SongbookPro-Direktivenliste beschreibt den Label-Parameter an `{soc}` und `{sov}` nicht.

Praktisch mit SongbookPro geprüft und für diesen Anwendungsfall maßgeblich:

- `{sov: …}` für Strophen funktioniert.
- `{soc: …}` für Refrains funktioniert.
- Abschließende `{eov}`- und `{eoc}`-Direktiven sind nicht erforderlich.

Deutsche Bezeichnungen wie `Strophe` und `Refrain` bleiben zulässig. `labelToDirective()` bleibt deshalb unverändert. `chorus` und `refrain` werden `{soc: <vollständiges Label>}`, `verse`, `strophe` und `vers` werden `{sov: <vollständiges Label>}`, andere Labels wie `Intro`, `Bridge`, `Solo` und `Pre-Chorus` werden `{c: <vollständiges Label>}`. Die fehlende schließende Direktive ist das mit SongbookPro bestätigte Verhalten dieses Anwendungsfalls. Herstellerdoku und allgemeine ChordPro-Konvention beschreiben diesen praktischen Befund nicht vollständig.

**3. Inline-Akkorde in eckigen Klammern sind die dokumentierte Liedzeilenform.**

SongbookPro beschreibt Akkorde als `[D]` im Text und zeigt dasselbe in den Beispielen. `mergeChordAndText()` erzeugt diese Form. Das ist anschlussfähig. Die Spaltenabstände des Ultimate-Guitar-Textes bleiben als Zeichenpositionen erhalten. Bei Speicherung und Export entsprechen die Buchstaben in diesen Klammern der internationalen Notation aus Punkt 1. Der heutige Code schreibt sie unverändert.

### 5.3 Direktiven, deren Name dokumentiert ist

SongbookPro führt diese Namen als Import-Direktiven, die im Editor selbst keine Wirkung haben und beim Import sowie Export unterstützt werden: Title (`t`), Subtitle (`st`), Artist, Key, Capo, außerdem Composer, Lyricist, Copyright, Footer, CCLI, Time, Tempo, Duration und Meta.

`{title: …}`, `{artist: …}`, `{key: …}` und `{capo: …}` sind damit dem Namen nach Import-Direktiven. Für die vier Felder zeigt die Herstellerseite kein vollständiges Dateibeispiel, welche Kopfzeile in welchem SongbookPro-Feld landet. `{artist: …}` ist deshalb dem Namen nach belegt und in der Feldzuordnung noch am Gerät zu prüfen. `{key: …}` ist dem Namen nach belegt. Der Wert verwendet die internationale Notation aus Abschnitt 5.2, also `{key: B}` für deutsches `H`. Der heutige Code schreibt `{key: H}` noch unverändert.

Die Dateiendung `.chord` steht in der Liste der ChordPro-Endungen auf [Adding Songs](https://songbook-pro.com/docs/manual/adding-songs/) (`.cho`, `.crd`, `.chordpro`, `.chopro`, `.chord`, `.pro`).

`{c: …}` ist in der Herstellerdoku Kommentar und Abschnittsüberschrift. In dieser Anwendung bleibt `{c: …}` die Direktive für Labels außerhalb von Strophe und Refrain. Strophe und Refrain bleiben `{sov: …}` und `{soc: …}`.

### 5.4 Fremdbeobachtung

Ein Praxisbericht beschreibt, dass SongbookPro Labels an `{sov}` nicht auswertet und dafür `{c: …}` genutzt werden soll, und dass `{sob}` / `{eob}` in seinem Editor-Versuch angezeigt wurden: [ChordPro Directives in SongbookPro](https://tuline.com/chordpro-directives-in-songbookpro/) (Andrew Tuline). Die Herstellerliste enthält das Wort `bridge` und enthält `sob` / `eob` nicht.

Für diese Anwendung ist der eigene praktische Test maßgeblich. `{sov: …}` und `{soc: …}` funktionieren, auch ohne schließende Direktive. Der Fremdbericht ersetzt diesen Test nicht und begründet keine Umstellung auf `{c: …}` für Strophe und Refrain.

### 5.5 Praktisch zu testen

`{sov: …}` für Strophen und `{soc: …}` für Refrains sind bereits praktisch bestätigt, auch ohne `{eov}` und `{eoc}`. Diese beiden Punkte stehen hier nicht mehr als offene Prüfung. Die Notation deutscher Quellen ist als Abbildungsregel entschieden. Offen bleibt vor allem das tatsächliche Exportformat aus SongbookPro.

Diese Punkte mit einer exportierten Beispieldatei auf einem Android-Tablet und einem iPad prüfen. Die App-Version festhalten.

| Prüfung | Woran der Ausgang unsicher ist |
| --- | --- |
| `{c: Intro}`, `{c: Solo}`, `{c: Pre-Chorus}` | Als `{c: …}` die bestehende Direktive für diese Labels. Eigene Formatierung gibt es nur, wenn in der App ein gleichnamiger Abschnitt angelegt ist. |
| `[|]` | Im Converter nachgewiesen. In der SongbookPro-ChordPro-Beschreibung kommt der Taktstrich als Akkordtoken nicht vor. |
| Feldzuordnung von `{artist: …}`, `{capo: …}`, `{key: …}` | Nur die Direktivennamen sind belegt. Der Tonartwert ist international, die Feldzuordnung in SongbookPro ist damit nicht belegt. |
| Dateiauswahl auf Android und iPadOS für `.chord` | Die Endung ist dokumentiert. Die System-Dateiauswahl kann enger filtern. |
| Export aus SongbookPro nach einer kleinen Textänderung | Die konkrete Direktiven-, Notations- und Leerzeilenform ist nicht spezifiziert. Diese Datei ist die Grundlage für Parser und Vorschau. |
| Export, nachdem das Lied in „Chords over Lyrics“ gespeichert wurde | Die zwei Editorarten schreiben Abschnitte unterschiedlich. Ob dabei weitere Direktiven entfallen, ist an der Installation zu prüfen. |
| ZIP mit mehreren Liedern und eine Datei mit mehreren `{new_song}`-Blöcken | Mehrfach-Export ist als ZIP beschrieben. Ob die Sammlung einen Mehrfachimport können soll, ist fachlich offen. |
| Download der Export-Datei aus der Web-App auf iPadOS Safari und Android Chrome | Der heutige Blob-Download ist auf diesen Geräten nicht gelaufen. |

Zielbild der Exportnotation, sobald die Abbildung umgesetzt ist. Die Abschnittsdirektiven entsprechen dem heutigen Algorithmus. Aus einer deutschen Quelle mit Tonart `H`, Akkord `H` und deutschem Akkord `B` wird:

```text
{title: SongbookPro Probe}
{artist: Alpspitz Buam}
{capo: 2}
{key: B}

{soc: Refrain}
[B]Zeile mit [Bb]internationaler Notation

{sov: Strophe 1}
[G]Text [D/F#]mit Slash

{c: Bridge}
Nur Text
```

Der heutige Algorithmus schreibt an diesen Stellen noch `{key: H}`, `[H]` und ein unverändertes deutsches `B`.

## 6. Offene fachliche Fragen

Diese Punkte sind noch offen. Sie sollten beantwortet sein, bevor die betroffenen Teile gebaut werden.

### Abschnitte

1. Welche Abschnitte kommen in der Sammlung tatsächlich vor (Intro, Pre-Chorus, Solo, Zwischenspiel, Outro, Instrumental)?

### Rückimport

2. Wie sieht das tatsächliche ChordPro-Exportformat aus SongbookPro aus, einschließlich Direktiven, Notation, Leerzeilen und der Unterschiede zwischen Android und iPadOS sowie zwischen den Editorarten „Chords over Lyrics“ und „ChordPro“? Davon hängt ab, ob der Rückimport die deutsche Notationsabbildung anwendet.
3. Welche Unterschiede sind inhaltliche Änderungen, und welche sind Formatierungsänderungen, die der Importvergleich übergeht?
4. Darf ein Rückimport Felder überschreiben, die nur in der Sammlung gepflegt werden?
5. Was passiert mit einer Fassung, wenn die Vorschau abgebrochen wird?
6. Sollen mehrere Lieder in einem ZIP oder einer Datei mit mehreren Liedern importiert werden?

### Lieder, Rechte, Versionen

7. Wer legt für die Band freigegebene Lieder an, und wer darf sie löschen?
8. Kann ein privates Lied für die Band freigegeben werden, und kann ein Bandlied wieder privat werden?
9. Dürfen mehrere Lieder denselben Titel tragen, etwa verschiedene Arrangements?
10. Erzeugt das Wiederherstellen eine neue aktuelle Fassung, oder wird eine ältere Fassung wieder zur aktuellen Fassung?

### Konten und Geräte

11. Wie wird ein Passwort neu gesetzt?
12. Wie lange bleibt eine Sitzung auf einem gemeinsam genutzten Tablet gültig, und wie verhält sich die Sitzung dort, einschließlich eines ausdrücklichen Abmeldens?
13. Welche Android- und iPadOS-Geräte mit welcher SongbookPro-Version sind die Referenz für den Abnahmetest?

### Umfang

14. Werden Tempo, Takt, Dauer, Bemerkungen oder Schlagmuster gepflegt?
15. Sollen Capo `0` und Capo über 11 zulässig sein?
16. Reicht die Titellänge über die heutigen 30 Zeichen hinaus?
17. Läuft `https://cpc.docfaust.de` während und nach der Umstellung weiter?
18. Wer sichert die SQLite-Datei auf `faustens.de`, und wo wird TLS für die gemeinsame Origin beendet?

## 7. Empfehlungen für die weitere Planung

Die Empfehlungen halten KISS und YAGNI ein. Sie sind Vorschläge für den nächsten Planungsschritt und ersetzen keine Antwort auf Abschnitt 6.

1. Notation und Abschnittsdirektiven sind entschieden. Offen bleiben das tatsächliche ChordPro-Exportformat aus SongbookPro und die Unterscheidung zwischen Formatierungsänderungen und inhaltlichen Änderungen. Parser und Änderungsvorschau hängen an diesen beiden Punkten. Die Grammatik des Rückimports wird erst festgelegt, wenn eine echte Exportdatei vorliegt. Die eigene Ausgabe für Strophe und Refrain bleibt `{sov: …}` und `{soc: …}`.
2. `labelToDirective()` beibehalten, einschließlich deutscher Labels und ohne schließende `{eoc}` oder `{eov}`. Speicherung und ChordPro-Export auf die internationale Notation umstellen. Deutsche Quellen mit `H` → `B`, `B` → `Bb`, `Hm` → `Bm` und `Bm` → `Bbm` übersetzen, einschließlich `{key: …}`. Internationale Tonbuchstaben bleiben unverändert. Eine Einstellung für deutsche Akkordnamen ist nicht Teil der Anwendung. SongbookPro stellt die Namen nach seinen Benutzereinstellungen dar. Diese Umstellung ist der Anpassungsbedarf aus Abschnitt 5.2 und wird mit dieser Analyse nicht implementiert.
3. Den Konverter im Frontend behalten. Den Server auf Konten, Lieder, Fassungen und Dateien beschränken. Die Vorschau des Rückimports im Browser rechnen und den Text erst nach ausdrücklicher Bestätigung speichern. Eine zusätzliche Administratorfreigabe ist nicht vorgesehen.
4. Jede Änderung eines gemeinsamen Liedes als vollständigen ChordPro-Text in internationaler Notation speichern. Gleichzeitige Änderungen über optimistisches Locking prüfen. Unterschiede erst beim Anzeigen berechnen. Welche Abweichungen inhaltlich sind und welche nur die Formatierung betreffen, folgt aus Frage 3. Das Exportformat aus SongbookPro liegt dafür noch nicht vor.
5. Eine Fastify-Anwendung baut die Vite-Ausgabe aus und bedient die API unter derselben Origin. SQLite liegt in einer Datei auf einem Volume. Weitere Dienste nur aufnehmen, wenn der Host TLS nicht schon beendet.
6. Die CI-Prüfungen Test, Lint und Build beibehalten. Das FTP-Deploy der statischen Seite nicht als Deploy von Version 2 weiterverwenden.
7. Die Nextcloud-Integration entfällt vollständig. Eine automatische Migration bestehender Nextcloud-Dateien ist nicht vorgesehen. Vorhandene ChordPro-Dateien sollen später manuell importiert werden können. Axios, das ungenutzte Konvertermodul, `App.css` und `dotenv` nicht in die neue Struktur übernehmen. Entfernen ist ein eigener späterer Schritt, kein Teil dieser Analyse.
8. Setlisten, Mediendateien, Transposition und eine zweite Datenbank nicht planen, solange Abschnitt 6 sie nicht verlangt.
9. Die Node-Version auf einen Stand festlegen. Die CI läuft mit Node 24, das README nennt Node 22. Für das Image denselben Stand verwenden.
10. Die bestehenden Konvertertests als Sicherung der Ultimate-Guitar-Erkennung und der Abschnittszuordnung behalten. `{soc: …}` und `{sov: …}` bleiben die erwarteten Direktiven. Sobald die Notationsabbildung umgesetzt wird, die Erwartung `{key: H}` in `test/convertToChordPro.test.js` auf die internationale Tonart anpassen. Eine gespeicherte SongbookPro-Exportdatei als Fixture hinzufügen, sobald sie vorliegt.

## Quellen im Repository

- `src/converter/convertToChordPro.js`, `src/converter/chords.js`, `src/converter/sections.js`
- `src/convertToChordPro.js` (ungenutzt)
- `src/App.jsx`, `src/components/*`, `src/nextcloud/*`
- `test/**/*.test.js`, `test/**/*.test.jsx`
- `package.json`, `vite.config.js`, `vitest.config.js`, `.github/workflows/ci.yml`
- `docs/architecture.md`, `docs/input-format.md`, `docs/nextcloud-upload.md`

## Externe Quellen, gelesen am 5. November 2026

- [SongbookPro, ChordPro Syntax](https://songbook-pro.com/docs/manual/chordpro/)
- [SongbookPro, Editing Songs](https://songbook-pro.com/docs/manual/editor/)
- [SongbookPro, Song Display Settings](https://songbook-pro.com/docs/manual/settings/song-display/)
- [SongbookPro, General Settings](https://songbook-pro.com/docs/manual/settings/general/)
- [SongbookPro, Adding Songs](https://songbook-pro.com/docs/manual/adding-songs/)
- [SongbookPro, Deleting and Sharing](https://songbook-pro.com/docs/getting-started/deleting-and-sharing/)
- [ChordPro, Environment directives](https://www.chordpro.org/chordpro/directives-env/)
- [ChordPro, directives overview](https://www.chordpro.org/chordpro/chordpro-directives/)
- [Andrew Tuline, ChordPro Directives in SongbookPro](https://tuline.com/chordpro-directives-in-songbookpro/)
