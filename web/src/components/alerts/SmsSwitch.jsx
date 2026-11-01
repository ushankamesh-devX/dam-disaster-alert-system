import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { composeAlertSms, getSmsRecipients, getSmsSettings, sendCustomSms, setSmsSendingAllowed, sendAlertSms } from '../../services/sms.service';

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

const SMS_PART = 160;

/** "Send SMS" button: write a custom message and send it now to chosen registered users. */
export function CustomSmsButton({ enabled, alerts = [] }) {
    const [open, setOpen] = useState(false);
    const [recipients, setRecipients] = useState([]);
    const [chosen, setChosen] = useState([]);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        getSmsRecipients()
            .then((list) => { setRecipients(list); setChosen((c) => (c.length ? c : list.slice(0, 1).map((r) => r.id))); })
            .catch(() => toast.error('Could not load users'));
    }, [open]);

    const [alertId, setAlertId] = useState('');
    const [filling, setFilling] = useState(false);
    const usable = alerts.filter((a) => a.status === 'active' || a.status === 'escalated')
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const fillFrom = async (id) => {
        setAlertId(id);
        if (!id) return;
        setFilling(true);
        try {
            setMessage((await composeAlertSms(id)).slice(0, 480));
        } catch (e) {
            toast.error(e.response?.data?.message || 'Could not build the message');
        } finally {
            setFilling(false);
        }
    };

    // Open with the newest alert's message, built from the dam's live values
    useEffect(() => {
        if (open && !message && usable[0]) fillFrom(String(usable[0].id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const toggle = (id) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
    const unicode = /[^\x00-\x7F]/.test(message);   // Sinhala/Tamil or symbols: 70 characters per SMS
    const parts = Math.max(1, Math.ceil(message.length / (unicode ? 70 : SMS_PART)));

    const send = async () => {
        setBusy(true);
        try {
            const r = await sendCustomSms(chosen, message);
            if (r.sent.length) toast.success(`SMS sent to ${r.sent.join(', ')}`);
            if (r.failed.length) toast.error(`Failed: ${r.failed.join(', ')}`);
            if (r.sent.length && !r.failed.length) setOpen(false);
        } catch (e) {
            toast.error(e.response?.data?.message || 'Could not send SMS');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}
                title={enabled ? 'Write and send an SMS now' : 'Turn the SMS switch on to send'}>
                ✉ Send SMS
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Send SMS</DialogTitle>
                        <DialogDescription>Sent right away with real SMS credits.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1.5">
                        <Label>To</Label>
                        {recipients.length === 0
                            ? <p className="text-xs text-muted-foreground">No registered user has a phone number.</p>
                            : <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                                {recipients.map((r) => (
                                    <label key={r.id} className="flex cursor-pointer items-center gap-2 text-sm">
                                        <input type="checkbox" checked={chosen.includes(r.id)} onChange={() => toggle(r.id)} />
                                        <span>{r.name}</span>
                                        <span className="ml-auto text-xs text-muted-foreground">{r.phone}</span>
                                    </label>
                                ))}
                            </div>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="sms-alert">Alert</Label>
                        <div className="flex gap-2">
                            <select id="sms-alert" value={alertId} onChange={(e) => fillFrom(e.target.value)}
                                className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm">
                                <option value="">Custom message</option>
                                {usable.map((a) => (
                                    <option key={a.id} value={a.id}>#{a.id} {a.title}{a.simulationMode ? ' (drill)' : ''}</option>
                                ))}
                            </select>
                            <Button type="button" size="sm" variant="outline" disabled={!alertId || filling}
                                title="Rebuild with the latest water level and time" onClick={() => fillFrom(alertId)}>
                                {filling ? '…' : 'Refresh values'}
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="sms-text">Message</Label>
                        <Textarea id="sms-text" rows={7} maxLength={480} value={message} onChange={(e) => setMessage(e.target.value)}
                            placeholder="[DDAS] EVACUATION ORDER | Victoria Dam | 21:14 …" />
                        <p className="text-right text-xs text-muted-foreground">
                            {message.length} / 480 · {parts} SMS per person{unicode ? ' · special characters use more SMS' : ''}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={send} disabled={busy || !enabled || !chosen.length || !message.trim()}>
                            {busy ? 'Sending…' : `Send to ${chosen.length}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
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
