#!/bin/bash

# ============================================================
#  build.sh — React Native build & run script for "moneyflow-react-native"
# ============================================================

set -e

# ---------- Colors ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ---------- Helpers ----------
log()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
success(){ echo -e "${GREEN}[OK]${NC}    $1"; }
warn()   { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ---------- Usage ----------
usage() {
  echo ""
  echo -e "${BLUE}Usage:${NC}"
  echo "  ./build.sh [platform] [options]"
  echo ""
  echo -e "${BLUE}Platforms:${NC}"
  echo "  android          Run on Android emulator / device"
  echo "  ios              Run on iOS simulator / device"
  echo "  both             Run Metro bundler, then prompt for platform"
  echo ""
  echo -e "${BLUE}Options:${NC}"
  echo "  --release        Build in release mode (default: debug)"
  echo "  --clean          Clean build artifacts before running"
  echo "  --install-pods   Re-install CocoaPods before iOS build"
  echo "  --device         Target a physical device instead of emulator/simulator"
  echo "  --reset-cache    Start Metro with --reset-cache flag"
  echo "  --help           Show this help message"
  echo ""
  echo -e "${BLUE}Examples:${NC}"
  echo "  ./build.sh android"
  echo "  ./build.sh ios --clean --install-pods"
  echo "  ./build.sh android --release"
  echo "  ./build.sh ios --device"
  echo ""
}

# ---------- Defaults ----------
PLATFORM=""
BUILD_MODE="debug"
CLEAN=false
INSTALL_PODS=false
USE_DEVICE=false
RESET_CACHE=false

# ---------- Parse arguments ----------
if [ $# -eq 0 ]; then
  usage
  exit 0
fi

PLATFORM=$1
shift

for arg in "$@"; do
  case $arg in
    --release)      BUILD_MODE="release" ;;
    --clean)        CLEAN=true ;;
    --install-pods) INSTALL_PODS=true ;;
    --device)       USE_DEVICE=true ;;
    --reset-cache)  RESET_CACHE=true ;;
    --help)         usage; exit 0 ;;
    *) warn "Unknown option: $arg" ;;
  esac
done

# ---------- Validate platform ----------
if [[ "$PLATFORM" != "android" && "$PLATFORM" != "ios" && "$PLATFORM" != "both" ]]; then
  error "Invalid platform '$PLATFORM'. Use: android | ios | both"
fi

# ---------- Project root check ----------
if [ ! -f "package.json" ]; then
  error "package.json not found. Please run this script from the project root."
fi

PROJECT_NAME=$(node -e "console.log(require('./package.json').name)" 2>/dev/null || echo "moneyflow-react-native")
log "Project: ${PROJECT_NAME}"
log "Platform: ${PLATFORM}"
log "Mode: ${BUILD_MODE}"
echo ""

# ============================================================
#  STEP 1 — Check dependencies
# ============================================================
check_deps() {
  log "Checking required tools..."

  command -v node    >/dev/null 2>&1 || error "node is not installed."
  command -v npm     >/dev/null 2>&1 || error "npm is not installed."
  command -v npx     >/dev/null 2>&1 || error "npx is not installed."

  if [[ "$PLATFORM" == "android" || "$PLATFORM" == "both" ]]; then
    command -v adb     >/dev/null 2>&1 || warn "adb not found — Android device/emulator detection may fail."
    [ -z "$ANDROID_HOME" ] && warn "ANDROID_HOME is not set. Make sure it points to your Android SDK."
  fi

  if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "both" ]]; then
    [[ "$(uname)" != "Darwin" ]] && error "iOS builds require macOS."
    command -v xcodebuild >/dev/null 2>&1 || error "Xcode / xcodebuild is not installed."
    command -v pod        >/dev/null 2>&1 || error "CocoaPods (pod) is not installed. Run: sudo gem install cocoapods"
  fi

  success "All required tools are present."
}

# ============================================================
#  STEP 2 — Install JS dependencies
# ============================================================
install_js_deps() {
  if [ ! -d "node_modules" ]; then
    log "node_modules not found — running npm install..."
    npm install || error "npm install failed."
    success "JS dependencies installed."
  else
    success "node_modules already exists. Skipping npm install."
  fi
}

