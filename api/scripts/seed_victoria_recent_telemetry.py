"""Seed recent mock telemetry data for Victoria Dam up to the current timestamp.

Bridges the gap from the last recorded reading (2026-10-05) up to current UTC time.
Generates:
1. Hourly sensor readings for all 6 Victoria Dam sensors (Water Level, Rainfall, Inflow, Outflow, Soil Moisture, Temperature).
2. Daily aggregates in sensor_readings_aggregated for all completed days.
3. Updated live status in dam_current_status and sensors.last_reading_at.
"""
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

# Ensure api/scripts directory is on path to import from seed_demo
SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from seed_demo import records, sql, quote, stamp


def generate_victoria_data():
    dam_rows = records("SELECT id, name, code FROM dams WHERE code='DEMO-002'")
    if not dam_rows:
        raise RuntimeError("Victoria Dam (code='DEMO-002') not found in database!")
    dam = dam_rows[0]
    dam_id = int(dam['id'])
    print(f"Target Dam: {dam['name']} (ID: {dam_id}, Code: {dam['code']})", flush=True)

    sensor_rows = records(f"SELECT id, sensor_type_id, name FROM sensors WHERE dam_id={dam_id} ORDER BY id")
    if not sensor_rows:
        raise RuntimeError(f"No sensors found for dam ID {dam_id}!")
    
    print(f"Found {len(sensor_rows)} sensors for Victoria Dam.", flush=True)

    # Map sensor_type_id to config: (code, unit, baseline, amplitude, min_val, max_val)
    sensor_profiles = {
        1: {'name': 'Water Level',   'unit': 'm',      'base': 71.5, 'amp': 2.5,  'min': 68.0, 'max': 76.0},
        2: {'name': 'Rainfall',      'unit': 'mm/hr',  'base': 2.0,  'amp': 4.0,  'min': 0.0,  'max': 18.0},
        3: {'name': 'Inflow',        'unit': 'cumecs', 'base': 280.0,'amp': 25.0, 'min': 240.0,'max': 330.0},
        4: {'name': 'Outflow',       'unit': 'cumecs', 'base': 240.0,'amp': 18.0, 'min': 210.0,'max': 280.0},
        5: {'name': 'Soil Moisture', 'unit': '%',      'base': 42.0, 'amp': 4.5,  'min': 35.0, 'max': 52.0},
        6: {'name': 'Temperature',   'unit': 'C',      'base': 27.0, 'amp': 3.5,  'min': 22.0, 'max': 32.5},
    }

    # Find the earliest last_reading timestamp among Victoria sensors
    last_times = []
    for s in sensor_rows:
        sid = int(s['id'])
        res = records(f"SELECT MAX(recorded_at) as last_at FROM sensor_readings WHERE sensor_id={sid}")
        if res and res[0]['last_at']:
            # Strip microseconds if present
            raw = res[0]['last_at'].split('.')[0]
            last_times.append(datetime.fromisoformat(raw))
    
    if not last_times:
        start_time = datetime(2026, 10, 5, 12, 0, 0)
    else:
        # Start 1 hour after the maximum recorded reading
        start_time = max(last_times) + timedelta(hours=1)

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None, minute=0, second=0, microsecond=0)
    
    if start_time >= now_utc:
        print(f"Data is already up to date! Last reading: {start_time - timedelta(hours=1)}, Now: {now_utc}")
        return

    total_hours = int((now_utc - start_time).total_seconds() // 3600) + 1
    print(f"Generating hourly data from {start_time} to {now_utc} ({total_hours} hours)...", flush=True)

    readings_to_insert = []
    daily_buckets = {}  # (sensor_id, date_str) -> list of float values

    latest_values = {}

    for hour_idx in range(total_hours):
        current_dt = start_time + timedelta(hours=hour_idx)
        hour_of_day = current_dt.hour
        day_progression = (current_dt - datetime(2026, 1, 1)).total_seconds() / 3600.0

        for s in sensor_rows:
            sid = int(s['id'])
            stype = int(s['sensor_type_id'])
            prof = sensor_profiles.get(stype, {'unit': '', 'base': 50.0, 'amp': 5.0, 'min': 0.0, 'max': 100.0})

            # Calculate realistic sinusoidal value
            # Diurnal 24h wave + multi-day weather fluctuation
            diurnal = math.sin(2 * math.pi * (hour_of_day - 6) / 24.0)
            multi_day = math.sin(2 * math.pi * day_progression / (24.0 * 5.0))
            
            val = prof['base'] + (prof['amp'] * 0.7 * diurnal) + (prof['amp'] * 0.3 * multi_day)

            # Rainfall is non-negative and zero on clear hours
            if stype == 2:  # Rainfall
                if diurnal < 0.2:
                    val = 0.0
                else:
                    val = max(0.0, (val - prof['base']) * 2.0)
            
            val = round(max(prof['min'], min(prof['max'], val)), 4)
            latest_values[stype] = val

            readings_to_insert.append({
                'sensor_id': sid,
                'dam_id': dam_id,
                'reading_value': val,
                'unit': prof['unit'],
                'recorded_at': stamp(current_dt),
                'received_at': stamp(current_dt + timedelta(seconds=5)),
                'quality': 'good'
            })

            day_key = (sid, current_dt.date())
            daily_buckets.setdefault(day_key, []).append(val)

    # 1. Insert sensor_readings in batches
    print(f"Inserting {len(readings_to_insert):,} sensor readings...", flush=True)
    batch_size = 500
    for i in range(0, len(readings_to_insert), batch_size):
        batch = readings_to_insert[i:i + batch_size]
        values_sql = []
        for r in batch:
            v_str = f"({r['sensor_id']}, {r['dam_id']}, {r['reading_value']}, {quote(r['unit'])}, '{r['recorded_at']}', '{r['received_at']}', '{r['quality']}')"
            values_sql.append(v_str)
        insert_query = (
            "INSERT INTO sensor_readings (sensor_id, dam_id, reading_value, unit, recorded_at, received_at, quality) "
            "VALUES " + ", ".join(values_sql) + ";"
        )
        sql(insert_query)

    # 2. Insert / update daily aggregates for completed days (full 24h)
    print("Computing daily aggregates...", flush=True)
    agg_sql_list = []
    for (sid, d_date), vals in daily_buckets.items():
        if len(vals) < 24 and d_date == now_utc.date():
            # Current incomplete day, skip or aggregate what's available
            pass
        p_start = f"{d_date} 00:00:00"
        p_end = f"{d_date + timedelta(days=1)} 00:00:00"
        min_v = min(vals)
        max_v = max(vals)
        avg_v = round(sum(vals) / len(vals), 4)
        count_v = len(vals)
        
        agg_sql_list.append(
            f"({sid}, {dam_id}, 'daily', '{p_start}', '{p_end}', {min_v}, {max_v}, {avg_v}, {count_v})"
        )

    if agg_sql_list:
        for i in range(0, len(agg_sql_list), 200):
            batch = agg_sql_list[i:i + 200]
            query = (
                "INSERT INTO sensor_readings_aggregated "
                "(sensor_id, dam_id, aggregation_type, period_start, period_end, min_value, max_value, avg_value, reading_count) "
                "VALUES " + ", ".join(batch) + " "
                "ON DUPLICATE KEY UPDATE min_value=VALUES(min_value), max_value=VALUES(max_value), "
                "avg_value=VALUES(avg_value), reading_count=VALUES(reading_count);"
            )
            sql(query)

    # 3. Update dam_current_status for Victoria Dam
    latest_wl = latest_values.get(1, 71.5)
    latest_rain = latest_values.get(2, 0.0)
    latest_inflow = latest_values.get(3, 280.0)
    latest_outflow = latest_values.get(4, 240.0)

    # Last 24hr rainfall
    rain_sensor = next((s for s in sensor_rows if int(s['sensor_type_id']) == 2), None)
    rain_24h = 0.0
    if rain_sensor:
        r24 = records(
            f"SELECT COALESCE(SUM(reading_value), 0) as total FROM sensor_readings "
            f"WHERE sensor_id={rain_sensor['id']} AND recorded_at >= '{stamp(now_utc - timedelta(hours=24))}';"
        )
        if r24:
            rain_24h = round(float(r24[0]['total']), 2)

    status_update = (
        f"UPDATE dam_current_status SET "
        f"water_level_meters = {latest_wl}, "
        f"water_level_percentage = {latest_wl}, "
        f"storage_current_mcm = {round(latest_wl * 5.0, 4)}, "
        f"storage_percentage = {latest_wl}, "
        f"inflow_cumecs = {latest_inflow}, "
        f"outflow_cumecs = {latest_outflow}, "
        f"rainfall_last_1hr_mm = {latest_rain}, "
        f"rainfall_last_24hr_mm = {rain_24h}, "
        f"last_sensor_reading_at = '{stamp(now_utc)}', "
        f"last_updated = '{stamp(now_utc)}' "
        f"WHERE dam_id = {dam_id};"
    )
    sql(status_update)

    # 4. Update sensors.last_reading_at
    sql(f"UPDATE sensors SET last_reading_at = '{stamp(now_utc)}' WHERE dam_id = {dam_id};")

    print("\n================ Victoria Dam Mock Seeding Complete ================", flush=True)
    print(f"Total New Readings Inserted: {len(readings_to_insert):,}")
    print(f"Date Range Covered:          {start_time} to {now_utc}")
    print(f"Latest Water Level:          {latest_wl} m ({latest_wl}%)")
    print(f"Latest Inflow / Outflow:     {latest_inflow} / {latest_outflow} cumecs")
    print(f"Rainfall (1hr / 24hr):       {latest_rain} mm / {rain_24h} mm")
    print(f"Status Updated At:           {stamp(now_utc)}")
    print("====================================================================", flush=True)


if __name__ == '__main__':
    generate_victoria_data()
