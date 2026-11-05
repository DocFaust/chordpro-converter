# Roadmap ChordPro Converter 2.0

Stand: 5. November 2026. Diese Roadmap setzt [CONCEPT.md](CONCEPT.md) in kleine, fachlich und technisch abgeschlossene Iterationen um. [V2_ANALYSIS.md](V2_ANALYSIS.md) bleibt die Ist-Analyse und wird nicht zur Implementierungsvorgabe umgedeutet.

Es wird noch kein Produktcode geschrieben. Jede Iteration beginnt erst, wenn die im Konzept genannten Fragen, die sie blockieren, beantwortet sind. Frühere Iterationen können weiterlaufen, während eine spätere Frage noch offen ist.

## Planungsregeln

- Node.js 24 LTS ist verbindlich. Entwicklung, CI und Docker verwenden diese Major-Version.
- Die bestehende Ultimate-Guitar-Konvertierung, ihre Abschnittszuordnung und die vorhandenen Vitest-Prüfungen bleiben in jeder Iteration grün.
- Maßgeblich ist `src/converter/`. Das ungenutzte `src/convertToChordPro.js` wird nicht erweitert.
- Neue fachliche Regeln werden nicht während der Umsetzung erfunden. Fehlt eine Antwort, hält die Iteration an.
- Es kommen keine Abhängigkeiten hinzu, solange die vorhandene Laufzeit und die bereits eingesetzten Bibliotheken ausreichen.
- Fastify liefert später die gebaute Vite-Oberfläche und die API unter einer Origin aus. Reine ChordPro-Regeln liegen in frameworkfreien Modulen, die Oberfläche und Server gemeinsam nutzen.
- SQLite läuft im WAL-Modus. Schemaänderungen sind einfache, der Reihe nach angewendete SQL-Stände, ohne Migrationsframework.
- Die Coverage-Schwelle von 80 Prozent bleibt bestehen und gilt auch für neuen Servercode.
- Die produktive Freigabe liegt nach Iteration 12 und nach den beiden Prüfaufgaben.

## Prüfaufgaben

Diese Aufgaben laufen neben den Iterationen. Sie sind Voraussetzungen, keine Implementierung.

### P1. SongBookPro-Export aufnehmen

**Ziel:** Eine belegte Exportprobe beschaffen. P1 ist abgeschlossen, bevor die Rückimport-Implementierung beginnt.

**Funktionsumfang:** Je eine ChordPro-Datei aus der von der Band genutzten SongBookPro-Version, auf den noch zu benennenden Android- und iPadOS-Referenzgeräten, nach einer kleinen bewussten Textänderung. Getrennt für die Editorarten „Chords over Lyrics“ und „ChordPro“, sofern beide genutzt werden. Die App-Version wird festgehalten. Die Proben werden unverändert als Fixture abgelegt.

**Betroffene Komponenten:** noch keine. Die Fixture gehört später zu Iteration 10.

**Abhängigkeiten:** Frage 11. Start parallel zu Iteration 1, weil die Beschaffung der längste Vorlauf ist. Der Abschluss von P1 ist Voraussetzung von Iteration 10. Iteration 1 bis 3 starten unabhängig davon.

**Akzeptanzkriterien:**

- Für jede genutzte Kombination aus Gerät und Editorart liegt eine echte Datei vor.
- Direktiven, Notation, Leerzeilen und fehlende Angaben sind am Dateiinhalt beschrieben.
- Es wurde keine Soll-Struktur angenommen, die in den Dateien nicht steht.

**Erforderliche Tests:** keiner am Produkt. Die Dateien werden erst in Iteration 10 zu Fixture-Tests.

**Definition of Done:** Die Beschreibung und die Dateien liegen im Repository, und Frage 6 ist damit für die beobachteten Kombinationen beantwortet. Erst danach beginnt die Rückimport-Implementierung.

### P2. Download und Dateiauswahl auf Tablets prüfen

**Ziel:** Belegen, wie `.chord`-Download und Dateiauswahl auf den Referenzgeräten funktionieren. P2 ist abgeschlossen, bevor die Downloadfunktion auf den Zielgeräten produktiv freigegeben wird.

**Funktionsumfang:** Ein gespeichertes Lied von `https://cpc.faustens.de` auf Android und iPadOS herunterladen. Eine `.chord`-Datei über die Systemauswahl wieder in CPC öffnen. Zusätzlich prüfen, ob das Gerät die Datei ohne proprietäre Schnittstelle direkt an SongBookPro übergeben kann.

**Betroffene Komponenten:** Export und Dateiauswahl aus Iteration 5, 9 und 10, auf der in Iteration 11 betriebenen Origin.

**Abhängigkeiten:** Frage 11, Iteration 5 und eine erreichbare Origin aus Iteration 11. Der Desktop-Abschluss von Iteration 5 wartet nicht auf P2. Die produktive Freigabe der Downloadfunktion auf den Zielgeräten wartet darauf.

**Akzeptanzkriterien:**

- Das Ergebnis je Gerät ist festgehalten: Datei wird gespeichert, nur geöffnet oder blockiert.
- Eine direkte Übergabe an SongBookPro wird nur dann zur Umsetzung vorgeschlagen, wenn sie auf dem Gerät ohne proprietäre Schnittstelle funktioniert.
- Funktioniert sie nicht, bleibt der Download der vorgesehene Weg.

