# Signaturschlüssel für die Android-App

Die CI signiert die APK nur auf dem Standardbranch in der geschützten GitHub-Umgebung `release`.
Der Schlüssel liegt **nicht** im Repository, sondern ausschließlich als Secrets
(Settings → Environments → `release` → Environment secrets):

| Secret | Inhalt |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Keystore-Datei, base64-kodiert |
| `ANDROID_KEYSTORE_PASSWORD` | Passwort des Keystores |
| `ANDROID_KEY_ALIAS` | Alias des Schlüssels |
| `ANDROID_KEY_PASSWORD` | Passwort des Schlüssels |

Schlüssel einmalig erzeugen (lokal, mit Java):

```bash
keytool -genkeypair -v -keystore normandy1944.jks -alias normandy -keyalg RSA -keysize 4096 -validity 36500
base64 -w0 normandy1944.jks > keystore.b64   # Inhalt als ANDROID_KEYSTORE_BASE64 eintragen
```

Den Keystore sicher aufbewahren: Ohne ihn lassen sich installierte Apps nicht mehr aktualisieren.
Empfehlung: in der Umgebung `release` unter „Required reviewers“ sich selbst eintragen – dann muss
jede Veröffentlichung per Klick freigegeben werden. Fehlen die Secrets, veröffentlicht die CI die
Website trotzdem, nur ohne APK.
