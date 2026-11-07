# Security

This is an experimental local desktop app. Supported reports apply to the latest public beta only.

For a vulnerability, use GitHub's private vulnerability-reporting feature when available. Do not publish credentials, live local tokens or personal device identifiers in a public issue. If private reporting is unavailable, open a minimal issue asking for a private reporting channel without exploit details.

The application binds its HTTP server to loopback, validates the host and checks a per-launch token on mutation routes. Renderers run with Node integration disabled, context isolation enabled and sandboxing enabled. These measures do not make untrusted content safe; do not load remote UI scripts or expose the service on the network.

Unsigned portable builds are provided for evaluation. No firmware update, authentication bypass or limiter-overclock feature is included.
