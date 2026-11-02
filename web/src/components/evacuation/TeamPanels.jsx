import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Marker, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ListPlus, Megaphone, Send, Star, Truck, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import CommandCenterService from '../../services/commandCenter.service';
import { distanceKm } from './serviceStyles';

// Response units: dispatch (ranked), job queues, job channel, unit control centre and the unit map layer.

export const TEAM_LOOK = {
    police: { emoji: '🚓', color: '#1D4ED8', label: 'Police' },
    hospital: { emoji: '🚑', color: '#DC2626', label: 'Ambulance' },
    fire_brigade: { emoji: '🚒', color: '#EA580C', label: 'Fire & rescue' },
};
const look = (type) => TEAM_LOOK[type] || { emoji: '🚨', color: '#475569', label: 'Unit' };

export const TEAM_STATUS = {
    available: { text: 'Available', className: 'bg-[#15803D] text-white' },
    off_duty: { text: 'Off duty', className: 'bg-muted text-muted-foreground' },
    assigned: { text: 'Dispatched', className: 'bg-amber-500 text-white' },
    queued: { text: 'In queue', className: 'bg-amber-100 text-amber-900' },
    on_the_way: { text: 'On the way', className: 'bg-blue-600 text-white' },
    arrived: { text: 'On scene', className: 'bg-violet-600 text-white' },
    rescued: { text: 'Rescued', className: 'bg-[#15803D] text-white' },
    done: { text: 'Done', className: 'bg-muted text-muted-foreground' },
};
const statusOf = (s) => TEAM_STATUS[s] || { text: s, className: '' };
const FIT = ['Best for this SOS', 'Can help', 'Other unit'];

const errorText = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';
const seen = (s) => (s == null ? 'never' : s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`);
const dispatched = (r) => (r.queuePosition > 0 ? `${r.unit} · added to its queue (job ${r.queuePosition + 1})` : `${r.unit} dispatched`);

/** Unit chips on an SOS: kind, unit, status, and a button to take it back. */
export function TeamChips({ sosId, teams, onChanged }) {
    if (!teams?.length) return null;
    const takeBack = async (t) => {
        try { await CommandCenterService.unassign(sosId, t.userId); toast.success(`${t.name} taken off SOS #${sosId}`); onChanged?.(); }
        catch (e) { toast.error(errorText(e)); }
    };
    return (
        <div className="mt-1 flex flex-wrap gap-1">
            {teams.filter((t) => t.status !== 'done').map((t) => (
                <span key={t.userId} className="inline-flex items-center gap-1 rounded-md border bg-card px-1.5 py-0.5 text-xs">
                    {look(t.type).emoji} <span className="max-w-44 truncate">{t.name}</span>
                    <Badge className={`h-4 px-1 text-[10px] ${statusOf(t.status).className}`}>{statusOf(t.status).text}</Badge>
                    {onChanged && ['assigned', 'on_the_way', 'arrived'].includes(t.status) && (
                        <button type="button" title="Take the job back" aria-label={`Take the job back from ${t.name}`}
                            onClick={(e) => { e.stopPropagation(); takeBack(t); }} className="text-muted-foreground hover:text-destructive">
                            <X className="size-3" />
                        </button>
                    )}
                </span>
            ))}
        </div>
    );
}

/** "Dispatch recommended" in one tap: the best free unit of the right kind by road time (else the one free soonest). */
export function DispatchRecommended({ sos, onChanged, disabled }) {
    const [busy, setBusy] = useState(false);
    const go = async () => {
        setBusy(true);
        try {
            const best = (await CommandCenterService.recommend(sos.id)).find((t) => t.recommended);
            if (!best) { toast.error('No response units. Run seed_responders.py on the server.'); return; }
            toast.success(`${dispatched(await CommandCenterService.assignUnit(sos.id, best.userId))} · ~${best.etaMin} min`);
            onChanged();
        } catch (e) {
            toast.error(errorText(e));
        } finally {
            setBusy(false);
        }
    };
    return <Button size="sm" disabled={busy || disabled} onClick={go}><Star /> {busy ? 'Finding unit…' : 'Dispatch recommended'}</Button>;
}

