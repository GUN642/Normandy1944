# Normandy 1944

Ego-Shooter zur Invasion in der Normandie im Browser – im Stil des Medevac-sim: läuft auf GitHub Pages, als
Android-App (APK mit automatischer Update-Funktion) und auf PC, Handy, Tablet und Android TV. Steuerung per
Tastatur/Maus, Gamepad oder Touchscreen. Von **amerikanischer und deutscher Seite** spielbar.

**Spielen:** https://gun642.github.io/Normandy1944/
**Android-APK:** https://gun642.github.io/Normandy1944/apk/normandy1944.apk

## Storyline – acht Operationen in historischer Reihenfolge

| # | Operation | Datum / Zeit | US-Seite | Deutsche Seite |
| --- | --- | --- | --- | --- |
| 1 | **Nacht der Fallschirmjäger** (Sainte-Marie-du-Mont) | 6.6., 01:15 | Absprung aus der C-47, Versprengte sammeln („Flash“ – „Thunder“), Flak sprengen | Flakstellung am Gehöft halten |
| 2 | **Sainte-Mère-Église** | 6.6., 04:30 | Kirchplatz säubern, Flagge am Rathaus hissen, N13 halten | Gegenangriff von Süden mit Sturmgeschützen |
| 3 | **Omaha Beach – Dog Green** | 6.6., 06:36 | Landung im LCVP, Kieselbank, Bangalore-Torpedo, Steilhang, Bunker | Widerstandsnest der 352. ID halten |
| 4 | **Pointe du Hoc** | 6.6., 07:10 | Klippe an Seilen erklettern, verlegte 155-mm-Geschütze im Obsthain zerstören, Straße halten | Gegenangriff des GR 914 |
| 5 | **Brécourt Manor** | 6.6., 08:30 | Vier 10,5-cm-Haubitzen im Graben sprengen | Geschützstellung sichern |
| 6 | **Der Damm von La Fière** | 6.–9.6. | Brücke mit Bazookas gegen Beutepanzer halten | Mit Panzern über den Damm angreifen |
| 7 | **Carentan** | 12.6., 06:00 | MG-Nest, Marktplatz, Bahnhof | Fallschirmjäger-Regiment 6 verteidigt und setzt sich ab |
| 8 | **Heckenkrieg – Höhe 192** | 11.–18.7. | Im Nebel Hecke um Hecke den Hang hinauf | Höhe halten, Gegenstoß |
| + | **Utah Beach** | 6.6., 06:30 | Landung bei Tageslicht, Ufermauer, WN 5, Damm nach Pouppeville | Dünen halten |
| + | **Operation Cobra – Marigny** | 25.–26.7. | Nach dem Bombenteppich über die Straße St-Lô–Périers, Panzer IV, Marigny | Panzer-Lehr-Division hält Hecken und Ort |
| + | **Kessel von Falaise – Chambois** | 20.8. | Chambois mit dem Donjon gegen den Ausbruch halten | Fallschirmjäger brechen über die Dives aus |

- **Kampagne:** je Seite eine eigene historische Reihenfolge, Missionen werden nacheinander freigeschaltet;
  nach jedem Sieg folgt der historische Ausgang (einschließlich Verlusten). Fällt man, übernimmt man den
  nächsten Kameraden – erst wenn keiner mehr lebt, ist die Mission verloren.
- **Freies Gefecht:** jede Operation, jede Seite, Wetter, Tageszeit und Truppenstärke frei wählbar.
- **Mehrspieler:** wie im Medevac-sim – Spielcode/Einladungslink (WebRTC über PeerJS) oder WLAN in der App;
  **Koop** gegen die KI oder **Gegeneinander** (US gegen DE, KI füllt beide Seiten auf). Sprechfunk
  (Feststelltaste / Maustaste 5 / FUNK-Knopf) mit Funkklang, Text-Chat, Einstieg jederzeit.

Personen sind erfunden (mit * markierte Namen an reale Kommandeure angelehnt); Einheiten, Orte, Zeiten und
Abläufe folgen den historischen Ereignissen. Keine verfassungsfeindlichen Symbole.

## Komfort im Gefecht

- **Wiedereinstieg vorn:** im freien Spiel und Mehrspieler bei den vordersten Kameraden (nicht im Feindkontakt).
- **Munition teilen:** E halten neben einem Kameraden (alle 90 s), bei einem Funker (füllt auf) oder bei Gefallenen.
- **Markierungen:** blaues Dreieck über Kameraden, rotes über sichtbaren Feinden, gelbes mit Kreuz über Verwundeten – feste Bildschirmgröße, auch auf dem Fernseher gut sichtbar (abschaltbar).
- **Verwundete:** Wer nicht in den Kopf oder durch eine Explosion getroffen wird, ist oft nur kampfunfähig, blutet und
  stirbt ohne Hilfe nach rund einer Minute. E halten: verarzten · H oder E kurz tippen: in Deckung ziehen · leicht Verletzte verbinden
  (Controller: R halten = verarzten bzw. selbst verbinden, R kurz tippen oder Steuerkreuz runter = ziehen/loslassen;
  Feuern oder Zielen lässt den Verwundeten sofort los).
  KI-Kameraden verarzten sich gegenseitig und kommen auch zum Spieler; im Mehrspieler können sich Spieler gegenseitig retten und Verwundete ziehen.
  Blut an der Einschussstelle, Blutlache, Verband nach dem Verarzten.
