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
#  STEP 3.5 — Pick specific Simulator / Emulator
# ============================================================
SELECTED_IOS_SIM=""
SELECTED_ANDROID_EMU=""

if [ "$USE_DEVICE" = false ]; then
  divider
  echo ""

  # ── iOS Simulator picker ──────────────────────────────────
  if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "both" ]]; then
    if [[ "$(uname)" == "Darwin" ]] && command -v xcrun >/dev/null 2>&1; then
      echo -e "${BOLD}${BLUE}  🍎  Select iOS Simulator${NC}"
      echo -e "  ${DIM}Fetching available simulators...${NC}"
      echo ""

      # Build list: filter available simulators — bash 3.2 compatible (no mapfile)
      IOS_SIMS=()
      while IFS= read -r line; do
        [ -n "$line" ] && IOS_SIMS+=("$line")
      done < <(
        xcrun simctl list devices available 2>/dev/null \
          | grep -E "^\s+.+\(.{36}\) \((Booted|Shutdown)\)" \
          | sed 's/^[[:space:]]*//' \
          | sed 's/ (.*//' \
          | sort -u
      )

      if [ ${#IOS_SIMS[@]} -eq 0 ]; then
        warn "No available iOS simulators found — will use default."
      else
        for i in "${!IOS_SIMS[@]}"; do
          echo -e "  ${BOLD}$((i+1)))${NC}  ${IOS_SIMS[$i]}"
        done
        echo ""
        while true; do
          read -rp "$(echo -e "  ${CYAN}Enter number [1-${#IOS_SIMS[@]}] or press Enter for default:${NC} ")" sim_choice
          if [ -z "$sim_choice" ]; then
            warn "No simulator selected — using default."
            break
          elif [[ "$sim_choice" =~ ^[0-9]+$ ]] && \
               [ "$sim_choice" -ge 1 ] && \
               [ "$sim_choice" -le "${#IOS_SIMS[@]}" ]; then
            SELECTED_IOS_SIM="${IOS_SIMS[$((sim_choice-1))]}"
            success "iOS Simulator : ${BOLD}${SELECTED_IOS_SIM}${NC}"
            break
          fi
          echo -e "  ${RED}Invalid — enter a number between 1 and ${#IOS_SIMS[@]}.${NC}"
        done
        echo ""
      fi
    else
      warn "xcrun not available — iOS simulator picker skipped."
    fi
  fi

  # ── Android Emulator picker ───────────────────────────────
  if [[ "$PLATFORM" == "android" || "$PLATFORM" == "both" ]]; then
    if command -v emulator >/dev/null 2>&1 || \
       [ -n "$ANDROID_HOME" ] && [ -f "$ANDROID_HOME/emulator/emulator" ]; then

      EMU_BIN="${ANDROID_HOME}/emulator/emulator"
      command -v emulator >/dev/null 2>&1 && EMU_BIN="emulator"

      echo -e "${BOLD}${BLUE}  🤖  Select Android Emulator${NC}"
      echo -e "  ${DIM}Fetching available AVDs...${NC}"
      echo ""

      # Fetch AVD list — bash 3.2 compatible (no mapfile)
      ANDROID_EMUS=()
      while IFS= read -r line; do
        [ -n "$line" ] && ANDROID_EMUS+=("$line")
      done < <("$EMU_BIN" -list-avds 2>/dev/null)

      if [ ${#ANDROID_EMUS[@]} -eq 0 ]; then
        warn "No Android AVDs found — will use default emulator."
      else
        for i in "${!ANDROID_EMUS[@]}"; do
          # Mark already-running emulators
          if command -v adb >/dev/null 2>&1; then
            RUNNING=$(adb devices 2>/dev/null | grep -c "emulator")
          else
            RUNNING=0
          fi
          echo -e "  ${BOLD}$((i+1)))${NC}  ${ANDROID_EMUS[$i]}"
        done
        echo ""
        while true; do
          read -rp "$(echo -e "  ${CYAN}Enter number [1-${#ANDROID_EMUS[@]}] or press Enter for default:${NC} ")" emu_choice
          if [ -z "$emu_choice" ]; then
            warn "No emulator selected — using default."
            break
          elif [[ "$emu_choice" =~ ^[0-9]+$ ]] && \
               [ "$emu_choice" -ge 1 ] && \
               [ "$emu_choice" -le "${#ANDROID_EMUS[@]}" ]; then
            SELECTED_ANDROID_EMU="${ANDROID_EMUS[$((emu_choice-1))]}"
            success "Android Emulator : ${BOLD}${SELECTED_ANDROID_EMU}${NC}"
            break
          fi
          echo -e "  ${RED}Invalid — enter a number between 1 and ${#ANDROID_EMUS[@]}.${NC}"
        done
        echo ""
      fi
    else
      warn "Android emulator binary not found — skipping AVD picker. Make sure ANDROID_HOME is set."
    fi
  fi
fi

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
[ -n "$SELECTED_IOS_SIM"    ] && echo -e "    iOS Sim     : ${BOLD}${SELECTED_IOS_SIM}${NC}"
[ -n "$SELECTED_ANDROID_EMU" ] && echo -e "    Android AVD : ${BOLD}${SELECTED_ANDROID_EMU}${NC}"
echo -e "    Clean       : ${BOLD}${CLEAN}${NC}"
echo -e "    Pods        : ${BOLD}${INSTALL_PODS}${NC}"
echo -e "    Reset cache : ${BOLD}${RESET_CACHE}${NC}"
echo -e "    Firebase    : ${BOLD}$([ -d "google-services" ] && echo "✓ will sync files + patch Gradle" || echo "⚠ google-services/ not found")${NC}"
echo -e "    Podfile     : ${BOLD}$([ -f \"ios/Podfile\" ] && echo \"✓ will patch for Xcode 26+ compatibility\" || echo \"⚠ ios/Podfile not found\")${NC}"
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
#  PATCH PODFILE
#  Injects post_install fixes into ios/Podfile:
#    1. ALLOW_NON_MODULAR_INCLUDES — fixes non-modular include errors (Xcode 26+)
#    2. CLANG_ENABLE_EXPLICIT_MODULES = NO — global explicit-modules guard
#    3. IPHONEOS_DEPLOYMENT_TARGET   — ensures minimum iOS 13 across all pods
#    4. CLANG_ENABLE_MODULES = NO    — fixes "Could not build Objective-C module
#       'RNFBFirestore'" on RNFB targets
#    5. DEFINES_MODULE = NO          — prevents bad module-map generation
#    6. -fno-modules in OTHER_CFLAGS — fixes "Expected ')'" / "Use of undeclared
#       identifier 'self'" / "id is not a function" in RNFBStorageModule
#  Safe to run multiple times (idempotent — checks before injecting)
# ============================================================
patch_podfile() {
  local PODFILE="ios/Podfile"

  if [ ! -f "$PODFILE" ]; then
    warn "ios/Podfile not found — skipping Podfile patch."
    return
  fi

  # ── Sentinel check ─────────────────────────────────────────
  # RNFB_NO_MODULES_TARGETS is the key marker of the refined patch.
  # The older patch used `target.name.start_with?('RNFB')` which incorrectly
  # disabled modules on RNFBFirestore, breaking the Firestore build.
  # If the old broad sentinel is present but not the refined one, re-patch.
  if grep -q "RNFB_NO_MODULES_TARGETS" "$PODFILE"; then
    success "Podfile — Firebase/Xcode 26+ fix (refined) already present."
    return
  fi

  log "Patching Podfile — injecting Firebase + Xcode 26+ compatibility fix..."
  log "  • Project-level: ALLOW_NON_MODULAR_INCLUDES, CLANG_ENABLE_EXPLICIT_MODULES=NO"
  log "  • All targets:   non-modular-include warnings suppressed"
  log "  • RNFB_NO_MODULES_TARGETS=[RNFBStorage,RNFBAuth,RNFBApp] — modules disabled"
  log "  • RNFBFirestore intentionally excluded (disabling modules breaks it)"

  # Strategy: if a post_install block already exists, replace its body.
  # Otherwise, append a complete new post_install block.
  if grep -q "post_install" "$PODFILE"; then

    python3 - "$PODFILE" << 'PYEOF'
import sys, re

path = sys.argv[1]
with open(path, 'r') as f:
    content = f.read()

# The refined inject block — mirrors the actual Podfile post_install exactly.
# Key difference from older patch:
#   OLD: target.name.start_with?('RNFB')  — hits RNFBFirestore, breaks it
#   NEW: RNFB_NO_MODULES_TARGETS allowlist — RNFBFirestore deliberately excluded
inject = """
    # ✅ AUTO-PATCHED by build.sh — Firebase + New Architecture + Xcode 26+
    # Fixes:
    #   FIX 1 — Non-modular includes: suppressed globally so FirebaseFirestore
    #            and FirebaseFirestoreInternal can compile under Xcode 26.
    #   FIX 2 — RNFBStorage / RNFBAuth / RNFBApp implicit-int errors: silenced
    #            with -w on the specific targets that need it.
    #   FIX 3 — DO NOT apply -fno-modules / CLANG_ENABLE_MODULES=NO to
    #            RNFBFirestore* — doing so hides RNFBFirestoreCommon and
    #            RNFBFirestoreQuery from scope and breaks the Firestore build.

    # Targets that need the aggressive "no-modules" + silence treatment.
    # Firestore targets are intentionally excluded.
    RNFB_NO_MODULES_TARGETS = %w[RNFBStorage RNFBAuth RNFBApp].freeze

    # ── Project-level defaults ──────────────────────────────────────────────
    installer.pods_project.build_configurations.each do |config|
      config.build_settings['ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
    end

    # ── Per-target settings ─────────────────────────────────────────────────
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'

        # Suppress non-modular-include errors for ALL pods (Xcode 26)
        existing_cflags = config.build_settings['OTHER_CFLAGS'] || '$(inherited)'
        unless existing_cflags.include?('-Wno-error=non-modular-include-in-framework-module')
          config.build_settings['OTHER_CFLAGS'] = \\
            "#{existing_cflags} -Wno-error=non-modular-include-in-framework-module -Wno-non-modular-include-in-framework-module"
        end

        existing_cppflags = config.build_settings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)'
        unless existing_cppflags.include?('-Wno-error=non-modular-include-in-framework-module')
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] = \\
            "#{existing_cppflags} -Wno-error=non-modular-include-in-framework-module -Wno-non-modular-include-in-framework-module"
        end

        # ── RNFBStorage / RNFBAuth / RNFBApp only ──────────────────────────
        # NOTE: RNFBFirestore is deliberately excluded — disabling modules there
        #       hides RNFBFirestoreCommon / RNFBFirestoreQuery from scope.
        if RNFB_NO_MODULES_TARGETS.include?(target.name)
          config.build_settings['CLANG_ENABLE_MODULES'] = 'NO'
          config.build_settings['DEFINES_MODULE']       = 'NO'
          existing = config.build_settings['OTHER_CFLAGS'] || '$(inherited)'
          unless existing.include?('-fno-modules')
            config.build_settings['OTHER_CFLAGS'] = \\
              "#{existing} -fno-modules -Wno-implicit-int -Wno-return-type -Wno-error=implicit-int -Wno-error=return-type -w"
          end
        end
      end
    end
"""

# Insert after the first `post_install do |installer|` line.
# Handles both existing blocks (inject inside) and absent blocks (appended below).
pattern = r'(post_install\s+do\s+\|installer\|)'
replacement = r'\1' + inject
new_content = re.sub(pattern, replacement, content, count=1)

with open(path, 'w') as f:
    f.write(new_content)

print("Injected refined fix into existing post_install block.")
PYEOF

  else
    # No post_install block at all — append a complete one.
    cat >> "$PODFILE" << 'RUBYEOF'

# ✅ AUTO-PATCHED by build.sh — Firebase + New Architecture + Xcode 26+
post_install do |installer|
  # Targets that need the aggressive "no-modules" + silence treatment.
  # FIX: RNFBFirestore intentionally excluded — disabling modules there
  #      hides RNFBFirestoreCommon/RNFBFirestoreQuery and breaks Firestore.
  RNFB_NO_MODULES_TARGETS = %w[RNFBStorage RNFBAuth RNFBApp].freeze

  # ── Project-level defaults ────────────────────────────────────────────────
  installer.pods_project.build_configurations.each do |config|
    config.build_settings['ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
    config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
  end

  # ── Per-target settings ───────────────────────────────────────────────────
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'

      # Suppress non-modular-include errors for ALL pods (Xcode 26)
      existing_cflags = config.build_settings['OTHER_CFLAGS'] || '$(inherited)'
      unless existing_cflags.include?('-Wno-error=non-modular-include-in-framework-module')
        config.build_settings['OTHER_CFLAGS'] = \
          "#{existing_cflags} -Wno-error=non-modular-include-in-framework-module -Wno-non-modular-include-in-framework-module"
      end

      existing_cppflags = config.build_settings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)'
      unless existing_cppflags.include?('-Wno-error=non-modular-include-in-framework-module')
        config.build_settings['OTHER_CPLUSPLUSFLAGS'] = \
          "#{existing_cppflags} -Wno-error=non-modular-include-in-framework-module -Wno-non-modular-include-in-framework-module"
      end

      # ── RNFBStorage / RNFBAuth / RNFBApp only ──────────────────────────────
      if RNFB_NO_MODULES_TARGETS.include?(target.name)
        config.build_settings['CLANG_ENABLE_MODULES'] = 'NO'
        config.build_settings['DEFINES_MODULE']       = 'NO'
        existing = config.build_settings['OTHER_CFLAGS'] || '$(inherited)'
        unless existing.include?('-fno-modules')
          config.build_settings['OTHER_CFLAGS'] = \
            "#{existing} -fno-modules -Wno-implicit-int -Wno-return-type -Wno-error=implicit-int -Wno-error=return-type -w"
        end
      end
    end
  end

  react_native_post_install(
    installer,
    config[:reactNativePath],
    :mac_catalyst_enabled => false,
  )
end
RUBYEOF
  fi
  success "Podfile patched — Firebase/RNFBStorage/Xcode 26+ fix (refined) applied ✓"
}

# ============================================================
#  COCOAPODS
# ============================================================
run_pod_install() {
  log "Patching Podfile for Xcode 26+ compatibility..."
  patch_podfile
  echo ""
  log "Installing CocoaPods dependencies..."
  cd ios && pod install --repo-update || error "pod install failed."; cd ..
  success "Pods installed."
}

# ============================================================
#  PATCH XCODE PROJECT — registers GoogleService-Info.plist in
#  the main app target (project navigator + Copy Bundle Resources).
#  Without this step the file exists on disk but Xcode never
#  bundles it, and FirebaseApp.configure() crashes at runtime.
#  Uses the `xcodeproj` Ruby gem (already present via CocoaPods).
# ============================================================
patch_xcode_project_for_plist() {
  local APP_NAME="$1"                                    # e.g. moneyflow
  local XCODEPROJ="ios/${APP_NAME}.xcodeproj"
  local PLIST_REL="${APP_NAME}/GoogleService-Info.plist" # relative to ios/

  if [ ! -d "$XCODEPROJ" ]; then
    warn "Xcode project not found at ${XCODEPROJ} — skipping .pbxproj patch."
    return
  fi

  # Idempotency check — skip if already registered
  if grep -q "GoogleService-Info.plist" "${XCODEPROJ}/project.pbxproj" 2>/dev/null; then
    success "GoogleService-Info.plist already registered in Xcode project."
    return
  fi

  log "Registering GoogleService-Info.plist into ${XCODEPROJ}..."

  ruby - "$XCODEPROJ" "$APP_NAME" "$PLIST_REL" << 'RUBYEOF'
require 'xcodeproj'

proj_path  = ARGV[0]   # ios/moneyflow.xcodeproj
app_name   = ARGV[1]   # moneyflow
plist_path = ARGV[2]   # moneyflow/GoogleService-Info.plist

begin
  project = Xcodeproj::Project.open(proj_path)
rescue => e
  warn "Could not open Xcode project: #{e.message}"
  exit 1
end

# Find the main app target (exact name match, fall back to first native target)
target = project.targets.find { |t| t.name == app_name } ||
         project.targets.find { |t| t.is_a?(Xcodeproj::Project::Object::PBXNativeTarget) }

unless target
  warn "No native target found in #{proj_path} — aborting plist registration."
  exit 1
end

# Locate or create the group for the app folder inside ios/
group = project.main_group.find_subpath(app_name, false) ||
        project.main_group.find_subpath(app_name, true)

# Add file reference (idempotent)
file_ref = group.files.find { |f| f.path == 'GoogleService-Info.plist' }
unless file_ref
  file_ref = group.new_file('GoogleService-Info.plist')
end

# Add to Copy Bundle Resources build phase (idempotent)
resources_phase = target.resources_build_phase
already_added   = resources_phase.files.any? { |bf| bf.file_ref == file_ref }
unless already_added
  resources_phase.add_file_reference(file_ref)
end

project.save
puts "[OK]    GoogleService-Info.plist added to target '#{target.name}' and Copy Bundle Resources ✓"
RUBYEOF

  if [ $? -eq 0 ]; then
    success "Xcode project patched — plist now in navigator & bundle resources ✓"
  else
    warn "xcodeproj Ruby step failed. Add GoogleService-Info.plist manually in Xcode:"
    warn "  1. Drag ios/${APP_NAME}/GoogleService-Info.plist into Xcode navigator"
    warn "  2. Tick '${APP_NAME}' under 'Add to targets'"
  fi
}

# ============================================================
#  PATCH Info.plist — injects the reversed client ID from
#  GoogleService-Info.plist as a CFBundleURLSchemes entry.
#  Required for Google Sign-In on iOS: without this the OAuth
#  redirect cannot return to the app and sign-in fails with
#  "Your app is missing support for the following URL schemes".
# ============================================================
patch_info_plist_url_schemes() {
  local APP_NAME="$1"   # e.g. moneyflow
  local GOOGLE_PLIST="ios/${APP_NAME}/GoogleService-Info.plist"
  local INFO_PLIST="ios/${APP_NAME}/Info.plist"

  if [ ! -f "$GOOGLE_PLIST" ]; then
    warn "GoogleService-Info.plist not found at ${GOOGLE_PLIST} — skipping URL scheme patch."
    return
  fi

  if [ ! -f "$INFO_PLIST" ]; then
    warn "Info.plist not found at ${INFO_PLIST} — skipping URL scheme patch."
    return
  fi

  # Extract the REVERSED_CLIENT_ID from GoogleService-Info.plist
  local REVERSED_CLIENT_ID
  REVERSED_CLIENT_ID=$(plutil -extract REVERSED_CLIENT_ID raw "$GOOGLE_PLIST" 2>/dev/null)

  if [ -z "$REVERSED_CLIENT_ID" ]; then
    warn "REVERSED_CLIENT_ID not found in GoogleService-Info.plist — skipping URL scheme patch."
    return
  fi

  # Idempotency check — skip if already present
  if /usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" "$INFO_PLIST" 2>/dev/null \
      | grep -q "$REVERSED_CLIENT_ID"; then
    success "Info.plist — Google Sign-In URL scheme already present."
    return
  fi

  log "Patching Info.plist — adding Google Sign-In URL scheme (${REVERSED_CLIENT_ID})..."

  # Find the index to append a new CFBundleURLTypes entry
  local URL_TYPES_COUNT
  URL_TYPES_COUNT=$(/usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" "$INFO_PLIST" 2>/dev/null \
    | grep -c "Dict" || echo "0")

  # If CFBundleURLTypes array doesn't exist yet, create it
  if ! /usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" "$INFO_PLIST" >/dev/null 2>&1; then
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$INFO_PLIST"
    URL_TYPES_COUNT=0
  fi

  # Append a new URL type entry for Google Sign-In
  /usr/libexec/PlistBuddy \
    -c "Add :CFBundleURLTypes:${URL_TYPES_COUNT} dict" \
    -c "Add :CFBundleURLTypes:${URL_TYPES_COUNT}:CFBundleTypeRole string Editor" \
    -c "Add :CFBundleURLTypes:${URL_TYPES_COUNT}:CFBundleURLName string GOOGLE_SIGN_IN" \
    -c "Add :CFBundleURLTypes:${URL_TYPES_COUNT}:CFBundleURLSchemes array" \
    -c "Add :CFBundleURLTypes:${URL_TYPES_COUNT}:CFBundleURLSchemes:0 string ${REVERSED_CLIENT_ID}" \
    "$INFO_PLIST" \
    && success "Info.plist — Google Sign-In URL scheme added (${REVERSED_CLIENT_ID}) ✓" \
    || warn "PlistBuddy failed — add the URL scheme manually (see README)."
}

# ============================================================
#  SYNC GOOGLE SERVICES FILES
#  1. Copies config files from google-services/ → android/app/ and ios/
#  2. Registers GoogleService-Info.plist in the Xcode project (.pbxproj)
#  3. Injects REVERSED_CLIENT_ID URL scheme into Info.plist (Google Sign-In)
#  4. Patches android/build.gradle        — ensures google-services classpath
#  5. Patches android/app/build.gradle    — ensures google-services plugin (last line)
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
    # Firebase requires GoogleService-Info.plist to be inside the Xcode app-target
    # folder (ios/<AppName>/) so it gets bundled into the app at build time.
    # Placing it only at ios/ root is NOT enough — FirebaseApp.configure() will
    # crash at runtime with "could not find a valid GoogleService-Info.plist".
    local IOS_PLIST_SRC="$SRC_DIR/GoogleService-Info.plist"
    local APP_NAME
    APP_NAME=$(node -e "console.log(require('./package.json').name)" 2>/dev/null || echo "moneyflow")
    local IOS_PLIST_DST_ROOT="ios/GoogleService-Info.plist"
    local IOS_PLIST_DST_TARGET="ios/${APP_NAME}/GoogleService-Info.plist"
    if [ -f "$IOS_PLIST_SRC" ]; then
      # Copy to both locations: root (for CocoaPods scripts) and the app-target
      # subfolder (required by Firebase to find the plist at runtime).
      cp "$IOS_PLIST_SRC" "$IOS_PLIST_DST_ROOT"
      if [ -d "ios/${APP_NAME}" ]; then
        cp "$IOS_PLIST_SRC" "$IOS_PLIST_DST_TARGET"
        success "Copied GoogleService-Info.plist → ios/ and ios/${APP_NAME}/ (app bundle target)"
      else
        warn "ios/${APP_NAME}/ directory not found — plist copied to ios/ root only."
        warn "Firebase may still crash. Ensure GoogleService-Info.plist is added to your Xcode target."
      fi
    else
      warn "google-services/GoogleService-Info.plist not found — iOS Firebase may not work."
    fi

    # ── Register plist in Xcode project (.pbxproj) ──────────
    # Copying the file to disk is not enough — Xcode only bundles
    # files that are registered in the project navigator + target.
    # This is the missing step that caused FirebaseApp.configure()
    # to crash with "could not find a valid GoogleService-Info.plist".
    if [[ "$(uname)" == "Darwin" ]]; then
      patch_xcode_project_for_plist "$APP_NAME"
    fi

    # ── Inject REVERSED_CLIENT_ID URL scheme into Info.plist ──
    # Google Sign-In requires the reversed client ID to be registered
    # as a CFBundleURLSchemes entry so iOS can redirect the OAuth
    # response back to the app after authentication.
    # Without this, sign-in fails with:
    #   "Your app is missing support for the following URL schemes: ..."
    if [[ "$(uname)" == "Darwin" ]]; then
      patch_info_plist_url_schemes "$APP_NAME"
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

  # Launch specific AVD if selected and not already running
  if [ -n "$SELECTED_ANDROID_EMU" ] && [ "$USE_DEVICE" = false ]; then
    ALREADY_RUNNING=$(adb devices 2>/dev/null | grep -c "^emulator" || true)
    if [ "$ALREADY_RUNNING" -eq 0 ]; then
      log "Starting emulator: ${SELECTED_ANDROID_EMU}..."
      EMU_BIN="${ANDROID_HOME}/emulator/emulator"
      command -v emulator >/dev/null 2>&1 && EMU_BIN="emulator"
      "$EMU_BIN" -avd "$SELECTED_ANDROID_EMU" -no-snapshot-save &
      EMU_PID=$!
      trap "kill $EMU_PID 2>/dev/null; kill ${METRO_PID:-0} 2>/dev/null" EXIT
      log "Waiting for emulator to boot..."
      adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 2; done'
      success "Emulator ready."
    else
      success "Emulator already running — skipping launch."
    fi
  fi

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
  elif [ -n "$SELECTED_IOS_SIM" ]; then
    log "Launching on simulator: ${SELECTED_IOS_SIM}..."
    npx react-native run-ios --simulator="$SELECTED_IOS_SIM" $ARGS || error "iOS build failed."
  else
    # No simulator selected — try sensible defaults in order
    for SIM in "iPhone 16" "iPhone 15" "iPhone 14" "iPhone 13"; do
      if xcrun simctl list devices available 2>/dev/null | grep -q "$SIM"; then
        log "Using default simulator: ${SIM}"
        npx react-native run-ios --simulator="$SIM" $ARGS || error "iOS build failed."
        break
      fi
    done || {
      warn "No preferred simulator found — using system default."
      npx react-native run-ios $ARGS || error "iOS build failed."
    }
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