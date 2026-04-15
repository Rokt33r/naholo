#!/usr/bin/env bash
set -euo pipefail

# Naholo CLI installer
# Usage: curl -fsSL https://naholo.app/install.sh | bash

BASE_URL="https://naholo.app"
INSTALL_DIR="$HOME/.naholo/bin"
CLI_JS="naholo-cli.js"
CHECKSUMS="checksums.txt"

info() { printf '\033[1;34m%s\033[0m\n' "$1"; }
error() { printf '\033[1;31mError: %s\033[0m\n' "$1" >&2; exit 1; }
success() { printf '\033[1;32m%s\033[0m\n' "$1"; }

# Check Node.js availability
if ! command -v node &>/dev/null; then
  error "Node.js is required but not found. Install Node.js >= 20 and try again."
fi

# Check Node.js version
NODE_VERSION=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_VERSION" -lt 20 ]; then
  error "Node.js >= 20 is required (found v$(node -e "process.stdout.write(process.versions.node)"))"
fi

info "Installing Naholo CLI..."

# Create temp directory
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Download CLI JS and checksums
info "Downloading CLI..."
curl -fsSL "$BASE_URL/cli/$CLI_JS" -o "$TMPDIR/$CLI_JS"
curl -fsSL "$BASE_URL/cli/$CHECKSUMS" -o "$TMPDIR/$CHECKSUMS"

# Verify SHA-256 checksum
info "Verifying checksum..."
EXPECTED=$(awk '{print $1}' "$TMPDIR/$CHECKSUMS")
if command -v sha256sum &>/dev/null; then
  ACTUAL=$(sha256sum "$TMPDIR/$CLI_JS" | awk '{print $1}')
elif command -v shasum &>/dev/null; then
  ACTUAL=$(shasum -a 256 "$TMPDIR/$CLI_JS" | awk '{print $1}')
else
  error "Neither sha256sum nor shasum found. Cannot verify checksum."
fi

if [ "$EXPECTED" != "$ACTUAL" ]; then
  error "Checksum verification failed. Expected: $EXPECTED, Got: $ACTUAL"
fi

# Install to ~/.naholo/bin/
mkdir -p "$INSTALL_DIR"
cp "$TMPDIR/$CLI_JS" "$INSTALL_DIR/$CLI_JS"

# Create wrapper script with shebang
cat > "$INSTALL_DIR/naholo" <<'WRAPPER'
#!/usr/bin/env node
import("./naholo-cli.js");
WRAPPER
chmod +x "$INSTALL_DIR/naholo"

# Also create a shell wrapper for compatibility
cat > "$INSTALL_DIR/naholo" <<SHELL_WRAPPER
#!/usr/bin/env bash
exec node "$INSTALL_DIR/$CLI_JS" "\$@"
SHELL_WRAPPER
chmod +x "$INSTALL_DIR/naholo"

# Add to PATH in shell profiles if not already present
add_to_path() {
  local profile="$1"
  if [ -f "$profile" ]; then
    if ! grep -q "$INSTALL_DIR" "$profile" 2>/dev/null; then
      printf '\n# Naholo CLI\nexport PATH="%s:$PATH"\n' "$INSTALL_DIR" >> "$profile"
      info "Added $INSTALL_DIR to PATH in $profile"
    fi
  fi
}

if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  add_to_path "$HOME/.bashrc"
  add_to_path "$HOME/.zshrc"
  export PATH="$INSTALL_DIR:$PATH"
fi

success "Naholo CLI installed successfully!"
echo ""
echo "  Run 'naholo login' to get started."
echo ""
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo "  Restart your shell or run:"
  echo "    export PATH=\"$INSTALL_DIR:\$PATH\""
  echo ""
fi
