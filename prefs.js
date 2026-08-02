import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from
    'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const SHORTCUT_KEY = 'toggle-shortcut';

const ShortcutButton = GObject.registerClass({
    Properties: {
        'accelerator': GObject.ParamSpec.string(
            'accelerator',
            'Accelerator',
            'Current accelerator string',
            GObject.ParamFlags.READWRITE,
            ''),
    },
}, class ShortcutButton extends Gtk.Button {
    _init(settings) {
        super._init({
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            has_frame: false,
        });

        this._settings = settings;
        this._editor = null;

        this._label = new Gtk.ShortcutLabel({
            disabled_text: _('Disabled'),
            valign: Gtk.Align.CENTER,
        });
        this.set_child(this._label);

        this._syncFromSettings();
        this._changedId = this._settings.connect(
            `changed::${SHORTCUT_KEY}`,
            () => this._syncFromSettings());

        this.connect('clicked', () => this._openEditor());
        this.connect('destroy', () => {
            if (this._changedId) {
                this._settings.disconnect(this._changedId);
                this._changedId = 0;
            }
        });
    }

    _syncFromSettings() {
        const [accel = ''] = this._settings.get_strv(SHORTCUT_KEY);
        this.accelerator = accel;
        this._label.set_accelerator(accel);
    }

    _setAccelerator(accel) {
        this._settings.set_strv(SHORTCUT_KEY, accel ? [accel] : []);
    }

    _openEditor() {
        const controller = new Gtk.EventControllerKey();

        const content = new Adw.StatusPage({
            title: _('Set Shortcut'),
            description: _('Press a key combination, Esc to cancel, or Backspace to clear'),
            icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic',
        });

        this._editor = new Adw.Window({
            modal: true,
            hide_on_close: true,
            transient_for: this.get_root(),
            width_request: 480,
            height_request: 320,
            content,
        });

        this._editor.add_controller(controller);
        controller.connect('key-pressed', this._onKeyPressed.bind(this));
        this._editor.present();
    }

    _onKeyPressed(_controller, keyval, keycode, state) {
        let mask = state & Gtk.accelerator_get_default_mod_mask();
        mask &= ~Gdk.ModifierType.LOCK_MASK;

        if (!mask && keyval === Gdk.KEY_Escape) {
            this._editor?.close();
            return Gdk.EVENT_STOP;
        }

        if (keyval === Gdk.KEY_BackSpace) {
            this._setAccelerator('');
            this._editor?.close();
            return Gdk.EVENT_STOP;
        }

        if (!this._isValidBinding(mask, keycode, keyval) ||
            !this._isValidAccel(mask, keyval))
            return Gdk.EVENT_STOP;

        const name = Gtk.accelerator_name_with_keycode(
            null, keyval, keycode, mask);
        this._setAccelerator(name);
        this._editor?.close();
        return Gdk.EVENT_STOP;
    }

    _keyvalIsForbidden(keyval) {
        return [
            Gdk.KEY_Home,
            Gdk.KEY_Left,
            Gdk.KEY_Up,
            Gdk.KEY_Right,
            Gdk.KEY_Down,
            Gdk.KEY_Page_Up,
            Gdk.KEY_Page_Down,
            Gdk.KEY_End,
            Gdk.KEY_Tab,
            Gdk.KEY_KP_Enter,
            Gdk.KEY_Return,
            Gdk.KEY_Mode_switch,
        ].includes(keyval);
    }

    _isValidBinding(mask, keycode, keyval) {
        if (mask === 0)
            return false;

        if (mask === Gdk.ModifierType.SHIFT_MASK && keycode !== 0) {
            const isPlain =
                (keyval >= Gdk.KEY_a && keyval <= Gdk.KEY_z) ||
                (keyval >= Gdk.KEY_A && keyval <= Gdk.KEY_Z) ||
                (keyval >= Gdk.KEY_0 && keyval <= Gdk.KEY_9) ||
                keyval === Gdk.KEY_space ||
                this._keyvalIsForbidden(keyval);
            if (isPlain)
                return false;
        }

        return !this._keyvalIsForbidden(keyval);
    }

    _isValidAccel(mask, keyval) {
        return Gtk.accelerator_valid(keyval, mask) ||
            (keyval === Gdk.KEY_Tab && mask !== 0);
    }
});

export default class TouchpadTogglePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings;

        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'input-touchpad-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('Keyboard'),
            description: _('Shortcut to toggle the touchpad on or off'),
        });
        page.add(group);

        const row = new Adw.ActionRow({
            title: _('Toggle touchpad'),
            subtitle: _('Click the button, then press a key combination'),
        });
        group.add(row);

        const button = new ShortcutButton(settings);
        row.add_suffix(button);
        row.activatable_widget = button;

        const hintGroup = new Adw.PreferencesGroup({
            title: _('About'),
            description: _(
                'Uses org.gnome.desktop.peripherals.touchpad send-events. ' +
                'Works on both X11 and Wayland.'),
        });
        page.add(hintGroup);
    }
}