**Erforderliche Tests:** manuelle Prüfung auf den Referenzgeräten. Kein automatisierter Gerätetest wird vorgetäuscht.

**Definition of Done:** Das Prüfergebnis ist schriftlich festgehalten. Die Downloadfunktion ist auf den Zielgeräten erst produktiv freigegeben, wenn dieses Prüfergebnis vorliegt.

## Iterationen

### Iteration 1. Technische Grundlage

**Ziel:** Einen Fastify-Prozess mit SQLite bereitstellen, ohne das Verhalten der bestehenden Oberfläche zu ändern.

**Funktionsumfang:**

- Prozess unter `server/`, Start über ein npm-Skript.
- SQLite-Datei an einem konfigurierbaren Pfad, WAL-Modus, Schema-Stand wird angelegt.
- Erreichbarkeitsprüfung ohne Fachdaten.
- `package.json` nennt Node.js 24 im Feld `engines`.
- Die README-Angabe Node.js 22 wird auf Node.js 24 LTS angeglichen.
- CI, Lint und Vite-Build bleiben auf dem bestehenden Weg. Die CI verwendet Node.js 24 bereits und wird nur angepasst, wenn sie diese Major-Version nicht festlegt. Die Coverage-Auswertung umfasst den Servercode.
- Die bestehende Oberfläche wird in dieser Iteration noch von Vite ausgeliefert.

**Betroffene Komponenten:** neues `server/`, `package.json`, README, `vitest.config.js`. Die CI-Datei nur, falls sie Node.js 24 nicht bereits verwendet.

**Abhängigkeiten:** keine offene Fachfrage. Für SQLite wird die in Node.js 24 ohne experimentelles Flag nutzbare Schnittstelle `node:sqlite` verwendet. Ist sie nicht nutzbar, stoppt die Iteration und die Schnittstelle wird neu entschieden, bevor eine native Zusatzbibliothek aufgenommen wird.

**Akzeptanzkriterien:**

- Der Prozess startet, legt die Datenbankdatei an und antwortet auf die Erreichbarkeitsprüfung.
- Ein Neustart öffnet dieselbe Datei wieder.
- `npm test`, Lint und `npm run build` sind grün.
- Konvertierung, Download und der noch vorhandene Nextcloud-Weg verhalten sich wie zuvor.

**Erforderliche Tests:** Prozessstart, Anlegen und erneutes Öffnen der Datenbank, Erreichbarkeitsprüfung. Die bestehenden Tests bleiben unverändert grün.

**Definition of Done:** Die Kriterien sind erfüllt, keine neue Abhängigkeit wurde aufgenommen, und die Datenbankdatei ist von der Versionsverwaltung ausgeschlossen.

### Iteration 2. Konten und Sitzungen

**Ziel:** Persönliche Konten mit widerrufbarer Cookie-Sitzung bereitstellen.

**Funktionsumfang:**

- Konten mit Benutzername, angezeigter Originalschreibweise, Passwort-Hash, Administratorrecht, Deaktivierungszustand und dem Kennzeichen für eine erzwungene Passwortänderung.
- Einmaliger Einrichtungsdialog, nur solange kein Administratorkonto existiert. Er legt dieses eine Administratorkonto an.
- Die Ersteinrichtung verlangt ein einmaliges Setup-Token. Das Token liegt beim Betreiber und nicht in der ausgelieferten Oberfläche. Ohne gültiges Token wird kein Konto angelegt. Nach erfolgreicher Einrichtung akzeptiert der Dialog und die zugehörige Schnittstelle keine weitere Einrichtung, auch nicht mit demselben Token.
- Der Administrator legt weitere Konten an. Eine Registrierungsschnittstelle gibt es nicht.
- Benutzername eindeutig ohne Unterscheidung der Groß- und Kleinschreibung. Login mit abweichender Schreibung desselben Namens gelingt. Die Anzeige behält die gespeicherte Schreibweise.
- Login, Logout und Abruf des eigenen Kontos.
- Eigenes Passwort ändern. Der Administrator setzt ein temporäres Passwort zurück. Das ist ein anderer Vorgang als das Deaktivieren.
- Nach dem Zurücksetzen erlaubt die nächste Sitzung nur die Passwortänderung. Anschließend ist diese Sitzung widerrufen.
- Der Administrator deaktiviert und aktiviert Konten. Ein deaktiviertes Konto kann sich nicht anmelden. Deaktivieren widerruft die bestehenden Sitzungen. Aktivieren stellt diese Sitzungen nicht wieder her und setzt das Passwort nicht zurück.
- Deaktivieren löscht das Konto nicht. Lieder und Versionen entstehen erst in späteren Iterationen; das Konto bleibt stehen, damit Deaktivieren sie dort nicht entfernt.
- Passwortänderung und Deaktivieren widerrufen die Sitzungen des Kontos.
- Das Sitzungs-Cookie ist HTTP-only, `SameSite=Strict` und bei HTTPS `Secure`. Es bleibt bestehen, bis Logout oder Widerruf.
- In der Datenbank liegt nur ein Hash des Sitzungs-Tokens. Passwörter werden mit `node:crypto` gehasht.
- Oberfläche für Einrichtung, Login, eigene Passwortänderung und Kontoverwaltung. Auf Tablets ohne Hover bedienbar.

**Betroffene Komponenten:** `server/`, neue Konten-Ansichten in `src/`, Vitest.

