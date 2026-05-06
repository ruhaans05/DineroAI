BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  CREATE TYPE user_role AS ENUM ('applicant', 'hirer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE auth_provider AS ENUM ('email', 'google');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE company_member_role AS ENUM ('owner', 'admin', 'recruiter', 'reviewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE resume_status AS ENUM ('uploaded', 'parsed', 'failed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE role_family AS ENUM ('software_engineering', 'machine_learning', 'data_science', 'product_engineering', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE seniority_level AS ENUM ('intern', 'entry', 'mid', 'senior', 'staff', 'principal', 'manager', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE suggestion_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE suggestion_status AS ENUM ('open', 'accepted', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE applicant_outcome_status AS ENUM ('planned', 'applied', 'interview', 'rejected', 'no_response', 'offer', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE hiring_feedback_verdict AS ENUM ('accurate', 'too_high', 'too_low', 'unclear');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  full_name text,
  role user_role NOT NULL,
  email_verified_at timestamptz,
  password_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider auth_provider NOT NULL,
  provider_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id),
  UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applicant_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  headline text,
  target_role_family role_family,
  target_seniority seniority_level DEFAULT 'unknown',
  preferred_locations text[] NOT NULL DEFAULT '{}',
  open_to_remote boolean NOT NULL DEFAULT true,
  data_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hiring_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain citext,
  website_url text,
  verification_email citext,
  verified_at timestamptz,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (domain)
);

CREATE TABLE IF NOT EXISTS hirer_company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES hiring_companies(id) ON DELETE CASCADE,
  role company_member_role NOT NULL DEFAULT 'recruiter',
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_profile_id uuid NOT NULL REFERENCES applicant_profiles(id) ON DELETE CASCADE,
  original_filename text NOT NULL,
  storage_url text NOT NULL,
  file_sha256 text,
  status resume_status NOT NULL DEFAULT 'uploaded',
  parsed_text text,
  parsed_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  base_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES hiring_companies(id) ON DELETE SET NULL,
  source_id uuid REFERENCES job_sources(id) ON DELETE SET NULL,
  external_id text,
  title text NOT NULL,
  company_name text NOT NULL,
  role_family role_family NOT NULL DEFAULT 'other',
  seniority seniority_level NOT NULL DEFAULT 'unknown',
  location text,
  remote_allowed boolean NOT NULL DEFAULT false,
  employment_type text,
  description text NOT NULL,
  extracted_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_url text,
  posted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_id)
);

CREATE TABLE IF NOT EXISTS job_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_listing_id uuid NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  requirement_type text NOT NULL,
  name text NOT NULL,
  importance integer NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  evidence text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_listing_id, requirement_type, name)
);

CREATE TABLE IF NOT EXISTS match_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  job_listing_id uuid NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  interview_probability numeric(5, 2) NOT NULL CHECK (interview_probability >= 0 AND interview_probability <= 100),
  confidence numeric(5, 2) CHECK (confidence >= 0 AND confidence <= 100),
  model_version text NOT NULL DEFAULT 'baseline_v1',
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resume_id, job_listing_id, model_version)
);

CREATE TABLE IF NOT EXISTS resume_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_score_id uuid NOT NULL REFERENCES match_scores(id) ON DELETE CASCADE,
  priority suggestion_priority NOT NULL DEFAULT 'medium',
  status suggestion_status NOT NULL DEFAULT 'open',
  category text NOT NULL,
  title text NOT NULL,
  recommendation text NOT NULL,
  job_requirement_id uuid REFERENCES job_requirements(id) ON DELETE SET NULL,
  expected_score_lift numeric(5, 2) CHECK (expected_score_lift >= 0 AND expected_score_lift <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applicant_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_profile_id uuid NOT NULL REFERENCES applicant_profiles(id) ON DELETE CASCADE,
  job_listing_id uuid NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  match_score_id uuid REFERENCES match_scores(id) ON DELETE SET NULL,
  status applicant_outcome_status NOT NULL,
  applied_at timestamptz,
  outcome_at timestamptz,
  notes text,
  data_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hiring_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES hiring_companies(id) ON DELETE CASCADE,
  job_listing_id uuid NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  match_score_id uuid REFERENCES match_scores(id) ON DELETE SET NULL,
  reviewer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  verdict hiring_feedback_verdict NOT NULL,
  notes text,
  useful boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bias_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_listing_id uuid NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES hiring_companies(id) ON DELETE CASCADE,
  public_opt_in boolean NOT NULL DEFAULT false,
  bias_score numeric(5, 2) CHECK (bias_score >= 0 AND bias_score <= 100),
  model_version text NOT NULL DEFAULT 'bias_baseline_v1',
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_listing_id, model_version)
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_resumes_applicant_profile_id ON resumes(applicant_profile_id);
CREATE INDEX IF NOT EXISTS idx_job_listings_role_family ON job_listings(role_family);
CREATE INDEX IF NOT EXISTS idx_job_listings_company_id ON job_listings(company_id);
CREATE INDEX IF NOT EXISTS idx_job_requirements_job_listing_id ON job_requirements(job_listing_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_resume_id ON match_scores(resume_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_job_listing_id ON match_scores(job_listing_id);
CREATE INDEX IF NOT EXISTS idx_resume_suggestions_match_score_id ON resume_suggestions(match_score_id);
CREATE INDEX IF NOT EXISTS idx_applicant_outcomes_profile_id ON applicant_outcomes(applicant_profile_id);
CREATE INDEX IF NOT EXISTS idx_hiring_feedback_company_id ON hiring_feedback(company_id);
CREATE INDEX IF NOT EXISTS idx_bias_assessments_public ON bias_assessments(public_opt_in) WHERE public_opt_in = true;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_applicant_profiles_updated_at ON applicant_profiles;
CREATE TRIGGER trg_applicant_profiles_updated_at
BEFORE UPDATE ON applicant_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_hiring_companies_updated_at ON hiring_companies;
CREATE TRIGGER trg_hiring_companies_updated_at
BEFORE UPDATE ON hiring_companies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_hirer_company_memberships_updated_at ON hirer_company_memberships;
CREATE TRIGGER trg_hirer_company_memberships_updated_at
BEFORE UPDATE ON hirer_company_memberships
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_resumes_updated_at ON resumes;
CREATE TRIGGER trg_resumes_updated_at
BEFORE UPDATE ON resumes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_job_listings_updated_at ON job_listings;
CREATE TRIGGER trg_job_listings_updated_at
BEFORE UPDATE ON job_listings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_resume_suggestions_updated_at ON resume_suggestions;
CREATE TRIGGER trg_resume_suggestions_updated_at
BEFORE UPDATE ON resume_suggestions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_applicant_outcomes_updated_at ON applicant_outcomes;
CREATE TRIGGER trg_applicant_outcomes_updated_at
BEFORE UPDATE ON applicant_outcomes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_bias_assessments_updated_at ON bias_assessments;
CREATE TRIGGER trg_bias_assessments_updated_at
BEFORE UPDATE ON bias_assessments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
