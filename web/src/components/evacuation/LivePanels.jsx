import { useState } from 'react';
import { toast } from 'sonner';
import { Bell, Ban, CheckCircle2, Megaphone, ShieldAlert, Siren, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import CommandCenterService from '../../services/commandCenter.service';
import { DispatchDialog, DispatchRecommended, SosChat, TeamChips } from './TeamPanels';

const SOS_STATUS = {
    triggered: { label: 'New', className: 'bg-destructive text-white' },
    acknowledged: { label: 'Seen', className: 'bg-amber-500 text-white' },
    responding: { label: 'Team dispatched', className: 'bg-blue-600 text-white' },
    resolved: { label: 'Resolved', className: 'bg-success text-white' },
};

const ago = (t) => {
    if (!t) return '';
    const s = Math.max(0, Math.round((Date.now() - new Date(t).getTime()) / 1000));
    return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`;
};

function errorText(e) {
    return e?.response?.data?.message || e?.message || 'Something went wrong';
}

/** One SOS with its actions: dispatch (recommended or chosen), team status, team channel. */
function SosItem({ sos, selected, onSelect, onChanged }) {
    const [busy, setBusy] = useState(false);
    const st = SOS_STATUS[sos.status] || { label: sos.status, className: '' };
    const open = ['triggered', 'acknowledged', 'responding'].includes(sos.status);

    const act = async (fn, done) => {
        setBusy(true);
        try { await fn(); toast.success(done); onChanged(); } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
    };

    return (
        <li className={`rounded-lg border p-3 ${selected ? 'border-primary ring-1 ring-primary' : ''} ${sos.backupRequested && open ? 'border-destructive bg-destructive/5' : ''}`}>
            <button type="button" className="w-full text-left" onClick={() => onSelect(sos)}>
                <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-medium"><Siren className="size-4 text-destructive" aria-hidden />{sos.type}</span>
                    <Badge className={st.className}>{st.label}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">#{sos.id} · {sos.person} · {ago(sos.triggeredAt)}{sos.battery != null ? ` · battery ${sos.battery}%` : ''}</p>
                {sos.message && <p className="mt-0.5">“{sos.message}”</p>}
                {sos.backupRequested && open && <p className="mt-0.5 font-semibold text-destructive">⚠ Team asked for backup</p>}
                <TeamChips teams={sos.teams} />
            </button>
            {open && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {sos.status === 'triggered' && (
                        <Button size="sm" variant="outline" disabled={busy}
                            onClick={() => act(() => CommandCenterService.acknowledge(sos.id), 'SOS acknowledged')}>
                            <UserCheck /> Acknowledge
                        </Button>
                    )}
                    {!sos.teams?.length && <DispatchRecommended sos={sos} onChanged={onChanged} disabled={busy} />}
                    <DispatchDialog sos={sos} onChanged={onChanged} />
                    <Button size="sm" variant="ghost" disabled={busy}
                        onClick={() => act(() => CommandCenterService.resolve(sos.id, ''), 'SOS resolved')}>
                        <CheckCircle2 /> Resolve
                    </Button>
                </div>
            )}
            {selected && sos.teams?.length > 0 && <SosChat sosId={sos.id} />}
        </li>
    );
}

export function SosQueue({ sos, selectedId, onSelect, onChanged }) {
    if (sos.length === 0) {
        return <p className="py-6 text-center text-muted-foreground">No SOS calls. People who need help appear here.</p>;
    }
    return (
        <ul className="space-y-2">
            {sos.map((s) => (
                <SosItem key={s.id} sos={s} selected={s.id === selectedId} onSelect={onSelect} onChanged={onChanged} />
            ))}
        </ul>
    );
}

export function ShelterList({ shelters }) {
    if (shelters.length === 0) return <p className="py-6 text-center text-muted-foreground">No shelters.</p>;
    const sorted = [...shelters].sort((a, b) => (b.occupancy || 0) / (b.capacity || 1) - (a.occupancy || 0) / (a.capacity || 1));
    return (
        <ul className="space-y-2.5">
            {sorted.map((s) => {
                const pct = s.capacity ? Math.min(100, Math.round(((s.occupancy || 0) / s.capacity) * 100)) : 0;
                const tone = s.inDangerZone ? 'bg-muted-foreground' : pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-amber-500' : 'bg-success';
                return (
                    <li key={s.id}>
                        <div className="flex justify-between gap-2">
                            <span className="truncate font-medium">{s.name}</span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">{s.occupancy || 0}{s.capacity ? ` / ${s.capacity}` : ''}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
                            aria-label={`${s.name} occupancy`}>
                            <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
                        </div>
                        {s.inDangerZone && <p className="mt-0.5 text-xs text-muted-foreground">Inside a danger zone — not used</p>}
                    </li>
                );
            })}
        </ul>
    );
}

const TIMELINE_ICON = { alert: Bell, sos: Siren, sos_assigned: ShieldAlert, sos_resolved: CheckCircle2, blocked: Ban };

export function Timeline({ items }) {
    if (items.length === 0) return <p className="py-6 text-center text-muted-foreground">Nothing has happened in the last 24 hours.</p>;
    return (
        <ol className="space-y-3">
            {items.map((t, i) => {
                const Icon = TIMELINE_ICON[t.kind] || Bell;
                return (
                    <li key={i} className="flex gap-2.5">
                        <Icon className={`mt-0.5 size-4 shrink-0 ${t.kind === 'sos' || t.kind === 'blocked' ? 'text-destructive' : 'text-muted-foreground'}`} aria-hidden />
                        <div className="min-w-0">
                            <p className="font-medium">{t.text}</p>
                            <p className="text-xs text-muted-foreground">{ago(t.ts)}{t.detail ? ` · ${t.detail}` : ''}</p>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

/** Raise an Evacuation Order for one dam's downstream zones. */
export function BroadcastDialog({ dams }) {
    const [open, setOpen] = useState(false);
    const [damId, setDamId] = useState('');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('Leave zones L1–L3 now and go to the nearest shelter. Do not cross flooded roads.');
    const [busy, setBusy] = useState(false);
    const dam = dams.find((d) => String(d.id) === damId);

    const send = async () => {
        setBusy(true);
        try {
            await CommandCenterService.broadcast(Number(damId), title || `Evacuation Order: ${dam?.name}`, message);
            toast.success('Evacuation Order raised. SMS is sent only if the SMS switch is on.');
            setOpen(false);
        } catch (e) {
            toast.error(errorText(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="destructive"><Megaphone /> Broadcast</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Evacuation Order</DialogTitle>
                    <DialogDescription>
                        Tells everyone in the dam's danger zones (L1–L3) to leave now. Shown on the dashboard and public page;
                        sent by SMS only while the SMS switch on the Alerts page is on.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label>Dam</Label>
                        <Select value={damId} onValueChange={setDamId}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Choose a dam" /></SelectTrigger>
                            <SelectContent>{dams.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="bc-title">Title</Label>
                        <Input id="bc-title" value={title} placeholder={dam ? `Evacuation Order: ${dam.name}` : 'Evacuation Order'} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="bc-msg">Message</Label>
                        <Textarea id="bc-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="destructive" disabled={!damId || !message.trim() || busy} onClick={send}>Raise Evacuation Order</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