**Abhängigkeiten:** Iteration 1. Keine offene Fachfrage. Die konkrete Prüfung des Setup-Tokens wird in dieser Iteration umgesetzt und bleibt eine geschützte Ersteinrichtung. Eine öffentliche Einrichtung ohne Token wird nicht gebaut.

**Akzeptanzkriterien:**

- Ohne Administratorkonto legt nur der geschützte Einrichtungsdialog genau ein Administratorkonto an.
- Ein Einrichtungsversuch ohne gültiges Setup-Token legt kein Konto an.
- Nach erfolgreicher Einrichtung ist der Dialog nicht mehr verfügbar, und ein weiterer Einrichtungsversuch schlägt fehl.
- Ein Nicht-Administrator kann kein Konto anlegen. Eine Selbstregistrierung existiert nicht.
- `Joshi`, `joshi` und `JOSHI` lassen sich nicht als zweite Konten anlegen. Die Anzeige bleibt die zuerst gespeicherte Schreibweise. Die Anmeldung gelingt mit jeder dieser Schreibweisen.
- Ein falsches Passwort, ein leeres Passwort und ein deaktiviertes Konto melden nicht an.
- Deaktivieren widerruft die bestehende Sitzung. Danach scheitert deren weitere Verwendung.
- Wiederaktivieren erlaubt eine neue Anmeldung mit dem bisherigen Passwort und belebt die widerrufene Sitzung nicht.
- Zurücksetzen des Passworts ist ohne Deaktivieren möglich. Mit dem Kennzeichen zur Passwortänderung schlagen Lied- und Kontoverwaltungsaufrufe fehl, der Wechsel des eigenen Passworts gelingt.
- Eine widerrufene Sitzung wird abgelehnt.
- Das Cookie trägt die genannten Eigenschaften, und der Klartext des Passworts erscheint weder in der Datenbank noch in der Antwort.
- Die bestehende Konvertierung bleibt ohne Anmeldung über den bisherigen Vite-Entwicklungsweg lauffähig, bis Iteration 4 sie in die angemeldete Anwendung übernimmt. Der Einrichtungsdialog gehört zur Kontenoberfläche.

**Erforderliche Tests:** geschützte Ersteinrichtung, Ablehnung ohne Token, keine zweite Einrichtung, Anlegen nur durch den Administrator, Groß- und Kleinschreibung von Eindeutigkeit und Login, erhaltene Anzeigeschreibweise, Login, Logout, Cookie-Eigenschaften, Widerruf, Deaktivieren, Wiederaktivieren, temporäres Passwort getrennt vom Deaktivieren, Hash statt Klartext. Bestehende Frontend-Tests bleiben grün.

**Definition of Done:** Die Kriterien sind erfüllt, und kein E-Mail- oder Registrierungsweg existiert. Die Ersteinrichtung ist ohne gültiges Setup-Token nicht nutzbar.

### Iteration 3. Internationale Notation

**Ziel:** Die Ausgabe des bestehenden Konverters auf die internationale Notation bringen, ohne die Abschnittslogik zu ändern.

**Funktionsumfang:**

- Abbildung nach Konzeptabschnitt 5 für den bestehenden Ultimate-Guitar-Konverter.
- Eindeutiges `H` wird international, einschließlich Suffix, Tonart und jeder Slash-Seite, die `H` ist.
- `B`, `Bm`, `Bb` und ihre Suffixe bleiben unverändert. Ein vorkommendes `H` schaltet diese Tokens nicht mit um.
- Die bisherige Eingabe bleibt zulässig. Es kommt keine Einstellung zur Auswahl der Eingabenotation hinzu.
- `labelToDirective()` bleibt einschließlich deutscher Labels und ohne `{eov}` oder `{eoc}`.
- Die Erwartung `{key: H}` in den Konvertertests wird auf `{key: B}`. Die Erwartungen `{soc: ...}`, `{sov: ...}` und `{c: ...}` bleiben.

**Betroffene Komponenten:** `src/converter/chords.js`, `src/converter/convertToChordPro.js`, `test/chords.test.js`, `test/convertToChordPro.test.js`. `src/converter/sections.js` bleibt fachlich unverändert.

**Abhängigkeiten:** keine offene Fachfrage. Iteration 1 ist keine fachliche Voraussetzung. Die Iteration kann unabhängig vom Server abgeschlossen werden.

**Akzeptanzkriterien:**

- `H`, `Hm` und `H7` werden zu `B`, `Bm` und `B7`. `{key: H}` wird `{key: B}`, `{key: Hm}` wird `{key: Bm}`.
- In einem Slash-Akkord wird nur die Seite umgeschrieben, die `H` ist.
- `B`, `Bm`, `B7`, `Bb`, `{key: B}` und `{key: Bm}` bleiben unverändert, auch wenn dieselbe Quelle ein `H` enthält.
- `Bb` wird nicht zu `Bbb`.
- Abschnittsprüfungen liefern dieselben Direktiven wie bisher.
- Es gibt keine Benutzeroption für deutsche Akkordnamen und keine Auswahl der Eingabenotation.
- Es gibt keine automatische Herkunftserkennung.

**Erforderliche Tests:** die genannten Fälle für Token und `{key: ...}`, dazu die unveränderten Abschnitts- und Merge-Tests. Ein Test mit `H` und `B` in derselben Quelle sichert ab, dass nur `H` umgeschrieben wird. Ein Test sichert ab, dass `Bb` nicht zu `Bbb` wird.

