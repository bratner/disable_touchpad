// SPDX-License-Identifier: GPL-2.0-or-later
// Copyright (C) 2026 Boris Ratner

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const TOUCHPAD_SCHEMA = 'org.gnome.desktop.peripherals.touchpad';
const SEND_EVENTS_KEY = 'send-events';
const SHORTCUT_KEY = 'toggle-shortcut';

const ICON_ENABLED = 'input-touchpad-symbolic';
const ICON_DISABLED = 'touchpad-disabled-symbolic';

const TouchpadIndicator = GObject.registerClass(
class TouchpadIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, _('Touchpad Toggle'), false);

        this._extension = extension;

        this._icon = new St.Icon({
            icon_name: ICON_ENABLED,
            style_class: 'system-status-icon',
        });
        this.add_child(this._icon);

        this.connect('button-press-event', this._onButtonPress.bind(this));
    }

    _onButtonPress(_actor, event) {
        if (event.get_button() === Clutter.BUTTON_PRIMARY) {
            this._extension.toggleTouchpad();
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    setEnabled(enabled) {
        this._icon.icon_name = enabled ? ICON_ENABLED : ICON_DISABLED;
        this.set_accessible_name(
            enabled ? _('Touchpad enabled') : _('Touchpad disabled'));
    }
});

export default class TouchpadToggleExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._touchpadSettings = new Gio.Settings({schema_id: TOUCHPAD_SCHEMA});

        this._indicator = new TouchpadIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        this._touchpadChangedId = this._touchpadSettings.connect(
            `changed::${SEND_EVENTS_KEY}`,
            () => this._syncIcon());
        this._syncIcon();

        this._addKeybinding();
        this._shortcutChangedId = this._settings.connect(
            `changed::${SHORTCUT_KEY}`,
            () => {
                this._removeKeybinding();
                this._addKeybinding();
            });
    }

    disable() {
        this._removeKeybinding();

        if (this._shortcutChangedId) {
            this._settings.disconnect(this._shortcutChangedId);
            this._shortcutChangedId = 0;
        }

        if (this._touchpadChangedId) {
            this._touchpadSettings.disconnect(this._touchpadChangedId);
            this._touchpadChangedId = 0;
        }

        this._indicator?.destroy();
        this._indicator = null;

        this._touchpadSettings = null;
        this._settings = null;
    }

    isTouchpadEnabled() {
        return this._touchpadSettings.get_string(SEND_EVENTS_KEY) === 'enabled';
    }

    toggleTouchpad() {
        const next = this.isTouchpadEnabled() ? 'disabled' : 'enabled';
        this._touchpadSettings.set_string(SEND_EVENTS_KEY, next);
    }

    _syncIcon() {
        this._indicator?.setEnabled(this.isTouchpadEnabled());
    }

    _addKeybinding() {
        Main.wm.addKeybinding(
            SHORTCUT_KEY,
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => this.toggleTouchpad());
    }

    _removeKeybinding() {
        Main.wm.removeKeybinding(SHORTCUT_KEY);
    }
}
