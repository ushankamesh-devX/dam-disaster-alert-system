export const STATE_LABEL = { danger: 'In danger zone', moving: 'On the way', sos: 'SOS', safe: 'Safe' };

export const EMPTY_FILTER = { state: 'all', mode: 'all', zoneId: 'all', stragglersOnly: false, q: '' };

/** Apply the People filter to the live list. */
export function filterPeople(people, filter, stragglerIds) {
    const q = filter.q.trim().toLowerCase();
    return people.filter((p) => (filter.state === 'all' || p.state === filter.state)
        && (filter.mode === 'all' || p.mode === filter.mode)
        && (filter.zoneId === 'all' || String(p.zoneId) === filter.zoneId)
        && (!filter.stragglersOnly || stragglerIds.has(p.id))
        && (!q || p.name.toLowerCase().includes(q)));
}
