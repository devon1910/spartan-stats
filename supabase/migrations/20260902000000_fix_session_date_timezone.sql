-- TuesdayCalendar previously formatted local-midnight Date objects with
-- toISOString(), which shifted every session back to Monday in UTC+ time zones.
-- Spartan sessions are Tuesday-only, so restore the intended local dates.
UPDATE sessions AS monday_session
SET session_date = monday_session.session_date + 1
WHERE EXTRACT(ISODOW FROM monday_session.session_date) = 1
  AND NOT EXISTS (
    SELECT 1
    FROM sessions AS tuesday_session
    WHERE tuesday_session.session_date = monday_session.session_date + 1
  );
