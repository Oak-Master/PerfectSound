# Contributing

Start with a device compatibility report or a focused pull request. Do not assume that a command documented for another Bluetooth generation is valid for the target model.

Run `npm ci` and `npm test` before submitting. Keep tests offline and reproducible; hardware-dependent checks must be explicit and describe the exact model and firmware used. Never report a device write as successful based only on sending a packet: require a matching acknowledgement or a fresh read-back.

Do not commit local data, raw identifiers, personal screenshots, credentials, vendor firmware or decompiled companion apps. Include attribution for reused protocol code and fixtures. The project is GPL-3.0.

JBL volume/mute uses Windows Core Audio. Native JBL BLE controls are currently a future integration, not a confirmed feature of this app. Useful contributions include read-only discovery, explicit device capability detection and sanitized test fixtures.

Keep changes to reset, pairing, firmware updates or limiter behavior outside routine UI work; they require a separate design and hardware validation. UI translations and accessibility improvements are welcome.