# ============================================================
#  STEP 3 — Clean (optional)
# ============================================================
clean_android() {
  log "Cleaning Android build..."
  cd android
  ./gradlew clean || warn "Gradle clean had warnings (continuing)."
  cd ..
  success "Android build cleaned."
}

clean_ios() {
  log "Cleaning iOS build..."
  rm -rf ios/build
  rm -rf ios/Pods
  rm -rf ~/Library/Developer/Xcode/DerivedData
  success "iOS build cleaned."
}

# ============================================================
#  STEP 4 — CocoaPods
# ============================================================
install_pods() {
  log "Installing CocoaPods dependencies..."
  cd ios
  pod install --repo-update || error "pod install failed."
  cd ..
  success "Pods installed."
}

# ============================================================
#  STEP 5 — Run Android
# ============================================================
run_android() {
  log "Starting Android build (${BUILD_MODE})..."

  ANDROID_ARGS=""
  [ "$BUILD_MODE" == "release" ] && ANDROID_ARGS="--mode=release"
  [ "$USE_DEVICE"  == true     ] && ANDROID_ARGS="$ANDROID_ARGS --device"

  METRO_ARGS=""
  [ "$RESET_CACHE" == true ] && METRO_ARGS="--reset-cache"

  npx react-native run-android $ANDROID_ARGS $METRO_ARGS \
    || error "Android build/run failed."

  success "Android app launched."
}

# ============================================================
#  STEP 6 — Run iOS
# ============================================================
run_ios() {
  log "Starting iOS build (${BUILD_MODE})..."

  IOS_ARGS=""
  [ "$BUILD_MODE" == "release" ] && IOS_ARGS="--mode=Release"

  METRO_ARGS=""
  [ "$RESET_CACHE" == true ] && METRO_ARGS="--reset-cache"

  if [ "$USE_DEVICE" == true ]; then
    # Physical device — let RN CLI pick the connected device
    npx react-native run-ios $IOS_ARGS $METRO_ARGS \
      || error "iOS build/run on device failed."
  else
    # Simulator — default to iPhone 15 if available, else let CLI pick
    SIMULATOR="iPhone 15"
    if xcrun simctl list devices | grep -q "$SIMULATOR"; then
      npx react-native run-ios --simulator="$SIMULATOR" $IOS_ARGS $METRO_ARGS \
        || error "iOS build/run on simulator failed."
    else
      warn "Simulator '$SIMULATOR' not found. Using default simulator."
      npx react-native run-ios $IOS_ARGS $METRO_ARGS \
        || error "iOS build/run on simulator failed."
    fi
  fi

  success "iOS app launched."
}

# ============================================================
#  MAIN
# ============================================================
check_deps
install_js_deps

case "$PLATFORM" in
  android)
    $CLEAN && clean_android
    run_android
    ;;
  ios)
    $CLEAN && clean_ios
    $INSTALL_PODS && install_pods
    if [ ! -d "ios/Pods" ]; then
      warn "ios/Pods not found — running pod install automatically."
      install_pods
    fi
    run_ios
    ;;
  both)
    $CLEAN        && { clean_android; clean_ios; }
    $INSTALL_PODS && install_pods
    log "Launching Metro bundler in background..."
    METRO_ARGS=""
    [ "$RESET_CACHE" == true ] && METRO_ARGS="--reset-cache"
    npx react-native start $METRO_ARGS &
    METRO_PID=$!
    trap "kill $METRO_PID 2>/dev/null" EXIT

    sleep 3  # let Metro start up
    echo ""
    echo -e "${YELLOW}Metro is running (PID $METRO_PID).${NC}"
    echo "Choose a platform to build:"
    select p in "Android" "iOS" "Both" "Quit"; do
      case $p in
        Android) run_android ;;
        iOS)     run_ios ;;
        Both)    run_android & run_ios ;;
        Quit)    break ;;
      esac
      break
    done
    ;;
esac

echo ""
success "Done! 🚀"
