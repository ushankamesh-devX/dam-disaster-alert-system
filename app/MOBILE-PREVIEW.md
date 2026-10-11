# Expo Go preview of local DDAS

Keep Docker Desktop and the local DDAS containers running. From PowerShell:

```powershell
cd D:\Git\dam-disaster-alert-system\app
npm.cmd run mobile:tunnel
```

This creates a local regular demo viewer account if needed, writes preview
settings into ignored `.env.local`, checks backend health, and starts Expo Go
tunneling on port 8082. Port 8081 stays available for phpMyAdmin. Metro forwards
`/api/v1/` requests to the local backend on port 8080; the mobile client derives
the API host from Expo's host URI. One tunnel carries both app and API traffic.

Open Expo Go on the phone and scan the terminal QR code. On iPhone, scan with
the Camera app. Both devices need internet; they do not need the same Wi-Fi.
Keep the preview terminal running. The project targets Expo SDK 57: use an Expo Go
version supporting SDK 57 (https://expo.dev/go).

The existing app automatically signs in using its viewer settings. Local
credentials are saved in ignored `.expo/mobile-demo-auth.json`; the administrator
account is not bundled. Expo bundles contain demo viewer credentials, so this
workflow is for temporary local previews.

Stop the preview tunnel with Ctrl+C in the Expo terminal.

Tunnel URLs can change when Expo restarts. Rerun `mobile:tunnel` to refresh
settings and clear the mobile bundler cache. Tunneling the Expo bundler alone
does not ordinarily make the API reachable from a phone; the configured
middleware forwards API traffic through the same tunnel.

## SDK 57 upgrade checks

The app uses Expo 57.0.26, React Native 0.86.3, and matching Expo libraries.
Navigation imports use Expo Router's bundled navigation entry points. Unused
Expo AV and separate React Navigation dependencies were removed. Audio uses
`expo-audio`. Deprecated Android and architecture configuration was removed.
TypeScript stays on 5.9 to match the existing localization library peer ranges;
this deliberate exception is recorded in `expo.install.exclude`.

Validated: Expo Doctor 21/21 checks, TypeScript without errors, Android and iOS
JavaScript bundles, and the public SDK 57 Expo Go manifest. Actual phone UI,
audio playback, and image-picker behavior still require device testing.

Preview cache and temporary files are kept in ignored project folders on D:
(`.npm-cache` and `.tmp`) to avoid filling the system drive. Expo's tunnel helper
is installed as a local development dependency.
