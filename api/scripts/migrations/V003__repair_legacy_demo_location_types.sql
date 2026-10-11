-- The old Hibernate schema omitted the location-type FK. The v1 generator
-- assigned sequential, invalid type IDs to some synthetic safe locations.
-- Repair only orphaned, manifest-owned v1/v2 demo rows, using the original
-- four demo lookup codes. Real records and already-valid references are retained.
CREATE TABLE IF NOT EXISTS ddas_demo_seed_runs (
    seed_key VARCHAR(50) PRIMARY KEY,
    manifest JSON NOT NULL
) ENGINE=InnoDB;

UPDATE system_safe_locations l
JOIN ddas_demo_seed_runs run ON run.seed_key='ddas-demo'
JOIN JSON_TABLE(run.manifest,'$.tables[*]' COLUMNS (
    table_name VARCHAR(100) PATH '$.table',
    first_id BIGINT PATH '$.ids[0]',
    last_id BIGINT PATH '$.ids[1]'
)) AS seed_span ON seed_span.table_name='system_safe_locations'
JOIN location_types t ON t.code=CONCAT('DEMO-',LPAD(1+MOD(l.id-seed_span.first_id,4),3,'0'))
LEFT JOIN location_types old_type ON old_type.id=l.location_type_id
SET l.location_type_id=t.id
WHERE old_type.id IS NULL
  AND l.id BETWEEN seed_span.first_id AND seed_span.last_id
  AND l.code REGEXP '^(DEMO-[0-9]{3}|VICTORIA-DEMO-SAFE-[0-9]{2})$'
  AND EXISTS (SELECT 1 FROM users owner
      WHERE owner.uuid='f8f1ef4e-23d8-5a8b-8b19-f75b6dd24220'
        AND owner.email='demo001@example.invalid');
