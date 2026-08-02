# Testing Touchpad Toggle

Manual test plan for `touchpad-toggle@bratner` on **GNOME Shell 50**
(Ubuntu 26.04). There is no automated unit suite; Shell extensions must be
verified in a live session.

**Target:** GNOME Shell 50.1 · X11 and Wayland  
**UUID:** `touchpad-toggle@bratner`  
**Setting under test:** `org.gnome.desktop.peripherals.touchpad` `send-events`

---

## 1. Prerequisites

- Laptop (or VM) with a working touchpad
- External mouse optional (useful for testing while the touchpad is off)
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

# Extension shortcut (empty by default)
gsettings --schemadir \
  "$HOME/.local/share/gnome-shell/extensions/touchpad-toggle@bratner/schemas" \
  get org.gnome.shell.extensions.touchpad-toggle toggle-shortcut

# Or after the schema is installed in the user session:
gsettings get org.gnome.shell.extensions.touchpad-toggle toggle-shortcut

# Extension state
gnome-extensions info touchpad-toggle@bratner
gnome-extensions list --enabled | grep touchpad-toggle

# Shell / extension errors
journalctl --user -f _COMM=gnome-shell
# Looking Glass (Alt+F2 → lg): Extensions → touchpad-toggle@bratner → errors
```

Restore a known-good touchpad state after testing:

```bash
gsettings set org.gnome.desktop.peripherals.touchpad send-events 'enabled'
```

---

## 2. Install and load

| # | Steps | Expected |
|---|--------|----------|
| 2.1 | Install via copy or `gnome-extensions pack` / `install` | Files under `~/.local/share/gnome-shell/extensions/touchpad-toggle@bratner/`, including compiled `schemas/gschemas.compiled` |
| 2.2 | **Wayland:** log out and log in. **X11:** Alt+F2 → `r` → Enter | Shell reloads / new session starts |
| 2.3 | `gnome-extensions enable touchpad-toggle@bratner` | `gnome-extensions info` shows **State: ENABLED**; no errors in Looking Glass / journal |
| 2.4 | Check top panel (right / status area) | Touchpad indicator icon is present near the system menu |

**Fail if:** extension missing after reload, enable fails, or journal shows import/`GSettings` schema errors.

---

## 3. Panel indicator — appearance and click

Start with the touchpad enabled:

```bash
gsettings set org.gnome.desktop.peripherals.touchpad send-events 'enabled'
```

| # | Steps | Expected |
|---|--------|----------|
| 3.1 | Observe panel icon with touchpad enabled | Icon is the normal touchpad glyph (`input-touchpad-symbolic`), not the disabled/slashed variant |
| 3.2 | Left-click the indicator once | `send-events` becomes `'disabled'`; touchpad stops moving the pointer; icon switches to disabled (`touchpad-disabled-symbolic`) |
| 3.3 | Left-click again | `send-events` becomes `'enabled'`; touchpad works; icon returns to enabled |
| 3.4 | Repeat 3.2–3.3 a few times | State and icon stay consistent; no empty popup menu on left-click; no Shell freeze |

**Verify with:**

```bash
gsettings get org.gnome.desktop.peripherals.touchpad send-events
```

---

## 4. Startup sync

| # | Steps | Expected |
|---|--------|----------|
| 4.1 | Set `send-events` to `'disabled'`, then disable and re-enable the extension (or reload Shell on X11 / re-login on Wayland with extension enabled) | On load, panel shows the **disabled** icon immediately — no flash of the wrong icon |
| 4.2 | Set `send-events` to `'enabled'`, reload/re-enable as above | On load, panel shows the **enabled** icon |

```bash
gsettings set org.gnome.desktop.peripherals.touchpad send-events 'disabled'
gnome-extensions disable touchpad-toggle@bratner
gnome-extensions enable touchpad-toggle@bratner
# Confirm icon, then:
gsettings set org.gnome.desktop.peripherals.touchpad send-events 'enabled'
```

---

## 5. External gsettings sync

With the extension enabled:

| # | Steps | Expected |
|---|--------|----------|
| 5.1 | From a terminal: `gsettings set org.gnome.desktop.peripherals.touchpad send-events 'disabled'` | Panel icon updates to disabled **without** clicking the indicator |
| 5.2 | `gsettings set … send-events 'enabled'` | Icon updates to enabled |
| 5.3 | Change the same setting via **Settings → Mouse & Touchpad** (or equivalent) | Icon tracks the UI change |

**Fail if:** icon only updates after clicking the panel button (listener missing).

---

## 6. Preferences and keyboard shortcut

Default shortcut is unset (`@as []`).

| # | Steps | Expected |
|---|--------|----------|
| 6.1 | Open prefs: `gnome-extensions prefs touchpad-toggle@bratner` | Adwaita preferences window opens with a **Toggle touchpad** shortcut row; label shows **Disabled** / empty |
| 6.2 | Click the shortcut button; press Esc | Capture dialog closes; shortcut remains unset |
| 6.3 | Click again; press Backspace | Shortcut cleared (still unset / Disabled) |
| 6.4 | Assign a free combo (e.g. `<Super>T` or `<Ctrl><Alt>T`) | Label shows the accelerator; `gsettings get … toggle-shortcut` is a non-empty strv |
| 6.5 | Press the shortcut on the desktop | Same effect as clicking the indicator (`enabled` ↔ `disabled` + icon update) |
| 6.6 | Open Overview (Super) and press the shortcut | Toggle still works (`Shell.ActionMode.OVERVIEW`) |
| 6.7 | Change the shortcut in prefs to another combo | Old combo no longer toggles; new combo does (no Shell restart needed) |
| 6.8 | Clear the shortcut (Backspace in capture dialog) | Shortcut no longer toggles; panel click still works |

**Avoid** combos already used by the Shell (check Settings → Keyboard → View and Customize Shortcuts).

---

## 7. Enable / disable lifecycle

| # | Steps | Expected |
|---|--------|----------|
| 7.1 | `gnome-extensions disable touchpad-toggle@bratner` | Indicator disappears; registered shortcut stops working |
| 7.2 | `gnome-extensions enable touchpad-toggle@bratner` | Indicator returns; icon matches current `send-events`; shortcut works again if set |
| 7.3 | Toggle several times via panel and shortcut, then disable | No leftover indicators; journal clean of extension errors |

---

## 8. Edge cases

| # | Steps | Expected |
|---|--------|----------|
| 8.1 | Set `send-events` to `'disabled-on-external-mouse'` | Icon shows as **disabled** (anything other than `'enabled'` is treated as off for the glyph) |
| 8.2 | Click the indicator once from that state | Setting becomes `'enabled'`; icon enabled |
| 8.3 | With touchpad disabled via the extension, use an external mouse | Pointer still works; panel and prefs remain usable |
| 8.4 | Pack install (`gnome-extensions pack` with `--extra-source=icons` and `--extra-source=COPYING`, then `install --force`) | Same behavior as copy install after Shell reload |

---

## 9. Session coverage

Run the core path (**§3**, **§5**, **§6.4–6.5**) on both:

| Session | Notes |
|---------|--------|
| Wayland | New installs need logout/login before `enable` sees the extension |
| X11 | Alt+F2 → `r` is enough to reload after file updates |

Record Shell version and session type with results.

---

## 10. Sign-off checklist

Copy and fill in:

```
Date:
Tester:
Host:                  (e.g. Ubuntu 26.04)
gnome-shell --version:
XDG_SESSION_TYPE:      wayland | x11

[ ] 2 Install / enable / panel icon present
[ ] 3 Panel click toggles send-events + icon
[ ] 4 Startup icon matches existing send-events
[ ] 5 Icon syncs when gsettings / Settings app changes
[ ] 6 Prefs shortcut set / clear / toggle / Overview
[ ] 7 Disable removes indicator; enable restores
[ ] 8 disabled-on-external-mouse + external mouse OK
[ ] 9 Retested on second session type (if available)

Notes / failures:
```

---

## Out of scope

- Automated GJS unit tests (no Shell/panel in CI without a nested session)
- extensions.gnome.org review tooling beyond local `gnome-extensions` checks
- Non-GNOME desktops
