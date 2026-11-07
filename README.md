# PerfectSound by OAK

An experimental Windows desktop audio hub with a compact interface, a system-tray menu and local device management. The interface is currently in Brazilian Portuguese.

**First public beta — Windows x64. Device-specific features are not universal Bluetooth features.**

## Download and try

1. Open [Releases](https://github.com/Oak-Master/PerfectSound/releases) and download the Windows ZIP from the latest prerelease.
2. Extract the **entire** ZIP into a writable folder. Do not run the executable inside the ZIP or copy the EXE without its supporting files.
3. Launch `PerfectSound.exe`. No separate Node.js installation is needed.
4. Pair your device in Windows, then use **Selecionar dispositivo → Adicionar dispositivo**.

The app is portable and unsigned. Closing its window keeps it running in the system tray; use **Sair** to exit. The app does not install drivers or start automatically with Windows.

## What works

| Device | Current scope |
| --- | --- |
| Samsung Galaxy Buds FE | Battery readings, ANC/ambient/off, six onboard EQ presets, ambient adjustments and custom long-press mapping. Tested on one unit; other firmware versions still need reports. |
| JBL Go 3 | Registered model and Windows output volume/mute adapter. Physical validation pending. No onboard JBL EQ integration. |
| JBL Charge 6 | Registered model and Windows output volume/mute adapter. Physical validation pending. BLE battery, onboard EQ and Auracast are not implemented. |
| Other Windows playback outputs | Add a detected output for Windows volume and mute. This does not enable proprietary headphone or speaker controls. |

Removing a device from PerfectSound **does not unpair it in Windows**. Selecting a device in the app does not change the default Windows playback output.

Additional features:

- App-based profiles for Buds FE, based on the foreground process name.
- Global shortcuts: `Ctrl+Shift+F9` ANC, `F10` ambient, `F11` off, `F12` next profile. Conflicts are displayed in the app.
- Local battery history and low-battery notifications.
- A ten-band EQ for a local audio player, with Equalizer APO export. System-wide processing requires a separate Equalizer APO installation/configuration.

Custom long-press actions need PerfectSound running. Enable them explicitly in **Mods**, and use **Restaurar originais** to restore the mapping saved when they were enabled. Windows media play/pause affects the system media session, not a Bluetooth device chosen independently.

## Local data and privacy

Preferences, device IDs, battery history and browser storage stay in the local `data` folder next to the packaged executable. The development server uses its configured data directory. Do not commit or share that folder.

No analytics service, account, cloud backend, firmware uploader or remote-control endpoint is included. The local HTTP service listens only on `127.0.0.1:4783`; device-writing routes require a per-launch token. App profiles inspect foreground process names locally, not window titles or document contents. See [PRIVACY.md](PRIVACY.md).

## Development

Requirements: Windows x64, Windows PowerShell 5.1, Bluetooth for Buds control, and Node.js 22.12 or newer.

```sh
npm ci
npm test
npm start
```

To build the portable Windows package:

```sh
npm run build
```

Output: `dist/PerfectSound-<version>-windows-x64.zip` and `dist/SHA256SUMS.txt`. The build includes application source under `resources/app` and excludes runtime data, caches and personal screenshots. GitHub Actions runs tests and can publish a prerelease when a `v*` tag is pushed.

## Help test devices

Use the **Device compatibility report** issue template. Include the model, firmware if available, Windows version, app version, expected behavior and actual result. Remove Bluetooth addresses, endpoint IDs, serial numbers, usernames and personal paths from screenshots or logs before posting.

Known limits: one active Buds FE control connection, possible conflicts with phone companion apps, a fixed local port, no verified JBL proprietary controls, and no automatic updater. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## License and attribution

GPL-3.0; see [LICENSE](LICENSE). Samsung protocol framing/fields and the Buds FE reference test capture are adapted from [GalaxyBudsClient](https://github.com/timschneeb/GalaxyBudsClient). Attribution and the consulted revision are in [THIRD-PARTY.md](THIRD-PARTY.md).

PerfectSound is an independent project. It is not affiliated with Samsung, JBL, Harman or Logitech. Their names identify compatible or planned devices.

### Português

Baixe o ZIP em **Releases**, extraia todos os arquivos e abra `PerfectSound.exe`. O suporte avançado foi testado em um Galaxy Buds FE. As JBL ainda precisam de validação física; cadastrar um modelo não significa que seus controles internos estejam implementados. Dados e preferências ficam na pasta `data` e não devem ser publicados.
