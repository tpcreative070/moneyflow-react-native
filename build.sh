#!/bin/bash

# ============================================================
#  build.sh — Interactive build & run script
#  Project : moneyflow-react-native
# ============================================================

set -e

# ---------- Colors ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ---------- Helpers ----------
log()     { echo -e "${CYAN}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
divider() { echo -e "${DIM}──────────────────────────────────────────${NC}"; }

# ============================================================
#  BANNER
# ============================================================
clear
echo ""
echo -e "${BOLD}${MAGENTA}"
echo "  ███╗   ███╗ ██████╗ ███╗   ██╗███████╗██╗   ██╗███████╗██╗      ██████╗ ██╗    ██╗"
echo "  ████╗ ████║██╔═══██╗████╗  ██║██╔════╝╚██╗ ██╔╝██╔════╝██║     ██╔═══██╗██║    ██║"
echo "  ██╔████╔██║██║   ██║██╔██╗ ██║█████╗   ╚████╔╝ █████╗  ██║     ██║   ██║██║ █╗ ██║"
echo "  ██║╚██╔╝██║██║   ██║██║╚██╗██║██╔══╝    ╚██╔╝  ██╔══╝  ██║     ██║   ██║██║███╗██║"
echo "  ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║███████╗   ██║   ██║     ███████╗╚██████╔╝╚███╔███╔╝"
echo "  ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝"
echo -e "${NC}"
echo -e "  ${DIM}React Native — Interactive Build Script${NC}"
echo ""
divider
echo ""

# ============================================================
#  MENU HELPERS  (defined first — used by all steps)
# ============================================================

# Single-select: show_menu "Title" opt1 opt2 ...  → sets $MENU_RESULT (1-based)
show_menu() {
  local title="$1"; shift
  local options=("$@")
  local count=${#options[@]}
  echo -e "${BOLD}${BLUE}${title}${NC}"
  echo ""
  for i in "${!options[@]}"; do
    echo -e "  ${BOLD}$((i+1)))${NC}  ${options[$i]}"
  done
  echo ""
  while true; do
    read -rp "$(echo -e "  ${CYAN}Enter number [1-${count}]:${NC} ")" choice
    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "$count" ]; then
      MENU_RESULT=$choice; break
    fi
    echo -e "  ${RED}Invalid — enter a number between 1 and ${count}.${NC}"
  done
  echo ""
}

# Multi-select: show_multiselect "Title" opt1 opt2 ...  → sets $MULTISELECT_RESULT array
show_multiselect() {
  local title="$1"; shift
  local options=("$@")
  local count=${#options[@]}
  echo -e "${BOLD}${BLUE}${title}${NC}"
  echo -e "  ${DIM}Type numbers separated by spaces, or press Enter to skip.${NC}"
  echo ""
  for i in "${!options[@]}"; do
    echo -e "  ${BOLD}$((i+1)))${NC}  ${options[$i]}"
  done
  echo ""
  read -rp "$(echo -e "  ${CYAN}Your choices (e.g. 1 3):${NC} ")" -a raw_choices
  MULTISELECT_RESULT=()
  for c in "${raw_choices[@]}"; do
    if [[ "$c" =~ ^[0-9]+$ ]] && [ "$c" -ge 1 ] && [ "$c" -le "$count" ]; then
      MULTISELECT_RESULT+=("$c")
    fi
  done
  echo ""
}

# ============================================================
#  SETUP FUNCTIONS
# ============================================================

# ---- Homebrew ----
install_homebrew() {
  if command -v brew >/dev/null 2>&1; then
    success "Homebrew is already installed. ($(brew --version | head -1))"
  else
    log "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" \
      || error "Homebrew installation failed."

    # Add brew to PATH for Apple Silicon
    if [[ "$(uname -m)" == "arm64" ]]; then
      echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
      eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    success "Homebrew installed."
  fi
}

# ---- Node.js via Homebrew ----
install_node() {
  if command -v node >/dev/null 2>&1; then
    success "Node.js is already installed. ($(node --version))"
  else
    if ! command -v brew >/dev/null 2>&1; then
      warn "Homebrew not found — installing it first..."
      install_homebrew
    fi
    log "Installing Node.js via Homebrew..."
    brew install node || error "Node.js installation failed."
    success "Node.js installed. ($(node --version))"
  fi
}

# ---- CocoaPods ----
install_cocoapods() {
  if command -v pod >/dev/null 2>&1; then
    success "CocoaPods is already installed. ($(pod --version))"
  else
    log "Installing CocoaPods..."

    # Prefer Homebrew install (avoids system Ruby permission issues on macOS 12+)
    if command -v brew >/dev/null 2>&1; then
      log "Using Homebrew to install CocoaPods..."
      brew install cocoapods || error "CocoaPods installation via Homebrew failed."
    else
      log "Homebrew not found — falling back to gem install..."
      sudo gem install cocoapods || error "CocoaPods installation via gem failed."
    fi

    success "CocoaPods installed. ($(pod --version))"
  fi
}

# ---- Watchman (recommended for RN file watching) ----
install_watchman() {
  if command -v watchman >/dev/null 2>&1; then
    success "Watchman is already installed. ($(watchman --version))"
  else
    if ! command -v brew >/dev/null 2>&1; then
      warn "Homebrew not found — installing it first..."
      install_homebrew
    fi
    log "Installing Watchman via Homebrew..."
    brew install watchman || error "Watchman installation failed."
    success "Watchman installed."
  fi
}

# ---- React Native CLI ----
install_rn_cli() {
  if command -v react-native >/dev/null 2>&1; then
    success "React Native CLI is already installed."
  else
    log "Installing React Native CLI globally..."
    npm install -g react-native-cli || error "React Native CLI installation failed."
    success "React Native CLI installed."
  fi
}

# ============================================================
#  STEP 0 — Setup / Install Dependencies
# ============================================================
divider
echo ""
show_menu "  🛠️  Would you like to install / verify dependencies first?" \
  "Yes — show me the setup options" \
  "No  — skip setup and go straight to build"

if [ "$MENU_RESULT" -eq 1 ]; then
  echo ""
  divider
  echo ""
  show_multiselect "  📦  Select what to install  (macOS only)" \
    "Homebrew            — macOS package manager (required by options below)" \
    "Node.js             — via Homebrew  (recommended)" \
    "CocoaPods           — via Homebrew  (required for iOS)" \
    "Watchman            — file watcher, improves Metro performance" \
    "React Native CLI    — global RN command-line tool"

  echo ""
  divider
  echo ""
  log "Running selected installations..."
  echo ""

  for sel in "${MULTISELECT_RESULT[@]}"; do
    case $sel in
      1) install_homebrew  ;;
      2) install_node      ;;
      3) install_cocoapods ;;
      4) install_watchman  ;;
      5) install_rn_cli    ;;
    esac
  done

  if [ ${#MULTISELECT_RESULT[@]} -eq 0 ]; then
    warn "Nothing selected — skipping setup."
  fi

  echo ""
  success "Setup complete."
  echo ""
  divider
  echo ""

  # Ask if they also want to continue to the build
  show_menu "  🚀  What would you like to do next?" \
    "Continue to build the app" \
    "Exit — I only needed setup"

  if [ "$MENU_RESULT" -eq 2 ]; then
    echo ""
    success "All done! Run ./build.sh again when you're ready to build."
    exit 0
  fi
fi

# ============================================================
#  Project root check
# ============================================================
echo ""
divider
echo ""
if [ ! -f "package.json" ]; then
  error "package.json not found. Please run this script from the project root."
fi

PROJECT_NAME=$(node -e "console.log(require('./package.json').name)" 2>/dev/null || echo "moneyflow-react-native")
log "Project : ${BOLD}${PROJECT_NAME}${NC}"
echo ""

# ============================================================
#  STEP 1 — Select PLATFORM
# ============================================================
divider
echo ""
show_menu "  🖥️  Select Platform" \
  "Android   — Run on emulator or physical device" \
  "iOS       — Run on simulator or physical device  (macOS only)" \
  "Both      — Launch Metro, then build for both"

case $MENU_RESULT in
  1) PLATFORM="android" ;;
  2) PLATFORM="ios"     ;;
  3) PLATFORM="both"    ;;
