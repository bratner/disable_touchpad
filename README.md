# Touchpad Toggle

GNOME Shell extension for Ubuntu 26.04 / GNOME Shell 50.1. Adds a top-panel
indicator that toggles the touchpad via
`org.gnome.desktop.peripherals.touchpad` `send-events`, with a configurable
keyboard shortcut.

Works on both X11 and Wayland.

## Features

- Panel icon next to the system menu (`PanelMenu.Button`)
- Click toggles touchpad `enabled` ↔ `disabled`
- Icon reflects current state (`input-touchpad-symbolic` /
  `touchpad-disabled-symbolic`) and stays in sync when the setting changes
  elsewhere
- Optional keyboard shortcut (unset by default), configured in preferences

## Install

UUID: `touchpad-toggle@bratner`

### Option A — copy files

```bash
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/touchpad-toggle@bratner"

mkdir -p "$EXT_DIR"
cp -r metadata.json extension.js prefs.js schemas icons "$EXT_DIR"/

glib-compile-schemas "$EXT_DIR/schemas"
```

### Option B — pack and install

```bash
gnome-extensions pack --force --extra-source=icons
gnome-extensions install --force touchpad-toggle@bratner.shell-extension.zip
```

(`gnome-extensions pack` compiles the gschema into the bundle.)

### Reload the Shell, then enable

- **Wayland:** log out and log back in (required to load a newly installed
  extension).
- **X11:** press Alt+F2, type `r`, and press Enter.

After the Shell has rescanned extensions:

```bash
gnome-extensions enable touchpad-toggle@bratner
```

Open **Extensions** → **Touchpad Toggle** → settings to assign a shortcut, or:

```bash
gnome-extensions prefs touchpad-toggle@bratner
```
## Uninstall

```bash
gnome-extensions disable touchpad-toggle@bratner
rm -rf "$HOME/.local/share/gnome-shell/extensions/touchpad-toggle@bratner"
```

## Development layout

```
metadata.json
extension.js
prefs.js
schemas/org.gnome.shell.extensions.touchpad-toggle.gschema.xml
icons/touchpad-enabled-symbolic.svg
icons/touchpad-disabled-symbolic.svg
README.md
```

Uses the modern ESM `Extension` / `ExtensionPreferences` API
(GNOME Shell 45+), which is current for GNOME 50.
