"""Clean the database down to a 3-dam system with real accounts only. Data only: no schema change.

    python3 cleanup_demo_data.py --kubectl                # dry run: prints what would change
    python3 cleanup_demo_data.py --kubectl --apply        # full backup first, then change

Keeps: Kotmale, Victoria and Randenigala (codes become KOT-01, VIC-01, RAN-01) with their zones,
gates, sensors, readings and shelters; the --keep-email accounts; regions, roles, permissions.
Removes: every other dam and everything under it, every other user, all alerts and their SMS
queue, demo news, demo reports and demo emergency service providers. Sets up the 7 standard alert types. Rows that only point at a removed user
(created_by and similar nullable links) are kept with the link cleared.
"""
import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed_demo import DATABASE, docker, quote, records, sql  # noqa: E402

DAMS = {'DEMO-001': 'KOT-01', 'DEMO-002': 'VIC-01', 'DEMO-003': 'RAN-01'}
DEFAULT_KEEP = ['admin@ddas.gov.lk', 'niduk16962@gmail.com']
NEWS_TABLES = ['news_user_interactions', 'news_push_logs', 'news_subscriptions', 'news_articles']
# Fake demo rows with no real counterpart; real police/hospitals come from seed_emergency_services.py
DEMO_ONLY_TABLES = ['reports', 'emergency_service_providers']

# One alert type per stage of the dam emergency plan (see ALERT-PLAN.md)
ALERT_TYPES = [
    # code, name, category, severity, color, needs acknowledgement, order
    ('RESERVOIR_WATCH', 'Reservoir Watch', 'dam', 'info', '#2563EB', 0, 1),
    ('SPILLWAY_RELEASE', 'Spillway Release Warning', 'dam', 'warning', '#F59E0B', 0, 2),
    ('FLOOD_WARNING', 'Flood Warning', 'flood', 'warning', '#EA580C', 0, 3),
    ('EVACUATION_ORDER', 'Evacuation Order', 'evacuation', 'critical', '#DC2626', 1, 4),
    ('DAM_EMERGENCY', 'Dam Emergency', 'dam', 'emergency', '#991B1B', 1, 5),
    ('ALL_CLEAR', 'All Clear', 'system', 'info', '#16A34A', 0, 6),
    ('DRILL', 'Drill / System Test', 'system', 'info', '#6B7280', 0, 7),
]

# Text cleanup on kept rows: (table, column)
TEXT_COLUMNS = [('dams', 'description'), ('dam_hazard_zones', 'zone_name'), ('dam_hazard_zones', 'description'),
                ('system_safe_locations', 'name'), ('system_safe_locations', 'description'),
                ('dam_gates', 'description'), ('sensors', 'name'), ('sensors', 'description')]
TEXT_REPLACEMENTS = ['[DEMO] ', '[DEMO]', ' (Demo exercise — not a real alert.)', 'Illustrative demo ', 'Demo ']


def columns():
    rows = records("SELECT TABLE_NAME t, COLUMN_NAME c, IS_NULLABLE n FROM information_schema.COLUMNS "
                   f"WHERE TABLE_SCHEMA={quote(DATABASE)}")
    return {(r['t'], r['c']): r['n'] == 'YES' for r in rows}


def foreign_keys():
    """{parent_table: [(child_table, child_column), ...]} for FKs to parent.id"""
    rows = records("SELECT TABLE_NAME child, COLUMN_NAME col, REFERENCED_TABLE_NAME parent "
                   "FROM information_schema.KEY_COLUMN_USAGE "
                   f"WHERE TABLE_SCHEMA={quote(DATABASE)} AND REFERENCED_TABLE_NAME IS NOT NULL "
                   "AND REFERENCED_COLUMN_NAME='id'")
    graph = {}
    for r in rows:
        graph.setdefault(r['parent'], []).append((r['child'], r['col']))
    return graph


# Rows that belong to a person and go with them. Any other table with a required link to a
# removed user (e.g. dams.created_by) keeps its rows, re-linked to the first kept account.
USER_OWNED = {'user_permissions', 'user_role_history', 'user_activity_logs', 'admin_sessions',
              'sos_events', 'sos_event_notifications', 'emergency_contacts', 'user_safe_locations',
              'user_hazard_location_snapshots', 'location_sharing_sessions', 'emergency_activity_logs',
              'alert_user_deliveries', 'news_user_interactions', 'news_subscriptions',
              'user_alert_preferences', 'reports', 'report_comments', 'report_media', 'report_upvotes',
              'report_status_history'}


class Plan:
    """Deletes, link-clears and re-links in a safe order: children first, parents last."""

    def __init__(self, cols, graph, keeper_user_id):
        self.cols, self.graph, self.keeper = cols, graph, keeper_user_id
        self.steps, self.seen = [], set()

    def delete(self, table, where):
        key = (table, where)
        if key in self.seen:
            return
        self.seen.add(key)
        ids = f'SELECT id FROM (SELECT id FROM `{table}` WHERE {where}) AS x'
        for child, col in self.graph.get(table, []):
            link = f'`{col}` IN ({ids})'
            if child == table or self.cols.get((child, col)):   # self-reference or optional link
                self.steps.append(('clear', child, col, link))
            elif table == 'users' and child not in USER_OWNED:
                self.steps.append(('relink', child, col, link))
            else:
                self.delete(child, link)
        self.steps.append(('delete', table, None, where))