esac

log "Platform : ${BOLD}${PLATFORM}${NC}"
echo ""

# ============================================================
#  STEP 2 — Select BUILD MODE
# ============================================================
divider
echo ""
show_menu "  ⚙️  Select Build Mode" \
  "Debug    — Fast iteration, JS logs visible (default)" \
  "Release  — Optimised build, ready for testing / store"

[ "$MENU_RESULT" -eq 1 ] && BUILD_MODE="debug" || BUILD_MODE="release"
log "Mode     : ${BOLD}${BUILD_MODE}${NC}"
echo ""

# ============================================================
#  STEP 3 — Select TARGET DEVICE
# ============================================================
divider
echo ""
show_menu "  📱  Select Target" \
  "Emulator / Simulator — Use a virtual device" \
  "Physical Device      — Use a connected real device"

[ "$MENU_RESULT" -eq 1 ] && USE_DEVICE=false || USE_DEVICE=true
log "Target   : ${BOLD}$([ "$USE_DEVICE" = true ] && echo "Physical device" || echo "Emulator / Simulator")${NC}"
echo ""

# ============================================================
#  STEP 4 — Extra Options (multi-select)
# ============================================================
divider
echo ""
show_multiselect "  🔧  Extra Options  (optional)" \
  "Clean build artifacts before running" \
  "Re-install CocoaPods  (iOS only)" \
  "Reset Metro bundler cache"