/** Ranked list of units for this SOS: right kind first, free before busy, then road time. */
export function DispatchDialog({ sos, onChanged }) {
    const [open, setOpen] = useState(false);
    const [list, setList] = useState(null);
    const [busyId, setBusyId] = useState(null);

    useEffect(() => {
        if (!open) return;
        setList(null);
        CommandCenterService.recommend(sos.id).then(setList).catch((e) => { toast.error(errorText(e)); setList([]); });
    }, [open, sos.id]);

    const send = async (t) => {
        setBusyId(t.userId);
        try {
            toast.success(dispatched(await CommandCenterService.assignUnit(sos.id, t.userId)));
            onChanged();
            setList(await CommandCenterService.recommend(sos.id));
        } catch (e) {
            toast.error(errorText(e));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Truck /> Choose unit</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Dispatch a unit · {sos.type}</DialogTitle>
                    <DialogDescription>Right kind first, free before busy, then road time. A busy unit gets the job in its queue; you can send more than one.</DialogDescription>
                </DialogHeader>
                {list === null ? <p className="py-6 text-center text-muted-foreground">Finding road times…</p> : (
                    <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto text-sm">
                        {list.length === 0 && <li className="py-6 text-center text-muted-foreground">No response units. Run seed_responders.py on the server.</li>}
                        {list.map((t) => (
                            <li key={t.userId} className={`flex items-center gap-2 rounded-lg border p-2 ${t.recommended ? 'border-primary bg-primary/5' : ''}`}>
                                <span className="text-xl" aria-hidden>{look(t.type).emoji}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{t.recommended && <Star className="mr-1 inline size-3.5 fill-amber-400 text-amber-500" />}{t.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {FIT[t.fit]} · ~{t.etaMin} min{t.busy ? ' after its jobs' : t.roadEta ? ' by road' : ''} · {t.km} km
                                    </p>
                                </div>
                                {t.onThisSos ? <Badge variant="secondary">On this SOS</Badge>
                                    : t.busy ? <Badge className="bg-amber-500 text-white">Busy · {t.jobs.length} job{t.jobs.length === 1 ? '' : 's'}</Badge>
                                        : <Badge className={statusOf(t.status).className}>{statusOf(t.status).text}</Badge>}
                                <Button size="sm" variant={t.recommended ? 'default' : 'outline'} disabled={t.onThisSos || busyId != null}
                                    onClick={() => send(t)}>{busyId === t.userId ? '…' : t.busy ? 'Queue' : 'Send'}</Button>
                            </li>
                        ))}
                    </ul>
                )}
            </DialogContent>
        </Dialog>
    );
}

const QUICK = ['Proceed with caution, roads are flooded', 'Use the main road, the bridge is closed', 'Backup is on the way', 'Report your status'];

/** Chat between the control room and the units on one SOS. */
export function SosChat({ sosId }) {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const end = useRef(null);
    const load = useCallback(() => CommandCenterService.messages(sosId).then(setMessages).catch(() => {}), [sosId]);
    useEffect(() => {
        load();
        const id = setInterval(load, 5000);
        return () => clearInterval(id);
    }, [load]);
    useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [messages.length]);

    const send = async (t) => {
        if (!t.trim()) return;
        try { await CommandCenterService.sendMessage(sosId, t.trim()); setText(''); load(); } catch (e) { toast.error(errorText(e)); }
    };

    return (
        <div className="mt-2 rounded-lg border bg-muted/30 p-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Unit channel</p>
            <div className="max-h-44 space-y-1 overflow-y-auto">
                {messages.length === 0 && <p className="text-xs text-muted-foreground">No messages yet.</p>}
                {messages.map((m) => (
                    <div key={m.id} className={`rounded-md px-2 py-1 text-xs ${m.from === 'control' ? 'ml-6 bg-primary/10' : 'mr-6 bg-card'}`}>
                        <span className="font-semibold">{m.fromName}</span>{m.toPerson ? ' → person' : ''}: {m.text}
                    </div>
                ))}
                <div ref={end} />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
                {QUICK.map((q) => <button key={q} type="button" onClick={() => send(q)} className="rounded-full border bg-card px-2 py-0.5 text-[11px] hover:bg-accent">{q}</button>)}
            </div>
            <form className="mt-1.5 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); send(text); }}>
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message to the units…" className="h-8" />
                <Button size="sm" type="submit" disabled={!text.trim()}><Send /></Button>
            </form>
        </div>
    );
}

/** Give a unit a job: open SOS calls, nearest first. */
function AssignJobDialog({ unit, sos, onChanged }) {
    const [open, setOpen] = useState(false);
    const openSos = sos.filter((s) => ['triggered', 'acknowledged', 'responding'].includes(s.status))
        .filter((s) => !(s.teams || []).some((t) => t.userId === unit.userId && ['assigned', 'on_the_way', 'arrived'].includes(t.status)))
        .map((s) => ({ ...s, km: distanceKm({ lat: unit.lat, lng: unit.lng }, { lat: Number(s.lat), lng: Number(s.lng) }) }))
        .sort((a, b) => a.km - b.km);
    const give = async (s) => {
        try { toast.success(dispatched(await CommandCenterService.assignUnit(s.id, unit.userId))); onChanged(); setOpen(false); }
        catch (e) { toast.error(errorText(e)); }
    };
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline" className="h-7"><ListPlus /> Assign job</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{look(unit.type).emoji} {unit.name}</DialogTitle>
                    <DialogDescription>{unit.jobs.length ? `Busy: the job goes into its queue (${unit.jobs.length} before it).` : 'Free: the job starts now.'}</DialogDescription>
                </DialogHeader>
                <ul className="max-h-[55vh] space-y-1.5 overflow-y-auto text-sm">
                    {openSos.length === 0 && <li className="py-6 text-center text-muted-foreground">No open SOS calls.</li>}
                    {openSos.map((s) => (
                        <li key={s.id} className="flex items-center gap-2 rounded-lg border p-2">
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">#{s.id} · {s.type}</p>
                                <p className="text-xs text-muted-foreground">{s.person} · {s.km.toFixed(1)} km · {(s.teams || []).filter((t) => t.status !== 'done').length} unit(s) on it</p>
                            </div>
                            <Button size="sm" onClick={() => give(s)}>{unit.jobs.length ? 'Queue' : 'Send'}</Button>
                        </li>
                    ))}
                </ul>
            </DialogContent>
        </Dialog>
    );
}

