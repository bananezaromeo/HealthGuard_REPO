SELECT d.doctor_id, u.user_id, u.full_name, d.verification_status FROM doctors d
JOIN users u ON d.user_id = u.user_id
ORDER BY d.doctor_id;
