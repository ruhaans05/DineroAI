BEGIN;

INSERT INTO job_sources (name, base_url)
VALUES
  ('Manual Import', NULL),
  ('Company Careers Page', NULL)
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (email, full_name, role, email_verified_at)
VALUES
  ('applicant@example.com', 'Demo Applicant', 'applicant', now()),
  ('hirer@example.com', 'Demo Hirer', 'hirer', now())
ON CONFLICT (email) DO NOTHING;

INSERT INTO applicant_profiles (user_id, headline, target_role_family, target_seniority, preferred_locations, open_to_remote, data_opt_in)
SELECT id, 'Backend and ML-focused software engineer', 'machine_learning', 'entry', ARRAY['New York', 'Remote'], true, true
FROM users
WHERE email = 'applicant@example.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO hiring_companies (name, domain, website_url, verification_email, verified_at, created_by_user_id)
SELECT 'Northstar Labs', 'northstarlabs.example', 'https://northstarlabs.example', 'hirer@northstarlabs.example', now(), id
FROM users
WHERE email = 'hirer@example.com'
ON CONFLICT (domain) DO NOTHING;

INSERT INTO hirer_company_memberships (user_id, company_id, role, verified_at)
SELECT users.id, hiring_companies.id, 'owner', now()
FROM users
CROSS JOIN hiring_companies
WHERE users.email = 'hirer@example.com'
  AND hiring_companies.domain = 'northstarlabs.example'
ON CONFLICT (user_id, company_id) DO NOTHING;

INSERT INTO resumes (applicant_profile_id, original_filename, storage_url, status, parsed_text, parsed_json, version, is_primary)
SELECT
  applicant_profiles.id,
  'demo-resume.pdf',
  's3://dinero-dev-resumes/demo-resume.pdf',
  'parsed',
  'Python, FastAPI, PostgreSQL, React, machine learning projects, model evaluation, and backend APIs.',
  '{"skills": ["Python", "FastAPI", "PostgreSQL", "React", "Machine Learning"], "years_experience": 1}'::jsonb,
  1,
  true
FROM applicant_profiles
JOIN users ON users.id = applicant_profiles.user_id
WHERE users.email = 'applicant@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO job_listings (
  company_id,
  source_id,
  external_id,
  title,
  company_name,
  role_family,
  seniority,
  location,
  remote_allowed,
  employment_type,
  description,
  extracted_requirements,
  source_url,
  posted_at
)
SELECT
  hiring_companies.id,
  job_sources.id,
  'northstar-ml-platform-engineer-1',
  'Machine Learning Platform Engineer',
  'Northstar Labs',
  'machine_learning',
  'entry',
  'New York, NY',
  true,
  'Full-time',
  'Build APIs and infrastructure for ML workflows using Python, PostgreSQL, cloud services, and model evaluation tooling.',
  '{"required": ["Python", "APIs", "PostgreSQL"], "preferred": ["ML workflows", "cloud services", "model evaluation"]}'::jsonb,
  'https://northstarlabs.example/jobs/ml-platform-engineer',
  now()
FROM hiring_companies
JOIN job_sources ON job_sources.name = 'Manual Import'
WHERE hiring_companies.domain = 'northstarlabs.example'
ON CONFLICT (source_id, external_id) DO NOTHING;

INSERT INTO job_requirements (job_listing_id, requirement_type, name, importance, evidence)
SELECT job_listings.id, requirement_type, name, importance, evidence
FROM job_listings
CROSS JOIN (
  VALUES
    ('skill', 'Python', 5, 'Required for backend ML workflow services.'),
    ('skill', 'PostgreSQL', 4, 'Used for product and scoring data.'),
    ('skill', 'Cloud services', 3, 'Preferred for production deployments.'),
    ('experience', 'Model evaluation', 4, 'Needed to judge prediction quality.')
) AS requirements(requirement_type, name, importance, evidence)
WHERE job_listings.external_id = 'northstar-ml-platform-engineer-1'
ON CONFLICT (job_listing_id, requirement_type, name) DO NOTHING;

INSERT INTO match_scores (resume_id, job_listing_id, interview_probability, confidence, model_version, score_breakdown, explanation)
SELECT
  resumes.id,
  job_listings.id,
  68.50,
  61.00,
  'baseline_v1',
  '{"skills": 76, "experience": 58, "seniority": 72, "ats_readability": 80}'::jsonb,
  'Strong Python, PostgreSQL, and ML alignment. Resume should add clearer cloud deployment evidence and model evaluation outcomes.'
FROM resumes
JOIN job_listings ON job_listings.external_id = 'northstar-ml-platform-engineer-1'
WHERE resumes.original_filename = 'demo-resume.pdf'
ON CONFLICT (resume_id, job_listing_id, model_version) DO NOTHING;

INSERT INTO resume_suggestions (match_score_id, priority, category, title, recommendation, expected_score_lift)
SELECT
  match_scores.id,
  'high',
  'experience_evidence',
  'Add production ML deployment evidence',
  'Add a resume bullet showing ownership of a deployed ML workflow, the tools used, and the measured product or business impact.',
  8.00
FROM match_scores
ON CONFLICT DO NOTHING;

COMMIT;
