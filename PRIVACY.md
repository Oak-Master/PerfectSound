# Local data

PerfectSound stores device selections, Windows endpoint IDs, EQ curves, gesture mappings and battery history locally. The embedded browser also stores preferences in its local profile. Packaged builds use a `data` directory next to the executable. Development can use `PERFECTSOUND_DATA_DIR` to select an isolated directory.

The foreground application's executable name is inspected locally when automatic profiles are enabled. Window titles, document content and keystrokes are not collected. Global shortcuts use Windows RegisterHotKey rather than a general keyboard hook.

There is no analytics or account backend. Local device details are not uploaded automatically. Requests from the UI go to the loopback service on port 4783. Tokens for device-writing routes are randomly generated per launch and are not permanent credentials.

Issue reports and screenshots posted to GitHub are public. Inspect them before sharing: Bluetooth addresses, serial numbers, endpoint IDs, personal paths and app names can be private. The public release and source archive exclude the `data` folder.

Battery history and settings can be cleared by exiting the app and removing its `data` directory. Restore custom earbud gestures from the app before clearing settings if you want to recover the saved mapping.
