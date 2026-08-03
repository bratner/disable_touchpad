# Touchpad Toggle - An AI dream.

GNOME Shell extension for Ubuntu 26.04 / GNOME Shell 50.1. 

Adds a top-panel indicator that toggles the touchpad with a configurable keyboard shortcut.

Works on both X11 and Wayland.

Developed by Cursor who was seeded by Claude (chat), orchestrated by me.
Works for me on Ubuntu 26.04, Lenovo Thinkpad T470s.  

**All feedback is welcome** 

**Open for work**

[https://www.linkedin.com/in/bratner](https://www.linkedin.com/in/bratner)

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
cp -r metadata.json extension.js prefs.js schemas icons COPYING "$EXT_DIR"/

glib-compile-schemas "$EXT_DIR/schemas"
```



### Option B — pack and install

```bash
gnome-extensions pack --force \
  --extra-source=icons \
  --extra-source=COPYING
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
COPYING
schemas/org.gnome.shell.extensions.touchpad-toggle.gschema.xml
icons/touchpad-enabled-symbolic.svg
icons/touchpad-disabled-symbolic.svg
icons/README.md
README.md
TESTING.md
```

Uses the modern ESM `Extension` / `ExtensionPreferences` API
(GNOME Shell 45+), which is current for GNOME 50.

## Testing

See [TESTING.md](TESTING.md) for the manual test plan (panel toggle,
gsettings sync, preferences shortcut, lifecycle, and Wayland/X11 notes).

## Prompt
See [prompt_backup.md](prompt_backup.md) for what Cursor decided is the summary that is good enough to re-create the feature. 

## License

This extension is free software: you can redistribute it and/or modify it
under the terms of the GNU General Public License as published by the Free
Software Foundation; either version 2 of the License, or (at your option)
any later version. See `[COPYING](COPYING)`.

That matches [GNOME Shell](https://gitlab.gnome.org/GNOME/gnome-shell)
(`GPL-2.0-or-later`) and the
[extensions.gnome.org](https://gjs.guide/extensions/review-guidelines/review-guidelines.html#licensing)
requirement that extensions use a GPL-compatible license (commonly
`GPL-2.0-or-later` or `GPL-3.0-or-later`; Dash to Dock / Ubuntu Dock ship
GPL-2 the same way).

### Icons

The SVGs under `icons/` are from the **Adwaita** icon theme (GNOME Project),
licensed under **CC-BY-SA-3.0 or LGPL-3**. Attribution: “GNOME Project”
([https://www.gnome.org](https://www.gnome.org)). Details in `[icons/README.md](icons/README.md)`.