**Definition of Done:** Die Kriterien sind erfüllt, und keine der bekannten, nicht beauftragten Konverterkanten wurde nebenbei umgebaut.

### Iteration 4. Liedersammlung

**Ziel:** Konvertierte Lieder dauerhaft, rechtegeprüft und ohne zweite Metadatenkopie speichern.

**Funktionsumfang:**

- Lied mit ID, Besitzer, Sichtbarkeit, Änderungszeitpunkt und Löschzustand.
- Die erste Speicherung schreibt den vollständigen ChordPro-Text als Version 1 mit Zeitpunkt und Benutzer.
- Anlegen aus dem Konverterergebnis. Der Benutzer wählt `PRIVATE` oder `BAND`.
- Liste der eigenen privaten Lieder und aller Bandlieder. Anzeige von ID, Besitzer, Sichtbarkeit, Zeitpunkt und den aus `{title: ...}` und `{artist: ...}` gelesenen Werten.
- Schreibgeschützte Liedansicht.
- Sichtbarkeitswechsel ohne Kopie, sobald Frage 1 und Frage 3 beantwortet sind. Der Besitzer bleibt.
- Deaktivieren eines Kontos löscht keine Lieder und ändert Besitzer und Sichtbarkeit nicht.
- Doppelte Titel sind zulässig.
- Der Server formatiert den übergebenen Text nicht um.
- Die neuen Ansichten sind im Tablet-Hochformat bedienbar. Bestätigungen und Fehlermeldungen dieser Iteration erscheinen in der Seite.

**Betroffene Komponenten:** `server/`, `src/App.jsx` und neue Sammlungskomponenten, frameworkfreies Lesen der Anzeigewerte, Tests.

**Abhängigkeiten:** Iteration 2 und 3. Fragen 1 und 3 für den Sichtbarkeitswechsel. Das Anlegen, Listen und Lesen kann fertiggestellt werden, bevor der Wechsel gebaut wird. Der Wechsel wird nicht mit einer vermuteten Berechtigung vorweggenommen.

**Akzeptanzkriterien:**

- Ein privates Lied ist nur für den Besitzer lesbar. Ein Bandlied ist für jedes Bandmitglied lesbar.
- Titel und Interpret liegen nicht als eigene fachliche Spalten vor.
- Zwei Lieder dürfen denselben Titel tragen und bleiben über die ID unterscheidbar.
- Der gespeicherte Text ist mit dem gesendeten Text identisch, einschließlich unbekannter Direktiven.
- Ein Sichtbarkeitswechsel legt kein zweites Lied an.
- Das Deaktivieren des Besitzers lässt das Lied mit demselben Besitzer und derselben Sichtbarkeit bestehen.

**Erforderliche Tests:** Rechte für Lesen und Anlegen, doppelte Titel, bytegleicher Text, Anzeige bei fehlendem Titel, Erhalt des Liedes nach Deaktivieren des Besitzers, Sichtbarkeitswechsel gemäß der dann vorliegenden Antwort. Konvertertests bleiben grün.

**Definition of Done:** Die Kriterien sind erfüllt, die Antworten zu Frage 1 und 3 sind nachgezogen, und es gibt keinen Editor für den gespeicherten Text.

### Iteration 5. Export

**Ziel:** Ein gespeichertes Lied als unveränderte `.chord`-Datei herunterladen.

**Funktionsumfang:**

- Download des gespeicherten Textes für den Besitzer eines privaten Liedes und für jedes Bandmitglied bei einem Bandlied.
- Dateiname nach der bestehenden Funktion `sanitizeFileName()`. Diese Funktion zieht vor dem Entfernen des Nextcloud-Moduls in ein neutrales Modul.
- Der lokale Download des noch nicht gespeicherten Konverterergebnisses bleibt.
- Keine proprietäre SongBookPro-Übergabe.

**Betroffene Komponenten:** `server/`, Sammeloberfläche, `sanitizeFileName` aus `src/nextcloud/client.js`, Exporttests. Die Nextcloud-Aufrufe bleiben bis Iteration 6.

**Abhängigkeiten:** Iteration 4. P2 prüft die Geräte später auf der produktiven Origin. Diese Iteration kann auf dem Desktop abgeschlossen werden, bevor P2 fertig ist. Die produktive Freigabe der Downloadfunktion auf den Zielgeräten setzt den Abschluss von P2 voraus.

**Akzeptanzkriterien:**

- Der heruntergeladene Inhalt ist bytegleich mit dem gespeicherten Text.
- Der Dateiname endet auf `.chord` und folgt der bestehenden Bereinigung.
- Ohne Titel heißt die Datei `chordpro_file.chord`.
- Ein Benutzer ohne Recht erhält die Datei nicht.

**Erforderliche Tests:** Inhalt, Dateiname, Fallback-Name und Rechte. Ein Browser-Test löst den Download der Sammelansicht aus.

**Definition of Done:** Die Kriterien sind erfüllt, und die Dateinamensfunktion ist nicht mehr an den Nextcloud-Client gebunden.

### Iteration 6. Nextcloud entfernen

**Ziel:** Die Nextcloud-Abhängigkeit aus der Anwendung nehmen, sobald Speichern und Download den bisherigen Upload fachlich ersetzen.