CLEAN=false
INSTALL_PODS=false
RESET_CACHE=false

for sel in "${MULTISELECT_RESULT[@]}"; do
  case $sel in
    1) CLEAN=true        ;;
    2) INSTALL_PODS=true ;;
    3) RESET_CACHE=true  ;;
  esac
done

# ============================================================
#  STEP 5 — Confirm
# ============================================================
divider
echo ""
echo -e "${BOLD}  📋  Build Summary${NC}"
echo ""
echo -e "    Platform    : ${BOLD}${PLATFORM}${NC}"
echo -e "    Mode        : ${BOLD}${BUILD_MODE}${NC}"
echo -e "    Target      : ${BOLD}$([ "$USE_DEVICE" = true ] && echo "Physical device" || echo "Emulator / Simulator")${NC}"
echo -e "    Clean       : ${BOLD}${CLEAN}${NC}"
echo -e "    Pods        : ${BOLD}${INSTALL_PODS}${NC}"
echo -e "    Reset cache : ${BOLD}${RESET_CACHE}${NC}"
echo -e "    Firebase    : ${BOLD}$([ -d "google-services" ] && echo "✓ will sync files + patch Gradle" || echo "⚠ google-services/ not found")${NC}"
echo ""

read -rp "$(echo -e "  ${YELLOW}Proceed? [Y/n]:${NC} ")" confirm
confirm="${confirm:-Y}"
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo ""; warn "Aborted by user."; exit 0
fi

echo ""
divider
echo ""

# ============================================================
#  DEPENDENCY CHECKS
# ============================================================
check_deps() {
  log "Checking required tools..."
  command -v node >/dev/null 2>&1 || error "node is not installed. Re-run build.sh and choose Setup → Install Node.js."
  command -v npm  >/dev/null 2>&1 || error "npm is not installed."
  command -v npx  >/dev/null 2>&1 || error "npx is not installed."

  if [[ "$PLATFORM" == "android" || "$PLATFORM" == "both" ]]; then
    command -v adb >/dev/null 2>&1 || warn "adb not found — Android device detection may fail."
    [ -z "$ANDROID_HOME" ] && warn "ANDROID_HOME is not set. Make sure it points to your Android SDK."
  fi

  if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "both" ]]; then
    [[ "$(uname)" != "Darwin" ]] && error "iOS builds require macOS."
    command -v xcodebuild >/dev/null 2>&1 || error "Xcode / xcodebuild is not installed."
    command -v pod >/dev/null 2>&1 || error "CocoaPods not found. Re-run build.sh and choose Setup → Install CocoaPods."
  fi

  success "All required tools present."
}

# ============================================================
#  JS DEPENDENCIES
# ============================================================
install_js_deps() {
  if [ ! -d "node_modules" ]; then
    log "node_modules not found — running npm install..."
    npm install || error "npm install failed."
    success "JS dependencies installed."
  else
    success "node_modules exists — skipping npm install."
  fi
}

