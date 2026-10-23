# Dam Disaster Alert System - Mobile UI Test Suite (Python + Appium)

Beginner-friendly guide to setting up and running the mobile automated UI test suite on **Windows** using **Appium 2**, **UiAutomator2**, and **pytest**.

---

## Architecture Overview

- **Framework**: `Appium-Python-Client` (Python 3.10+) + `pytest`
- **Pattern**: Page Object Model (POM) with reusable gestures & explicit waits in `pages/base_page.py`
- **Reporting**: `pytest-html` report at `reports/report.html` with automatic failure screenshots in `reports/screenshots/`
- **Target Platform**: Android Emulator (API 30 - 34)
- **Target Application**: Expo React Native Development Build APK (`./app`)

---

## Prerequisites (Step-by-Step for Windows)

### 1. Install Node.js
1. Download **Node.js LTS (v20+)** from [nodejs.org](https://nodejs.org/).
2. Run the installer and ensure **Add to PATH** is checked.
3. Open PowerShell and verify:
   ```powershell
   node -v
   npm -v
   ```

### 2. Install Java JDK 17
1. Download **Java SE Development Kit 17 (x64 Installer)** from [Oracle JDK 17](https://www.oracle.com/java/technologies/downloads/#java17) or Eclipse Temurin 17.
2. Complete the installation (default path: `C:\Program Files\Java\jdk-17`).
3. Set the `JAVA_HOME` environment variable:
   ```powershell
   [System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-17", "User")
   ```
4. Verify in a new terminal:
   ```powershell
   java -version
   ```

### 3. Install Android Studio & Android SDK
1. Download and install **Android Studio** from [developer.android.com/studio](https://developer.android.com/studio).
2. During setup, choose standard components including:
   - **Android SDK**
   - **Android SDK Platform-Tools**
   - **Android Virtual Device (AVD)**
3. Default SDK directory on Windows is usually:
   `C:\Users\<YourUsername>\AppData\Local\Android\Sdk`
4. Set `ANDROID_HOME` and update your system `PATH`:
   ```powershell
   $userSdk = "$env:LOCALAPPDATA\Android\Sdk"
   [System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $userSdk, "User")
   
   # Add platform-tools, emulator, and cmdline-tools to PATH
   $oldPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
   $newPath = "$oldPath;$userSdk\platform-tools;$userSdk\emulator;$userSdk\cmdline-tools\latest\bin"
   [System.Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
   ```
5. Restart PowerShell and verify `adb`:
   ```powershell
   adb version
   ```

### 4. Create and Start an Android Virtual Device (AVD Emulator)
1. Open **Android Studio** -> click **Virtual Device Manager** (or **Device Manager**).
2. Click **Create Device** -> Select a phone profile (e.g. **Pixel 7** or **Pixel 6**).
3. Select an Android system image: **API 33 (Tiramisu)** or **API 34 (UpsideDownCake)** with Google Play or Google APIs.
4. Finish creation. Click the **Play** button to launch the emulator.
5. In PowerShell, check that your running emulator is detected:
   ```powershell
   adb devices
   # Expected output:
   # emulator-5554    device
   ```

### 5. Install Appium 2 and UiAutomator2 Driver
1. In PowerShell, install Appium 2 globally:
   ```powershell
   npm install -g appium
   ```
2. Install the official Android UiAutomator2 driver:
   ```powershell
   appium driver install uiautomator2
   ```
3. Verify driver installation:
   ```powershell
   appium driver list --installed
   # Should list: uiautomator2
   ```

---

## Building the Expo Development APK

To run UI tests against the actual React Native app:
1. Open PowerShell and navigate to `./app`:
   ```powershell
   cd "d:\Software Project -3 rd year\Dam Disaster latest updates\dam-disaster-alert-system\app"
   ```
2. Build and launch on your running Android emulator:
   ```powershell
   npx expo run:android
   ```
   *(This builds the development APK, installs it on your emulator, and launches it automatically).*
3. Verify the installed package name:
   ```powershell
   adb shell pm list packages | Select-String "anonymous"
   # Shows: package:com.anonymous.app
   ```

---

## Test Suite Installation

1. Navigate to the test suite directory:
   ```powershell
   cd "d:\Software Project -3 rd year\Dam Disaster latest updates\dam-disaster-alert-system\QA\Mobile UI Test"
   ```
2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. Install test dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Copy environment configuration:
   ```powershell
   Copy-Item .env.example .env
   ```
5. Check your `.env` settings:
   - `APPIUM_SERVER_URL`: `http://127.0.0.1:4723`
   - `ANDROID_DEVICE_NAME`: `Android Emulator`
   - `APP_PACKAGE`: `com.anonymous.app`
   - `APP_ACTIVITY`: `.MainActivity`

---

## Running the Tests

### Step 1: Start Appium Server
Open a dedicated PowerShell terminal and start Appium:
```powershell
appium
```
Leave this window running. It will listen on `http://127.0.0.1:4723`.

### Step 2: Ensure Emulator is Running
```powershell
adb devices
```

### Step 3: Execute Test Suites

From your activated virtual environment in `./QA/Mobile UI Test`:

```powershell
# 1. Run quick smoke tests
pytest -m smoke

# 2. Run all tests
pytest

# 3. Run using the PowerShell wrapper
.\run_tests.ps1

# 4. Run tests by category marker
pytest -m nav         # Tab and route navigation tests
pytest -m dashboard   # Dashboard & gauge tests
pytest -m news        # News feed, filter chips, and detail modal
pytest -m emergency   # DMC hotline and evacuation shelters
pytest -m alerts      # Severity counters and alerts feed
pytest -m report      # Report issues search, filter, and modal validation
pytest -m hazard      # Hazard map and emergency alarm simulation
pytest -m settings    # English / Sinhala language switching
pytest -m resilience  # Edge-case and lifecycle resilience tests

# 5. Run a single test file
pytest tests/test_01_smoke.py
pytest tests/test_07_report_issues.py
```

---

## Viewing Test Results & Reports

- **HTML Report**: Open `reports/report.html` in Google Chrome or Edge:
  ```powershell
  Start-Process reports/report.html
  ```
- **Failure Screenshots**: If any test fails, an automatic screenshot is saved to:
  `reports/screenshots/FAIL_<test_name>_<timestamp>.png`
  and embedded directly into the HTML report.

---

## Troubleshooting Guide

| Issue | Root Cause | Solution |
|---|---|---|
| `Could not connect to Appium server at http://127.0.0.1:4723` | Appium server is not running | Run `appium` in a separate PowerShell terminal before running tests. |
| `Could not find a connected Android device` | Emulator not started or ADB offline | Run `adb devices`. If list is empty, start emulator from Android Studio. Run `adb kill-server` then `adb start-server` if stuck. |
| `Original error: Activity class .MainActivity does not exist` | App not installed on emulator | Run `npx expo run:android` in `./app` once to compile and install the APK onto the emulator. |
| `Script execution disabled on Windows (Activate.ps1)` | PowerShell execution policy | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in your PowerShell window. |
| `TimeoutException: Condition not met` | Slow emulator or screen transition | Increase `EXPLICIT_WAIT=25` in `.env` for slower virtual devices. |