**Funktionsumfang:**

- Entfernen von `src/nextcloud/`, `NextcloudSettingsModal.jsx`, der Upload-Aktion und der nur dafür genutzten Abhängigkeit `axios`.
- Entfernen der ungenutzten Dateien `src/convertToChordPro.js` und `src/App.css` sowie der ungenutzten Abhängigkeit `dotenv`.
- Anpassung der Nextcloud-Tests, des README und der Nutzerdoku, die den Upload als aktuelle Funktion beschreiben.
- `docs/V2_ANALYSIS.md` bleibt unverändert.

**Betroffene Komponenten:** die genannten Module, `package.json`, `package-lock.json`, Tests, README, `docs/architecture.md`, `docs/nextcloud-upload.md`.

**Abhängigkeiten:** Iteration 5. Keine offene Fachfrage.

**Akzeptanzkriterien:**

- Im Laufzeitcode und in `package.json` gibt es keinen Nextcloud- oder Axios-Bezug mehr.
- Konvertieren, lokal herunterladen und in der Sammlung speichern funktionieren.
- Coverage-, Lint- und Build-Konfiguration verweisen nicht mehr auf entfernte Dateien.

**Erforderliche Tests:** die bisherige Upload-Suite entfällt mit dem Modul. Konvertierung, Download und Sammlungstests sind grün. Ein Test stellt sicher, dass die Oberfläche keine Nextcloud-Aktion mehr anbietet.

**Definition of Done:** Die Kriterien sind erfüllt, `npm ci` installiert die entfernten Pakete nicht erneut, und keine Lieddaten wurden migriert, weil eine Nextcloud-Migration nicht vorgesehen ist.

### Iteration 7. Versionierung und Konflikte

**Ziel:** Jede weitere Textänderung als dauerhafte Version speichern und gleichzeitige Schreibvorgänge erkennen.

**Funktionsumfang:**

- Versionsliste mit Zeitpunkt und verantwortlichem Benutzer für private Lieder des Besitzers und für Bandlieder jedes Bandmitglieds.
- Wiederherstellen einer früheren Version als neue Version mit dem unveränderten Text dieser Fassung.
- Schreibende Textänderungen senden die zuletzt gelesene Versionskennung. Bei Abweichung speichert der Server nichts und antwortet mit einem Konflikt.
- Die Oberfläche erklärt den Konflikt und übernimmt die ältere Fassung nicht.
- Es gibt weiterhin keinen Editor. Die Schreibschnittstelle wird von Wiederherstellung und später vom Rückimport genutzt.

**Betroffene Komponenten:** `server/`, Liedansicht, Tests.

**Abhängigkeiten:** Iteration 4. Iteration 6 ist keine fachliche Voraussetzung, vermeidet aber, die neue Liedansicht um den Upload herum zu bauen.

**Akzeptanzkriterien:**

- Eine zweite Textfassung legt eine neue Version an und lässt die erste lesbar.
- Wiederherstellen legt eine weitere Version an und macht den früheren Text zum aktuellen Text.
- Zwei Schreibvorgänge auf derselben gelesenen Fassung: der erste gilt, der zweite ändert nichts.
- Versionen werden nicht verkürzt oder gelöscht.
- Das Deaktivieren des verantwortlichen Kontos löscht keine Version.

**Erforderliche Tests:** Anlegen der Folgeversion, Wiederherstellen, Konflikt ohne Schreibwirkung, Rechte auf der Versionsliste, Erhalt der Versionen nach Deaktivieren eines Kontos.

**Definition of Done:** Die Kriterien sind erfüllt, und ein Konflikt führt zu keiner zusammengeführten Zwischenfassung.

### Iteration 8. Soft-Delete und Wiederherstellen

**Ziel:** Lieder aus der aktiven Sammlung nehmen und zurückholen, ohne Text oder Versionen zu verlieren.

**Funktionsumfang:**

- Soft-Delete mit vorheriger Bestätigung, die ID und verfügbaren Titel nennt.
- Bandlieder dürfen von jedem Bandmitglied gelöscht und zurückgeholt werden.
- Private Lieder nur in dem Umfang, den Frage 2 festlegt.
- Gelöschte Lieder fehlen in der aktiven Liste und im Export und erscheinen in der Wiederherstell-Liste der berechtigten Benutzer.
- Zurückholen hebt den Löschzustand auf. Ob dabei eine Textversion entsteht, folgt der Antwort auf Frage 3.
- Es gibt keine endgültige Löschfunktion und keinen automatischen Löschlauf.

**Betroffene Komponenten:** `server/`, Liste und Liedansicht, Exportrecht aus Iteration 5.

**Abhängigkeiten:** Iteration 7, Fragen 2 und 3.

**Akzeptanzkriterien:**

- Nach dem Löschen ist das Lied für berechtigte Benutzer nur über die Wiederherstell-Liste erreichbar.
- Abbruch der Bestätigung lässt den Zustand unverändert.
- Versionen bleiben nach dem Löschen und nach dem Zurückholen vollständig.
- Ein nicht berechtigter Benutzer kann den Löschzustand nicht ändern und das gelöschte Lied nicht lesen.

**Erforderliche Tests:** Bestätigung, Abbruch, Rechte für Bandlieder, der für private Lieder entschiedene Fall, Export eines gelöschten Liedes wird verweigert, Versionsanzahl bleibt erhalten.

