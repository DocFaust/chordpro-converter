# Nextcloud-Upload

Der ChordPro Converter kann konvertierte Lieder per WebDAV auf eine Nextcloud-Instanz hochladen. Bandkollegen können die `.chord`-Dateien dort abrufen und in ihre ChordPro-App importieren.

## Voraussetzungen

- Eine erreichbare **Nextcloud-Instanz** (WebDAV unter `/remote.php/dav/files/`)
- Ein **Benutzerkonto** auf dieser Instanz
- Ein **App-Passwort** für WebDAV-Zugriff (empfohlen statt des Hauptpassworts)
- **CORS-Konfiguration** auf Nextcloud (einmalig durch den Administrator — siehe [Admin-Einrichtung (CORS)](#admin-einrichtung-cors))

### App-Passwort anlegen

1. In Nextcloud einloggen
2. Einstellungen → Sicherheit → Geräte & Sitzungen
3. Neues App-Passwort erstellen (z. B. „ChordPro Converter“)
4. Das generierte Passwort kopieren — es wird nur einmal angezeigt

Weitere Informationen: [Nextcloud-Dokumentation zu App-Passwörtern](https://docs.nextcloud.com/server/latest/user_manual/en/session_management.html#managing-devices)

> **Hinweis:** Das App-Passwort aus „Geräte & Sitzungen“ ist **nicht** dasselbe wie die temporäre Passwort-Generierung in der Nextcloud-App **WebAppPassword**. Letztere dient nur der CORS-Konfiguration (Administration), nicht dem Login in der Converter-App.

## Einrichtung

1. In der App auf **Nextcloud-Einstellungen** klicken
2. Folgende Felder ausfüllen:

| Feld | Beispiel (docfaust.de) | Hinweis |
|------|------------------------|---------|
| Server-URL | `https://nextcloud.docfaust.de` | Haupt-URL, **ohne** WebDAV-Pfad und ohne trailing slash |
| Benutzername | `wfaust_alpspitzbuam` | Nextcloud-Benutzername |
| App-Passwort | `xxxx-xxxx-xxxx-xxxx` | Aus „Geräte & Sitzungen“, nicht das Login-Passwort |
| Zielordner | `Band/ChordPro` | Optional manuell; leer = Root-Verzeichnis |

3. Zielordner festlegen — **eine** der beiden Varianten:

**Variante A — manuell:** Pfad direkt ins Feld **Zielordner** eintragen (z. B. `Band/ChordPro`).

**Variante B — per Browser:**
   - **Ordner anzeigen** klicken
   - Neben einem Ordner **Auswählen** klicken (setzt den Zielordner), oder **Öffnen** zum Navigieren in Unterordner
   - Alternativ: **Aktuellen Ordner übernehmen** (für den gerade angezeigten Ordner)

4. **Speichern** klicken — die Einstellungen werden lokal im Browser gespeichert (Bestätigung per Browser-Alert)

Beim nächsten Besuch sind alle Felder vorausgefüllt.

## Upload durchführen

1. Lied konvertieren (**Umwandeln**)
2. **Zu Nextcloud hochladen** klicken
3. Im **Browser-Bestätigungsdialog** Dateiname und Zielordner prüfen → **OK**
4. Bei Erfolg erscheint ein Alert: `"MeinLied.chord" wurde hochgeladen!`

Die Datei wird als **`{Titel}.chord`** gespeichert, abgeleitet aus dem Titelfeld. Ist kein Titel gesetzt, heißt die Datei `chordpro_file.chord`.

Ungültige Zeichen im Titel (`/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`) werden durch `_` ersetzt.

Fehlende oder unvollständige Einstellungen (z. B. kein Zielordner) öffnen automatisch **Nextcloud-Einstellungen**.

## Unterschied zum lokalen Download

| Aktion | Ergebnis |
|--------|----------|
| **Download als Datei** | Speichert die `.chord`-Datei lokal auf dem Gerät |
| **Zu Nextcloud hochladen** | Lädt die Datei in den konfigurierten Nextcloud-Ordner hoch |

Beide Aktionen sind unabhängig voneinander.

## Fehlerbehebung

| Problem | Mögliche Ursache | Lösung |
|---------|------------------|--------|
| Einstellungen-Modal öffnet sich beim Upload | Zielordner oder Credentials fehlen | Zielordner setzen und **Speichern** |
| „Ungültige Anmeldedaten" | Falscher Benutzername oder Passwort | App-Passwort aus „Geräte & Sitzungen“ prüfen |
| „Ordner nicht gefunden" | Zielordner gelöscht oder Pfad falsch | Zielordner in den Einstellungen korrigieren |
| „Netzwerkfehler — oft CORS beim PUT" | CORS blockiert Upload (PUT) | Siehe [Admin-Einrichtung (CORS)](#admin-einrichtung-cors); PROPFIND allein reicht nicht |
| Ordnerliste reagiert nicht | — | **Auswählen**-Button neben dem Ordner nutzen oder Pfad manuell eintragen |
| Upload-Button deaktiviert | Keine ChordPro-Ausgabe vorhanden | Zuerst **Umwandeln** klicken |
| WebDAV in Nautilus ok, Browser nicht | Kein CORS-Problem in Nautilus | CORS auf Nextcloud für die App-Origin konfigurieren |

## Admin-Einrichtung (CORS)

Der Upload läuft direkt im Browser — ohne Backend-Proxy. Der ChordPro Converter und Nextcloud liegen auf **unterschiedlichen Domains**; der Browser behandelt das als Cross-Origin-Zugriff. Nextcloud muss deshalb explizit Anfragen von der Converter-Domain erlauben — für **PROPFIND und PUT**.

### Deployment docfaust.de

| Dienst | Domain | Rolle |
|--------|--------|-------|
| ChordPro Converter | `https://cpc.docfaust.de` | Web-App für die Band |
| Nextcloud | `https://nextcloud.docfaust.de` | Ziel für WebDAV-Upload |

CORS wird auf **Nextcloud** konfiguriert — nicht in der Converter-App.

> **Hinweis:** „Vertrauenswürdige Domains" in den Nextcloud-Grundeinstellungen (`trusted_domains`) regeln nur, unter welchen URLs Nutzer **Nextcloud selbst** aufrufen dürfen. Das ist **nicht** dasselbe wie CORS für WebDAV von `cpc.docfaust.de`.

### Option A: Nextcloud-App WebAppPassword (empfohlen, mit Admin-UI)

Die App [WebAppPassword](https://apps.nextcloud.com/apps/webapppassword) erlaubt Cross-Domain-WebDAV. Die **Admin-Einstellungen** (Allowed origins) sind getrennt von der Passwort-Generierung in der App.

1. Als Nextcloud-Administrator einloggen auf `https://nextcloud.docfaust.de`
2. App **WebAppPassword** installieren und aktivieren
3. **Administration → WebAppPassword** (linke Seitenleiste unter Administration)
4. Unter **Allowed origins (WebDAV/CalDAV)** eintragen:
   - `https://cpc.docfaust.de` (Produktion)
   - `http://localhost:5173` (lokale Entwicklung)
5. Speichern — kein Server-Neustart nötig

Alternativ per `config/config.php`:

```php
'webapppassword.origins' => [
    'https://cpc.docfaust.de',
    'http://localhost:5173',
],
```

### Option B: Webserver / Reverse-Proxy

CORS-Header auf dem Reverse-Proxy vor Nextcloud (nginx, Apache, Caddy). Preflight (OPTIONS) für PUT und PROPFIND beachten. Für die meisten Setups ist **Option A** einfacher.

### Prüfen, ob CORS funktioniert

1. Converter öffnen (`https://cpc.docfaust.de` oder `http://localhost:5173`)
2. **Nextcloud-Einstellungen** → **Ordner anzeigen**
3. Ordnerliste sichtbar → PROPFIND ok
4. Lied hochladen → PUT in DevTools (Netzwerk) mit Status **200/201/204**

Bei CORS-Problemen: Konsole zeigt „blocked by CORS policy"; oft schlägt **PUT** fehl, obwohl **PROPFIND** bereits funktioniert.

## Sicherheitshinweis

Server-URL, Benutzername und App-Passwort werden im **localStorage** des Browsers gespeichert.

Empfehlungen:

- **App-Passwort** verwenden, nicht das Hauptpasswort
- App-Passwort widerrufen, wenn es nicht mehr benötigt wird
- Auf gemeinsam genutzten Geräten Vorsicht walten lassen
