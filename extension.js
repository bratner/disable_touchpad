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
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

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
        // dontCreateMenu=true avoids the default left-click menu toggle;
        // we attach our own menu and open it only on right-click.
        super._init(0.0, _('Touchpad Toggle'), true);

        this._extension = extension;

        this.setMenu(new PopupMenu.PopupMenu(this, 0.0, St.Side.TOP));
        // setMenu() re-enables PanelMenu's ClickGesture; keep left-click free.
        this._clickGesture.set_enabled(false);

        this.menu.addAction(_('Preferences'), () => {
            this._extension.debugLog('menu: Preferences');
            this._extension.openPreferences();
        });

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

        if (type !== Clutter.EventType.BUTTON_PRESS)
            return Clutter.EVENT_PROPAGATE;

        const button = event.get_button();
        this._extension.debugLog(
            `vfunc_event BUTTON_PRESS button=${button}` +
            ` PRIMARY=${Clutter.BUTTON_PRIMARY}` +
            ` SECONDARY=${Clutter.BUTTON_SECONDARY}`);

        if (button === Clutter.BUTTON_PRIMARY) {
            this.menu.close();
            this._extension.debugLog('vfunc_event: left-click → toggleTouchpad()');
            this._extension.toggleTouchpad();
            return Clutter.EVENT_STOP;
        }

        if (button === Clutter.BUTTON_SECONDARY) {
            this._extension.debugLog('vfunc_event: right-click → menu.toggle()');
            this.menu.toggle();
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
        this._notification = null;
        this._notificationSource = null;

        this.debugLog('enable() starting');
        this.debugLog(
            `enable() send-events=${this._touchpadSettings.get_string(SEND_EVENTS_KEY)}`);

        this._indicator = new TouchpadIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
        this.debugLog('enable() indicator added to status area');

        this._touchpadChangedId = this._touchpadSettings.connect(
            `changed::${SEND_EVENTS_KEY}`,
            () => this._onTouchpadChanged());
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
        this._dismissNotification();

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

        this._destroyNotificationSource();
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

    enableTouchpad() {
        if (this.isTouchpadEnabled())
            return;
        this.debugLog('enableTouchpad()');
        this._touchpadSettings.set_string(SEND_EVENTS_KEY, 'enabled');
    }

    _onTouchpadChanged() {
        this._syncIcon();
        if (this.isTouchpadEnabled())
            this._dismissNotification();
        else if (!this._notification)
            this._notifyTouchpadDisabled();
    }

    _getNotificationSource() {
        if (this._notificationSource)
            return this._notificationSource;

        this._notificationSource = new MessageTray.Source({
            title: _('Touchpad Toggle'),
            iconName: ICON_DISABLED,
        });
        this._notificationSource.connect('destroy', () => {
            this._notificationSource = null;
            this._notification = null;
        });
        Main.messageTray.add(this._notificationSource);
        return this._notificationSource;
    }

    _notifyTouchpadDisabled() {
        this._dismissNotification();

        const source = this._getNotificationSource();
        const notification = new MessageTray.Notification({
            source,
            title: _('Touchpad Toggle'),
            body: _('Touchpad is disabled. Click here or in the top bar to enable it back.'),
            gicon: new Gio.ThemedIcon({name: ICON_DISABLED}),
            urgency: MessageTray.Urgency.NORMAL,
            isTransient: false,
        });

        notification.connect('activated', () => {
            this.debugLog('notification activated → enableTouchpad()');
            this.enableTouchpad();
        });
        notification.addAction(_('Enable'), () => {
            this.debugLog('notification Enable action → enableTouchpad()');
            this.enableTouchpad();
        });
        notification.connect('destroy', () => {
            if (this._notification === notification)
                this._notification = null;
        });

        this._notification = notification;
        source.addNotification(notification);
        this.debugLog('showed persistent touchpad-disabled notification');
    }

    _dismissNotification() {
        if (!this._notification)
            return;
        this.debugLog('dismissing notification');
        this._notification.destroy(
            MessageTray.NotificationDestroyedReason.SOURCE_CLOSED);
        this._notification = null;
    }

    _destroyNotificationSource() {
        this._dismissNotification();
        if (this._notificationSource) {
            this._notificationSource.destroy(
                MessageTray.NotificationDestroyedReason.SOURCE_CLOSED);
            this._notificationSource = null;
        }
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