**Definition of Done:** Die Kriterien sind erfüllt, und die Antworten auf Frage 2 und 3 sind im Konzept nachgezogen.

### Iteration 9. Einzelimport einer ChordPro-Datei

**Ziel:** Eine vorhandene ChordPro-Datei als neues Lied übernehmen.

**Funktionsumfang:**

- Genau eine Datei je Vorgang.
- Der Benutzer sieht den vollständigen Text, der gespeichert würde, wählt die Sichtbarkeit und bestätigt.
- Abbruch legt kein Lied an.
- Die Notationsabbildung folgt Konzeptabschnitt 5. Eindeutiges `H` wird abgebildet. `B`, `Bm` und `Bb` bleiben unverändert, solange die Datei nicht als deutsch belegt ist. Ein vorkommendes `H` ist dieser Beleg nicht. Danach speichert der Server den bestätigten Text unverändert als Version 1.
- Unbekannte Direktiven bleiben erhalten.
- Eine leere Datei legt kein Lied an.
- Eine Datei, die sich nach der Antwort auf Frage 8 nicht als genau ein Lied behandeln lässt, wird vollständig abgelehnt.

**Betroffene Komponenten:** frameworkfreie Eingangsfunktion, Sammeloberfläche, Anlegen aus Iteration 4.

**Abhängigkeiten:** Iteration 3, 4 und 7. Frage 8 für die Ablehnung von Mehrfachinhalten. Enthält die von der Band tatsächlich importierte Dateimenge nach Prüfung nur einzelne Lieder, kann der Einzelimport dieser Dateien abgeschlossen werden, bevor Frage 8 für andere Dateiformen beantwortet ist.

**Akzeptanzkriterien:**

- Bestätigen legt genau ein Lied mit neuer ID an.
- Abbruch hinterlässt keine Zeile in der Datenbank.
- Der gespeicherte Text entspricht dem bestätigten Text, einschließlich unbekannter Direktiven.
- Zwei Dateien in einem Vorgang werden nicht angenommen.

**Erforderliche Tests:** Bestätigen, Abbruch, leere Datei, Erhalt einer unbekannten Direktive, Ablehnung eines zweiten ausgewählten Dokuments, Notationsfälle nach Konzeptabschnitt 5. Ein Test mit `H` und `B` in derselben Datei schreibt nur `H` um.

**Definition of Done:** Die Kriterien sind erfüllt, und der Import ersetzt kein vorhandenes Lied.

### Iteration 10. Rückimport

**Ziel:** Eine bearbeitete ChordPro-Datei nach Vorschau und Bestätigung als neue Fassung eines bestehenden Liedes übernehmen.

**Funktionsumfang:**

- Genau eine Datei je Vorgang.
- Eindeutige Zuordnung nur über die in Frage 7 belegten Signale. Sonst wählt der Benutzer das Ziel-Lied oder bricht ab.
- Vergleich nach Konzeptabschnitt 12.3 in einem frameworkfreien Modul. Dieselbe Funktion nutzt die Vorschau und der Server.
- Vorschau mit Ziel-Lied und den inhaltlich abweichenden Zeilen.
- Bestätigung sendet den vollständigen Text. Der Server prüft Recht, Versionskennung und Vergleich erneut.
- Keine inhaltliche Änderung: keine neue Version, gespeicherter Text bytegleich unverändert.
- Inhaltliche Änderung: neue Version mit dem vollständigen Dateitext.
- Abbruch sendet keinen Schreibaufruf.
- Konflikt: keine Speicherung.
- Keine zusätzliche Administratorfreigabe und keine selektive Feldmischung.
- Die Exportproben aus P1 werden als Fixture verwendet. Nur am Fixture belegte gleichwertige Schreibweisen dürfen im Vergleich ignoriert werden.

**Betroffene Komponenten:** `src/`-Vergleichsmodul, `server/`, Liedansicht, Fixture-Verzeichnis, Tests.

**Abhängigkeiten:** Iteration 7 und 9, abgeschlossene Prüfaufgabe P1, Fragen 6 und 7. Frage 8 blockiert wie in Iteration 9 nur Dateien, die mehr als ein Lied enthalten. Zeigen die Proben deutsche Notation, gilt die Tabelle aus Konzeptabschnitt 5 für diesen Eingang, einschließlich `B` → `Bb`. Andernfalls bleibt der bestätigte Dateitext in seiner Notation. Aus den Proben wird keine Erkennungsregel für andere Quellen. Die Implementierung beginnt erst nach Abschluss von P1.

**Akzeptanzkriterien:**

- Ein Abbruch verändert das Lied nicht.
- Ein rein technischer Unterschied bei Zeilenenden oder Leerzeichen am Zeilenende erzeugt keine Version und schreibt den Text nicht um.
- Eine zusätzliche oder entfernte Leerzeile, eine geänderte unbekannte Direktive und eine geänderte Textzeile erzeugen eine Version mit dem vollständigen neuen Text.
- Eine unklare Zuordnung speichert nichts, bevor der Benutzer ein Lied gewählt und bestätigt hat.
- Eine veraltete Versionskennung speichert nichts.
- Die Fixture-Tests beschreiben das beobachtete Dateiformat und enthalten keine angenommene Direktivengrammatik.