- **Panzer besetzen:** Am eigenen Panzer E (Controller: R) halten. Erster Platz Fahrer und Richtschütze (fahren, Turm mit
  der Maus/rechtem Stick, Kanone mit Nachladezeit, Zielfernrohr), zweiter Platz MG-Schütze – im Mehrspieler fährt einer,
  der andere bedient das MG. Hecken, Mauern und Häuser halten auch Panzer auf; wird der Panzer abgeschossen, ist die Besatzung schwer verwundet.
- **Häuser und Kirchen begehbar:** Tür, offene Fenster zum Hinausschießen, Treppe ins Obergeschoss; im Kirchturm führt
  eine Wendeltreppe bis zur Glockenstube (Scharfschützenposten mit Schallöffnungen in alle Richtungen).
- **Realistisches Fallen:** Getroffene knicken in den Knien ein und kippen je nach Trefferrichtung nach vorn, hinten oder
  zur Seite, Kopftreffer sacken sofort zusammen, Explosionen schleudern weg.
- **Controller einrichten** (Einstellungen): fragt ZR, ZL, R, L, die vier Tasten, +/−, Stickdruck und den rechten Stick
  nacheinander ab und speichert die tatsächlich gemeldete Belegung je Controller – falls Android einen Controller
  ungewohnt meldet. „Controller testen“ zeigt live, was der Controller sendet.
- **Zielhilfe** für Touch und Controller wie im Medevac-sim; Controller inkl. Switch Pro/Joy-Con und Android TV.

## Waffen (historische Kenndaten, detaillierte 3D-Modelle)

**USA:** M1 Garand (8-Schuss-Ladestreifen mit „Ping“, teilgeladene werden ausgeworfen), M1 Carbine,
Thompson M1A1, BAR M1918A2, M1903A4 Springfield mit Weaver-Zielfernrohr, Colt M1911A1, M1A1 Bazooka, Mk-2-Granate.
**Deutschland:** Karabiner 98k (Ladestreifen, Kammerstängel), Kar 98k mit ZF 39, Gewehr 43, MP 40, StG 44,
MG 42 (1.200 Schuss/min), Walther P38, Panzerfaust 60, Stielhandgranate 24.
Klassen: Schütze, MP-Schütze, Sturmschütze, MG-Schütze, Scharfschütze, Panzerabwehr, Funker/Führer.

Ballistik mit Fallkurve und Laufzeit, Schall mit Verzögerung (343 m/s), Überschallknall vorbeifliegender
Geschosse, Niederhalten (Vignette, Zielschwanken), Kopftreffer, Zweibein im Liegen.

## Atmosphäre

Artilleriefeuer mit anfliegendem Pfeifen, Schiffsartillerie (USS Texas) auf die Steilhänge, Nebelwerfer-Salven
mit heulenden Raketen und Rauchschweifen, Mörser, Scharfschützen in Kirchtürmen und Hecken, Flak-Leuchtspur
und Suchscheinwerfer im Nachthimmel, C-47-Verbände mit abspringenden Fallschirmjägern, P-47 im Tiefflug,
Leuchtkugeln, Panzer (Sherman, StuG III, Panzer IV, Hotchkiss H39), brennende Wracks, Krater.
Wetter: klar, bedeckt, Wind, Regen, Nebel, Frühnebel, Nacht – Tageszeit mit Sonnenstand.

Per **Funk (F)** fordert man Unterstützung an (Ziel = Fadenkreuz): Artillerie/Schiffsartillerie,
P-47-Luftangriff, Nebelwerfer (DE), Rauchvorhang. Funksprüche werden vorgelesen (abschaltbar).

## Grafik

Stufen **Sehr niedrig** (Android TV, schwache Geräte), Niedrig, Mittel, Hoch, Ultra, dazu Auflösung (50–150 %),
Sichtweite, Schatten, Effektmenge, Sichtfeld und FPS-Anzeige.

## Technik

- `web/` – das Spiel (three.js, ES-Module, kein Build-Schritt). `js/story.js` enthält die Storyline,
  `js/maps.js` die acht Karten, `js/weapons.js` Waffen und Modelle.
- `android/` – WebView-Hülle mit Update-Prüfung, LAN-Mehrspieler und Sprachausgabe (aus dem Medevac-sim).
- `.github/workflows/build-deploy.yml` – bei jedem Push Prüfung + Probebau, auf dem Standardbranch
  signierte APK + Veröffentlichung auf GitHub Pages.

### Einmalige Einrichtung auf GitHub

1. **Settings → Pages → Source: GitHub Actions**.
2. Signaturschlüssel als Secrets in der Umgebung `release` hinterlegen (siehe `android/keystore/README.md`).
   Ohne Schlüssel wird die Website trotzdem veröffentlicht, nur ohne APK.

Lokal testen: `python3 -m http.server --directory web` und http://localhost:8000 öffnen
(Mehrspieler-Test in zwei Tabs: `?net=test`).
