
-- Verifica timezone attuale del database
SELECT 
    'Database Timezone' as info,
    current_setting('timezone') as timezone_attuale,
    now() as ora_database,
    now() at time zone 'Europe/Rome' as ora_italia,
    now() at time zone 'UTC' as ora_utc;

-- Mostra differenza tra UTC e Italia
SELECT 
    'Differenza UTC vs Italia' as info,
    EXTRACT(hour from (now() at time zone 'Europe/Rome' - now() at time zone 'UTC')) as ore_differenza,
    CASE 
        WHEN EXTRACT(hour from (now() at time zone 'Europe/Rome' - now() at time zone 'UTC')) = 1 THEN 'CET (Inverno)'
        WHEN EXTRACT(hour from (now() at time zone 'Europe/Rome' - now() at time zone 'UTC')) = 2 THEN 'CEST (Estate)'
        ELSE 'Timezone non riconosciuto'
    END as tipo_orario;