**Erforderliche Tests:** die Vergleichsfälle, Abbruch, Bestätigung, Rechte, Konflikt, Fixture der P1-Dateien. Mindestens ein Test mit einer Direktive, die der Konverter selbst nicht erzeugt.

**Definition of Done:** Die Kriterien sind erfüllt, die Fragen 6 bis 8 sind für den beobachteten Umfang im Konzept nachgezogen, und unbekannte Eigenschaften der Proben sind als weiterhin offen gekennzeichnet statt durch Code zu raten.

### Iteration 11. Deployment

**Ziel:** Dieselbe Origin unter `https://cpc.faustens.de` mit Docker Compose betreiben.

**Funktionsumfang:**

- Ein Image auf Node.js 24 LTS enthält den Produktions-Build und den Fastify-Prozess. Der Prozess liefert `dist/` und die API aus. Entwicklung, CI und Image verwenden dieselbe Major-Version.
- Compose mountet ein persistentes Datenverzeichnis. Ein Neustart und ein neues Image behalten die SQLite-Datei.
- Konfiguration über Umgebungsvariablen, keine Geheimnisse im Image.
- Die CI baut das Image. Der bestehende FTP-Job bleibt, bis Frage 10 beantwortet ist.
- TLS wird entsprechend Frage 9 angebunden. Ein zusätzlicher Proxy-Dienst kommt nur hinzu, wenn der Host TLS nicht bereits beendet.
- Hinter einem Proxy gilt `Secure` für das Sitzungs-Cookie nur, wenn der Proxy vertrauenswürdig die Original-Protokollangabe übergibt.

**Betroffene Komponenten:** `Dockerfile`, Compose-Datei, `.dockerignore`, `.github/workflows/ci.yml`, Servereinstieg.

**Abhängigkeiten:** Iteration 6 und 10. Fragen 9 und 10. Frage 10 blockiert nur das Entfernen des FTP-Jobs.

**Akzeptanzkriterien:**

- `https://cpc.faustens.de` liefert Oberfläche und API von derselben Origin.
- Ein Compose-Neustart erhält ein zuvor angelegtes Lied.
- Der Image-Build läuft in der CI.
- Der FTP-Deploy wird durch diesen Job nicht ersetzt, solange Frage 10 offen ist.

**Erforderliche Tests:** Image-Start mit temporärem Volume, Erreichbarkeit von Oberfläche und API, Datenerhalt über einen Neustart. Die bestehenden CI-Prüfungen für Test, Lint und Build bleiben.

**Definition of Done:** Die Kriterien sind auf dem Ubuntu-Host erfüllt, Frage 9 ist nachgezogen, und P2 ist auf dieser Origin ausgeführt oder als offene Freigabesperre der Downloadfunktion auf den Zielgeräten ausgewiesen.

### Iteration 12. Sicherung und Wiederherstellung

**Ziel:** Tägliche konsistente Sicherungen mit geprüftem Wiederherstellungsverfahren bereitstellen.

**Funktionsumfang:**

- Tägliche Sicherung über die Online-Backup-Schnittstelle von SQLite, während die Datenbank geöffnet ist.
- Zielverzeichnis als eigenes persistentes Volume, außerhalb des Container-Dateisystems.
- Die letzten 30 erfolgreichen Tagesstände bleiben erhalten. Die Sicherung eines Tages wird erst nach Erfolg abgelegt. Ein Fehler löscht nichts.
- Aufruf über einen zeitgesteuerten Befehl des Ubuntu-Hosts gegen den laufenden Dienst. Dafür wird kein zweiter Container und kein zusätzliches Backup-Produkt eingeführt.
- Das Wiederherstellungsverfahren wird im Repository beschrieben und an einer Kopie ausgeführt: Dienst der Kopie anhalten, Datenbankdatei der Kopie durch die Sicherung ersetzen, Dienst starten, bekanntes Lied lesen, Schreibprüfung ausführen.

**Betroffene Komponenten:** `server/`-Sicherungsskript, Compose-Volume, Host-Zeitplan, Betriebsdokument, Tests.

**Abhängigkeiten:** Iteration 11.

**Akzeptanzkriterien:**

- Eine Sicherung einer laufenden Datenbank lässt sich unabhängig öffnen und enthält ein zuvor festgeschriebenes Lied.
- Der 31. erfolgreiche Tagesstand entfernt den ältesten Tagesstand und keinen neueren.
- Ein erzwungener fehlgeschlagener Lauf lässt die vorhandenen Dateien unversehrt.
- Die Wiederherstellung auf einer Kopie zeigt das gesicherte Lied und nimmt danach einen Schreibvorgang an.
- Die produktive Datenbank wird bei dieser Prüfung nicht ersetzt.

**Erforderliche Tests:** automatisierte Prüfung der Sicherung gegen eine laufende temporäre Datenbank, Aufbewahrung von 30 Ständen und Verhalten bei Fehler. Die Wiederherstellung wird zusätzlich nach der beschriebenen Anleitung auf einer Kopie ausgeführt und das Ergebnis festgehalten.

**Definition of Done:** Die Kriterien sind erfüllt, die Anleitung liegt im Repository, und die tägliche Ausführung auf dem Ubuntu-Host ist eingerichtet. Erst danach ist Version 2 produktiv freigegeben. Die Downloadfunktion auf den Zielgeräten ist dabei nur freigegeben, wenn P2 abgeschlossen ist.

