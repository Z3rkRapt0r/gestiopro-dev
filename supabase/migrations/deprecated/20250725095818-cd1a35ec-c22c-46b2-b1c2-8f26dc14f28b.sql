-- Rimuovo la vista SECURITY DEFINER non sicura
DROP VIEW IF EXISTS upcoming_leaves;

-- Ricreo la vista senza SECURITY DEFINER
CREATE VIEW upcoming_leaves AS
SELECT 
  lr.id,
  lr.user_id,
  lr.type,
  CASE 
    WHEN lr.type = 'ferie' THEN lr.date_from
    ELSE lr.day
  END as start_date,
  CASE 
    WHEN lr.type = 'ferie' THEN lr.date_to
    ELSE lr.day
  END as end_date,
  lr.note,
  lr.status,
  lr.admin_note,
  lr.reviewed_at,
  lr.reviewed_by,
  lr.date_to,
  lr.date_from,
  lr.time_to,
  lr.time_from,
  lr.day,
  lr.updated_at,
  lr.notify_employee,
  lr.leave_balance_id,
  lr.created_at,
  p.first_name,
  p.last_name,
  p.email
FROM leave_requests lr
JOIN profiles p ON lr.user_id = p.id
WHERE lr.status = 'approved' 
  AND (
    (lr.type = 'ferie' AND lr.date_from >= CURRENT_DATE) OR
    (lr.type = 'permesso' AND lr.day >= CURRENT_DATE)
  );