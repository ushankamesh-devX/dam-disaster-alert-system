import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Play, RotateCcw, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ScenarioService from '../../services/scenario.service';

const DAMS = [['victoria', 'Victoria'], ['randenigala', 'Randenigala'], ['kotmale', 'Kotmale']];

function elapsed(startedAt) {
    if (!startedAt) return '';
    const s = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Demo buttons: run the Python evacuation scenario (via the ddas-scenario pod), stop it, reset its data. */
export default function ScenarioPanel() {
    const [st, setSt] = useState(null);
    const [error, setError] = useState(null);
    const [dams, setDams] = useState(['victoria', 'randenigala']);
    const [minutes, setMinutes] = useState(10);
    const [people, setPeople] = useState(80);
    const [busy, setBusy] = useState(false);
    const logRef = useRef(null);

    const load = useCallback(() => ScenarioService.status()
        .then((s) => { setSt(s); setError(null); })
        .catch((e) => setError(e.response?.data?.message || 'Scenario runner not reachable')), []);

    useEffect(() => {
        load();
        const id = setInterval(load, st?.running ? 3000 : 10000);
        return () => clearInterval(id);
    }, [load, st?.running]);

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [st?.log?.length]);

    const act = async (fn, done) => {
        setBusy(true);
        try {
            setSt(await fn());
            toast.success(done);
        } catch (e) {
            toast.error(e.response?.data?.message || 'Request failed');
        } finally {
            setBusy(false);
        }
    };

    const toggleDam = (d) => setDams((c) => (c.includes(d) ? c.filter((x) => x !== d) : [...c, d]));
    const running = !!st?.running;
    const label = running
        ? `${st.action === 'reset' ? 'Resetting' : 'Running'} · ${elapsed(st.startedAt)}`
        : st?.recorded ? 'Stopped · scenario data still on the map' : 'Ready';

    return (
        <div className="space-y-2">
            {error && <p className="text-destructive">{error}</p>}
            <div className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${running ? 'animate-pulse bg-emerald-500' : st?.recorded ? 'bg-amber-500' : 'bg-slate-300'}`} />
                <span className="font-medium">{st ? label : '…'}</span>
            </div>
            <div className="space-y-1">
                <Label>Dams (in release order)</Label>
                <div className="flex flex-wrap gap-3">
                    {DAMS.map(([key, name]) => (
                        <label key={key} className="flex cursor-pointer items-center gap-1.5">
                            <input type="checkbox" checked={dams.includes(key)} onChange={() => toggleDam(key)} disabled={running} />
                            {name}
                        </label>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label htmlFor="sc-min">Minutes</Label>
                    <Input id="sc-min" type="number" min={2} max={30} value={minutes} disabled={running}
                        onChange={(e) => setMinutes(Number(e.target.value))} /></div>
                <div className="space-y-1"><Label htmlFor="sc-ppl">People</Label>
                    <Input id="sc-ppl" type="number" min={10} max={200} value={people} disabled={running}
                        onChange={(e) => setPeople(Number(e.target.value))} /></div>
            </div>
            <div className="flex gap-2">
                <Button size="sm" disabled={busy || running || !dams.length || st?.recorded || !!error}
                    title={st?.recorded ? 'Reset the last scenario first' : 'Start the scenario'}
                    onClick={() => act(() => ScenarioService.start(DAMS.map(([k]) => k).filter((k) => dams.includes(k)), minutes, people), 'Scenario started')}>
                    <Play /> Start
                </Button>
                <Button size="sm" variant="outline" disabled={busy || !running || st?.action !== 'scenario'}
                    onClick={() => act(ScenarioService.stop, 'Scenario stopped')}>
                    <Square /> Stop
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" disabled={busy || running || !!error}
                    onClick={() => act(ScenarioService.reset, 'Removing scenario data')}>
                    <RotateCcw /> Reset data
                </Button>
            </div>
            {st?.log?.length > 0 && (
                <pre ref={logRef} className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-[11px] leading-snug">
                    {st.log.join('\n')}
                </pre>
            )}
        </div>
    );
}