# ============================================================
#  CLEAN
# ============================================================
clean_android() {
  log "Cleaning Android build..."
  cd android && ./gradlew clean || warn "Gradle clean had warnings."; cd ..
  success "Android cleaned."
}

clean_ios() {
  log "Cleaning iOS build..."
  rm -rf ios/build ios/Pods ~/Library/Developer/Xcode/DerivedData
  success "iOS cleaned."
}

# ============================================================
#  COCOAPODS
# ============================================================
run_pod_install() {
  log "Installing CocoaPods dependencies..."
  cd ios && pod install --repo-update || error "pod install failed."; cd ..
  success "Pods installed."
}

# ============================================================
#  SYNC GOOGLE SERVICES FILES
#  1. Copies config files from google-services/ → android/app/ and ios/
#  2. Patches android/build.gradle        — ensures google-services classpath
#  3. Patches android/app/build.gradle    — ensures google-services plugin (last line)
# ============================================================
sync_google_services() {
  local SRC_DIR="google-services"

  # ── 1. Copy config files ────────────────────────────────────

  if [ ! -d "$SRC_DIR" ]; then
    warn "google-services/ folder not found at project root — skipping file sync."
  else
    # Android JSON
    local ANDROID_JSON_SRC="$SRC_DIR/google-services.json"
    local ANDROID_JSON_DST="android/app/google-services.json"
    if [ -f "$ANDROID_JSON_SRC" ]; then
      cp "$ANDROID_JSON_SRC" "$ANDROID_JSON_DST"
      success "Copied google-services.json → android/app/"
    else
      warn "google-services/google-services.json not found — Android Firebase may not work."
    fi

    # iOS plist
    local IOS_PLIST_SRC="$SRC_DIR/GoogleService-Info.plist"
    local IOS_PLIST_DST="ios/GoogleService-Info.plist"
    if [ -f "$IOS_PLIST_SRC" ]; then
      cp "$IOS_PLIST_SRC" "$IOS_PLIST_DST"
      success "Copied GoogleService-Info.plist → ios/"
    else
      warn "google-services/GoogleService-Info.plist not found — iOS Firebase may not work."
    fi
  fi

  # ── 2. Patch android/build.gradle (project-level) ───────────
  #       Ensures the google-services classpath is present inside buildscript > dependencies
  local ROOT_GRADLE="android/build.gradle"
  if [ -f "$ROOT_GRADLE" ]; then
    local GS_CLASSPATH='classpath("com.google.gms:google-services:4.4.1")'
    if grep -q "com.google.gms:google-services" "$ROOT_GRADLE"; then
      success "android/build.gradle — google-services classpath already present."
    else
      # Insert after the last classpath(...) line inside buildscript
      # Works by finding the closing brace of the dependencies block
      # Strategy: append the line right before the closing `}` of `dependencies {`
      # We use awk to insert after the last classpath line in the dependencies block
      awk '
        /classpath\(/ { last_classpath_line = NR }
        { lines[NR] = $0 }
        END {
          for (i = 1; i <= NR; i++) {
            print lines[i]
            if (i == last_classpath_line) {
              print "        classpath(\"com.google.gms:google-services:4.4.1\") // ← Firebase: auto-init"
            }
          }
        }
      ' "$ROOT_GRADLE" > "${ROOT_GRADLE}.tmp" && mv "${ROOT_GRADLE}.tmp" "$ROOT_GRADLE"
      success "android/build.gradle — added google-services classpath ✓"
    fi
  else
    warn "android/build.gradle not found — skipping project-level patch."
  fi

  # ── 3. Patch android/app/build.gradle (app-level) ───────────
  #       Ensures `apply plugin: "com.google.gms.google-services"` is the last line
  local APP_GRADLE="android/app/build.gradle"
  if [ -f "$APP_GRADLE" ]; then
    local GS_PLUGIN='apply plugin: "com.google.gms.google-services"'
    if grep -q "com.google.gms.google-services" "$APP_GRADLE"; then
      # Already present — make sure it is the LAST non-blank line (move it if needed)
      local last_line
      last_line=$(grep -v '^\s*$' "$APP_GRADLE" | tail -1)
      if echo "$last_line" | grep -q "com.google.gms.google-services"; then
        success "android/app/build.gradle — google-services plugin already at bottom."
      else
        # Remove existing occurrence then re-append at end
        grep -v "com.google.gms.google-services" "$APP_GRADLE" > "${APP_GRADLE}.tmp"
        echo "" >> "${APP_GRADLE}.tmp"
        echo "// ✅ Must be last — processes google-services.json for Firebase auto-init" >> "${APP_GRADLE}.tmp"
        echo "$GS_PLUGIN" >> "${APP_GRADLE}.tmp"
        mv "${APP_GRADLE}.tmp" "$APP_GRADLE"
        success "android/app/build.gradle — moved google-services plugin to bottom ✓"
      fi
    else
      # Not present at all — append to end
      echo "" >> "$APP_GRADLE"
      echo "// ✅ Must be last — processes google-services.json for Firebase auto-init" >> "$APP_GRADLE"
      echo "$GS_PLUGIN" >> "$APP_GRADLE"
      success "android/app/build.gradle — added google-services plugin at bottom ✓"
    fi
  else
    warn "android/app/build.gradle not found — skipping app-level patch."
  fi
}

# ============================================================
#  RUN ANDROID
# ============================================================
run_android() {
  log "Building Android (${BUILD_MODE})..."

  # --reset-cache is a Metro flag, not a run-android flag.
  # Start Metro manually with the flag, then let run-android connect to it.
  if [ "$RESET_CACHE" == true ]; then
    log "Starting Metro with --reset-cache..."
    npx react-native start --reset-cache &
    METRO_PID=$!
    trap "kill $METRO_PID 2>/dev/null" EXIT
    sleep 4  # give Metro time to boot before Gradle connects
  fi

  ARGS=""
  [ "$BUILD_MODE" == "release" ] && ARGS="$ARGS --mode=release"
  [ "$USE_DEVICE"  == true     ] && ARGS="$ARGS --device"

  npx react-native run-android $ARGS || error "Android build failed."
  success "Android app launched."
}

# ============================================================
#  RUN iOS
# ============================================================
run_ios() {
  log "Building iOS (${BUILD_MODE})..."
  ARGS=""
  [ "$BUILD_MODE" == "release" ] && ARGS="$ARGS --mode=Release"
  [ "$RESET_CACHE" == true     ] && ARGS="$ARGS --reset-cache"

  if [ "$USE_DEVICE" == true ]; then
    npx react-native run-ios $ARGS || error "iOS build on device failed."
  else
    SIMULATOR="iPhone 15"
    if xcrun simctl list devices 2>/dev/null | grep -q "$SIMULATOR"; then
      npx react-native run-ios --simulator="$SIMULATOR" $ARGS || error "iOS build failed."
    else
      warn "Simulator '$SIMULATOR' not found — using default."
      npx react-native run-ios $ARGS || error "iOS build failed."
    fi
  fi
  success "iOS app launched."
}

# ============================================================
#  MAIN
# ============================================================
check_deps
install_js_deps

# ── Always sync Firebase config files before building ──────
divider
echo ""
log "Syncing Google Services files & patching Gradle..."
sync_google_services
echo ""
divider
echo ""

case "$PLATFORM" in
  android)
    $CLEAN && clean_android
    run_android
    ;;
  ios)
    $CLEAN && clean_ios
    ($INSTALL_PODS || [ ! -d "ios/Pods" ]) && run_pod_install
    run_ios
    ;;
  both)
    $CLEAN && { clean_android; clean_ios; }
    ($INSTALL_PODS || [ ! -d "ios/Pods" ]) && run_pod_install

    log "Starting Metro bundler in background..."
    METRO_ARGS=""
    [ "$RESET_CACHE" == true ] && METRO_ARGS="--reset-cache"
    npx react-native start $METRO_ARGS &
    METRO_PID=$!
    trap "kill $METRO_PID 2>/dev/null" EXIT
    sleep 3

    log "Metro running (PID ${METRO_PID}) — launching both platforms..."
    run_android &
    run_ios
    ;;
esac

echo ""
divider
success "Done! 🚀  ${PROJECT_NAME} is running."
echo ""