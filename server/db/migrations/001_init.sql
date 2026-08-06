-- ---------------------------------------------------------------------------
-- 001_init.sql - GRAG Production ERP base schema
--
-- Every business table carries company_id so that a company's rows are never
-- visible to another company (steps.md: "each company have company id connected
-- to every row to identifies which company data it is").
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --- enums ------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('root', 'owner', 'admin', 'grey', 'embroidery', 'handwork');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('pending', 'active', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Grey dupatta: "no" or, when yes, tone / contrast.
DO $$ BEGIN
  CREATE TYPE grey_dupatta AS ENUM ('no', 'tone', 'contrast');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Challan dupatta: "yes" or, when no, diamond / chain / plain.
DO $$ BEGIN
  CREATE TYPE challan_dupatta AS ENUM ('yes', 'diamond', 'chain', 'plain');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE work_kind AS ENUM ('embroidery', 'handwork');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --- companies --------------------------------------------------------------

CREATE TABLE IF NOT EXISTS companies (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  BIGINT,
  UNIQUE (name)
);

-- --- users ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  google_sub      TEXT UNIQUE,
  email           TEXT        NOT NULL UNIQUE,
  name            TEXT        NOT NULL DEFAULT '',
  picture         TEXT,
  username        TEXT UNIQUE CHECK (char_length(username) <= 12),
  pin_hash        TEXT,
  role            user_role   NOT NULL DEFAULT 'grey',
  status          user_status NOT NULL DEFAULT 'pending',
  refresh_token   TEXT,
  last_access_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one root user may ever exist (steps.md: "their can only be one root user").
CREATE UNIQUE INDEX IF NOT EXISTS users_single_root_idx
  ON users ((role)) WHERE role = 'root';

-- --- masters ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS masters (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id  BIGINT      NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  mobile      TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  BIGINT REFERENCES users (id),
  updated_by  BIGINT REFERENCES users (id),
  deleted_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS masters_company_name_idx
  ON masters (company_id, lower(name)) WHERE deleted_at IS NULL;

-- --- grey lots --------------------------------------------------------------

CREATE TABLE IF NOT EXISTS grey_lots (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id  BIGINT       NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  lot_no      TEXT         NOT NULL,
  date        DATE         NOT NULL,
  master_id   BIGINT REFERENCES masters (id),
  fabric      TEXT,
  chart       TEXT,
  cut         TEXT,
  quantity    NUMERIC(12,2) NOT NULL DEFAULT 0,
  dupatta     grey_dupatta  NOT NULL DEFAULT 'no',
  bottom      BOOLEAN       NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by  BIGINT REFERENCES users (id),
  updated_by  BIGINT REFERENCES users (id),
  deleted_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS grey_lots_company_lot_idx
  ON grey_lots (company_id, lot_no) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS grey_lots_company_date_idx ON grey_lots (company_id, date DESC);

-- --- issue challans ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS issue_challans (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id  BIGINT        NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  kind        work_kind     NOT NULL,
  challan_no  TEXT          NOT NULL,
  date        DATE          NOT NULL,
  lot_id      BIGINT        NOT NULL REFERENCES grey_lots (id),
  master_id   BIGINT REFERENCES masters (id),
  fabric      TEXT,
  design      TEXT,
  dupatta     challan_dupatta,
  dup_qty     NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity    NUMERIC(12,2) NOT NULL DEFAULT 0,
  rate        NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by  BIGINT REFERENCES users (id),
  updated_by  BIGINT REFERENCES users (id),
  deleted_at  TIMESTAMPTZ,
  CHECK (dup_qty >= 0 AND quantity >= 0 AND rate >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS issue_challans_no_idx
  ON issue_challans (company_id, kind, challan_no) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS issue_challans_lot_idx ON issue_challans (lot_id);
CREATE INDEX IF NOT EXISTS issue_challans_company_kind_date_idx
  ON issue_challans (company_id, kind, date DESC);

-- --- receive challans -------------------------------------------------------

CREATE TABLE IF NOT EXISTS receive_challans (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id        BIGINT        NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  kind              work_kind     NOT NULL,
  issue_challan_id  BIGINT        NOT NULL REFERENCES issue_challans (id),
  challan_no        TEXT          NOT NULL,
  retail_challan_no TEXT,
  date              DATE          NOT NULL,
  lot_id            BIGINT        NOT NULL REFERENCES grey_lots (id),
  master_id         BIGINT REFERENCES masters (id),
  fabric            TEXT,
  design            TEXT,
  dupatta           challan_dupatta,
  dup_qty           NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity          NUMERIC(12,2) NOT NULL DEFAULT 0,
  rate              NUMERIC(12,2) NOT NULL DEFAULT 0,
  damaged           NUMERIC(12,2) NOT NULL DEFAULT 0,
  loss              NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount            NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by        BIGINT REFERENCES users (id),
  updated_by        BIGINT REFERENCES users (id),
  deleted_at        TIMESTAMPTZ,
  CHECK (dup_qty >= 0 AND quantity >= 0 AND rate >= 0 AND damaged >= 0 AND loss >= 0)
);

CREATE INDEX IF NOT EXISTS receive_challans_issue_idx ON receive_challans (issue_challan_id);
CREATE INDEX IF NOT EXISTS receive_challans_company_kind_date_idx
  ON receive_challans (company_id, kind, date DESC);

-- --- edit history -----------------------------------------------------------
-- steps.md: "Every can be editable but keep the previous data too"

CREATE TABLE IF NOT EXISTS record_revisions (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name    TEXT        NOT NULL,
  record_id     BIGINT      NOT NULL,
  company_id    BIGINT      NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  version       INTEGER     NOT NULL,
  previous_data JSONB       NOT NULL,
  changed_by    BIGINT REFERENCES users (id),
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS record_revisions_unique_idx
  ON record_revisions (table_name, record_id, version);
CREATE INDEX IF NOT EXISTS record_revisions_lookup_idx
  ON record_revisions (table_name, record_id);

-- --- activity log -----------------------------------------------------------
-- steps.md: "It shows every change onto the web application.
--            All logins and exits for every user."

CREATE TABLE IF NOT EXISTS activity_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id  BIGINT REFERENCES companies (id) ON DELETE SET NULL,
  user_id     BIGINT REFERENCES users (id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  entity      TEXT,
  entity_id   BIGINT,
  details     JSONB,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_created_idx ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_company_idx ON activity_logs (company_id, created_at DESC);

-- --- session store (connect-pg-simple) --------------------------------------

CREATE TABLE IF NOT EXISTS session (
  sid    TEXT PRIMARY KEY,
  sess   JSON        NOT NULL,
  expire TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS session_expire_idx ON session (expire);
