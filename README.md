# 💸 Moneyflow React Native

A cross-platform personal finance mobile application built with **React Native**, supporting both **Android** and **iOS**.

---

## 📋 Table of Contents

- [Requirements](#requirements)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Running the App](#running-the-app)
- [Build Script](#build-script)
- [Firebase Setup](#firebase-setup)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Requirements

### General
| Tool | Version |
|------|---------|
| Node.js | >= 18.x |
| npm | >= 9.x |
| React Native CLI | latest |

### Android
| Tool | Notes |
|------|-------|
| Android Studio | Latest stable |
| Android SDK | API Level 33+ recommended |
| `ANDROID_HOME` | Must be set as an environment variable |
| JDK | 17 recommended |

### iOS *(macOS only)*
| Tool | Notes |
|------|-------|
| Xcode | 14+ |
| CocoaPods | `sudo gem install cocoapods` |
| iOS Simulator | Included with Xcode |

---

## Project Structure

```
moneyflow-react-native/
├── __tests__/          # Jest test files
├── android/            # Native Android project
├── ios/                # Native iOS project (Xcode)
├── src/                # Main application source
├── google-services/    # Firebase config files
├── node_modules/       # JS dependencies
├── app.json            # App configuration
├── babel.config.js     # Babel configuration
├── metro.config.js     # Metro bundler configuration
├── jest.config.js      # Jest configuration
├── tsconfig.json       # TypeScript configuration
├── package.json        # Project dependencies & scripts
├── Gemfile             # Ruby gems (CocoaPods)
└── build.sh            # Build & run helper script
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd moneyflow-react-native
```

### 2. Install JavaScript dependencies

```bash
npm install
```

### 3. Install iOS pods *(macOS only)*

```bash
cd ios && pod install && cd ..
```

### 4. Set up environment variables

Create a `.env` file in the project root (if applicable) and ensure your `ANDROID_HOME` is exported in your shell profile:

```bash
# ~/.zshrc or ~/.bashrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## Running the App

### Using React Native CLI

**Start Metro bundler:**
```bash
npx react-native start
```

**Run on Android:**
```bash
npx react-native run-android
```

**Run on iOS:**
```bash
npx react-native run-ios
```

**Run on a specific iOS simulator:**
```bash
npx react-native run-ios --simulator="iPhone 15"
```

---

## Build Script

A `build.sh` helper script is included in the project root for convenience.

### Make it executable (first time only)

```bash
chmod +x build.sh
```

### Usage

```bash
./build.sh [platform] [options]
```

### Platforms

| Platform | Description |
|----------|-------------|
| `android` | Run on Android emulator or device |
| `ios` | Run on iOS simulator or device |
| `both` | Start Metro, then choose platform interactively |

### Options

| Flag | Description |
|------|-------------|
| `--release` | Build in release mode (default: debug) |
| `--clean` | Clean build artifacts before running |
| `--install-pods` | Re-install CocoaPods before iOS build |
| `--device` | Target a physical device |
| `--reset-cache` | Start Metro with `--reset-cache` |

### Examples

```bash
# Run on Android emulator (debug)
./build.sh android

# Run on iOS simulator (debug)
./build.sh ios

# Clean and rebuild iOS with fresh pods
./build.sh ios --clean --install-pods

# Build release APK and run on device
./build.sh android --release --device

# Reset Metro cache and run on iOS simulator
./build.sh ios --reset-cache
```

---

## Firebase Setup

This project uses **Firebase** with static framework linking, configured in the iOS `Podfile`:

```ruby
use_frameworks! :linkage => :static
$RNFirebaseAsStaticFramework = true
```

### Configuration files

- **Android:** Place `google-services.json` in `android/app/`
- **iOS:** Place `GoogleService-Info.plist` in `ios/moneyflow-react-native/`

> ⚠️ These files contain sensitive credentials — **never commit them to version control**. Add them to `.gitignore`.

---

## Testing

Run the test suite with Jest:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

---

## Troubleshooting

### Metro bundler port already in use
```bash
npx react-native start --reset-cache
# or kill the existing process
lsof -ti:8081 | xargs kill
```

### Android — `ANDROID_HOME` not set
Add to your shell profile:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Android — Gradle build fails
```bash
cd android && ./gradlew clean && cd ..
./build.sh android
```

### iOS — Pod install fails
```bash
cd ios
pod deintegrate
pod install --repo-update
```

### iOS — Xcode DerivedData cache issues
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
./build.sh ios --clean --install-pods
```

### iOS — `use_frameworks!` conflicts with Firebase
Ensure your `Podfile` contains:
```ruby
use_frameworks! :linkage => :static
$RNFirebaseAsStaticFramework = true
```
Then re-run `pod install`.

---

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm start` | Start Metro bundler |
| `npm run android` | Run on Android |
| `npm run ios` | Run on iOS |
| `npm test` | Run Jest tests |
| `npm run lint` | Run ESLint |
| `./build.sh android` | Build & run Android (with helpers) |
| `./build.sh ios` | Build & run iOS (with helpers) |

---

## License

Private — All rights reserved.
