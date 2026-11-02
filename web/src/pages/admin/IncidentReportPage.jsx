import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Ban, Bell, Clock, House, ShieldCheck, Siren, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CommandCenterService from '../../services/commandCenter.service';
import { ZonesPanel } from '../../components/evacuation/AnalyticsPanels';
import { Timeline } from '../../components/evacuation/LivePanels';

const fmtTime = (t) => (t ? new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtDuration = (from, to) => {
    if (!from) return '—';
    const min = Math.max(0, Math.round(((to ? new Date(to) : new Date()) - new Date(from)) / 60000));
    return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
};
const secs = (s) => (s == null ? '—' : s < 60 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`);

function Kpi({ icon: Icon, label, value, sub, tone }) {
    return (
        <Card className="gap-1 py-4">
            <CardContent className="flex items-start gap-3 px-4">
                <div className={`rounded-lg p-2 ${tone || 'bg-accent text-accent-foreground'}`}><Icon className="size-5" aria-hidden /></div>
                <div className="min-w-0">
                    <p className="text-2xl font-semibold tabular-nums">{value}</p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                </div>
            </CardContent>
        </Card>
    );
}

/** Live incident report: everything about the current (or last) evacuation, refreshed every 10 s. */
export default function IncidentReportPage() {
    const [an, setAn] = useState(null);
    const [snap, setSnap] = useState(null);
    const [updated, setUpdated] = useState(null);

    const refresh = useCallback(async () => {
        const [a, s] = await Promise.allSettled([CommandCenterService.analytics(), CommandCenterService.snapshot()]);
        if (a.status === 'fulfilled') setAn(a.value);
        if (s.status === 'fulfilled') setSnap(s.value);
        setUpdated(new Date());
    }, []);
    useEffect(() => {
        const first = setTimeout(refresh, 0);
        const timer = setInterval(refresh, 10000);
        return () => { clearTimeout(first); clearInterval(timer); };
    }, [refresh]);

    const inc = an?.incident || {};
    const sos = inc.sos || {};
    const total = Number(inc.peopleTotal || 0);
    const safePct = total ? Math.round((Number(inc.peopleSafe || 0) / total) * 100) : 0;
    const ongoing = Number(inc.zonesActive || 0) > 0;

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1"><Link to="/admin/evacuation"><ArrowLeft /> Command center</Link></Button>
                    <h1 className="text-xl font-semibold">Incident report</h1>
                    <p className="text-sm text-muted-foreground">
                        Evacuation from {fmtTime(inc.startedAt)} · {fmtDuration(inc.startedAt, ongoing ? null : inc.lastActivity)}
                        {' · '}{updated ? `updated ${updated.toLocaleTimeString()}` : 'loading…'}
                    </p>
                </div>
                <Badge className={ongoing ? 'bg-destructive text-white' : 'bg-[#15803D] text-white'}>
                    {ongoing ? `Ongoing · ${inc.zonesActive} zones active` : 'Ended'}
                </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi icon={Users} label="People involved" value={total} sub={`${inc.peopleOnTheMove ?? 0} on the way`} />
                <Kpi icon={ShieldCheck} label="Reached safety" value={`${inc.peopleSafe ?? 0} (${safePct}%)`} tone="bg-[#DCFCE7] text-[#15803D]" />
                <Kpi icon={Siren} label="Still in danger" value={inc.peopleInDanger ?? 0} tone={inc.peopleInDanger ? 'bg-destructive/10 text-destructive' : undefined} />
                <Kpi icon={House} label="Shelter use" value={`${inc.shelterOccupancy ?? 0} / ${inc.shelterCapacity ?? 0}`} sub={`${inc.sheltersUsed ?? 0} shelters used`} />
                <Kpi icon={Bell} label="SOS calls" value={sos.total ?? 0} sub={`${sos.resolved ?? 0} resolved · ${sos.open ?? 0} open`} />
                <Kpi icon={Clock} label="Average response" value={secs(sos.avgResponse)} sub={`slowest ${secs(sos.maxResponse)} · resolved in ${secs(sos.avgResolve)}`} />
                <Kpi icon={Ban} label="Roads blocked" value={(inc.blockedRoads || []).length} />
                <Kpi icon={Bell} label="Alerts raised" value={(inc.alerts || []).length} />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card className="gap-3">
                    <CardHeader><CardTitle>Zones</CardTitle><CardDescription>How much of each danger zone has been evacuated, and when the water arrives</CardDescription></CardHeader>
                    <CardContent><ZonesPanel zones={an?.zones || []} progress={an?.progress} /></CardContent>
                </Card>
                <Card className="gap-3">
                    <CardHeader><CardTitle>Shelters</CardTitle><CardDescription>Occupancy and people still on the way</CardDescription></CardHeader>
                    <CardContent className="px-0">
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead className="pl-6">Shelter</TableHead><TableHead className="text-right">In</TableHead>
                                <TableHead className="text-right">Capacity</TableHead><TableHead className="text-right">On the way</TableHead><TableHead className="pr-6">Forecast</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {(an?.shelters || []).map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="max-w-48 truncate pl-6 font-medium">{s.name}</TableCell>
                                        <TableCell className="text-right tabular-nums">{s.occupancy}</TableCell>
                                        <TableCell className="text-right tabular-nums">{s.capacity || '—'}</TableCell>
                                        <TableCell className="text-right tabular-nums">{s.incoming}</TableCell>
                                        <TableCell className="pr-6 text-xs">{s.inZone ? 'In a danger zone' : s.willFill ? `Full ${s.fullInMin != null ? `in ~${s.fullInMin} min` : 'soon'}` : 'OK'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card className="gap-3">
                    <CardHeader><CardTitle>SOS calls</CardTitle><CardDescription>Open first, then resolved in the last 30 minutes</CardDescription></CardHeader>
                    <CardContent className="px-0">
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead className="pl-6">Type</TableHead><TableHead>Person</TableHead><TableHead>Status</TableHead>
                                <TableHead>Team</TableHead><TableHead className="pr-6 text-right">Response</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {(snap?.sos || []).map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="pl-6 font-medium">{s.type}</TableCell>
                                        <TableCell className="max-w-32 truncate">{s.person}</TableCell>
                                        <TableCell><Badge variant="outline" className="capitalize">{s.status}</Badge></TableCell>
                                        <TableCell className="max-w-40 truncate text-xs">{s.assignedTo || '—'}</TableCell>
                                        <TableCell className="pr-6 text-right tabular-nums">{secs(s.responseSeconds)}</TableCell>
                                    </TableRow>
                                ))}
                                {(snap?.sos || []).length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No SOS calls</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card className="gap-3">
                    <CardHeader><CardTitle>What happened</CardTitle><CardDescription>Alerts, SOS calls, teams and blocked roads, newest first</CardDescription></CardHeader>
                    <CardContent className="max-h-[480px] overflow-y-auto text-sm"><Timeline items={snap?.timeline || []} /></CardContent>
                </Card>
            </div>

            <Card className="gap-3">
                <CardHeader><CardTitle>Alerts and blocked roads</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <ul className="space-y-2">
                        {(inc.alerts || []).map((a) => (
                            <li key={a.id} className="flex items-start justify-between gap-2">
                                <div className="min-w-0"><p className="truncate font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{fmtTime(a.createdAt)} · {a.damName || '—'}</p></div>
                                <div className="flex shrink-0 gap-1">
                                    {a.drill ? <Badge variant="secondary">Drill</Badge> : null}
                                    <Badge variant="outline" className="capitalize">{a.severity}</Badge>
                                </div>
                            </li>
                        ))}
                        {(inc.alerts || []).length === 0 && <li className="text-muted-foreground">No alerts</li>}
                    </ul>
                    <ul className="space-y-2">
                        {(inc.blockedRoads || []).map((b, i) => (
                            <li key={i}><p className="font-medium">{b.name}</p><p className="text-xs text-muted-foreground">{fmtTime(b.createdAt)}{b.reason ? ` · ${b.reason}` : ''}</p></li>
                        ))}
                        {(inc.blockedRoads || []).length === 0 && <li className="text-muted-foreground">No roads blocked</li>}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
