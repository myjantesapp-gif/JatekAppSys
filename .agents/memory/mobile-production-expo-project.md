---
name: Mobile production Expo project
description: The published mobile landing server must resolve Expo manifests from the same EAS project and channel as the Android preview build.
---

The production mobile server must keep its manifest fallback project ID and channel aligned with `eas.json` and `app.config.js`. A stale fallback can make `/mobile/` look available while the Android manifest returns an EAS error or loads a different project.

**Why:** The published deployment did not inject the mobile build project variables, so its old fallback pointed to a different Expo project than the current Android preview build.

**How to apply:** When changing Expo accounts, project IDs, or preview channels, verify `/mobile/` with Android Expo headers and verify the production page/QR after publishing.