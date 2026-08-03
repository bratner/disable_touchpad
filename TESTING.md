# Testing Touchpad Toggle

Manual test plan for `touchpad-toggle@bratner` on **GNOME Shell 50**
(Ubuntu 26.04). There is no automated unit suite; Shell extensions must be
verified in a live session.

**Target:** GNOME Shell 50.1 · X11 and Wayland  
**UUID:** `touchpad-toggle@bratner`  
**Setting under test:** `org.gnome.desktop.peripherals.touchpad` `send-events`  
**Extension schema:** `org.gnome.shell.extensions.touchpad-toggle`  
(`toggle-shortcut`, `debug-logging`)

---

## 1. Prerequisites

- Laptop (or VM) with a working touchpad
- External mouse or laptop with track point (Like ThinkPad, useful for testing while the touchpad is off)
- GNOME Shell 50.x:

  ```bash
  gnome-shell --version   # expect 50.x
  echo "$XDG_SESSION_TYPE"  # wayland or x11
  ```

- Extension installed and schemas compiled (see [README.md](README.md))

### Inspect helpers

```bash
# Touchpad send-events (enabled | disabled | disabled-on-external-mouse)
gsettings get org.gnome.desktop.peripherals.touchpad send-events

# Extension settings (use --schemadir if the schema is not on the search path)
EXT_SCHEMA_DIR="$HOME/.local/share/gnome-shell/extensions/touchpad-toggle@bratner/schemas"
gsettings --schemadir "$EXT_SCHEMA_DIR" get org.gnome.shell.extensions.touchpad-toggle toggle-shortcut
gsettings --schemadir "$EXT_SCHEMA_DIR" get org.gnome.shell.extensions.touchpad-toggle debug-logging

# Extension state
gnome-extensions info touchpad-toggle@bratner
gnome-extensions list --enabled | grep touchpad-toggle

# Shell / extension errors
journalctl -f _COMM=gnome-shell
# Looking Glass (Alt+F2 → lg): Extensions → touchpad-toggle@bratner → errors

# Debug log file (only written when Debug Logging is on)
tail -f /tmp/touchpad-toggle.debug.log
```

Restore a known-good touchpad state after testing:

```bash
gsettings set org.gnome.desktop.peripherals.touchpad send-events 'enabled'
```

### Reloading after code changes

| Session | Reload |
|---------|--------|
| **Wayland** | Log out and log in. Disable/enable often **does not** reload ESM modules. |
| **X11** | Alt+F2 → `r` → Enter |

---

## 2. Install and load

| # | Steps | Expected |
|---|--------|----------|
| 2.1 | Install via copy or `gnome-extensions pack` / `install` | Files under `~/.local/share/gnome-shell/extensions/touchpad-toggle@bratner/`, including compiled `schemas/gschemas.compiled` |
| 2.2 | Reload Shell (§1 reload table) | Shell rescans extensions |
| 2.3 | `gnome-extensions enable touchpad-toggle@bratner` | `gnome-extensions info` shows **Enabled: Yes** / **State: ACTIVE**; no errors in Looking Glass / journal |
| 2.4 | Check top panel (right / status area) | Touchpad indicator icon is present near the system menu |

**Fail if:** extension missing after reload, enable fails, or journal shows import/`GSettings` schema errors.

---

## 3. Panel indicator — left-click toggle

Start with the touchpad enabled:

```bash
gsettings set org.gnome.desktop.peripherals.touchpad send-events 'enabled'
```

| # | Steps | Expected |
|---|--------|----------|
| 3.1 | Observe panel icon with touchpad enabled | Icon is the normal touchpad glyph (`input-touchpad-symbolic`) |
| 3.2 | **Left-click** the indicator once | `send-events` becomes `'disabled'`; touchpad stops; icon becomes `touchpad-disabled-symbolic`; **no** menu opens |
| 3.3 | Left-click again | `send-events` becomes `'enabled'`; touchpad works; enabled icon returns |
| 3.4 | Middle-click (or other non-primary buttons) | No toggle; no Preferences menu |
| 3.5 | Repeat left-click toggles | State and icon stay consistent; no Shell freeze |

**Verify with:**

```bash
gsettings get org.gnome.desktop.peripherals.touchpad send-events
```

---

## 4. Panel indicator — right-click Preferences menu

| # | Steps | Expected |
|---|--------|----------|
| 4.1 | **Right-click** the indicator | A small popup menu opens with **Preferences** |
| 4.2 | Choose **Preferences** | Extension preferences window opens (same as `gnome-extensions prefs`) |
| 4.3 | Right-click again while menu is open | Menu closes (toggle) or re-opens cleanly |
| 4.4 | Left-click while menu is open | Menu closes and touchpad toggles |

---

## 5. Startup sync

| # | Steps | Expected |
|---|--------|----------|
| 5.1 | Set `send-events` to `'disabled'`, then disable and re-enable the extension (X11: Shell reload; Wayland: prefer re-login with extension enabled) | On load, panel shows the **disabled** icon immediately |
| 5.2 | Set `send-events` to `'enabled'`, reload/re-enable as above | On load, panel shows the **enabled** icon; **no** disabled notification |

```bash
gsettings set org.gnome.desktop.peripherals.touchpad send-events 'disabled'
gnome-extensions disable touchpad-toggle@bratner
gnome-extensions enable touchpad-toggle@bratner
# Confirm icon + notification (§6), then:
gsettings set org.gnome.desktop.peripherals.touchpad send-events 'enabled'
```

---

## 6. Disabled-touchpad notification

