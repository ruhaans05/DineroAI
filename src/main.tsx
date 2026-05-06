import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import heroImage from "./assets/hero-dinero.png";
import "./styles.css";

type View = "home" | "about" | "contact" | "applicant" | "hirer";
type AuthMode = "signin" | "signup";
type Notice = { type: "success" | "error"; text: string } | null;
type AuthNotice = { view: "applicant" | "hirer"; notice: NonNullable<Notice> } | null;
type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: "applicant" | "hirer" | "admin";
  emailVerified: boolean;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function App() {
  const [view, setView] = useState<View>("home");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authNotice, setAuthNotice] = useState<AuthNotice>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyToken = params.get("verifyToken");

    if (verifyToken) {
      verifyEmailFromLink(verifyToken)
        .then((user) => {
          const targetView = user?.role === "hirer" ? "hirer" : "applicant";
          setCurrentUser(null);
          setView(targetView);
          setAuthNotice({
            view: targetView,
            notice: {
              type: "success",
              text: "Email confirmed. You can sign in now.",
            },
          });
        })
        .catch((error) => {
          setCurrentUser(null);
          setView("applicant");
          setAuthNotice({
            view: "applicant",
            notice: {
              type: "error",
              text: getErrorMessage(error),
            },
          });
        })
        .finally(() => {
          window.history.replaceState({}, "", window.location.pathname);
          setAuthChecked(true);
        });
      return;
    }

    refreshCurrentUser()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  async function handleLogout() {
    await apiRequest("/api/logout", { method: "POST" });
    setCurrentUser(null);
  }

  return (
    <div className="app-shell">
      <Header view={view} currentUser={currentUser} onNavigate={setView} onLogout={handleLogout} />
      {!authChecked && <div className="session-loading">Checking session...</div>}
      {view === "home" && <LandingPage onNavigate={setView} />}
      {view === "about" && <AboutPage onNavigate={setView} />}
      {view === "contact" && <ContactPage />}
      {view === "applicant" && (
        <ApplicantAuth
          currentUser={currentUser}
          initialNotice={authNotice?.view === "applicant" ? authNotice.notice : null}
          onAuthenticated={setCurrentUser}
          onNoticeConsumed={() => setAuthNotice(null)}
        />
      )}
      {view === "hirer" && (
        <HirerAuth
          currentUser={currentUser}
          initialNotice={authNotice?.view === "hirer" ? authNotice.notice : null}
          onAuthenticated={setCurrentUser}
          onNoticeConsumed={() => setAuthNotice(null)}
        />
      )}
    </div>
  );
}

