import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getSmsSettings, setSmsSendingAllowed, sendAlertSms } from '../../services/sms.service';

/**
 * Small admin switch for real SMS. Off by default (and after every API restart) so the
 * limited SMS credits are only used when an admin turns it on for a demo.
 */
export function SmsSwitch({ onChange }) {
    const [settings, setSettings] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        getSmsSettings().then((s) => { setSettings(s); onChange?.(s.sendingAllowed); }).catch(() => setSettings(null));
    }, [onChange]);

    if (!settings) return null;

    const on = settings.sendingAllowed;
    const ready = settings.serverEnabled && settings.providerConfigured;
    const title = !ready
        ? 'SMS not configured on the server'
        : `${on ? 'SMS sending ON' : 'SMS sending OFF'} · ${settings.recipients} recipient${settings.recipients === 1 ? '' : 's'} with a phone number`;

    const toggle = async () => {
        setBusy(true);
        try {
            const s = await setSmsSendingAllowed(!on);
            setSettings(s);
            onChange?.(s.sendingAllowed);
            toast.success(s.sendingAllowed ? 'SMS sending turned on' : 'SMS sending turned off');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Could not change SMS setting');
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Real SMS sending"
            title={title}
            disabled={busy || !ready}
            onClick={toggle}
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 disabled:opacity-50 cursor-pointer"
        >
            <span className={`relative inline-block w-7 h-4 rounded-full transition-colors ${on ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${on ? 'left-3.5' : 'left-0.5'}`} />
            </span>
            SMS
        </button>
    );
}

/** Tiny "send this alert by SMS" button for an alert row. */
export function SendSmsButton({ alertId, enabled }) {
    const [busy, setBusy] = useState(false);

    const send = async () => {
        if (!enabled) return;
        setBusy(true);
        try {
            const r = await sendAlertSms(alertId);
            toast.success(r.queued ? `SMS queued for ${r.queued} recipient${r.queued === 1 ? '' : 's'}` : 'Already sent to everyone');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Could not send SMS');
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={send}
            disabled={!enabled || busy}
            title={enabled ? 'Send this alert by SMS now' : 'Turn SMS on first'}
            aria-label="Send this alert by SMS"
            className="text-xs text-gray-500 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
            {busy ? 'Sending…' : 'SMS'}
        </button>
    );
}