Uses a persistent `MessageTray` notification (`isTransient: false`), not a
banner-only `Main.notify()`.

| # | Steps | Expected |
|---|--------|----------|
| 6.1 | Enable extension while `send-events` is `'disabled'` | Notification appears: title **Touchpad Toggle**, body about enabling via click / top bar; **Enable** action button present |
| 6.2 | Open the notification list (calendar / message list) | Notification **remains listed** after the banner times out |
| 6.3 | Click the notification body (activate) | Touchpad becomes `'enabled'`; icon updates; notification is dismissed |
| 6.4 | Disable touchpad again (left-click panel); click notification **Enable** | Same as 6.3 |
| 6.5 | Disable touchpad; then `gsettings set … send-events 'enabled'` | Notification dismisses without clicking it |
| 6.6 | With touchpad enabled, disable via gsettings | A new disabled notification appears (same source/behavior as 6.1) |

---

## 7. External gsettings sync

With the extension enabled:

| # | Steps | Expected |
|---|--------|----------|
| 7.1 | `gsettings set org.gnome.desktop.peripherals.touchpad send-events 'disabled'` | Panel icon updates to disabled **without** clicking the indicator |
| 7.2 | `gsettings set … send-events 'enabled'` | Icon updates to enabled |
| 7.3 | Change the same setting via **Settings → Mouse & Touchpad** | Icon (and notification presence) track the change |

**Fail if:** icon only updates after clicking the panel button (listener missing).

---

## 8. Preferences — shortcut and debug logging

Default shortcut is unset (`@as []`). Debug logging defaults to **off**.

| # | Steps | Expected |
|---|--------|----------|
| 8.1 | Open prefs (`gnome-extensions prefs …` or right-click → Preferences) | Window has **Keyboard** (shortcut), **Diagnostics** (Debug Logging), and **About** |
| 8.2 | Shortcut: Esc in capture dialog | Dialog closes; shortcut unchanged |
| 8.3 | Shortcut: Backspace | Shortcut cleared / **Disabled** |
| 8.4 | Assign a free combo (e.g. `<Super>T`) | Label updates; `toggle-shortcut` is a non-empty strv |
| 8.5 | Press the shortcut on the desktop | Same as left-click toggle |
| 8.6 | Open Overview (Super) and press the shortcut | Toggle still works |
| 8.7 | Change / clear shortcut | Binding updates without Shell restart; left-click still works when cleared |
| 8.8 | **Debug Logging** off; remove `/tmp/touchpad-toggle.debug.log` if present; left-click toggle | File is **not** created / not appended |
| 8.9 | Turn **Debug Logging** on; left-click or right-click | `/tmp/touchpad-toggle.debug.log` gains lines; `journalctl -f _COMM=gnome-shell` may show `[touchpad-toggle] …` |
| 8.10 | Turn **Debug Logging** off again | Further clicks produce no new log lines |

**Avoid** combos already used by the Shell (Settings → Keyboard → View and Customize Shortcuts).

---

## 9. Enable / disable lifecycle

| # | Steps | Expected |
|---|--------|----------|
| 9.1 | `gnome-extensions disable touchpad-toggle@bratner` | Indicator disappears; shortcut stops; notification/source cleaned up |
| 9.2 | `gnome-extensions enable touchpad-toggle@bratner` | Indicator returns; icon matches `send-events`; if disabled, notification shown again; shortcut works if set |
| 9.3 | Toggle via panel, shortcut, and notification, then disable | No leftover indicators; journal clean of extension errors |

---

## 10. Edge cases

| # | Steps | Expected |
|---|--------|----------|
| 10.1 | Set `send-events` to `'disabled-on-external-mouse'` | Icon shows as **disabled**; disabled notification appears if none already shown |
| 10.2 | Left-click the indicator from that state | Setting becomes `'enabled'`; icon enabled; notification dismissed |
| 10.3 | With touchpad disabled via the extension, use an external mouse | Pointer still works; panel menu and prefs remain usable |
| 10.4 | Pack install (`gnome-extensions pack` with `--extra-source=icons` and `--extra-source=COPYING`, then `install --force`) | Same behavior as copy install after Shell reload |

---

## 11. Session coverage

Run the core path (**§3**, **§4**, **§6**, **§7**, **§8.4–8.5**) on both:

| Session | Notes |
|---------|--------|
| Wayland | New installs and most `extension.js` edits need logout/login |
| X11 | Alt+F2 → `r` reloads after file updates |

Record Shell version and session type with results.

---

## 12. Sign-off checklist

Copy and fill in:

```
Date:
Tester:
Host:                  (e.g. Ubuntu 26.04)
gnome-shell --version:
XDG_SESSION_TYPE:      wayland | x11

[ ] 2  Install / enable / panel icon present
[ ] 3  Left-click toggles send-events + icon; no menu; middle-click ignored
[ ] 4  Right-click menu → Preferences opens prefs
[ ] 5  Startup icon matches existing send-events
[ ] 6  Persistent disabled notification; click / Enable / auto-dismiss
[ ] 7  Icon syncs when gsettings / Settings app changes
[ ] 8  Shortcut + Debug Logging on/off
[ ] 9  Disable removes indicator; enable restores
[ ] 10 disabled-on-external-mouse + external mouse OK
[ ] 11 Retested on second session type (if available)

Notes / failures:
```

---

## Out of scope

- Automated GJS unit tests (no Shell/panel in CI without a nested session)
- extensions.gnome.org review tooling beyond local `gnome-extensions` checks
- Non-GNOME desktops
