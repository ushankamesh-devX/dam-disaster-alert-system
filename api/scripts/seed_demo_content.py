"""Demo content for the news, reports and alerts pages: data only, tagged, removable.

    python3 seed_demo_content.py --kubectl            # add (skips anything already added)
    python3 seed_demo_content.py --kubectl --reset    # remove only what this script added

Adds 6 published news articles, 8 citizen reports near the three dams (mixed statuses, some assigned to an
officer) and an alert history (resolved drills plus one active Randenigala reservoir watch). Every row carries
metadata.demoContent = true, which is how --reset finds it. Alerts are written straight to the database as
drills, so no SMS or push is ever sent. No table or column changes.
"""
import argparse
import json
import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed_demo import quote, records, sql  # noqa: E402

TAG = "JSON_EXTRACT(metadata, '$.demoContent') = true"
META = {'demoContent': True}

NEWS = [  # category filter key, title, summary, content, priority, featured, dam code, days ago
    ('dam-status', 'Victoria spillway gates tested ahead of the monsoon',
     'Engineers opened all spillway gates at Victoria for a scheduled test before the north-east monsoon.',
     'The spillway gates at Victoria were opened one by one this morning as part of the yearly pre-monsoon test. '
     'Downstream residents may have seen higher water in the Mahaweli for about two hours. The test went as planned '
     'and all gates are closed again. The reservoir is at a normal level.', 'medium', True, 'VIC-01', 2),
    ('safety', 'Randenigala evacuation drill this Saturday',
     'Residents downstream of Randenigala will practise the evacuation to high ground on Saturday at 9 am.',
     'An evacuation drill will be held for the villages downstream of Randenigala on Saturday from 9 am. '
     'You will receive a drill alert in the DDAS app. Follow the purple route in the app to the nearest high ground '
     'assembly point. Volunteers will guide you. The drill takes about one hour.', 'high', True, 'RAN-01', 3),
    ('weather', 'Monsoon rainfall outlook for the Mahaweli basin',
     'Above-average rainfall is expected in the upper Mahaweli catchment over the next two weeks.',
     'The weather outlook shows above-average rainfall in the central hills over the next 14 days. Inflow to '
     'Kotmale, Victoria and Randenigala is expected to rise. Dam operators will release water in planned steps. '
     'Keep the DDAS app alerts on to get water release notices for your area.', 'medium', False, None, 5),
    ('safety', 'How to find your nearest high ground',
     'The DDAS app shows the safest high ground near you and the road to get there.',
     'Open the Emergency tab in the DDAS app and tap Find safest route. The app picks high ground above the '
     'expected flood level and a road that avoids the danger zones. Practise the route once with your family, '
     'so you know it when an alert comes.', 'low', False, None, 7),
    ('announcements', 'New SOS feature in the DDAS app',
     'If you are trapped or injured during a flood, you can now send an SOS with your location from the app.',
     'The new SOS button in the DDAS app sends your location and the kind of help you need to the evacuation '
     'control room. A response unit is sent to you, and you can see it coming on the map. Use it only in a real '
     'emergency.', 'medium', False, None, 9),
    ('safety', 'Kotmale downstream: emergency kit checklist',
     'A small bag ready at the door saves time when you have to leave.',
     'Keep a bag ready with: drinking water, dry food for two days, a torch, a power bank, your ID and important '
     'papers in a plastic bag, medicines, and a charged phone with the DDAS app. Check it every month.',
     'low', False, 'KOT-01', 12),
]

REPORTS = [  # type keyword, dam code, title, description, status, priority, days ago, assigned, place
    ('crack', 'VIC-01', 'Crack on the road near the spillway', 'A long crack has opened across the road about 200 m '
     'below the Victoria spillway. Vehicles are slowing down.', 'in_progress', 'high', 1, True, 'Road below the spillway'),
    ('seep', 'RAN-01', 'Water seeping at the embankment', 'Wet patch with clear water coming out at the bottom of the '
     'downstream embankment, left side.', 'reviewing', 'critical', 1, True, 'Downstream embankment, left side'),
    ('drain', 'KOT-01', 'Blocked drain on the main road', 'The roadside drain is blocked with mud and leaves. Water '
     'flows over the road when it rains.', 'pending', 'medium', 2, False, 'Main road near the bus stop'),
    ('tree', 'RAN-01', 'Fallen tree on the evacuation road', 'A large tree has fallen across the road to the high ground '
     'assembly point. Only motorbikes can pass.', 'resolved', 'high', 3, True, 'Road to High ground A'),
    ('landslide', 'VIC-01', 'Landslide risk above the houses', 'New cracks in the slope above the houses after the rain. '
     'Small stones are falling.', 'pending', 'high', 4, False, 'Hillside above the village'),
    ('water', 'KOT-01', 'River level rising fast', 'The river rose about half a metre in one hour this evening.',
     'resolved', 'medium', 6, True, 'Bridge over the river'),
    ('other', 'VIC-01', 'Warning siren not working', 'The siren near the temple did not sound during the last test.',
     'rejected', 'low', 8, False, 'Near the temple'),
    ('equipment', 'RAN-01', 'Damaged water level sign', 'The painted water level marks on the bridge pillar are no '
     'longer readable.', 'in_progress', 'low', 10, True, 'Bridge pillar'),
]