/** Unit control centre: every unit with its current job and queue, broadcast. Units get jobs only from you. */
export function TeamsPanel({ teams, sos = [], onSelect, onChanged }) {
    const [text, setText] = useState('');
    const [type, setType] = useState('all');
    const [expanded, setExpanded] = useState(null);

    const broadcast = async () => {
        try {
            const r = await CommandCenterService.teamBroadcast(text.trim(), type === 'all' ? null : type);
            toast.success(`Sent to ${r.sent} unit${r.sent === 1 ? '' : 's'}`);
            setText('');
        } catch (e) { toast.error(errorText(e)); }
    };
    const act = async (fn, done) => {
        try { await fn(); if (done) toast.success(done); onChanged(); } catch (e) { toast.error(errorText(e)); }
    };

    const counts = teams.reduce((a, t) => ({ ...a, [t.status]: (a[t.status] || 0) + 1 }), {});
    return (
        <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-1.5">
                {['available', 'assigned', 'on_the_way', 'arrived', 'off_duty'].map((s) => (
                    <Badge key={s} className={statusOf(s).className}>{statusOf(s).text} {counts[s] || 0}</Badge>
                ))}
            </div>
            <div className="space-y-1.5 rounded-lg border p-2">
                <p className="flex items-center gap-1.5 font-medium"><Megaphone className="size-4" /> Message to units</p>
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All units</SelectItem>
                        <SelectItem value="police">Police units</SelectItem>
                        <SelectItem value="hospital">Ambulances</SelectItem>
                        <SelectItem value="fire_brigade">Fire & rescue</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex gap-1.5">
                    <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Kandy road closed at Peradeniya bridge" className="h-8" />
                    <Button size="sm" disabled={!text.trim()} onClick={broadcast}><Send /></Button>
                </div>
            </div>
            <ul className="space-y-1.5">
                {teams.length === 0 && <li className="py-6 text-center text-muted-foreground">No response units yet.</li>}
                {teams.map((t) => (
                    <li key={t.userId} className="rounded-lg border">
                        <button type="button" onClick={() => { onSelect?.(t); setExpanded(expanded === t.userId ? null : t.userId); }}
                            className="flex w-full items-center gap-2 p-2 text-left hover:bg-accent">
                            <span className="text-xl" aria-hidden>{look(t.type).emoji}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{t.name}</span>
                                <span className="block text-xs text-muted-foreground">
                                    {t.mission ? `SOS #${t.mission.sosId} now` : 'No job'}{t.queued ? ` · ${t.queued} in queue` : ''} · {t.live ? '📱 live' : `seen ${seen(t.lastSeenSeconds)}`}
                                    {t.battery != null ? ` · 🔋${t.battery}%` : ''}
                                </span>
                            </span>
                            <Badge className={statusOf(t.status).className}>{statusOf(t.status).text}</Badge>
                        </button>
                        {expanded === t.userId && (
                            <div className="space-y-1.5 border-t p-2">
                                {t.jobs.map((j, i) => (
                                    <div key={j.sosId} className="flex items-center gap-1.5 text-xs">
                                        <span className="w-14 shrink-0 font-medium">{i === 0 ? 'Now' : `Next ${i}`}</span>
                                        <span className="min-w-0 flex-1 truncate">SOS #{j.sosId}</span>
                                        <Badge className={`h-4 px-1 text-[10px] ${statusOf(i === 0 ? j.status : 'queued').className}`}>{statusOf(i === 0 ? j.status : 'queued').text}</Badge>
                                        {i > 0 && j.status === 'assigned' && <>
                                            <Button size="icon" variant="ghost" className="size-6" aria-label="Move up" disabled={i === 1 && t.jobs[0].status !== 'assigned'}
                                                onClick={() => act(() => CommandCenterService.moveJob(t.userId, j.sosId, 'up'))}><ArrowUp /></Button>
                                            <Button size="icon" variant="ghost" className="size-6" aria-label="Move down" disabled={i === t.jobs.length - 1}
                                                onClick={() => act(() => CommandCenterService.moveJob(t.userId, j.sosId, 'down'))}><ArrowDown /></Button>
                                        </>}
                                        <Button size="icon" variant="ghost" className="size-6 text-destructive" aria-label="Take the job back"
                                            onClick={() => act(() => CommandCenterService.unassign(j.sosId, t.userId), `SOS #${j.sosId} taken back`)}><X /></Button>
                                    </div>
                                ))}
                                <AssignJobDialog unit={t} sos={sos} onChanged={onChanged} />
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

const iconCache = new Map();
function teamIcon(type, status) {
    const key = `${type}:${status}`;
    if (!iconCache.has(key)) {
        const l = look(type);
        const ring = status === 'off_duty' ? '#94A3B8' : status === 'available' ? '#15803D' : l.color;
        iconCache.set(key, L.divIcon({
            className: 'ddas-service',
            html: `<div style="width:30px;height:30px;border-radius:50%;background:#fff;border:3px solid ${ring};display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,.35);${status === 'off_duty' ? 'opacity:.6' : ''}">${l.emoji}</div>`,
            iconSize: [30, 30], iconAnchor: [15, 15],
        }));
    }
    return iconCache.get(key);
}

/** Every unit on the map, with a dashed line to its current job. */
export function TeamsLayer({ teams }) {
    return teams.map((t) => (
        <Fragment key={`team-${t.userId}`}>
            {t.mission && (
                <Polyline positions={[[t.lat, t.lng], [Number(t.mission.lat), Number(t.mission.lng)]]} interactive={false}
                    pathOptions={{ color: look(t.type).color, weight: 2, dashArray: '5 6', opacity: 0.8 }} />
            )}
            <Marker position={[t.lat, t.lng]} icon={teamIcon(t.type, t.status)} zIndexOffset={t.mission ? 2900 : 2500}>
                <Tooltip>{t.name} · {statusOf(t.status).text}{t.mission ? ` · SOS #${t.mission.sosId}` : ''}{t.queued ? ` · ${t.queued} in queue` : ''}</Tooltip>
            </Marker>
        </Fragment>
    ));
}
