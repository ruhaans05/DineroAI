# Dinero

Dinero helps job applicants understand which roles they are most likely to interview for, why those roles fit, and what concrete resume changes would improve their odds.

The product starts with CS, software engineering, machine learning, and data science roles. Applicants upload a resume, select or discover target jobs, and receive a role-specific interview likelihood score with practical resume feedback. Over time, opt-in applicant and hiring-team feedback improves the prediction model.

## Vision

Most job seekers apply with limited signal. They do not know which roles are worth their time, what an ATS or recruiter may miss, or how to tailor their resume without guessing.

Dinero is designed to become a resume-to-role matching layer that:

- Scores how likely an applicant is to get an interview for a specific job.
- Explains the score in plain language.
- Recommends exact resume improvements based on the job description.
- Learns from user-reported outcomes such as interview, rejection, no response, or offer.
- Lets hiring teams validate prediction quality against real applicants.
- Eventually supports opt-in job description bias analysis for hiring teams.

## Core User Flows

### Applicants

1. Create an account or sign in with Google.
2. Upload one or more resumes as PDFs.
3. Search or select target roles.
4. Compare their resume against each job description.
5. Receive an interview chance score, such as `64%`.
6. Review specific resume suggestions to improve the match.
7. Track outcomes and optionally share feedback to improve future predictions.

### Hiring Teams

1. Create a hiring-team account.
2. Add or sync job listings.
3. View applicant match predictions.
4. Mark whether predictions are useful or inaccurate.
5. Optionally enable bias scoring for specific job descriptions.

## Key Features

- Applicant profiles with authentication and Google sign-in.
- Resume PDF upload, parsing, storage, and versioning.
- Job listing ingestion for CS, SWE, ML, and DS roles.
- Resume-to-job matching using structured resume data and job description analysis.
- Interview likelihood scoring with an actual numeric percentage.
- Resume feedback that identifies missing skills, weak evidence, unclear phrasing, and role-specific improvements.
- Outcome tracking so applicants can report whether they received an interview.
- Hiring-team feedback loops to improve prediction quality.
- PostgreSQL-backed storage for users, resumes, jobs, scores, suggestions, and feedback.
- Modern React frontend focused on a smooth applicant experience.
- Future opt-in bias analysis for job descriptions.

## Initial Tech Stack

- Frontend: React with TypeScript.
- Backend: Node.js/TypeScript or Python/FastAPI.
- Database: PostgreSQL.
- Authentication: Email/password plus Google OAuth.
- File storage: Resume PDFs stored in object storage, with parsed metadata stored in PostgreSQL.
- AI/NLP: Resume parsing, job description extraction, match scoring, and feedback generation.
- Analytics/modeling: Opt-in outcome data used to calibrate interview probability over time.

## Local Database

Dinero uses PostgreSQL for user accounts, applicant profiles, company accounts, resumes, job listings, match scores, resume suggestions, applicant outcomes, hiring-team feedback, and future opt-in bias assessments.

To start the local database:

```bash
cp .env.example .env
npm run db:up
npm run db:migrate
npm run db:seed
```

Useful commands:

```bash
npm run db:shell
npm run db:logs
npm run db:down
```

The default local connection string is:

```text
postgresql://dinero:dinero_dev_password@localhost:5432/dinero
```

## Local API

The signup flow is backed by a local Express API connected to PostgreSQL.

Start the database, apply migrations, then start the API:

```bash
npm run db:up
npm run db:migrate
npm run api:dev
```

In another terminal, start the React frontend:

```bash
npm run dev -- --port 5174
```

The frontend proxies `/api` requests to `http://localhost:8787`.

Implemented API routes:

- `GET /api/health`
- `GET /api/companies`
- `GET /api/me`
- `POST /api/applicants/signup`
- `POST /api/hirers/signup`
- `POST /api/signin`
- `POST /api/logout`
- `POST /api/verify-email`

Signup and signin create HTTP-only session cookies backed by the `user_sessions` table. Email verification tokens are stored in the database. Actual email sending is intentionally not wired yet.