ALERTS = [  # type code, severity, dam code, title, message, status, days ago, hours open
    ('RESERVOIR_WATCH', 'warning', 'VIC-01', 'Reservoir watch: Victoria Dam',
     'Victoria reservoir is 94 % full and rising. No action needed now. Stay alert for updates.', 'resolved', 6, 10),
    ('SPILLWAY_RELEASE', 'warning', 'VIC-01', 'Spillway release: Victoria Dam',
     'Gates 2 and 3 are opened. River level downstream will rise by about 1 m. Keep away from the river banks.', 'resolved', 5, 8),
    ('FLOOD_WARNING', 'critical', 'KOT-01', 'Flood warning: Kotmale downstream',
     'Heavy inflow at Kotmale. Low-lying areas downstream may flood in the next 3 hours. Be ready to leave.', 'resolved', 4, 6),
    ('ALL_CLEAR', 'info', 'KOT-01', 'All clear: Kotmale Dam',
     'Water levels are back to normal. You can return home safely.', 'resolved', 4, 1),
    ('DRILL', 'info', 'RAN-01', 'Drill: Randenigala evacuation practice',
     'This is a drill. Follow the route in the DDAS app to your nearest high ground.', 'resolved', 2, 2),
    ('RESERVOIR_WATCH', 'warning', 'RAN-01', 'Reservoir watch: Randenigala Dam',
     'Randenigala reservoir is near full after heavy rain upstream. No action needed now. Keep the app alerts on.', 'active', 0, 0),
]


def first(query):
    rows = records(query)
    return rows[0] if rows else None


def reset():
    n = {t: len(records(f'SELECT id FROM {t} WHERE {TAG}')) for t in ('news_articles', 'reports', 'alerts')}
    sql(f'DELETE FROM news_articles WHERE {TAG}')
    sql(f'DELETE FROM report_media WHERE report_id IN (SELECT id FROM (SELECT id FROM reports WHERE {TAG}) x)')
    sql(f'DELETE FROM reports WHERE {TAG}')
    sql(f'DELETE FROM alerts WHERE {TAG}')
    print(f'Removed demo content: {n["news_articles"]} news, {n["reports"]} reports, {n["alerts"]} alerts')


def category(key):
    """An existing news category for this filter key, else a matching one, else the first one (created if none)."""
    row = first(f'SELECT id FROM news_categories WHERE filter_key = {quote(key)} AND is_active = 1 ORDER BY id LIMIT 1') \
        or first(f"SELECT id FROM news_categories WHERE is_active = 1 AND filter_key <> 'all' ORDER BY id LIMIT 1")
    if row:
        return row['id']
    sql("INSERT INTO news_categories (code, name, filter_key, display_order, is_active) VALUES ('GENERAL', 'General', 'general', 1, 1)")
    return first("SELECT id FROM news_categories WHERE code = 'GENERAL'")['id']


