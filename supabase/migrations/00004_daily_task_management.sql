
-- Departments master
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read departments" ON public.departments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage departments" ON public.departments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.departments (name) VALUES
  ('Accounts'),
  ('MIS/Back Office'),
  ('Warehouse Operations'),
  ('Sales'),
  ('Purchase'),
  ('Administration')
ON CONFLICT (name) DO NOTHING;

-- Daily task report header
CREATE TABLE IF NOT EXISTS public.daily_task_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  employee_name text NOT NULL,
  designation text,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  issues_requirements text,
  plan_for_tomorrow text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_task_reports_date ON public.daily_task_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_daily_task_reports_user ON public.daily_task_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_task_reports_dept ON public.daily_task_reports(department_id);

-- Completed / daily task line items
CREATE TABLE IF NOT EXISTS public.daily_task_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.daily_task_reports(id) ON DELETE CASCADE,
  task_type text NOT NULL DEFAULT '',
  work_description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Completed',
  remarks text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_task_items_report ON public.daily_task_items(report_id);

-- Pending / ongoing work line items
CREATE TABLE IF NOT EXISTS public.pending_task_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.daily_task_reports(id) ON DELETE CASCADE,
  task_type text NOT NULL DEFAULT '',
  work_description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Ongoing',
  expected_completion date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_task_items_report ON public.pending_task_items(report_id);

ALTER TABLE public.daily_task_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_task_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_task_items ENABLE ROW LEVEL SECURITY;

-- Reports: own rows + admin read all
CREATE POLICY "Users read own daily task reports" ON public.daily_task_reports
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users insert own daily task reports" ON public.daily_task_reports
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own daily task reports" ON public.daily_task_reports
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own daily task reports" ON public.daily_task_reports
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Task items: access via report ownership
CREATE POLICY "Access daily task items via report" ON public.daily_task_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_task_reports r
      WHERE r.id = report_id
        AND (r.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_task_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Access pending task items via report" ON public.pending_task_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_task_reports r
      WHERE r.id = report_id
        AND (r.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_task_reports r
      WHERE r.id = report_id AND r.user_id = auth.uid()
    )
  );