def count(table, where):
    return int(records(f'SELECT COUNT(*) n FROM `{table}` WHERE {where}')[0]['n'])


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--kubectl', nargs='?', const='ddas-db-0', metavar='POD',
                        help='Use the k3s MySQL pod (default ddas-db-0) instead of Docker Compose')
    parser.add_argument('--apply', action='store_true', help='Back up, then make the changes (default: dry run)')
    parser.add_argument('--keep-email', action='append', help=f'Account to keep (default: {", ".join(DEFAULT_KEEP)})')
    args = parser.parse_args()
    if args.kubectl:
        os.environ['DDAS_DB_POD'] = args.kubectl

    keep_emails = args.keep_email or DEFAULT_KEEP
    cols, graph = columns(), foreign_keys()
    tables = {t for t, _ in cols}

    kept_users = records('SELECT id, email FROM users WHERE email IN (' + ','.join(map(quote, keep_emails)) + ')')
    if not kept_users:
        sys.exit(f'None of {keep_emails} exist; refusing to remove every account.')
    codes = list(DAMS) + list(DAMS.values())
    kept_dams = records('SELECT id, code, name FROM dams WHERE code IN (' + ','.join(map(quote, codes)) + ')')
    if len(kept_dams) != 3:
        sys.exit(f'Expected the 3 cascade dams, found {[d["code"] for d in kept_dams]}. Run seed_cascade_demo.py first.')
    user_ids = ','.join(u['id'] for u in kept_users)
    dam_ids = ','.join(d['id'] for d in kept_dams)

    plan = Plan(cols, graph, kept_users[0]['id'])
    plan.delete('alerts', '1=1')
    if ('system_safe_locations', 'primary_dam_id') in cols:
        plan.delete('system_safe_locations', f'primary_dam_id IS NOT NULL AND primary_dam_id NOT IN ({dam_ids})')
    plan.delete('dams', f'id NOT IN ({dam_ids})')
    for t in NEWS_TABLES + DEMO_ONLY_TABLES:
        if t in tables:
            plan.delete(t, '1=1')
    plan.delete('users', f'id NOT IN ({user_ids})')
    plan.delete('alert_types', 'code NOT IN (' + ','.join(quote(a[0]) for a in ALERT_TYPES) + ')')

    print(f'Database {DATABASE}: keeping users {[u["email"] for u in kept_users]} and dams '
          f'{[d["name"] for d in kept_dams]}', flush=True)
    total = 0
    for kind, table, col, where in plan.steps:
        n = count(table, where if kind == 'delete' else f'({where}) AND `{col}` IS NOT NULL')
        if n:
            total += n
            detail = {'clear': f'.{col} -> NULL', 'relink': f'.{col} -> user {plan.keeper}'}.get(kind, '')
            print(f'  {kind:6} {n:>8,}  {table}{detail}', flush=True)
    print(f'  rename dam codes {", ".join(f"{a}->{b}" for a, b in DAMS.items())}; set up {len(ALERT_TYPES)} alert types')

    if not args.apply:
        print(f'\nDry run: {total:,} rows would change. Re-run with --apply to back up and apply.')
        return

    backup = Path.home() / f'ddas-backup-before-cleanup-{datetime.now():%Y%m%d-%H%M}.sql'
    print(f'\nBacking up to {backup} ...', flush=True)
    dump = docker('export MYSQL_PWD=$MYSQL_PASSWORD; exec mysqldump --user=$MYSQL_USER --single-transaction '
                  '--no-tablespaces --triggers --set-gtid-purged=OFF $MYSQL_DATABASE')
    if b'Dump completed' not in dump[-200:]:
        sys.exit('Backup looks incomplete; nothing was changed.')
    backup.write_bytes(dump)
    print(f'  {len(dump) / 1e6:.1f} MB saved', flush=True)

    statements = []
    for kind, table, col, where in plan.steps:
        if kind == 'clear':
            statements.append(f'UPDATE `{table}` SET `{col}`=NULL WHERE {where}')
        elif kind == 'relink':
            statements.append(f'UPDATE `{table}` SET `{col}`={int(plan.keeper)} WHERE {where}')
        else:
            statements.append(f'DELETE FROM `{table}` WHERE {where}')
    for old, new in DAMS.items():
        statements.append(f'UPDATE dams SET code={quote(new)} WHERE code={quote(old)}')
    for table, col in TEXT_COLUMNS:
        if (table, col) in cols:
            expr = f'`{col}`'
            for text in TEXT_REPLACEMENTS:
                expr = f'REPLACE({expr}, {quote(text)}, {quote("")})'
            statements.append(f'UPDATE `{table}` SET `{col}`=TRIM({expr}) WHERE `{col}` LIKE {quote("%emo%")}')
    statements += alert_type_statements(cols)

    sql('START TRANSACTION;\n' + ';\n'.join(statements) + ';\nCOMMIT;')
    print('Done. Remaining: ' + ', '.join(f'{t} {count(t, "1=1"):,}' for t in ['dams', 'users', 'alerts', 'alert_types']))
    print(f'Undo: restore {backup}')


def alert_type_statements(cols):
    """Insert or update the 7 alert types using whichever optional columns this table has."""
    optional = {'severity': 3, 'color': 4, 'requires_acknowledgment': 5, 'display_order': 6}
    names = ['code', 'name', 'category'] + [c for c in optional if ('alert_types', c) in cols]
    out = []
    for row in ALERT_TYPES:
        values = list(row[:3]) + [row[optional[c]] for c in names[3:]]
        updates = ', '.join(f'`{c}`=VALUES(`{c}`)' for c in names[1:])
        out.append(f'INSERT INTO alert_types ({", ".join(f"`{c}`" for c in names)}) VALUES '
                   f'({", ".join(map(quote, values))}) ON DUPLICATE KEY UPDATE {updates}')
    return out


if __name__ == '__main__':
    main()