def report_type(keyword):
    row = first(f"SELECT id FROM report_types WHERE is_active = 1 AND (code LIKE {quote('%' + keyword + '%')} "
                f"OR name LIKE {quote('%' + keyword + '%')}) ORDER BY id LIMIT 1") \
        or first("SELECT id FROM report_types WHERE is_active = 1 ORDER BY display_order, id LIMIT 1")
    if row:
        return row['id']
    sql("INSERT INTO report_types (code, name, category, default_priority, is_active, display_order) "
        "VALUES ('GENERAL_ISSUE', 'General issue', 'other', 'medium', 1, 99)")
    return first("SELECT id FROM report_types WHERE code = 'GENERAL_ISSUE'")['id']


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--kubectl', nargs='?', const='ddas-db-0', default='ddas-db-0', metavar='POD')
    parser.add_argument('--reset', action='store_true', help='Remove only the demo content this script added')
    parser.add_argument('--reporter', default='niduk16962@gmail.com', help='Account the citizen reports come from')
    args = parser.parse_args()
    os.environ['DDAS_DB_POD'] = args.kubectl
    if args.reset:
        return reset()
    if first(f'SELECT id FROM news_articles WHERE {TAG} LIMIT 1'):
        sys.exit('Demo content is already there. Run with --reset first to add it again.')

    dams = {r['code']: r for r in records('SELECT id, code, name, latitude lat, longitude lng, region_id FROM dams')}
    admin = first("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code IN ('SUPER_ADMIN','ADMIN') "
                  "AND u.deleted_at IS NULL ORDER BY r.priority_level DESC, u.id LIMIT 1")
    reporter = first(f'SELECT id FROM users WHERE email = {quote(args.reporter)}') or admin
    if not admin:
        sys.exit('No admin user found.')
    admin, reporter = admin['id'], reporter['id']
    meta = quote(json.dumps(META))

    for key, title, summary, content, prio, featured, dam_code, days in NEWS:
        d = dams.get(dam_code) if dam_code else None
        sql('INSERT INTO news_articles (uuid, category_id, title, summary, content, priority_level, source, is_nationwide, '
            'dam_id, region_id, status, is_featured, publish_date, view_count, metadata, author_id, created_by, created_at) VALUES ('
            + ', '.join(map(quote, [str(uuid.uuid4()), category(key), title, summary, content, prio, 'DDAS Operations',
                                    0 if d else 1, d['id'] if d else None, d['region_id'] if d else None, 'published',
                                    1 if featured else 0]))
            + f', NOW() - INTERVAL {days} DAY, {37 + days * 11}, CAST({meta} AS JSON), {admin}, {admin}, NOW() - INTERVAL {days} DAY)')

    for i, (kw, dam_code, title, desc, status, prio, days, assigned, place) in enumerate(REPORTS, start=1):
        d = dams[dam_code]
        lat = float(d['lat']) - 0.01 - 0.004 * i
        lng = float(d['lng']) + 0.006 * (i % 3)
        done = status in ('resolved', 'rejected')
        sql('INSERT INTO reports (uuid, report_number, user_id, report_type_id, priority, dam_id, region_id, latitude, longitude, '
            'location_description, title, description, status, assigned_to, assigned_at, assigned_by, resolution_notes, '
            'resolved_at, resolved_by, rejection_reason, is_verified, metadata, created_at) VALUES ('
            + ', '.join(map(quote, [str(uuid.uuid4()), f'RPT-DEMO-{i:03d}', reporter, report_type(kw), prio, d['id'], d['region_id'],
                                    round(lat, 6), round(lng, 6), place, title, desc, status,
                                    admin if assigned else None]))
            + (f', NOW() - INTERVAL {days} DAY + INTERVAL 2 HOUR, {admin}' if assigned else ', NULL, NULL')
            + (', ' + quote('Fixed by the maintenance team.') + f', NOW() - INTERVAL {days} DAY + INTERVAL 20 HOUR, {admin}'
               if status == 'resolved' else ', NULL, NULL, NULL')
            + (', ' + quote('Checked on site: the siren works; it was switched off for maintenance.') if status == 'rejected' else ', NULL')
            + f', {1 if done or status == "in_progress" else 0}, CAST({meta} AS JSON), NOW() - INTERVAL {days} DAY)')

    types = {r['code']: r['id'] for r in records('SELECT id, code FROM alert_types')}
    added_alerts = 0
    for code, sev, dam_code, title, msg, status, days, hours in ALERTS:
        if code not in types:
            print(f'  alert type {code} missing, skipped')
            continue
        d = dams[dam_code]
        start = f'NOW() - INTERVAL {days} DAY' if days else 'NOW() - INTERVAL 20 MINUTE'
        resolved = f'{start} + INTERVAL {max(hours, 1)} HOUR' if status == 'resolved' else 'NULL'
        sql('INSERT INTO alerts (uuid, alert_type_id, title, message, severity, source, scope, dam_id, region_id, status, '
            'issued_at, effective_from, resolved_at, resolved_by, simulation_mode, metadata, created_by, created_at) VALUES ('
            + ', '.join(map(quote, [str(uuid.uuid4()), types[code], title, msg, sev, 'manual', 'dam_specific', d['id'], d['region_id'], status]))
            + f', {start}, {start}, {resolved}, {admin if status == "resolved" else "NULL"}, 1, CAST({meta} AS JSON), {admin}, {start})')
        added_alerts += 1

    print(f'Added demo content: {len(NEWS)} news articles, {len(REPORTS)} reports, {added_alerts} alerts (drills, no SMS).')
    print('Remove it again with: python3 seed_demo_content.py --kubectl --reset')


if __name__ == '__main__':
    main()