## Company Verification

When a hirer signs up with a new company, Dinero first checks whether the company already exists in the app by name or email domain. If no existing company matches, it creates a company record and stores a verification check.

If no verification provider is configured, new companies are saved as `pending` for manual review.

To wire an AI search provider later, set:

```bash
COMPANY_VERIFICATION_PROVIDER=perplexity
COMPANY_VERIFICATION_API_KEY=your_key_here
```

or:

```bash
COMPANY_VERIFICATION_PROVIDER=grok
COMPANY_VERIFICATION_API_KEY=your_key_here
```

Optional provider overrides:

```bash
COMPANY_VERIFICATION_API_URL=
COMPANY_VERIFICATION_MODEL=
```

The provider response is stored in `company_verification_checks`, and summarized fields are copied to `hiring_companies`.

## Data Model Draft

Core tables:

- `users`: Applicant and hiring-team login details.
- `applicant_profiles`: Applicant profile metadata and preferences.
- `hiring_teams`: Company or recruiter accounts.
- `resumes`: Uploaded PDF metadata, storage URL, parsed text, and version history.
- `job_listings`: Job title, company, location, description, source, role family, seniority, and extracted requirements.
- `match_scores`: Resume-to-job score, model version, confidence, explanation, and created timestamp.
- `resume_suggestions`: Concrete recommendations tied to a match score.
- `applicant_outcomes`: User-reported outcomes such as interview, rejection, no response, or offer.
- `hiring_feedback`: Hiring-team feedback on whether predictions matched their review.
- `bias_assessments`: Optional job description bias analysis for roles where the hiring team opts in.

## Scoring Approach

The first version should combine:

- Resume-to-job requirement overlap.
- Required and preferred skills coverage.
- Experience relevance.
- Project and impact evidence.
- Seniority fit.
- Education or certification fit when relevant.
- Resume clarity and ATS readability.

The score should be presented as an estimated interview chance, not a guarantee. As users opt in to share outcomes, the score can be calibrated against real interview results.

Example:

```text
Estimated interview chance: 64%

Main reasons:
- Strong Python, backend, and ML project alignment.
- Missing clear evidence of production model deployment.
- Job asks for AWS experience, but resume only mentions cloud generally.

Suggested resume updates:
- Add a bullet showing deployed ML model ownership, metrics, and production impact.
- Clarify AWS tools used, such as S3, Lambda, SageMaker, or ECS if accurate.
- Move the most relevant ML project higher on the resume.
```

## Feedback Loop

Prediction quality improves when the system learns where it was wrong.

Applicant feedback:

- Did they apply?
- Did they receive an interview?
- Did they receive a rejection?
- Did they receive no response?
- Did they receive an offer?

Hiring-team feedback:

- Was the prediction useful?
- Did the score match their review of the candidate?
- Which qualifications mattered most?
- Was anything overvalued or undervalued?

The model should track prediction accuracy by role type, company type, seniority, resume version, and model version.

## Bias Analysis Future Direction

Bias scoring should only be shown publicly when a hiring team opts in for a specific role.

Potential checks:

- Gendered or exclusionary language.
- Unnecessary credential requirements.
- Inflated years-of-experience requirements.
- Vague culture-fit language.
- Requirements that may reduce applicant diversity without clear job relevance.

## MVP Scope

1. Applicant auth with Google sign-in.
2. Resume PDF upload and parsing.
3. Job listing ingestion for CS/SWE/ML/DS roles.
4. Resume-to-job score with numeric interview likelihood.
5. Concrete resume suggestions for a selected job.
6. User outcome feedback after applying.
7. PostgreSQL schema for storing profiles, resumes, jobs, scores, and feedback.
8. Modern React dashboard for uploading resumes, browsing roles, viewing scores, and tracking outcomes.

## Product Principle

Dinero should not tell users to apply everywhere. It should help them spend time where they have the strongest chance, understand why, and improve their resume with evidence-based changes.
