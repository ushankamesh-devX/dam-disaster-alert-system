# Mobile authentication and onboarding

Implemented locally, 1 November 2026:

- Personal email/password login and account registration (full name, email, password confirmation).
- Clear validation, request progress, failure messages and password visibility controls.
- Native secure token storage with a new key that ignores former shared demo sessions.
- Session restore through `/users/me`; retry on connectivity failures; invalid sessions return to login.
- No automatic viewer login or identity substitution after a 401.
- Onboarding chooses language and an operational dam manually. No GPS permission, location screen or location update is requested.
- The preference is stored on the user account as `preferredDamId` and `onboardingCompletedAt`.
- Dashboard dam details, readings, hazard map and legends use the selected dam, replacing the Victoria demo default. An unavailable preference does not silently select another dam.
- Settings shows the account, offers dam/language changes and sign-out. Route guards keep app screens behind authentication and completed setup; account/dam changes reset navigation state.

## Local database

`V010__mobile_onboarding_contract.json` adds nullable `users.preferred_dam_id`, its dam foreign key, and `users.onboarding_completed_at`.

For an existing local database, run from `api/`:

```powershell
python scripts/migrate_mobile_onboarding.py
```

This applies only the mobile preference columns/link and records V010, with a full backup before DDL. It was used locally because the general schema checker encounters pre-existing V005 checksum formatting differences and report-table timestamp differences. Those older records and report tables were not changed or bypassed by weakening the general checker.

Restart host Spring Boot after applying the fields. No production migration or deployment was performed.

## Development and checks

```powershell
# app/
npm.cmd run test:auth
npm.cmd run test:metro
npm.cmd run mobile:build

# api/
python scripts/check_mobile_auth.py
```

The API smoke test creates two temporary QA accounts, checks preference persistence and isolation, then deactivates those accounts. It does not modify existing user profiles.

## Validation

- Full backend suite: 62 tests passed, including 5 new preference/onboarding tests.
- Mobile auth/session tests: 7 passed, including expired-session handling, no shared-viewer fallback, late-response isolation, secure token storage and manual dam selection. Development-server compatibility tests: 3 passed.
- Local API smoke test passed registration, account isolation, invalid dam rejection, saved preference after another login and unchanged location fields. QA accounts were deactivated afterward.
- Mobile TypeScript passed. Lint reported no errors; scanning all app routes also reports one existing import-order warning in the news screen.
- Updated Android arm64 development APK built successfully at `android/app/build/outputs/apk/debug/app-debug.apk`.
- The updated APK is installed on the connected Vivo V2419. Registration, manual onboarding, the selected reservoir dashboard, session restoration after restart, sign-out and validation messages were observed on the phone. Full manual acceptance testing is left to the user; a complete on-device login round trip is not claimed.
- Both temporary phone-QA accounts were deactivated. The app was relaunched against the running local API and Metro for manual testing.
- USB development advertises loopback while listening on IPv4 as well, resolving the phone's failed bundle connection. A project-owned compatibility bridge adapts NativeWind virtual CSS events to Metro's change-map format; adding/removing a scanned CSS class no longer stops the development server. No dependency source files were patched.
- Dashboard warnings now follow the chosen dam's returned hazard status, with demo readings labelled, instead of displaying a fixed evacuation warning for every dam.

## Manual acceptance checklist

1. Register with a new email, select a language and dam, then continue to the dashboard.
2. Confirm the dashboard and map show the selected dam. Sign out and log in with the same account; the choice should remain.
3. Close and reopen the app to check session restoration. Change the dam in Settings and check the dashboard again.
4. Try an incorrect password and a second account; check error messages and separate dam preferences.

Keep USB connected, Metro on port 8082, host Spring Boot on port 8080, and supporting Docker services running. Location permissions and location updates remain out of scope.
