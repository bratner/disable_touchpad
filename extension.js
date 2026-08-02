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
const DEBUG_LOGGING_KEY = 'debug-logging';

const ICON_ENABLED = 'input-touchpad-symbolic';
const ICON_DISABLED = 'touchpad-disabled-symbolic';

const DEBUG_LOG_PATH = '/tmp/touchpad-toggle.debug.log';

const TouchpadIndicator = GObject.registerClass(
class TouchpadIndicator extends PanelMenu.Button {
    _init(extension) {
        // dontCreateMenu=true: PanelMenu.Button otherwise toggles an empty
        // popup from vfunc_event and never exposes a reliable click signal.
        super._init(0.0, _('Touchpad Toggle'), true);

        this._extension = extension;

        this._icon = new St.Icon({
            icon_name: ICON_ENABLED,
            style_class: 'system-status-icon',
        });
        this.add_child(this._icon);
    }

    vfunc_event(event) {
        let type;
        try {
            type = event.type();
        } catch (e) {
            this._extension.debugLog(`vfunc_event: type() failed: ${e}`);
            return Clutter.EVENT_PROPAGATE;
        }

        // Log press/touch only — enter/leave/motion would flood the file.
        if (type === Clutter.EventType.BUTTON_PRESS ||
            type === Clutter.EventType.BUTTON_RELEASE ||
            type === Clutter.EventType.TOUCH_BEGIN ||
            type === Clutter.EventType.TOUCH_END) {
            let button = -1;
            try {
                button = event.get_button();
            } catch (_e) {
                /* touch events have no button */
            }
            this._extension.debugLog(
                `vfunc_event type=${type} button=${button}` +
                ` BUTTON_PRESS=${Clutter.EventType.BUTTON_PRESS}` +
                ` TOUCH_BEGIN=${Clutter.EventType.TOUCH_BEGIN}`);
        }

        if (type === Clutter.EventType.BUTTON_PRESS ||
            type === Clutter.EventType.TOUCH_BEGIN) {
            this._extension.debugLog(
                'vfunc_event: handling press/touch → toggleTouchpad()');
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
        this.debugLog('enable() starting');
        this.debugLog(
            `enable() send-events=${this._touchpadSettings.get_string(SEND_EVENTS_KEY)}`);

        this._indicator = new TouchpadIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
        this.debugLog('enable() indicator added to status area');

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

        if (!this.isTouchpadEnabled())
            this._notifyTouchpadDisabled();
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

    debugLog(message) {
        if (!this._settings?.get_boolean(DEBUG_LOGGING_KEY))
            return;

        const line = `${new Date().toISOString()} ${message}\n`;
        console.log(`[touchpad-toggle] ${message}`);
        try {
            const file = Gio.File.new_for_path(DEBUG_LOG_PATH);
            const stream = file.query_exists(null)
                ? file.append_to(Gio.FileCreateFlags.NONE, null)
                : file.create(Gio.FileCreateFlags.NONE, null);
            stream.write_all(line, null);
            stream.close(null);
        } catch (e) {
            console.error(`[touchpad-toggle] debug file write failed: ${e}`);
        }
    }

    isTouchpadEnabled() {
        return this._touchpadSettings.get_string(SEND_EVENTS_KEY) === 'enabled';
    }

    toggleTouchpad() {
        const current = this._touchpadSettings.get_string(SEND_EVENTS_KEY);
        const next = current === 'enabled' ? 'disabled' : 'enabled';
        this.debugLog(`toggleTouchpad ${current} -> ${next}`);
        this._touchpadSettings.set_string(SEND_EVENTS_KEY, next);
        this.debugLog(
            `toggleTouchpad after set: ${this._touchpadSettings.get_string(SEND_EVENTS_KEY)}`);
    }

    _notifyTouchpadDisabled() {
        Main.notify(
            _('Touchpad Toggle'),
            _('Touchpad is disabled. Click on this ICON to enable.'));
        this.debugLog('showed touchpad-disabled notification');
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