function Header({
  view,
  currentUser,
  onNavigate,
  onLogout,
}: {
  view: View;
  currentUser: CurrentUser | null;
  onNavigate: (view: View) => void;
  onLogout: () => void;
}) {
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
        <button className={view === "about" ? "nav-link active" : "nav-link"} onClick={() => onNavigate("about")}>
          About
        </button>
        <button
          className={view === "contact" ? "nav-link active" : "nav-link"}
          onClick={() => onNavigate("contact")}
        >
          Contact
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
      {currentUser && (
        <div className="session-pill">
          <span>{currentUser.email}</span>
          <button onClick={onLogout} type="button">
            Log out
          </button>
        </div>
      )}
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

function AboutPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  return (
    <main className="content-page">
      <section className="about-hero">
        <div>
          <p className="eyebrow">About Dinero</p>
          <h1>Applications should feel less random.</h1>
          <p>
            Dinero is being built for the moment when a candidate has a resume, a role they want, and no clear answer
            to the question that matters most: is this worth my time, and what would make me more competitive?
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onNavigate("applicant")}>
              Start as applicant
            </button>
            <button className="secondary-button" onClick={() => onNavigate("hirer")}>
              Start as hirer
            </button>
          </div>
        </div>
        <div className="about-score-panel" aria-label="Dinero score preview">
          <span>Interview fit</span>
          <strong>78%</strong>
          <p>Resume evidence aligns with role scope, core skills, and hiring signal.</p>
          <div>
            <label>Resume match</label>
            <progress value="78" max="100" />
          </div>
          <div>
            <label>Missing keywords</label>
            <progress value="28" max="100" />
          </div>
          <div>
            <label>Project proof</label>
            <progress value="66" max="100" />
          </div>
        </div>
      </section>

      <section className="about-band" aria-labelledby="about-promise">
        <div className="section-heading">
          <p className="eyebrow">The promise</p>
          <h2 id="about-promise">Better choices before the application goes out.</h2>
        </div>
        <div className="value-grid">
          {[
            [
              "Know where to focus",
              "Dinero helps applicants compare roles by actual fit instead of sending the same resume everywhere.",
            ],
            [
              "Improve with specifics",
              "Feedback is tied to the job description, so resume edits become practical: skills, phrasing, projects, and proof.",
            ],
            [
              "Learn from outcomes",
              "As users opt in and report interviews, the score can become sharper and more honest over time.",
            ],
          ].map(([title, body]) => (
            <article className="value-card" key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-band split-band" aria-labelledby="why-teams">
        <div>
          <p className="eyebrow">For hiring teams</p>
          <h2 id="why-teams">Cleaner context, fewer noisy matches.</h2>
        </div>
        <p>
          Hirers can see why Dinero thinks a candidate fits a role, then give feedback when the model is right or
          wrong. That closes the loop between resume signal and real hiring judgment.
        </p>
      </section>
    </main>
  );
}

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [audience, setAudience] = useState("applicant");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setNotice(null);

    try {
      const result = await apiRequest("/api/contact", {
        method: "POST",
        body: { name, email, audience, topic, message },
      });
      setNotice({ type: "success", text: result.message ?? "Your message was sent." });
      setName("");
      setEmail("");
      setAudience("applicant");
      setTopic("");
      setMessage("");
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="contact-page">
      <section className="contact-intro">
        <p className="eyebrow">Contact Dinero</p>
        <h1>Questions, concerns, or early access ideas.</h1>
        <p>
          Send a note to the Dinero team. Applicant feedback, hiring-team questions, bug reports, and partnership ideas
          all land in the same inbox so nothing gets lost.
        </p>
        <div className="contact-direct">
          <span>Email inbox</span>
          <strong>dinerobusinessofficial@gmail.com</strong>
        </div>
      </section>

      <section className="contact-panel" aria-label="Contact form">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required />
            </label>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
          </div>
          <label>
            I am a
            <select value={audience} onChange={(event) => setAudience(event.target.value)}>
              <option value="applicant">Applicant</option>
              <option value="hirer">Hirer</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Topic
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="What should we help with?"
              required
            />
          </label>
          <label>
            Question or concern
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Share the details here."
              rows={7}
              required
            />
          </label>
          {notice && <p className={`form-message ${notice.type}`}>{notice.text}</p>}
          <button className="primary-button full-width" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send message"}
          </button>
        </form>
      </section>
    </main>
  );
}

function ApplicantAuth({
  currentUser,
  initialNotice,
  onAuthenticated,
  onNoticeConsumed,
}: {
  currentUser: CurrentUser | null;
  initialNotice: Notice;
  onAuthenticated: (user: CurrentUser) => void;
  onNoticeConsumed: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const submitLabel = mode === "signin" ? "Sign in as applicant" : "Create applicant account";

  useEffect(() => {
    if (initialNotice) {
      setMode("signin");
      setNotice(initialNotice);
      onNoticeConsumed();
    }
  }, [initialNotice, onNoticeConsumed]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setNotice(null);

    try {
      validateSignupPassword(mode, password, confirmPassword);
      const result = await apiRequest(mode === "signin" ? "/api/signin" : "/api/applicants/signup", {
        method: "POST",
        body: {
          email,
          password,
          ...(mode === "signin" ? { role: "applicant" } : { fullName: fullName || undefined }),
        },
      });

      setNotice({
        type: "success",
        text:
          result.message ??
          (mode === "signin"
            ? "Signed in as applicant."
            : "Applicant account created. Check your email to verify before signing in."),
      });
      if (mode === "signin") {
        onAuthenticated(result.user);
      } else {
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifying(true);
    setNotice(null);

    try {
      const result = await apiRequest("/api/verify-email", {
        method: "POST",
        body: { token: verificationToken },
      });
      setNotice({ type: "success", text: result.message ?? "Email verified." });
      if (result.user) {
        onAuthenticated(result.user);
      }
      setVerificationToken("");
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Applicant portal"
      title="Turn a resume into a smarter application strategy."
      body="Sign in to track target roles, compare your resume against job descriptions, and see which changes could lift your interview chance."
      previewTitle="Applicant outcome loop"
      previewItems={["Resume PDF upload", "Interview chance by role", "Email verification after signup"]}
    >
      {currentUser?.role === "applicant" && <SignedInPanel user={currentUser} />}
      <SegmentedControl mode={mode} setMode={setMode} />
      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "signup" && (
          <label>
            Full name
            <input
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={mode === "signup" ? 8 : 1}
            required
          />
        </label>
        {mode === "signup" && (
          <>
            <label>
              Confirm password
              <input
                type="password"
                placeholder="Type your password again"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>
            <PasswordMatchMessage password={password} confirmPassword={confirmPassword} />
            <PasswordRequirements password={password} />
          </>
        )}
        {mode === "signup" && (
          <p className="form-note">
            After signup, Dinero will send a verification link. Role focus will be inferred later from your resume and
            target jobs.
          </p>
        )}
        {notice && <p className={`form-message ${notice.type}`}>{notice.text}</p>}
        <button className="primary-button full-width" type="submit" disabled={loading}>
          {loading ? "Working..." : submitLabel}
        </button>
      </form>
      {currentUser?.role === "applicant" && !currentUser.emailVerified && (
        <EmailVerificationForm
          token={verificationToken}
          loading={verifying}
          onTokenChange={setVerificationToken}
          onSubmit={handleVerifyEmail}
        />
      )}
    </AuthLayout>
  );
}

function HirerAuth({
  currentUser,
  initialNotice,
  onAuthenticated,
  onNoticeConsumed,
}: {
  currentUser: CurrentUser | null;
  initialNotice: Notice;
  onAuthenticated: (user: CurrentUser) => void;
  onNoticeConsumed: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const submitLabel = mode === "signin" ? "Sign in as hirer" : "Create hirer account";

  useEffect(() => {
    if (initialNotice) {
      setMode("signin");
      setNotice(initialNotice);
      onNoticeConsumed();
    }
  }, [initialNotice, onNoticeConsumed]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setNotice(null);

    try {
      validateSignupPassword(mode, password, confirmPassword);
      const result = await apiRequest(mode === "signin" ? "/api/signin" : "/api/hirers/signup", {
        method: "POST",
        body:
          mode === "signin"
            ? { email, password, role: "hirer" }
            : {
                email,
                password,
                fullName: fullName || undefined,
                companyName,
              },
      });

      const companyMessage = result.company?.message ? ` ${result.company.message}` : "";
      setNotice({
        type: "success",
        text:
          (result.message ?? (mode === "signin" ? "Signed in as hirer." : "Hirer account created.")) +
          companyMessage,
      });
      if (mode === "signin") {
        onAuthenticated(result.user);
      } else {
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifying(true);
    setNotice(null);

    try {
      const result = await apiRequest("/api/verify-email", {
        method: "POST",
        body: { token: verificationToken },
      });
      setNotice({ type: "success", text: result.message ?? "Email verified." });
      if (result.user) {
        onAuthenticated(result.user);
      }
      setVerificationToken("");
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Hirer portal"
      title="Bring better matching signal into every role."
      body="Hiring teams can manage company roles, see how applicants match against job descriptions, and improve Dinero's predictions with review feedback."
      previewTitle="Hirer feedback loop"
      previewItems={["Company role setup", "Prediction quality feedback", "Optional future bias scoring"]}
    >
      {currentUser?.role === "hirer" && <SignedInPanel user={currentUser} />}
      <SegmentedControl mode={mode} setMode={setMode} />
      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "signup" && (
          <label>
            Full name
            <input
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>
        )}
        <label>
          Work email
          <input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={mode === "signup" ? 8 : 1}
            required
          />
        </label>
        {mode === "signup" && (
          <>
            <label>
              Confirm password
              <input
                type="password"
                placeholder="Type your password again"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>
            <PasswordMatchMessage password={password} confirmPassword={confirmPassword} />
            <PasswordRequirements password={password} />
          </>
        )}
        {mode === "signup" && (
          <label>
            Company name
            <input
              type="text"
              placeholder="Company legal or public name"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              required
            />
          </label>
        )}
        {mode === "signup" && (
          <p className="form-note">
            Dinero will save this company as pending verification. Once the Perplexity provider is configured, this
            step will check the real company and prevent duplicates automatically.
          </p>
        )}
        {notice && <p className={`form-message ${notice.type}`}>{notice.text}</p>}
        <button className="primary-button full-width" type="submit" disabled={loading}>
          {loading ? "Working..." : submitLabel}
        </button>
      </form>
      {currentUser?.role === "hirer" && !currentUser.emailVerified && (
        <EmailVerificationForm
          token={verificationToken}
          loading={verifying}
          onTokenChange={setVerificationToken}
          onSubmit={handleVerifyEmail}
        />
      )}
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

function SignedInPanel({ user }: { user: CurrentUser }) {
  return (
    <div className="signed-in-panel">
      <strong>Signed in</strong>
      <span>{user.email}</span>
      {!user.emailVerified && <em>Email verification is still pending.</em>}
    </div>
  );
}

function PasswordRequirements({ password }: { password: string }) {
  const requirements = [
    ["At least 8 characters", password.length >= 8],
    ["At least 1 number", /\d/.test(password)],
    ["At least 1 special character", /[^A-Za-z0-9]/.test(password)],
  ] as const;

  return (
    <ul className="password-rules" aria-label="Password requirements">
      {requirements.map(([label, passed]) => (
        <li className={passed ? "passed" : ""} key={label}>
          {label}
        </li>
      ))}
    </ul>
  );
}

function PasswordMatchMessage({ password, confirmPassword }: { password: string; confirmPassword: string }) {
  if (!confirmPassword) {
    return null;
  }

  const matches = password === confirmPassword;

  return (
    <p className={`password-match ${matches ? "matched" : "unmatched"}`}>
      {matches ? "Passwords match." : "Passwords do not match yet."}
    </p>
  );
}

function EmailVerificationForm({
  token,
  loading,
  onTokenChange,
  onSubmit,
}: {
  token: string;
  loading: boolean;
  onTokenChange: (token: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="auth-form verification-form" onSubmit={onSubmit}>
      <label>
        Verification token
        <input
          type="text"
          placeholder="Paste the token from your email"
          value={token}
          onChange={(event) => onTokenChange(event.target.value)}
          required
        />
      </label>
      <button className="secondary-button full-width" disabled={loading} type="submit">
        {loading ? "Verifying..." : "Verify email"}
      </button>
    </form>
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

async function apiRequest(path: string, options: { method?: string; body?: Record<string, unknown> } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}

async function refreshCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/api/me`, {
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  return payload.user as CurrentUser | null;
}

async function verifyEmailFromLink(token: string) {
  const result = await apiRequest("/api/verify-email", {
    method: "POST",
    body: { token },
  });

  return result.user as CurrentUser | null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function validateSignupPassword(mode: AuthMode, password: string, confirmPassword: string) {
  if (mode !== "signup") {
    return;
  }

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (!/\d/.test(password)) {
    throw new Error("Password must include at least one number.");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error("Password must include at least one special character.");
  }
}
