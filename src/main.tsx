import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import heroImage from "./assets/hero-dinero.png";
import "./styles.css";

type View = "home" | "about" | "contact" | "applicant" | "hirer";
type AuthMode = "signin" | "signup";
type PortalTab = "resume" | "jobs" | "forum";
type HirerTab = "profile" | "jobs";
type JobSort = "popular" | "recent";
type Notice = { type: "success" | "error"; text: string } | null;
type AuthNotice = { view: "applicant" | "hirer"; notice: NonNullable<Notice> } | null;
type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: "applicant" | "hirer" | "admin";
  emailVerified: boolean;
};
type ForumComment = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorUserId: string;
  authorName: string;
  authorEmail: string;
};
type ForumPost = {
  id: string;
  subject: string;
  body: string;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  authorUserId: string;
  authorName: string;
  authorEmail: string;
  comments: ForumComment[];
};
type HirerProfile = {
  id: string;
  userId: string;
  displayName: string | null;
  profileImageDataUrl: string | null;
  headline: string | null;
  message: string | null;
  companyName: string | null;
  companyInfo: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
};
type JobPost = {
  id: string;
  hirerUserId: string | null;
  title: string;
  companyName: string;
  location: string | null;
  employmentType: string | null;
  applicationUrl: string;
  description: string;
  sourceKind: "hirer" | "scraped_api";
  clickCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  hirer: {
    displayName: string | null;
    profileImageDataUrl: string | null;
    headline: string | null;
    message: string | null;
    contactEmail: string | null;
  };
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
      .then((user) => {
        setCurrentUser(user);
        if (user?.role === "applicant") {
          setView("applicant");
        } else if (user?.role === "hirer") {
          setView("hirer");
        }
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  async function handleLogout() {
    await apiRequest("/api/logout", { method: "POST" });
    setCurrentUser(null);
    setView("home");
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
          onNavigate={setView}
          onLogout={handleLogout}
          onNoticeConsumed={() => setAuthNotice(null)}
        />
      )}
      {view === "hirer" && (
        <HirerAuth
          currentUser={currentUser}
          initialNotice={authNotice?.view === "hirer" ? authNotice.notice : null}
          onAuthenticated={setCurrentUser}
          onNavigate={setView}
          onLogout={handleLogout}
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
              minLength={3}
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
              minLength={10}
              required
            />
          </label>
          <p className="form-note">Please write at least 10 characters so the team has enough context to help.</p>
          {notice && <p className={`form-message ${notice.type}`}>{notice.text}</p>}
          <button className="primary-button full-width" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send message"}
          </button>
        </form>
      </section>
    </main>
  );
}

function ApplicantPortal({
  user,
  onNavigate,
  onLogout,
}: {
  user: CurrentUser;
  onNavigate: (view: View) => void;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<PortalTab>("resume");
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <main className="portal-page">
      <div className="portal-topbar">
        <button className="secondary-button" type="button" onClick={() => onNavigate("home")}>
          Home
        </button>
        <div>
          <span>Applicant portal</span>
          <strong>{user.fullName || user.email}</strong>
        </div>
        <button className="secondary-button" type="button" onClick={() => setSettingsOpen(true)}>
          Settings
        </button>
      </div>

      <section className="portal-hero">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1>Run the application workflow from one place.</h1>
          <p>
            Upload a resume for the future ATS scan, ask questions in the global forum, and keep your account controls
            close without leaving the portal.
          </p>
        </div>
        <div className="portal-status-card">
          <span>Next action</span>
          <strong>Upload resume</strong>
          <p>PDF intake is ready. Resume parsing and ATS scoring will connect here next.</p>
        </div>
      </section>

      <div className="portal-tabs" aria-label="Applicant portal sections">
        <button className={activeTab === "resume" ? "selected" : ""} onClick={() => setActiveTab("resume")} type="button">
          Resume scan
        </button>
        <button className={activeTab === "jobs" ? "selected" : ""} onClick={() => setActiveTab("jobs")} type="button">
          Jobs
        </button>
        <button className={activeTab === "forum" ? "selected" : ""} onClick={() => setActiveTab("forum")} type="button">
          Global forum
        </button>
      </div>

      {activeTab === "resume" && <ResumeUploadPanel />}
      {activeTab === "jobs" && <ApplicantJobsPanel />}
      {activeTab === "forum" && <ForumPanel currentUser={user} />}

      {settingsOpen && (
        <div className="settings-backdrop" role="presentation" onClick={() => setSettingsOpen(false)}>
          <aside className="settings-panel" aria-label="Applicant settings" onClick={(event) => event.stopPropagation()}>
            <div className="settings-header">
              <div>
                <p className="eyebrow">Settings</p>
                <h2>Account controls</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                x
              </button>
            </div>
            <div className="settings-user">
              <span>{user.fullName || "Applicant"}</span>
              <strong>{user.email}</strong>
            </div>
            <p className="settings-note">More settings will live here later.</p>
            <button className="primary-button full-width" type="button" onClick={onLogout}>
              Sign out
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}

function ResumeUploadPanel() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setNotice(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setSelectedFile(null);
      setNotice({ type: "error", text: "Please upload a PDF resume." });
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setNotice({ type: "success", text: "Resume accepted. ATS scanning will connect here next." });
  }

  return (
    <section className="portal-grid">
      <article className="portal-card upload-card">
        <span className="card-label">Resume upload</span>
        <h2>Upload a PDF for the ATS scan.</h2>
        <p>
          This intake accepts PDF resumes now. The future scanner will parse the file, compare it against job
          descriptions, and return an interview-fit score with resume fixes.
        </p>
        <label className="file-drop">
          <input type="file" accept="application/pdf,.pdf" onChange={handleFileChange} />
          <strong>{selectedFile ? selectedFile.name : "Choose resume PDF"}</strong>
          <span>{selectedFile ? `${formatFileSize(selectedFile.size)} ready for scanner setup` : "PDF only"}</span>
        </label>
        {notice && <p className={`form-message ${notice.type}`}>{notice.text}</p>}
      </article>

      <article className="portal-card scan-card">
        <span className="card-label">ATS scan preview</span>
        <div className="scan-preview">
          <div>
            <strong>Pending</strong>
            <span>Resume parser</span>
          </div>
          <div>
            <strong>Next</strong>
            <span>Job description match</span>
          </div>
          <div>
            <strong>Later</strong>
            <span>Score recommendations</span>
          </div>
        </div>
      </article>
    </section>
  );
}

function ApplicantJobsPanel() {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [sort, setSort] = useState<JobSort>("recent");
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs(sort);
  }, [sort]);

  async function loadJobs(nextSort: JobSort) {
    setLoading(true);
    setNotice(null);

    try {
      const result = await apiRequest(`/api/jobs?sort=${nextSort}`);
      setJobs(result.jobs ?? []);
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenJob(job: JobPost) {
    try {
      const result = await apiRequest(`/api/jobs/${job.id}/click`, { method: "POST" });
      const applicationUrl = result.applicationUrl ?? job.applicationUrl;
      window.open(applicationUrl, "_blank", "noopener,noreferrer");
      await loadJobs(sort);
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    }
  }

  return (
    <section className="jobs-panel">
      <div className="jobs-toolbar">
        <div>
          <span className="card-label">Job postings</span>
          <h2>Explore roles posted through Dinero.</h2>
        </div>
        <div className="portal-tabs compact" aria-label="Job sorting">
          <button className={sort === "recent" ? "selected" : ""} type="button" onClick={() => setSort("recent")}>
            Recent
          </button>
          <button className={sort === "popular" ? "selected" : ""} type="button" onClick={() => setSort("popular")}>
            Popular
          </button>
        </div>
      </div>
      {notice && <p className={`form-message ${notice.type}`}>{notice.text}</p>}
      {loading && <p className="empty-state">Loading job postings...</p>}
      {!loading && jobs.length === 0 && (
        <p className="empty-state">No job postings yet. Hirer posts and future scraped API roles will appear here.</p>
      )}
      <div className="jobs-list">
        {jobs.map((job) => (
          <article className="job-card" key={job.id}>
            <div className="job-card-main">
              <div className="job-source-row">
                <span>{job.sourceKind === "hirer" ? "Hirer post" : "API scrape"}</span>
                <time>{formatDate(job.createdAt)}</time>
              </div>
              <h3>{job.title}</h3>
              <p className="job-company">
                {job.companyName}
                {job.location ? ` · ${job.location}` : ""}
                {job.employmentType ? ` · ${job.employmentType}` : ""}
              </p>
              <p>{job.description}</p>
              {job.hirer.message && <p className="hirer-message">{job.hirer.message}</p>}
            </div>
            <div className="job-card-side">
              {job.hirer.profileImageDataUrl && <img src={job.hirer.profileImageDataUrl} alt="" />}
              <strong>{job.hirer.displayName || job.companyName}</strong>
              {job.hirer.headline && <span>{job.hirer.headline}</span>}
              <span>{job.clickCount} clicks</span>
              <button className="primary-button full-width" type="button" onClick={() => handleOpenJob(job)}>
                Open application
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ForumPanel({ currentUser }: { currentUser: CurrentUser }) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    setLoading(true);
    try {
      const result = await apiRequest("/api/forum/posts");
      setPosts(result.posts ?? []);
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPosting(true);
    setNotice(null);

    try {
      await apiRequest("/api/forum/posts", {
        method: "POST",
        body: { subject, body },
      });
      setSubject("");
      setBody("");
      setNotice({ type: "success", text: "Post created." });
      await loadPosts();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setPosting(false);
    }
  }

  async function handleComment(postId: string) {
    const draft = commentDrafts[postId]?.trim() ?? "";
    if (!draft) {
      return;
    }

    try {
      await apiRequest(`/api/forum/posts/${postId}/comments`, {
        method: "POST",
        body: { body: draft },
      });
      setCommentDrafts((drafts) => ({ ...drafts, [postId]: "" }));
      await loadPosts();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    }
  }

  async function handleResolved(post: ForumPost) {
    try {
      await apiRequest(`/api/forum/posts/${post.id}/resolved`, {
        method: "PATCH",
        body: { isResolved: !post.isResolved },
      });
      await loadPosts();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    }
  }

  function startEditing(post: ForumPost) {
    setEditingPostId(post.id);
    setEditSubject(post.subject);
    setEditBody(post.body);
    setNotice(null);
  }

  function cancelEditing() {
    setEditingPostId(null);
    setEditSubject("");
    setEditBody("");
  }

  async function handleEditPost(postId: string) {
    try {
      await apiRequest(`/api/forum/posts/${postId}`, {
        method: "PATCH",
        body: { subject: editSubject, body: editBody },
      });
      cancelEditing();
      await loadPosts();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    }
  }

  async function handleDeletePost(post: ForumPost) {
    const confirmed = window.confirm("Delete this post and all of its replies?");
    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/api/forum/posts/${post.id}`, {
        method: "DELETE",
      });
      setNotice({ type: "success", text: "Post deleted." });
      await loadPosts();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    }
  }

  return (
    <section className="forum-layout">
      <aside className="portal-card forum-composer">
        <span className="card-label">Global forum</span>
        <h2>Create a post.</h2>
        <p>Ask application questions, share blockers, and help other applicants. Posts and replies are stored by date.</p>
        <form className="auth-form" onSubmit={handleCreatePost}>
          <label>
            Subject
            <input value={subject} onChange={(event) => setSubject(event.target.value)} minLength={4} maxLength={160} required />
          </label>
          <label>
            Post
            <textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={10} maxLength={4000} required />
          </label>
          <p className="form-note">Posts with blocked inappropriate keywords cannot be published.</p>
          {notice && <p className={`form-message ${notice.type}`}>{notice.text}</p>}
          <button className="primary-button full-width" type="submit" disabled={posting}>
            {posting ? "Posting..." : "Publish post"}
          </button>
        </form>
      </aside>

      <div className="forum-feed">
        {loading && <p className="empty-state">Loading forum posts...</p>}
        {!loading && posts.length === 0 && <p className="empty-state">No posts yet. Start the first thread.</p>}
        {posts.map((post) => (
          <article className={post.isResolved ? "forum-post resolved" : "forum-post"} key={post.id}>
            <div className="forum-post-header">
              <div>
                <span>{post.authorName}</span>
                <time>
                  {formatDate(post.createdAt)}
                  {post.editedAt && <em> (edited)</em>}
                </time>
              </div>
              {post.authorUserId === currentUser.id && (
                <div className="post-actions">
                  <button className="resolved-toggle" type="button" onClick={() => handleResolved(post)}>
                    {post.isResolved ? "Resolved" : "Mark resolved"}
                  </button>
                  <button className="mini-action" type="button" onClick={() => startEditing(post)}>
                    Edit
                  </button>
                  <button className="mini-action danger" type="button" onClick={() => handleDeletePost(post)}>
                    Delete
                  </button>
                </div>
              )}
              {post.authorUserId !== currentUser.id && post.isResolved && <span className="resolved-badge">Resolved</span>}
            </div>
            {editingPostId === post.id ? (
              <form className="auth-form edit-post-form" onSubmit={(event) => event.preventDefault()}>
                <label>
                  Subject
                  <input
                    value={editSubject}
                    onChange={(event) => setEditSubject(event.target.value)}
                    minLength={4}
                    maxLength={160}
                    required
                  />
                </label>
                <label>
                  Post
                  <textarea
                    value={editBody}
                    onChange={(event) => setEditBody(event.target.value)}
                    minLength={10}
                    maxLength={4000}
                    required
                  />
                </label>
                <div className="edit-actions">
                  <button className="primary-button" type="button" onClick={() => handleEditPost(post.id)}>
                    Save edit
                  </button>
                  <button className="secondary-button" type="button" onClick={cancelEditing}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h3>{post.subject}</h3>
                <p>{post.body}</p>
              </>
            )}
            <div className="comments-list">
              {post.comments.map((comment) => (
                <div className="comment" key={comment.id}>
                  <div>
                    <strong>{comment.authorName}</strong>
                    <time>{formatDate(comment.createdAt)}</time>
                  </div>
                  <p>{comment.body}</p>
                </div>
              ))}
            </div>
            <div className="comment-box">
              <input
                value={commentDrafts[post.id] ?? ""}
                onChange={(event) => setCommentDrafts((drafts) => ({ ...drafts, [post.id]: event.target.value }))}
                placeholder="Reply to this post"
              />
              <button className="secondary-button" type="button" onClick={() => handleComment(post.id)}>
                Reply
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function HirerPortal({
  user,
  onNavigate,
  onLogout,
}: {
  user: CurrentUser;
  onNavigate: (view: View) => void;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<HirerTab>("profile");
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <main className="portal-page">
      <div className="portal-topbar">
        <button className="secondary-button" type="button" onClick={() => onNavigate("home")}>
          Home
        </button>
        <div>
          <span>Hirer portal</span>
          <strong>{user.fullName || user.email}</strong>
        </div>
        <button className="secondary-button" type="button" onClick={() => setSettingsOpen(true)}>
          Settings
        </button>
      </div>

      <section className="portal-hero">
        <div>
          <p className="eyebrow">Hiring workspace</p>
          <h1>Build your profile and publish roles.</h1>
          <p>
            Create a public hiring profile, upload a picture, and post job links. Dinero will add link scraping later;
            for now, the role details are entered directly and shown to applicants.
          </p>
        </div>
        <div className="portal-status-card">
          <span>Visible to applicants</span>
          <strong>Profile + job posts</strong>
          <p>Applicants can sort jobs by recent or popular, with each application click tracked.</p>
        </div>
      </section>

      <div className="portal-tabs" aria-label="Hirer portal sections">
        <button className={activeTab === "profile" ? "selected" : ""} onClick={() => setActiveTab("profile")} type="button">
          Hiring profile
        </button>
        <button className={activeTab === "jobs" ? "selected" : ""} onClick={() => setActiveTab("jobs")} type="button">
          Job postings
        </button>
      </div>

      {activeTab === "profile" ? <HirerProfilePanel user={user} /> : <HirerJobsPanel user={user} />}

      {settingsOpen && (
        <div className="settings-backdrop" role="presentation" onClick={() => setSettingsOpen(false)}>
          <aside className="settings-panel" aria-label="Hirer settings" onClick={(event) => event.stopPropagation()}>
            <div className="settings-header">
              <div>
                <p className="eyebrow">Settings</p>
                <h2>Account controls</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                x
              </button>
            </div>
            <div className="settings-user">
              <span>{user.fullName || "Hirer"}</span>
              <strong>{user.email}</strong>
            </div>
            <p className="settings-note">More hiring settings will live here later.</p>
            <button className="primary-button full-width" type="button" onClick={onLogout}>
              Sign out
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}

function HirerProfilePanel({ user }: { user: CurrentUser }) {
  const [displayName, setDisplayName] = useState(user.fullName ?? "");
  const [profileImageDataUrl, setProfileImageDataUrl] = useState("");
  const [headline, setHeadline] = useState("");
  const [message, setMessage] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyInfo, setCompanyInfo] = useState("");
  const [contactEmail, setContactEmail] = useState(user.email);
  const [contactPhone, setContactPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const result = await apiRequest("/api/hirer/profile");
      const profile = result.profile as HirerProfile | null;
      if (profile) {
        setDisplayName(profile.displayName ?? "");
        setProfileImageDataUrl(profile.profileImageDataUrl ?? "");
        setHeadline(profile.headline ?? "");
        setMessage(profile.message ?? "");
        setCompanyName(profile.companyName ?? "");
        setCompanyInfo(profile.companyInfo ?? "");
        setContactEmail(profile.contactEmail ?? user.email);
        setContactPhone(profile.contactPhone ?? "");
        setWebsiteUrl(profile.websiteUrl ?? "");
        setLinkedinUrl(profile.linkedinUrl ?? "");
      }
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setNotice({ type: "error", text: "Please upload an image file." });
      event.target.value = "";
      return;
    }

    if (file.size > 750_000) {
      setNotice({ type: "error", text: "Please use an image under 750 KB for now." });
      event.target.value = "";
      return;
    }

    setProfileImageDataUrl(await readFileAsDataUrl(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);

    try {
      const result = await apiRequest("/api/hirer/profile", {
        method: "PUT",
        body: {
          displayName,
          profileImageDataUrl,
          headline,
          message,
          companyName,
          companyInfo,
          contactEmail,
          contactPhone,
          websiteUrl,
          linkedinUrl,
        },
      });
      setNotice({ type: "success", text: result.message ?? "Hirer profile saved." });
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="portal-grid">
      <article className="portal-card">
        <span className="card-label">Hiring profile</span>
        <h2>Create the profile applicants see.</h2>
        <p>Use this to explain who you are, what your company does, and how candidates can contact you.</p>
        {loading && <p className="empty-state">Loading profile...</p>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="profile-image-picker">
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {profileImageDataUrl ? <img src={profileImageDataUrl} alt="" /> : <span>Upload picture</span>}
          </label>
          <div className="form-grid">
            <label>
              Your name
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
            <label>
              Company
              <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            </label>
          </div>
          <label>
            Headline
            <input value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Recruiting ML engineers at..." />
          </label>
          <label>
            Message to applicants
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>
          <label>
            Company info
            <textarea value={companyInfo} onChange={(event) => setCompanyInfo(event.target.value)} />
          </label>
          <div className="form-grid">
            <label>
              Contact email
              <input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
            </label>
            <label>
              Contact phone
              <input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Website
              <input type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} />
            </label>
            <label>
              LinkedIn
              <input type="url" value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} />
            </label>
          </div>
          {notice && <p className={`form-message ${notice.type}`}>{notice.text}</p>}
          <button className="primary-button full-width" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </button>
        </form>
      </article>
      <article className="portal-card hirer-preview-card">
        <span className="card-label">Preview</span>
        {profileImageDataUrl && <img src={profileImageDataUrl} alt="" />}
        <h3>{displayName || "Your name"}</h3>
        <strong>{headline || "Hiring headline"}</strong>
        <p>{message || "Your message to applicants will appear here."}</p>
        <p>{companyInfo || "Company information will appear here."}</p>
      </article>
    </section>
  );
}

function HirerJobsPanel({ user }: { user: CurrentUser }) {
  const emptyJob = {
    title: "",
    companyName: "",
    location: "",
    employmentType: "",
    applicationUrl: "",
    description: "",
  };
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [form, setForm] = useState(emptyJob);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    setLoading(true);
    try {
      const result = await apiRequest("/api/hirer/jobs");
      setJobs(result.jobs ?? []);
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  function updateForm(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEditingJob(job: JobPost) {
    setEditingJobId(job.id);
    setForm({
      title: job.title,
      companyName: job.companyName,
      location: job.location ?? "",
      employmentType: job.employmentType ?? "",
      applicationUrl: job.applicationUrl,
      description: job.description,
    });
    setNotice(null);
  }

  function resetForm() {
    setEditingJobId(null);
    setForm(emptyJob);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);

    try {
      const path = editingJobId ? `/api/hirer/jobs/${editingJobId}` : "/api/hirer/jobs";
      await apiRequest(path, {
        method: editingJobId ? "PATCH" : "POST",
        body: form,
      });
      setNotice({ type: "success", text: editingJobId ? "Job post updated." : "Job post published." });
      resetForm();
      await loadJobs();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(job: JobPost) {
    const confirmed = window.confirm("Delete this job posting?");
    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/api/hirer/jobs/${job.id}`, { method: "DELETE" });
      setNotice({ type: "success", text: "Job post deleted." });
      await loadJobs();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    }
  }

  return (
    <section className="hirer-jobs-layout">
      <article className="portal-card">
        <span className="card-label">Upload job posting</span>
        <h2>{editingJobId ? "Edit job posting." : "Post a role."}</h2>
        <p>Paste the application link now. Later, Dinero will scrape that link and prefill the details.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Application link
            <input
              type="url"
              value={form.applicationUrl}
              onChange={(event) => updateForm("applicationUrl", event.target.value)}
              placeholder="https://company.com/careers/job"
              required
            />
          </label>
          <div className="form-grid">
            <label>
              Job title
              <input value={form.title} onChange={(event) => updateForm("title", event.target.value)} required />
            </label>
            <label>
              Company
              <input value={form.companyName} onChange={(event) => updateForm("companyName", event.target.value)} required />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Location
              <input value={form.location} onChange={(event) => updateForm("location", event.target.value)} />
            </label>
            <label>
              Employment type
              <input value={form.employmentType} onChange={(event) => updateForm("employmentType", event.target.value)} />
            </label>
          </div>
          <label>
            Description
            <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} required />
          </label>
          {notice && <p className={`form-message ${notice.type}`}>{notice.text}</p>}
          <div className="edit-actions">
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingJobId ? "Save job" : "Publish job"}
            </button>
            {editingJobId && (
              <button className="secondary-button" type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </article>
      <div className="forum-feed">
        {loading && <p className="empty-state">Loading your postings...</p>}
        {!loading && jobs.length === 0 && <p className="empty-state">No job postings yet.</p>}
        {jobs.map((job) => (
          <article className="job-card compact-job-card" key={job.id}>
            <div className="job-card-main">
              <div className="job-source-row">
                <span>{job.clickCount} clicks</span>
                <time>{formatDate(job.createdAt)}</time>
              </div>
              <h3>{job.title}</h3>
              <p className="job-company">
                {job.companyName}
                {job.location ? ` · ${job.location}` : ""}
              </p>
              <p>{job.description}</p>
            </div>
            <div className="post-actions">
              <button className="mini-action" type="button" onClick={() => startEditingJob(job)}>
                Edit
              </button>
              <button className="mini-action danger" type="button" onClick={() => handleDelete(job)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ApplicantAuth({
  currentUser,
  initialNotice,
  onAuthenticated,
  onNavigate,
  onLogout,
  onNoticeConsumed,
}: {
  currentUser: CurrentUser | null;
  initialNotice: Notice;
  onAuthenticated: (user: CurrentUser) => void;
  onNavigate: (view: View) => void;
  onLogout: () => void;
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
  const [resending, setResending] = useState(false);
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

  async function handleResendVerification() {
    setResending(true);
    setNotice(null);

    try {
      const result = await apiRequest("/api/resend-verification", {
        method: "POST",
        body: { email, role: "applicant" },
      });
      setNotice({ type: "success", text: result.message ?? "Verification email sent." });
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setResending(false);
    }
  }

  if (currentUser?.role === "applicant" && currentUser.emailVerified) {
    return <ApplicantPortal user={currentUser} onNavigate={onNavigate} onLogout={onLogout} />;
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
      {mode === "signin" && (
        <button className="ghost-button full-width" type="button" disabled={resending || !email} onClick={handleResendVerification}>
          {resending ? "Sending..." : "Resend verification email"}
        </button>
      )}
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
  onNavigate,
  onLogout,
  onNoticeConsumed,
}: {
  currentUser: CurrentUser | null;
  initialNotice: Notice;
  onAuthenticated: (user: CurrentUser) => void;
  onNavigate: (view: View) => void;
  onLogout: () => void;
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
  const [resending, setResending] = useState(false);
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

  async function handleResendVerification() {
    setResending(true);
    setNotice(null);

    try {
      const result = await apiRequest("/api/resend-verification", {
        method: "POST",
        body: { email, role: "hirer" },
      });
      setNotice({ type: "success", text: result.message ?? "Verification email sent." });
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setResending(false);
    }
  }

  if (currentUser?.role === "hirer" && currentUser.emailVerified) {
    return <HirerPortal user={currentUser} onNavigate={onNavigate} onLogout={onLogout} />;
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
      {mode === "signin" && (
        <button className="ghost-button full-width" type="button" disabled={resending || !email} onClick={handleResendVerification}>
          {resending ? "Sending..." : "Resend verification email"}
        </button>
      )}
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
    throw new Error(getApiErrorMessage(payload));
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(new Error("Could not read image file.")));
    reader.readAsDataURL(file);
  });
}

function getApiErrorMessage(payload: {
  error?: string;
  issues?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
}) {
  const fieldErrors = payload.issues?.fieldErrors;
  const firstFieldError = fieldErrors
    ? Object.values(fieldErrors)
        .flat()
        .find(Boolean)
    : null;
  const firstFormError = payload.issues?.formErrors?.find(Boolean);

  return firstFieldError ?? firstFormError ?? payload.error ?? "Request failed.";
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
