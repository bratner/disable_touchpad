# Build: Touchpad Toggle — GNOME Shell extension

Target **Ubuntu 26.04 / GNOME Shell 50.1**. Use the modern ESM API only
(`import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js'`),
`PanelMenu.Button`, and `Gio.Settings` prefs — stable since GNOME 45, current for 50.
Do **not** use deprecated `imports.misc.extensionUtils`.

## Product
GNOME Shell extension **Touchpad Toggle** (UUID e.g. `touchpad-toggle@yourname`) that
toggles the touchpad via:
`org.gnome.desktop.peripherals.touchpad` → `send-events` (`'enabled'` / `'disabled'`).
Works on X11 and Wayland.

## Required behavior

### Panel
- Status-area `PanelMenu.Button` with `St.Icon` near the system menu.
- **Left-click only** toggles touchpad. Middle/other buttons must not toggle.
- Icon reflects state: enabled → `input-touchpad-symbolic`; disabled (anything
  other than `'enabled'`, including `disabled-on-external-mouse`) →
  `touchpad-disabled-symbolic`.
- On enable: read current `send-events` and set icon immediately.
- Listen to gsettings `changed::send-events` so the icon stays in sync if
  Settings or another app changes it.
- **Important Shell 50 detail:** `PanelMenu.Button` uses `Clutter.ClickGesture`
  for menus. For click-to-toggle, construct with `dontCreateMenu=true`, attach
  your own `PopupMenu` via `setMenu()`, then **`this._clickGesture.set_enabled(false)`**,
  and handle clicks in `vfunc_event` (not only `button-press-event`).
- **Right-click** opens a menu with **Preferences** → `this.openPreferences()`.
  Left-click must not open that menu.

### Keyboard shortcut
- Configurable shortcut (default unset) stored in extension gschema (`as` / strv).
- Register with `Main.wm.addKeybinding` / `removeKeybinding`; same toggle as left-click.
- Prefs: `ExtensionPreferences` + `Adw.PreferencesWindow` / `Adw.PreferencesPage`,
  shortcut capture UI (Esc cancel, Backspace clear).

### Debug logging (optional but preferred)
- Boolean gschema key `debug-logging` (default false).
- Prefs: Adw SwitchRow “Debug Logging”.
- When on, log diagnostics to journal (`console.log`) and append
  `/tmp/touchpad-toggle.debug.log`. When off, no file writes.

### Notification
- When extension loads (or touchpad becomes non-enabled) and touchpad is not
  `'enabled'`, show a **persistent** MessageTray notification
  (`isTransient: false` — do **not** use banner-only `Main.notify`).
- Body roughly: touchpad disabled; click notification or top-bar icon to enable.
- Clicking the notification (and an **Enable** action) sets `send-events` to
  `'enabled'` and dismisses the notification.
- Dismiss when touchpad becomes enabled by any means; clean up source on
  extension `disable()`.

## Packaging
Ship a complete extension:
- `metadata.json` (`shell-version: ["50"]`, `settings-schema`, uuid, name, description)
- `extension.js`, `prefs.js`
- `schemas/*.gschema.xml` (compile with `glib-compile-schemas`)
- SVG icons (may copy Adwaita symbolic touchpad icons; attribute GNOME Project,
  CC-BY-SA-3.0 or LGPL-3)
- `COPYING` = GPL-2.0-or-later (GNOME Shell / e.g.o compatible)
- SPDX/copyright headers on JS
- `README.md`: install to `~/.local/share/gnome-shell/extensions/<uuid>/`,
  compile schemas, enable; Wayland needs logout/login for new/changed ESM;
  X11 can Alt+F2 → `r`
- `TESTING.md`: manual test plan covering left/right click, sync, shortcut,
  debug logging, persistent notification, lifecycle, Wayland vs X11

## Constraints
- Prefer system themed icon *names* at runtime for light/dark; ship SVG copies
  for packaging with attribution.
- Keep the implementation focused; no unrelated refactors.
- After JS changes on Wayland, document that logout/login is required (disable/
  enable often does not reload ESM).