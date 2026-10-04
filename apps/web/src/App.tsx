import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  getCurrentUser,
  login,
  logout,
  register,
  getToken,
} from "./auth";
import "./App.css";

type User = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
};

type Customer = {
  id: string;
  customer_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
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

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

function LoginScreen({
  onLogin,
}: {
  onLogin: (user: User) => void;
}) {
  const [mode, setMode] =
    useState<"login" | "register">("login");
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
            <div className="error-box">{error}</div>
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

function CustomersModule({
  user,
}: {
  user: User;
}) {
  const canWrite = user.permissions.includes(
    "customers.write"
  );

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] =
    useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    address: "",
    city: "",
    state: "",
    country: "Nigeria",
    notes: "",
  });

  async function request(
    path: string,
    options: RequestInit = {}
  ) {
    const token = getToken();

    const response = await fetch(
      `${API_BASE}${path}`,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token
            ? { Authorization: `Bearer ${token}` }
            : {}),
          ...(options.headers || {}),
        },
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.error ||
          data?.message ||
          `Request failed (${response.status})`
      );
    }

    return data;
  }

  async function loadCustomers() {
    setLoading(true);
    setError("");

    try {
      const query = search.trim()
        ? `?search=${encodeURIComponent(search.trim())}`
        : "";

      const data = await request(
        `/api/customers${query}`
      );

      setCustomers(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.customers)
            ? data.customers
            : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load customers"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    await loadCustomers();
  }

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function createCustomer(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const data = await request("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email || undefined,
          phone: form.phone || undefined,
          companyName:
            form.companyName || undefined,
          address: form.address || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          country: form.country || "Nigeria",
          notes: form.notes || undefined,
        }),
      });

      const customer =
        data?.customer || data;

      if (customer?.id) {
        setCustomers((current) => [
          customer,
          ...current,
        ]);
        setSelected(customer);
      } else {
        await loadCustomers();
      }

      setForm({
        fullName: "",
        email: "",
        phone: "",
        companyName: "",
        address: "",
        city: "",
        state: "",
        country: "Nigeria",
        notes: "",
      });

      setShowForm(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create customer"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="customers-module">
      <div className="module-toolbar">
        <div>
          <p className="eyebrow">Customer Management</p>
          <h2>Customers</h2>
          <p>
            Manage MagCharge customers, companies and
            contact information.
          </p>
        </div>

        {canWrite && (
          <button
            className="primary-button"
            onClick={() =>
              setShowForm((current) => !current)
            }
          >
            {showForm ? "Close form" : "+ Add customer"}
          </button>
        )}
      </div>

      {error && (
        <div className="error-box">{error}</div>
      )}

      {showForm && canWrite && (
        <form
          className="customer-form"
          onSubmit={createCustomer}
        >
          <div className="form-heading">
            <div>
              <p className="eyebrow">New customer</p>
              <h3>Add customer</h3>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Full name *
              <input
                value={form.fullName}
                onChange={(event) =>
                  updateField(
                    "fullName",
                    event.target.value
                  )
                }
                placeholder="Customer full name"
                required
              />
            </label>

            <label>
              Company
              <input
                value={form.companyName}
                onChange={(event) =>
                  updateField(
                    "companyName",
                    event.target.value
                  )
                }
                placeholder="Company name"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  updateField(
                    "email",
                    event.target.value
                  )
                }
                placeholder="customer@example.com"
              />
            </label>

            <label>
              Phone
              <input
                value={form.phone}
                onChange={(event) =>
                  updateField(
                    "phone",
                    event.target.value
                  )
                }
                placeholder="+234..."
              />
            </label>

            <label>
              City
              <input
                value={form.city}
                onChange={(event) =>
                  updateField(
                    "city",
                    event.target.value
                  )
                }
                placeholder="Lagos"
              />
            </label>

            <label>
              State
              <input
                value={form.state}
                onChange={(event) =>
                  updateField(
                    "state",
                    event.target.value
                  )
                }
                placeholder="Lagos"
              />
            </label>

            <label className="full-width">
              Address
              <input
                value={form.address}
                onChange={(event) =>
                  updateField(
                    "address",
                    event.target.value
                  )
                }
                placeholder="Customer address"
              />
            </label>

            <label className="full-width">
              Notes
              <textarea
                value={form.notes}
                onChange={(event) =>
                  updateField(
                    "notes",
                    event.target.value
                  )
                }
                placeholder="Internal notes"
                rows={3}
              />
            </label>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save customer"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <form
        className="customer-search"
        onSubmit={handleSearch}
      >
        <input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search by name, email, phone or company..."
        />
        <button
          type="submit"
          className="secondary-button"
        >
          Search
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setSearch("");
            loadCustomers();
          }}
        >
          Reset
        </button>
      </form>

      <div className="customer-layout">
        <div className="customer-list-card">
          <div className="list-heading">
            <strong>Customer list</strong>
            <span>{customers.length}</span>
          </div>

          {loading ? (
            <div className="empty-state">
              Loading customers...
            </div>
          ) : customers.length === 0 ? (
            <div className="empty-state">
              <strong>No customers found</strong>
              <span>
                Add your first customer to begin.
              </span>
            </div>
          ) : (
            <div className="customer-list">
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  className={
                    selected?.id === customer.id
                      ? "customer-row selected"
                      : "customer-row"
                  }
                  onClick={() =>
                    setSelected(customer)
                  }
                >
                  <div>
                    <strong>
                      {customer.full_name}
                    </strong>
                    <span>
                      {customer.company_name ||
                        customer.customer_code}
                    </span>
                  </div>

                  <span
                    className={`customer-status ${customer.status}`}
                  >
                    {customer.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="customer-detail-card">
          {selected ? (
            <>
              <div className="detail-heading">
                <div>
                  <p className="eyebrow">
                    {selected.customer_code}
                  </p>
                  <h3>{selected.full_name}</h3>
                </div>

                <span
                  className={`customer-status ${selected.status}`}
                >
                  {selected.status}
                </span>
              </div>

              <div className="detail-grid">
                <div>
                  <span>Email</span>
                  <strong>
                    {selected.email || "—"}
                  </strong>
                </div>

                <div>
                  <span>Phone</span>
                  <strong>
                    {selected.phone || "—"}
                  </strong>
                </div>

                <div>
                  <span>Company</span>
                  <strong>
                    {selected.company_name || "—"}
                  </strong>
                </div>

                <div>
                  <span>Location</span>
                  <strong>
                    {[
                      selected.city,
                      selected.state,
                      selected.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </strong>
                </div>

                <div className="full-width">
                  <span>Address</span>
                  <strong>
                    {selected.address || "—"}
                  </strong>
                </div>

                <div className="full-width">
                  <span>Notes</span>
                  <strong>
                    {selected.notes || "—"}
                  </strong>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <strong>Select a customer</strong>
              <span>
                Customer details will appear here.
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
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
            <p className="eyebrow">
              MagCharge Sales SaaS
            </p>
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
                <p className="eyebrow">
                  Command Center
                </p>
                <h2>
                  Welcome,{" "}
                  {user.fullName.split(" ")[0]}.
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
                <strong>Live</strong>
                <small>Customer database connected</small>
              </div>

              <div className="stat-card">
                <span>Orders</span>
                <strong>—</strong>
                <small>Connect order module</small>
              </div>
            </section>

            <section className="command-grid">
              <article>
                <p className="eyebrow">
                  ChatGPT Assistant
                </p>
                <h3>AI business assistant</h3>
                <p>
                  Controlled AI tools will operate
                  through authenticated business actions.
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
        ) : active === "Customers" ? (
          <CustomersModule user={user} />
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
