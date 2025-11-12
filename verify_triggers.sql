-- Verifica trigger email installati
SELECT
    trigger_name,
    event_object_table as tabella,
    action_timing as quando,
    event_manipulation as evento
FROM information_schema.triggers
WHERE trigger_name IN (
    'trigger_notify_new_employee',
    'trigger_notify_leave_request',
    'trigger_notify_leave_status_change'
)
ORDER BY event_object_table, trigger_name;
