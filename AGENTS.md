# Arbeitsregeln für Coding-Agenten

Verbindliche Regeln für KI-Coding-Agenten in diesem Repository. Fachliche Inhalte stehen in der Projektdokumentation und werden hier nicht wiederholt.

## 1. Dokumentation zuerst

Vor jeder Aufgabe die relevanten Abschnitte lesen:

| Dokument | Inhalt |
| --- | --- |
| `docs/CONCEPT.md` | Verbindliches Fachkonzept |
| `docs/ROADMAP.md` | Iterationen und Akzeptanzkriterien |
| `docs/V2_ANALYSIS.md` | Bestandsanalyse und technische Risiken |
| `docs/architecture.md` | Technische Architektur, sofern vorhanden |

Fachliche Entscheidungen aus `docs/CONCEPT.md` sind verbindlich. Offene Fragen nicht eigenständig entscheiden, sondern nachfragen.

`docs/CONCEPT.md` und `docs/ROADMAP.md` können parallel von anderen Agenten bearbeitet werden. Diese Dateien nicht ändern, überschreiben oder in Konflikte bringen, außer der Auftrag benennt sie ausdrücklich.

## 2. Arbeitsweise

- KISS und YAGNI konsequent einhalten.
- In kleinen, abgeschlossenen Iterationen arbeiten.
- Nur beauftragte Änderungen durchführen.
- Keine ungefragten Refactorings.
- Keine zusätzlichen Abhängigkeiten ohne begründeten Nutzen und Freigabe.
- Bestehende Architektur und Konventionen respektieren.
- Vor größeren Änderungen einen Implementierungsplan vorlegen und die Freigabe abwarten.
- Bei Unklarheiten nachfragen, statt Annahmen zu treffen.
- Keine Folgeiterationen eigenständig beginnen.

## 3. Codequalität und Tests

### Unit-Tests

- Neue Funktionen und Fehlerbehebungen angemessen durch Unit-Tests absichern.
- Coverage des gesamten produktiven Anwendungscodes über 80 % in allen vier Metriken: Statements, Branches, Functions, Lines.
- Coverage automatisiert messen und prüfen.
- Keine künstlichen Ausschlüsse, deaktivierten Tests oder manipulierten Coverage-Werte.
- Reine Konfigurationsdateien und generierten Code sachgerecht ausnehmen.

### End-to-End-Tests

Wesentliche Benutzerabläufe durch automatisierte, reproduzierbare E2E-Tests ohne manuelle Eingriffe absichern. Sobald der jeweilige Ablauf implementiert ist, gehören dazu:

- Anmeldung und Abmeldung
- Benutzerverwaltung und Berechtigungen
- Private und gemeinsame Liedersammlung
- ChordPro-Konvertierung und Download
- Import und Rückimport mit Vorschau und Bestätigung
- Versionshistorie und Wiederherstellung
- Soft-Delete und Wiederherstellung gelöschter Lieder

Vorhandene Testwerkzeuge bevorzugen. Vitest und Playwright nur verwenden, wenn noch keine geeigneten Werkzeuge existieren.

### Qualitätsprüfungen

Vor Abschluss einer Iteration die relevanten Unit-Tests, E2E-Tests, Lint und den Build ausführen. Fehlerursachen beheben, Prüfungen nicht umgehen. Nicht ausführbare Prüfungen ausdrücklich dokumentieren.

Eine Iteration nicht als abgeschlossen melden, solange ihre verbindlichen Akzeptanzkriterien oder Qualitätsprüfungen nicht erfüllt sind.

## 4. Sicherheit und Datenintegrität

- Keine Passwörter, Tokens oder Zugangsdaten in Code, Logs oder Dokumentation.
- Geheimnisse über Umgebungsvariablen oder geschützte Konfiguration bereitstellen.
- Keine destruktiven Datenbankoperationen ohne ausdrücklichen Auftrag.
- Vorhandene ChordPro-Inhalte einschließlich unbekannter Direktiven vollständig erhalten.
- Keine unbeabsichtigten Änderungen an gespeicherten Liedern.
- Berechtigungen serverseitig prüfen.

## 5. Git und Änderungsumfang

- Für jede beauftragte Implementierungsiteration einen eigenen Feature-Branch von aktuellem `master` verwenden.
- Nach erfolgreicher Umsetzung und den vorgeschriebenen Qualitätsprüfungen die Änderungen der Iteration committen, den Branch pushen und einen Pull Request gegen `master` eröffnen. Dafür ist keine separate Freigabe erforderlich.
- Vor Commit und Push den Git-Status und den Diff prüfen; nur beauftragte Änderungen aufnehmen. Fremde oder unklare Änderungen nicht ungefragt committen.
- Bei fehlgeschlagenen Prüfungen oder unerfüllten Akzeptanzkriterien keinen PR als fertig melden; Probleme dokumentieren und Rücksprache halten.
- Pull Requests niemals selbst mergen. Merge und Deployment erfolgen nur nach ausdrücklicher Freigabe.
- Für Aufgaben außerhalb einer beauftragten Implementierungsiteration nur auf ausdrücklichen Auftrag committen oder pushen.
- Keine Änderungen außerhalb des beauftragten Umfangs.
- Keine ungefragten Formatierungen anderer Dateien.
- Bestehende Änderungen anderer Agenten oder des Benutzers nicht überschreiben.

## 6. Abschlussbericht

Am Ende jeder Aufgabe kurz berichten:

1. Welche Dateien geändert wurden.
2. Welche Funktionen umgesetzt wurden.
3. Welche Tests und Prüfungen ausgeführt wurden, einschließlich Coverage-Ergebnis.
4. Welche Probleme oder offenen Fragen bestehen.
