import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import heroImage from "./assets/hero-dinero.png";
import "./styles.css";

type View = "home" | "applicant" | "hirer";
type AuthMode = "signin" | "signup";

const roleTypes = ["Software Engineering", "Machine Learning", "Data Science", "Product Engineering"];
const companies = ["Select a company", "Northstar Labs", "BrightHire Systems", "Atlas Data", "Add a new company"];

function App() {
  const [view, setView] = useState<View>("home");

  return (
    <div className="app-shell">
      <Header view={view} onNavigate={setView} />
      {view === "home" && <LandingPage onNavigate={setView} />}
      {view === "applicant" && <ApplicantAuth />}
      {view === "hirer" && <HirerAuth />}
    </div>
  );
}

function Header({ view, onNavigate }: { view: View; onNavigate: (view: View) => void }) {
  return (
    <header className="site-header">
      <button className="brand" onClick={() => onNavigate("home")} aria-label="Go to Dinero home">
        <span className="brand-mark">$</span>
        <span>Dinero</span>
      </button>
      <nav aria-label="Primary navigation">
        <button className={view === "home" ? "nav-link active" : "nav-link"} onClick={() => onNavigate("home")}>
          Home
        </button>
        <button
          className={view === "applicant" ? "nav-link active" : "nav-link"}
          onClick={() => onNavigate("applicant")}
        >
          Applicants
        </button>
        <button className={view === "hirer" ? "nav-link active" : "nav-link"} onClick={() => onNavigate("hirer")}>
          Hirers
        </button>
      </nav>
    </header>
  );
}

function LandingPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  return (
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Resume-to-role intelligence</p>
          <h1>Find the jobs most likely to pay off.</h1>
          <p className="hero-text">
            Dinero compares a resume against real job descriptions, estimates interview likelihood, and shows the
            changes that can raise a candidate's chance before they apply.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onNavigate("applicant")}>
              Applicant sign in
            </button>
            <button className="secondary-button" onClick={() => onNavigate("hirer")}>
              Hirer sign in
            </button>
          </div>
          <div className="metric-strip" aria-label="Dinero product highlights">
            <div>
              <strong>72%</strong>
              <span>example interview fit</span>
            </div>
            <div>
              <strong>3 min</strong>
              <span>resume scan flow</span>
            </div>
            <div>
              <strong>CS/SWE</strong>
              <span>first role focus</span>
            </div>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <img src={heroImage} alt="" />
        </div>
      </section>

      <section className="audience-section" aria-labelledby="audience-title">
        <div className="section-heading">
          <p className="eyebrow">Two sides, better signal</p>
          <h2 id="audience-title">Built for applicants and hiring teams.</h2>
        </div>
        <div className="audience-grid">
          <article className="audience-card applicant-card">
            <span className="card-label">For applicants</span>
            <h3>Apply where your odds are strongest.</h3>
            <p>
              Upload a resume, pick target roles, and see an interview likelihood score with the exact skills,
              projects, and wording that should be strengthened.
            </p>
            <button className="text-button" onClick={() => onNavigate("applicant")}>
              Continue as applicant
            </button>
          </article>
          <article className="audience-card hirer-card">
            <span className="card-label">For hirers</span>
            <h3>Review fit with clearer context.</h3>
            <p>
              Hiring teams can connect roles, review Dinero's predictions, and send feedback when a match score is
              useful, too generous, or too conservative.
            </p>
            <button className="text-button" onClick={() => onNavigate("hirer")}>
              Continue as hirer
            </button>
          </article>
        </div>
      </section>

      <section className="how-section" aria-labelledby="how-title">
        <div className="section-heading">
          <p className="eyebrow">How Dinero works</p>
          <h2 id="how-title">From resume to higher-confidence applications.</h2>
        </div>
        <div className="steps-grid">
          {[
            ["Scan", "Parse the resume and the job description into skills, evidence, seniority, and ATS signals."],
            ["Score", "Estimate the applicant's interview chance for that exact role with a clear numeric score."],
            ["Improve", "Recommend specific resume updates that can raise the match before the application is sent."],
            ["Learn", "Use opt-in applicant and hiring-team outcomes to calibrate future predictions over time."],
          ].map(([title, body], index) => (
            <article className="step-card" key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function ApplicantAuth() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const submitLabel = mode === "signin" ? "Sign in as applicant" : "Create applicant account";

  return (
    <AuthLayout
      eyebrow="Applicant portal"
      title="Turn a resume into a smarter application strategy."
      body="Sign in to track target roles, compare your resume against job descriptions, and see which changes could lift your interview chance."
      previewTitle="Applicant outcome loop"
      previewItems={["Resume PDF upload", "Interview chance by role", "Email verification after signup"]}
    >
      <SegmentedControl mode={mode} setMode={setMode} />
      <form className="auth-form">
        <label>
          Email
          <input type="email" placeholder="you@example.com" />
        </label>
        <label>
          Password
          <input type="password" placeholder="Enter your password" />
        </label>
        {mode === "signup" && (
          <>
            <label>
              Primary role target
              <select defaultValue="">
                <option value="" disabled>
                  Choose a role family
                </option>
                {roleTypes.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </label>
            <p className="form-note">
              After signup, Dinero will ask you to verify your email before resume uploads and scoring are enabled.
            </p>
          </>
        )}
        <button className="primary-button full-width" type="button">
          {submitLabel}
        </button>
      </form>
    </AuthLayout>
  );
}

function HirerAuth() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [company, setCompany] = useState(companies[0]);
  const addingCompany = company === "Add a new company";
  const submitLabel = mode === "signin" ? "Sign in as hirer" : "Create hirer account";

  const helperText = useMemo(() => {
    if (mode === "signin") {
      return "Choose the company connected to your hiring account.";
    }
    return "New company signups will require email verification before role management is enabled.";
  }, [mode]);

  return (
    <AuthLayout
      eyebrow="Hirer portal"
      title="Bring better matching signal into every role."
      body="Hiring teams can manage company roles, see how applicants match against job descriptions, and improve Dinero's predictions with review feedback."
      previewTitle="Hirer feedback loop"
      previewItems={["Company role setup", "Prediction quality feedback", "Optional future bias scoring"]}
    >
      <SegmentedControl mode={mode} setMode={setMode} />
      <form className="auth-form">
        <label>
          Work email
          <input type="email" placeholder="name@company.com" />
        </label>
        <label>
          Password
          <input type="password" placeholder="Enter your password" />
        </label>
        <label>
          Company
          <select value={company} onChange={(event) => setCompany(event.target.value)}>
            {companies.map((companyName) => (
              <option key={companyName}>{companyName}</option>
            ))}
          </select>
        </label>
        {(mode === "signup" || addingCompany) && (
          <label>
            Company name
            <input type="text" placeholder="Company legal or public name" />
          </label>
        )}
        <p className="form-note">{helperText}</p>
        <button className="primary-button full-width" type="button">
          {submitLabel}
        </button>
      </form>
    </AuthLayout>
  );
}

function SegmentedControl({ mode, setMode }: { mode: AuthMode; setMode: (mode: AuthMode) => void }) {
  return (
    <div className="segmented-control" aria-label="Authentication mode">
      <button className={mode === "signin" ? "selected" : ""} onClick={() => setMode("signin")} type="button">
        Sign in
      </button>
      <button className={mode === "signup" ? "selected" : ""} onClick={() => setMode("signup")} type="button">
        Sign up
      </button>
    </div>
  );
}

function AuthLayout({
  eyebrow,
  title,
  body,
  previewTitle,
  previewItems,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  previewTitle: string;
  previewItems: string[];
  children: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{body}</p>
        <div className="auth-preview">
          <h2>{previewTitle}</h2>
          <ul>
            {previewItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="auth-panel" aria-label={eyebrow}>
        {children}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
