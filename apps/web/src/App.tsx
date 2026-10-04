import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  getCurrentUser,
  login,
  logout,
  register,
} from "./auth";
import "./App.css";

type User = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
};

type ModuleName =
  | "Dashboard"
  | "Sales"
  | "Inventory"
  | "Customers"
  | "Orders"
  | "Payments"
  | "Dealers"
  | "Warranty/RMA"
  | "Analytics"
  | "Admin";

const modules: ModuleName[] = [
  "Dashboard",
  "Sales",
  "Inventory",
  "Customers",
  "Orders",
  "Payments",
  "Dealers",
  "Warranty/RMA",
  "Analytics",
  "Admin",
];

const permissionMap: Partial<Record<ModuleName, string>> = {
  Sales: "sales.read",
  Inventory: "inventory.read",
  Customers: "customers.read",
  Orders: "orders.read",
  Payments: "payments.read",
  Dealers: "dealers.read",
  "Warranty/RMA": "warranty.read",
  Analytics: "analytics.read",
  Admin: "admin.manage",
};

function LoginScreen({
  onLogin,
}: {
  onLogin: (user: User) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        await register(email, password, fullName);
      }

      const user = await login(email, password);
      onLogin(user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark">
          <span>MAG</span>
          <strong>CHARGE</strong>
        </div>

        <p className="eyebrow">Sales SaaS</p>

        <h1>
          {mode === "login"
            ? "Welcome back"
            : "Create your account"}
        </h1>

        <p className="auth-subtitle">
          Secure business management for MagCharge sales,
          inventory and customers.
        </p>

        <form onSubmit={submit}>
          {mode === "register" && (
            <label>
              Full name
              <input
                value={fullName}
                onChange={(event) =>
                  setFullName(event.target.value)
                }
                placeholder="Your full name"
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Minimum 8 characters"
              minLength={8}
              required
            />
          </label>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <button
          className="switch-button"
          onClick={() => {
            setMode(
              mode === "login" ? "register" : "login"
            );
            setError("");
          }}
        >
          {mode === "login"
            ? "Create a new account"
            : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}

function Dashboard({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [active, setActive] =
    useState<ModuleName>("Dashboard");

  const visibleModules = modules.filter((module) => {
    if (module === "Dashboard") return true;

    const required = permissionMap[module];

    if (!required) return true;

    return user.permissions.includes(required);
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>MAG</span>
          <strong>CHARGE</strong>
        </div>

        <div className="role-badge">
          {user.role.replace("_", " ")}
        </div>

        <nav>
          {visibleModules.map((module) => (
            <button
              key={module}
              className={
                active === module
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => setActive(module)}
            >
              {module}
            </button>
          ))}
        </nav>

        <button
          className="logout-button"
          onClick={onLogout}
        >
          Sign out
        </button>
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">MagCharge Sales SaaS</p>
            <h1>{active}</h1>
          </div>

          <div className="user-chip">
            <strong>{user.fullName}</strong>
            <span>{user.email}</span>
          </div>
        </header>

        {active === "Dashboard" ? (
          <>
            <section className="welcome-card">
              <div>
                <p className="eyebrow">Command Center</p>
                <h2>
                  Welcome, {user.fullName.split(" ")[0]}.
                </h2>
                <p>
                  Your authenticated MagCharge business
                  workspace is ready.
                </p>
              </div>

              <div className="security-status">
                <span>●</span>
                Authenticated
              </div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <span>Sales</span>
                <strong>—</strong>
                <small>Connect sales module</small>
              </div>

              <div className="stat-card">
                <span>Inventory</span>
                <strong>—</strong>
                <small>Connect inventory module</small>
              </div>

              <div className="stat-card">
                <span>Customers</span>
                <strong>—</strong>
                <small>Connect customer module</small>
              </div>

              <div className="stat-card">
                <span>Orders</span>
                <strong>—</strong>
                <small>Connect order module</small>
              </div>
            </section>

            <section className="command-grid">
              <article>
                <p className="eyebrow">ChatGPT Assistant</p>
                <h3>AI business assistant</h3>
                <p>
                  Controlled AI tools will operate through
                  authenticated business actions.
                </p>
                <span className="status-pill">
                  Foundation ready
                </span>
              </article>

              <article>
                <p className="eyebrow">BALMZ AI</p>
                <h3>MagCharge intelligence</h3>
                <p>
                  AI workflows will be connected through
                  the permission-controlled API layer.
                </p>
                <span className="status-pill">
                  Foundation ready
                </span>
              </article>
            </section>
          </>
        ) : (
          <section className="module-card">
            <p className="eyebrow">Module</p>
            <h2>{active}</h2>
            <p>
              This module is authenticated and permission
              controlled. The database workflow will be
              implemented next.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await logout();
    setUser(null);
  }

  if (loading) {
    return (
      <main className="loading-page">
        <strong>Loading MagCharge...</strong>
      </main>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
    />
  );
}

export default App;
