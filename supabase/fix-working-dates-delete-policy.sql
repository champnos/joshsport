ALTER TABLE working_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS working_dates_no_anon_delete ON working_dates;
DROP POLICY IF EXISTS working_dates_delete_admin ON working_dates;
DROP POLICY IF EXISTS working_dates_delete_service_role ON working_dates;

CREATE POLICY working_dates_delete_service_role ON working_dates
  FOR DELETE
  TO service_role
  USING (true);
