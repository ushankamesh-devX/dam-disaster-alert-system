# DDAS mobile development

## Connected Android development build

Start host Spring Boot with `api/scripts/start-local.ps1`; supporting services stay in Docker.
Connect an Android phone with USB debugging authorized, then from `app/`:

```powershell
# First install, or after changing native dependencies/configuration:
npm.cmd run mobile:build

# Normal daily development after installation:
npm.cmd run mobile:usb
```

- App label: DDAS; Android package: `lk.ddas.mobile`.
- The USB launcher forwards phone ports 8080 (API) and 8082 (Metro) to the computer.
- `.env.local` uses the local API directly in USB mode; no Wi-Fi or Expo tunnel is required.
- Metro listens on IPv4 and advertises `127.0.0.1` for USB forwarding. The launcher uses Expo's LAN listener for this; a shared Wi-Fi network is still unnecessary.
- Keep the USB cable, Spring Boot, Docker dependencies and Metro running. JavaScript edits reload through Metro; native changes require `mobile:build` again.
- Native builds use a single Gradle worker and a smaller Java heap to fit this machine's available memory. The local MLflow overlay also uses one worker.
- For multiple phones, call `scripts/start-tunnel.ps1 -Usb -DeviceId <adb-serial>` and add `-Build` for installation.
- If a custom Android debugging server is needed, pass `-AdbPort <port>` or save the port in ignored `.expo/adb-port`. The normal server uses 5037.
- Switching to `mobile:tunnel` rewrites the local preview settings for Expo Go. Restart Metro after changing modes.
- The app now opens personal login/registration. Tokens use native secure storage; the launcher does not create or bundle a shared demo account.

Validated on 1 November 2026: arm64 Android development APK built and installed
on the connected Vivo V2419. The dashboard rendered on the phone, Metro served
the app on 8082, and an API health request executed inside the phone app returned
`success: true`, `status: UP` through USB port 8080. Initial development-client
onboarding showed an Expo startup error; a fresh launch cleared it.

The updated authentication build is also installed. See [AUTH-ONBOARDING.md](AUTH-ONBOARDING.md) for completed checks and the manual login/registration/dam-selection checklist.

## Expo Go tunnel preview

Keep Docker Desktop and the local DDAS containers running. From PowerShell:

```powershell
cd D:\Git\dam-disaster-alert-system\app
npm.cmd run mobile:tunnel
```

This writes API preview settings into ignored `.env.local`, checks backend health, and starts Expo Go
tunneling on port 8082. Port 8081 stays available for phpMyAdmin. Metro forwards
`/api/v1/` requests to the local backend on port 8080; the mobile client derives
the API host from Expo's host URI. One tunnel carries both app and API traffic.

Open Expo Go on the phone and scan the terminal QR code. On iPhone, scan with
the Camera app. Both devices need internet; they do not need the same Wi-Fi.
Keep the preview terminal running. The project targets Expo SDK 57: use an Expo Go
version supporting SDK 57 (https://expo.dev/go).

Sign in or register in the app, then select a dam manually during onboarding.
The old shared demo sign-in and automatic viewer fallback have been removed.
GPS/location setup is not part of this onboarding version.

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