## Reihenfolge

```text
P1 Exportprobe, abgeschlossen vor der Rückimport-Implementierung ► I10
I1 ► I2 ► I4 ► I5 ► I6 ► I7 ► I8 ► I9 ► I10 ► I11 ► I12
I3 ───────────► I4
P2 Tabletprüfung auf der Origin aus I11 ► Freigabe der Downloadfunktion auf den Zielgeräten, vor der produktiven Freigabe nach I12
```

Iteration 1, 2 und 3 haben keine offene Fachfrage als Voraussetzung. Iteration 2 setzt die technische Grundlage aus Iteration 1 voraus. Iteration 3 kann parallel zu Iteration 1 und 2 umgesetzt werden. Sie muss vor dem ersten fachlich genutzten Speichern abgeschlossen sein. P1 muss vor Iteration 10 abgeschlossen sein. P2 muss vor der produktiven Freigabe der Downloadfunktion auf den Zielgeräten abgeschlossen sein.

## Backlog

### Mehrfachimport mehrerer ChordPro-Dateien

Diese Erweiterung ist ausdrücklich nicht Teil der ersten produktiven Version.

**Ziel später:** Mehrere ChordPro-Dateien in einem Vorgang importieren.

**Vorläufiger Rahmen, keine Implementierung:**

- Jede Datei wird ein eigenes Lied oder, bei einem Rückimport, die Aktualisierung genau eines bestehenden Liedes.
- Es gelten dann dieselben Regeln wie für den Einzelimport und den Rückimport: vollständiger Text, Vorschau, ausdrückliche Bestätigung, Abbruch ohne Änderung, keine selektive Feldmischung.
- ZIP-Archive und Dateien mit mehreren Liedern werden erst betrachtet, wenn eine echte Probe ihre Struktur belegt. Diese Struktur wird jetzt nicht entworfen.
- Die Erweiterung setzt Iteration 9 und 10 voraus.

Eine eigene Iteration wird dafür erst geschnitten, wenn die erste Version produktiv ist und diese Erweiterung beauftragt wird.

## Technische Risiken

Die Risiken ändern den fachlichen Umfang nicht. Sie begrenzen, was die Iterationen vorgeben dürfen.

| Risiko | Folge für die Umsetzung |
| --- | --- |
| Das SongBookPro-Exportformat ist unbekannt. Exporte können Angaben verlieren und je Editorart anders aussehen. | Iteration 10 startet erst nach abgeschlossener P1. Die Vorschau kann viele Zeilen zeigen, obwohl musikalisch wenig geändert wurde. Verluste werden durch die vollständige Textübernahme gespeichert, wenn der Benutzer bestätigt. |
| `B` und `Bm` sind ohne belegten deutschen Kontext mehrdeutig. Eine automatische Herkunftserkennung ist nicht vorgesehen. | Iteration 3 schreibt nur eindeutiges `H` um und lässt `B`, `Bm` und `Bb` unverändert. Dieselbe Einschränkung gilt für den Einzelimport. `B` → `Bb` gilt für den Rückimport nur, wenn P1 deutsche Notation dieser Exporte belegt. |
| SQLite erlaubt einen Schreiber. | WAL und optimistisches Locking verhindern stille Überschreibungen. Ein Konflikt bleibt ein Abbruch ohne Zusammenführung. |
| Eine fehlende Volume-Zuordnung oder eine Dateikopie der offenen Datenbank verliert oder beschädigt die Sammlung. | Iteration 11 mountet das Datenverzeichnis. Iteration 12 benutzt die Online-Backup-Schnittstelle. |
| Browser, insbesondere Safari auf iPadOS, können die Lebensdauer eines Cookies begrenzen. | Das widerspricht der gewünschten Sitzung ohne Ablaufzeit, lässt sich in CPC aber nicht zuverlässig aufheben. P2 hält das tatsächliche Verhalten fest. Abmelden und Widerruf bleiben die vorgesehenen Enden einer Sitzung. |
| Der Blob-Download ist auf Android und iPadOS nicht geprüft. | P2 blockiert die produktive Freigabe der Downloadfunktion auf den Zielgeräten, nicht den Desktop-Abschluss von Iteration 5. |
| Bekannte Konverterkanten, zwei Konverterdateien und das abweichende Merge-Beispiel in `docs/input-format.md`. | Tests stützen sich auf `src/converter/`. Die Kanten werden nicht in Iteration 3 mitbehoben. `docs/input-format.md` wird nicht nebenbei umgeschrieben. |
| Der FTP-Deploy beschreibt den Zielbetrieb nicht. TLS-Terminierung und der Verbleib von `cpc.docfaust.de` stehen nicht im Repository. | Iteration 11 wartet auf Frage 9. Der FTP-Job bleibt bis Frage 10. |
| Gemeinsam genutzte Tablets bleiben angemeldet, bis jemand sich abmeldet oder die Sitzung widerrufen wird. | Das ist die entschiedene Sitzungsregel. Der Schutz dagegen ist Logout, Passwortänderung und Deaktivieren, nicht eine zusätzlich erfundene Ablaufzeit. |
| Das README nennt noch Node.js 22, die CI verwendet Node.js 24. | Verbindlich ist Node.js 24 LTS. Iteration 1 gleicht die README-Angabe an und setzt `engines`. Das Image in Iteration 11 verwendet dieselbe Major-Version. |
