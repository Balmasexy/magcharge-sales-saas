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
  import.meta.env.VITE_API_URL ||
  "https://magcharge-sales-api.onrender.com";

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
  const [editing, setEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
    status: "active",
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

  function populateForm(customer: Customer) {
    setForm({
      fullName: customer.full_name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      companyName: customer.company_name || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      country: customer.country || "Nigeria",
      notes: customer.notes || "",
      status: customer.status || "active",
    });
  }

  function startEditing(customer: Customer) {
    populateForm(customer);
    setEditing(true);
    setShowForm(false);
    setError("");
  }

  function cancelEditing() {
    setEditing(false);
    if (selected) {
      populateForm(selected);
    }
  }

  async function updateCustomer(event: FormEvent) {
    event.preventDefault();

    if (!selected) return;

    setSaving(true);
    setError("");

    try {
      const data = await request(
        `/api/customers/${selected.id}`,
        {
          method: "PUT",
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
            status: form.status || "active",
          }),
        }
      );

      const customer = data?.customer || data;

      if (!customer?.id) {
        throw new Error("Customer update failed");
      }

      setCustomers((current) =>
        current.map((item) =>
          item.id === customer.id ? customer : item
        )
      );

      setSelected(customer);
      setEditing(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update customer"
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeCustomerStatus(status: string) {
    if (!selected) return;

    setActionLoading(true);
    setError("");

    try {
      const data = await request(
        `/api/customers/${selected.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            fullName: selected.full_name,
            email: selected.email || undefined,
            phone: selected.phone || undefined,
            companyName:
              selected.company_name || undefined,
            address: selected.address || undefined,
            city: selected.city || undefined,
            state: selected.state || undefined,
            country: selected.country || "Nigeria",
            notes: selected.notes || undefined,
            status,
          }),
        }
      );

      const customer = data?.customer || data;

      if (!customer?.id) {
        throw new Error("Customer status update failed");
      }

      setCustomers((current) =>
        current.map((item) =>
          item.id === customer.id ? customer : item
        )
      );

      setSelected(customer);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update customer status"
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteCustomer() {
    if (!selected) return;

    const confirmed = window.confirm(
      `Delete ${selected.full_name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setActionLoading(true);
    setError("");

    try {
      await request(
        `/api/customers/${selected.id}`,
        {
          method: "DELETE",
        }
      );

      setCustomers((current) =>
        current.filter(
          (item) => item.id !== selected.id
        )
      );

      setSelected(null);
      setEditing(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete customer"
      );
    } finally {
      setActionLoading(false);
    }
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
        status: "active",
      });

      setShowForm(false);
      setEditing(false);
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

              {editing && canWrite ? (
                <form
                  className="customer-form"
                  onSubmit={updateCustomer}
                >
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
                      />
                    </label>

                    <label>
                      Country
                      <input
                        value={form.country}
                        onChange={(event) =>
                          updateField(
                            "country",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      Status
                      <select
                        value={form.status}
                        onChange={(event) =>
                          updateField(
                            "status",
                            event.target.value
                          )
                        }
                      >
                        <option value="active">
                          Active
                        </option>
                        <option value="inactive">
                          Inactive
                        </option>
                        <option value="blocked">
                          Blocked
                        </option>
                      </select>
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
                        : "Save changes"}
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={cancelEditing}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
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

                  {canWrite && (
                    <div className="form-actions">
                      <button
                        className="primary-button"
                        onClick={() =>
                          startEditing(selected)
                        }
                        disabled={actionLoading}
                      >
                        Edit customer
                      </button>

                      <button
                        className="secondary-button"
                        onClick={() =>
                          changeCustomerStatus(
                            selected.status === "active"
                              ? "inactive"
                              : "active"
                          )
                        }
                        disabled={actionLoading}
                      >
                        {actionLoading
                          ? "Updating..."
                          : selected.status === "active"
                            ? "Deactivate"
                            : "Activate"}
                      </button>

                      <button
                        className="secondary-button"
                        onClick={deleteCustomer}
                        disabled={actionLoading}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
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


type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unit_price: string | number;
  cost_price: string | number;
  stock_quantity: number;
  reorder_level: number;
  status: string;
  created_at: string;
  updated_at: string;
};

type SaleItem = {
  id?: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  quantity: number;
  unit_price: string | number;
  total: string | number;
};

type Sale = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  subtotal: string | number;
  discount: string | number;
  total: string | number;
  payment_method: string;
  payment_status: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: SaleItem[];
};

function SalesModule({
  user,
}: {
  user: User;
}) {
  const canRead = user.permissions.includes("sales.read");
  const canWrite = user.permissions.includes("sales.write");

  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showNewSale, setShowNewSale] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [notes, setNotes] = useState("");

  const [cart, setCart] = useState<SaleItem[]>([]);

  async function request(
    path: string,
    options: RequestInit = {}
  ) {
    const token = getToken();

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || `Request failed with status ${response.status}`
      );
    }

    return data;
  }

  async function loadData() {
    if (!canRead) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let salesData;
      let customersData;
      let productsData;

      try {
        salesData = await request("/api/sales?limit=100");
      } catch (err) {
        throw new Error(
          `Sales API failed: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }

      try {
        customersData = await request("/api/customers");
      } catch (err) {
        throw new Error(
          `Customers API failed: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }

      try {
        productsData = await request("/api/products");
      } catch (err) {
        throw new Error(
          `Products API failed: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }

      setSales(salesData.sales || []);
      setCustomers(customersData.customers || []);
      setProducts(productsData.products || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load sales data"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [canRead]);

  function resetSaleForm() {
    setCustomerId("");
    setProductId("");
    setQuantity("1");
    setDiscount("");
    setPaymentMethod("cash");
    setPaymentStatus("paid");
    setNotes("");
    setCart([]);
    setError("");
  }

  function openNewSale() {
    resetSaleForm();
    setSuccess("");
    setSelectedSale(null);
    setShowNewSale(true);
  }

  function closeNewSale() {
    setShowNewSale(false);
    resetSaleForm();
  }

  function addProductToCart() {
    setError("");
    setSuccess("");

    const product = products.find(
      (item) => item.id === productId
    );

    const qty = Number(quantity);

    if (!product) {
      setError("Select a product first.");
      return;
    }

    if (!Number.isInteger(qty) || qty <= 0) {
      setError("Quantity must be a whole number greater than zero.");
      return;
    }

    if (product.status !== "active") {
      setError("This product is not active.");
      return;
    }

    const existing = cart.find(
      (item) => item.product_id === product.id
    );

    const existingQuantity = existing
      ? existing.quantity
      : 0;

    if (
      existingQuantity + qty >
      Number(product.stock_quantity)
    ) {
      setError(
        `Only ${product.stock_quantity} unit(s) of ${product.name} are available.`
      );
      return;
    }

    if (existing) {
      setCart(
        cart.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + qty,
                total:
                  Number(item.unit_price) *
                  (item.quantity + qty),
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          quantity: qty,
          unit_price: Number(product.unit_price),
          total: Number(product.unit_price) * qty,
        },
      ]);
    }

    setProductId("");
    setQuantity("1");
  }

  function updateCartQuantity(
    productIdToUpdate: string,
    nextQuantity: number
  ) {
    const product = products.find(
      (item) => item.id === productIdToUpdate
    );

    if (!product) {
      return;
    }

    if (nextQuantity <= 0) {
      setCart(
        cart.filter(
          (item) => item.product_id !== productIdToUpdate
        )
      );
      return;
    }

    if (nextQuantity > Number(product.stock_quantity)) {
      setError(
        `Only ${product.stock_quantity} unit(s) of ${product.name} are available.`
      );
      return;
    }

    setError("");

    setCart(
      cart.map((item) =>
        item.product_id === productIdToUpdate
          ? {
              ...item,
              quantity: nextQuantity,
              total:
                Number(item.unit_price) * nextQuantity,
            }
          : item
      )
    );
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.total),
    0
  );

  const discountAmount = Math.max(
    Number(discount) || 0,
    0
  );

  const total = Math.max(
    subtotal - discountAmount,
    0
  );

  async function completeSale(event: FormEvent) {
    event.preventDefault();

    if (!canWrite) {
      setError("You do not have permission to create sales.");
      return;
    }

    if (!cart.length) {
      setError("Add at least one product to the sale.");
      return;
    }

    if (discountAmount > subtotal) {
      setError("Discount cannot be greater than the subtotal.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const result = await request("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          customerId: customerId || null,
          items: cart.map((item) => ({
            productId: item.product_id,
            quantity: item.quantity,
          })),
          discount: discountAmount,
          paymentMethod,
          paymentStatus,
          notes: notes.trim() || null,
        }),
      });

      setSuccess(
        `Sale completed successfully. Sale ID: ${result.sale.id}`
      );

      setShowNewSale(false);
      resetSaleForm();

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete sale"
      );
    } finally {
      setSaving(false);
    }
  }

  async function viewSale(id: string) {
    setError("");

    try {
      const data = await request(`/api/sales/${id}`);
      setSelectedSale(data.sale);
      setShowNewSale(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load sale details"
      );
    }
  }

  if (!canRead) {
    return (
      <section className="module-card">
        <p className="eyebrow">Sales</p>
        <h2>Permission denied</h2>
        <p>
          Your account does not have permission to view
          sales.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="module-card">
        <p className="eyebrow">Sales</p>
        <h2>Loading sales...</h2>
        <p>Please wait while sales data is loaded.</p>
      </section>
    );
  }

  return (
    <section className="module-stack">
      <div className="module-card">
        <div className="module-header">
          <div>
            <p className="eyebrow">MagCharge Sales</p>
            <h2>Sales Management</h2>
            <p>
              Create sales, track payments and automatically
              reduce inventory.
            </p>
          </div>

          {canWrite && (
            <button
              className="primary-button"
              onClick={openNewSale}
            >
              + New Sale
            </button>
          )}
        </div>

        {success && (
          <div className="success-box">{success}</div>
        )}

        {error && (
          <div className="error-box">{error}</div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <span>Total sales</span>
            <strong>{sales.length}</strong>
            <small>Recent transactions</small>
          </div>

          <div className="stat-card">
            <span>Sales value</span>
            <strong>
              ₦
              {sales
                .reduce(
                  (sum, sale) => sum + Number(sale.total),
                  0
                )
                .toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
            </strong>
            <small>Loaded sales</small>
          </div>

          <div className="stat-card">
            <span>Customers</span>
            <strong>{customers.length}</strong>
            <small>Available customers</small>
          </div>

          <div className="stat-card">
            <span>Products</span>
            <strong>{products.length}</strong>
            <small>Inventory products</small>
          </div>
        </div>
      </div>

      {showNewSale && canWrite && (
        <div className="module-card">
          <div className="module-header">
            <div>
              <p className="eyebrow">Transaction</p>
              <h2>New Sale</h2>
            </div>

            <button
              className="secondary-button"
              onClick={closeNewSale}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={completeSale}>
            <div className="form-grid">
              <label>
                Customer
                <select
                  value={customerId}
                  onChange={(event) =>
                    setCustomerId(event.target.value)
                  }
                >
                  <option value="">
                    Walk-in customer
                  </option>

                  {customers
                    .filter(
                      (customer) =>
                        customer.status === "active"
                    )
                    .map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.full_name} —{" "}
                        {customer.customer_code}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Payment method
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value)
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">
                    Bank Transfer
                  </option>
                  <option value="card">Card</option>
                  <option value="pos">POS</option>
                </select>
              </label>

              <label>
                Payment status
                <select
                  value={paymentStatus}
                  onChange={(event) =>
                    setPaymentStatus(event.target.value)
                  }
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </label>

              <label>
                Discount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(event) =>
                    setDiscount(event.target.value)
                  }
                  placeholder="0.00"
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                Product
                <select
                  value={productId}
                  onChange={(event) =>
                    setProductId(event.target.value)
                  }
                >
                  <option value="">
                    Select product
                  </option>

                  {products
                    .filter(
                      (product) =>
                        product.status === "active" &&
                        Number(product.stock_quantity) > 0
                    )
                    .map((product) => (
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.name} — {product.sku} —{" "}
                        ₦
                        {Number(
                          product.unit_price
                        ).toLocaleString()} — Stock:{" "}
                        {product.stock_quantity}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Quantity
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(event.target.value)
                  }
                />
              </label>

              <div className="form-action">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={addProductToCart}
                >
                  Add product
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {!cart.length ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <strong>No products added</strong>
                          <span>
                            Select a product and add it to
                            this sale.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cart.map((item) => (
                      <tr key={item.product_id}>
                        <td>{item.product_name}</td>
                        <td>{item.sku}</td>
                        <td>
                          ₦
                          {Number(
                            item.unit_price
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td>
                          <input
                            className="table-input"
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(event) =>
                              updateCartQuantity(
                                item.product_id,
                                Number(event.target.value)
                              )
                            }
                          />
                        </td>
                        <td>
                          ₦
                          {Number(
                            item.total
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              updateCartQuantity(
                                item.product_id,
                                0
                              )
                            }
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="sale-summary">
              <div>
                <span>Subtotal</span>
                <strong>
                  ₦
                  {subtotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </div>

              <div>
                <span>Discount</span>
                <strong>
                  ₦
                  {discountAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </div>

              <div className="sale-total">
                <span>Total</span>
                <strong>
                  ₦
                  {total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </div>
            </div>

            <label>
              Notes
              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="Optional sale notes"
                rows={3}
              />
            </label>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeNewSale}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving || !cart.length}
              >
                {saving
                  ? "Completing sale..."
                  : "Complete Sale"}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedSale && (
        <div className="module-card">
          <div className="module-header">
            <div>
              <p className="eyebrow">Sale Details</p>
              <h2>
                {selectedSale.id.slice(0, 8)}
              </h2>
            </div>

            <button
              className="secondary-button"
              onClick={() => setSelectedSale(null)}
            >
              Close
            </button>
          </div>

          <div className="detail-grid">
            <div>
              <span>Customer</span>
              <strong>
                {selectedSale.customer_name ||
                  "Walk-in customer"}
              </strong>
            </div>

            <div>
              <span>Payment</span>
              <strong>
                {selectedSale.payment_method}
              </strong>
            </div>

            <div>
              <span>Status</span>
              <strong>
                {selectedSale.payment_status}
              </strong>
            </div>

            <div>
              <span>Date</span>
              <strong>
                {new Date(
                  selectedSale.created_at
                ).toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {(selectedSale.items || []).map(
                  (item) => (
                    <tr key={item.id || item.product_id}>
                      <td>{item.product_name}</td>
                      <td>{item.sku}</td>
                      <td>{item.quantity}</td>
                      <td>
                        ₦
                        {Number(
                          item.unit_price
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td>
                        ₦
                        {Number(
                          item.total
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="sale-summary">
            <div>
              <span>Subtotal</span>
              <strong>
                ₦
                {Number(
                  selectedSale.subtotal
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </strong>
            </div>

            <div>
              <span>Discount</span>
              <strong>
                ₦
                {Number(
                  selectedSale.discount
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </strong>
            </div>

            <div className="sale-total">
              <span>Total</span>
              <strong>
                ₦
                {Number(
                  selectedSale.total
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </strong>
            </div>
          </div>
        </div>
      )}

      <div className="module-card">
        <div className="module-header">
          <div>
            <p className="eyebrow">History</p>
            <h2>Recent Sales</h2>
          </div>

          <button
            className="secondary-button"
            onClick={loadData}
          >
            Refresh
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {!sales.length ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <strong>No sales yet</strong>
                      <span>
                        Create your first sale to see it
                        here.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      {sale.customer_name ||
                        "Walk-in customer"}
                    </td>
                    <td>
                      ₦
                      {Number(
                        sale.total
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td>
                      {sale.payment_method}
                    </td>
                    <td>
                      <span className="status-pill">
                        {sale.payment_status}
                      </span>
                    </td>
                    <td>
                      {new Date(
                        sale.created_at
                      ).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="secondary-button"
                        onClick={() =>
                          viewSale(sale.id)
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ProductsModule({
  user,
}: {
  user: User;
}) {
  const canWrite = user.permissions.includes("inventory.write");

  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);

  const emptyForm = {
    sku: "",
    name: "",
    description: "",
    category: "",
    unitPrice: "",
    costPrice: "",
    stockQuantity: "0",
    reorderLevel: "0",
    status: "active",
  };

  const [form, setForm] = useState(emptyForm);

  async function request(
    path: string,
    options: RequestInit = {}
  ) {
    const token = getToken();

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
        ...(options.headers || {}),
      },
    });

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

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const query = search.trim()
        ? `?search=${encodeURIComponent(search.trim())}`
        : "";

      const data = await request(`/api/products${query}`);

      setProducts(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.products)
            ? data.products
            : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load products"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditing(false);
    setShowForm(false);
  }

  function startEdit(product: Product) {
    setSelected(product);
    setForm({
      sku: product.sku || "",
      name: product.name || "",
      description: product.description || "",
      category: product.category || "",
      unitPrice: String(product.unit_price ?? ""),
      costPrice: String(product.cost_price ?? ""),
      stockQuantity: String(product.stock_quantity ?? 0),
      reorderLevel: String(product.reorder_level ?? 0),
      status: product.status || "active",
    });
    setEditing(true);
    setShowForm(true);
    setError("");
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category.trim() || undefined,
        unitPrice: Number(form.unitPrice),
        costPrice: Number(form.costPrice),
        stockQuantity: Number(form.stockQuantity),
        reorderLevel: Number(form.reorderLevel),
        status: form.status,
      };

      const data = await request(
        editing && selected
          ? `/api/products/${selected.id}`
          : "/api/products",
        {
          method: editing && selected ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      const product = data?.product || data;

      if (!product?.id) {
        throw new Error("Product save failed");
      }

      if (editing) {
        setProducts((current) =>
          current.map((item) =>
            item.id === product.id ? product : item
          )
        );
      } else {
        setProducts((current) => [product, ...current]);
      }

      setSelected(product);
      resetForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save product"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product: Product) {
    if (
      !window.confirm(
        `Delete ${product.name} (${product.sku})? This action cannot be undone.`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await request(`/api/products/${product.id}`, {
        method: "DELETE",
      });

      setProducts((current) =>
        current.filter((item) => item.id !== product.id)
      );

      if (selected?.id === product.id) {
        setSelected(null);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete product"
      );
    } finally {
      setSaving(false);
    }
  }

  const lowStock = products.filter(
    (product) =>
      product.status === "active" &&
      Number(product.stock_quantity) <=
        Number(product.reorder_level)
  ).length;

  return (
    <section className="customers-module">
      <div className="module-toolbar">
        <div>
          <p className="eyebrow">Inventory Management</p>
          <h2>Products</h2>
          <p>
            Manage MagCharge products, pricing and stock levels.
          </p>
        </div>

        {canWrite && (
          <button
            className="primary-button"
            onClick={() => {
              setSelected(null);
              setForm(emptyForm);
              setEditing(false);
              setShowForm((current) => !current);
            }}
          >
            {showForm ? "Close form" : "+ Add product"}
          </button>
        )}
      </div>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Total products</span>
          <strong>{products.length}</strong>
          <small>Products in catalogue</small>
        </div>

        <div className="stat-card">
          <span>Active</span>
          <strong>
            {products.filter((p) => p.status === "active").length}
          </strong>
          <small>Currently available</small>
        </div>

        <div className="stat-card">
          <span>Low stock</span>
          <strong>{lowStock}</strong>
          <small>At or below reorder level</small>
        </div>

        <div className="stat-card">
          <span>Inventory units</span>
          <strong>
            {products.reduce(
              (total, product) =>
                total + Number(product.stock_quantity || 0),
              0
            )}
          </strong>
          <small>Total units in stock</small>
        </div>
      </section>

      {error && <div className="error-box">{error}</div>}

      {showForm && canWrite && (
        <form className="customer-form" onSubmit={saveProduct}>
          <div className="form-heading">
            <div>
              <p className="eyebrow">
                {editing ? "Edit product" : "New product"}
              </p>
              <h3>
                {editing ? "Update product" : "Add product"}
              </h3>
            </div>
          </div>

          <div className="form-grid">
            <label>
              SKU *
              <input
                value={form.sku}
                onChange={(event) =>
                  updateField("sku", event.target.value)
                }
                placeholder="MAG-001"
                required
              />
            </label>

            <label>
              Product name *
              <input
                value={form.name}
                onChange={(event) =>
                  updateField("name", event.target.value)
                }
                placeholder="MagCharge Magnetic Charger"
                required
              />
            </label>

            <label>
              Category
              <input
                value={form.category}
                onChange={(event) =>
                  updateField("category", event.target.value)
                }
                placeholder="Chargers"
              />
            </label>

            <label>
              Selling price *
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.unitPrice}
                onChange={(event) =>
                  updateField("unitPrice", event.target.value)
                }
                placeholder="25000"
                required
              />
            </label>

            <label>
              Cost price *
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={(event) =>
                  updateField("costPrice", event.target.value)
                }
                placeholder="18000"
                required
              />
            </label>

            <label>
              Stock quantity *
              <input
                type="number"
                min="0"
                value={form.stockQuantity}
                onChange={(event) =>
                  updateField(
                    "stockQuantity",
                    event.target.value
                  )
                }
                required
              />
            </label>

            <label>
              Reorder level *
              <input
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(event) =>
                  updateField(
                    "reorderLevel",
                    event.target.value
                  )
                }
                required
              />
            </label>

            <label>
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  updateField("status", event.target.value)
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <label className="full-width">
              Description
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value
                  )
                }
                placeholder="Product description"
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
                : editing
                  ? "Save changes"
                  : "Create product"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={resetForm}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <form
        className="customer-search"
        onSubmit={(event) => {
          event.preventDefault();
          loadProducts();
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search SKU, product name or category..."
        />

        <button type="submit" className="secondary-button">
          Search
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setSearch("");
            setTimeout(loadProducts, 0);
          }}
        >
          Reset
        </button>
      </form>

      <div className="customer-layout">
        <div className="customer-list-card">
          <div className="list-heading">
            <strong>Product catalogue</strong>
            <span>{products.length}</span>
          </div>

          {loading ? (
            <div className="empty-state">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <strong>No products found</strong>
              <span>
                Add your first MagCharge product to begin.
              </span>
            </div>
          ) : (
            <div className="customer-list">
              {products.map((product) => {
                const isLow =
                  Number(product.stock_quantity) <=
                  Number(product.reorder_level);

                return (
                  <button
                    key={product.id}
                    className={
                      selected?.id === product.id
                        ? "customer-row selected"
                        : "customer-row"
                    }
                    onClick={() => setSelected(product)}
                  >
                    <div>
                      <strong>{product.name}</strong>
                      <span>
                        {product.sku} ·{" "}
                        {product.category || "Uncategorised"}
                      </span>
                    </div>

                    <span
                      className={`customer-status ${
                        isLow ? "blocked" : product.status
                      }`}
                    >
                      {isLow
                        ? "Low stock"
                        : product.status}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="customer-detail-card">
          {selected ? (
            <>
              <div className="detail-heading">
                <div>
                  <p className="eyebrow">{selected.sku}</p>
                  <h3>{selected.name}</h3>
                </div>

                <span
                  className={`customer-status ${
                    Number(selected.stock_quantity) <=
                    Number(selected.reorder_level)
                      ? "blocked"
                      : selected.status
                  }`}
                >
                  {Number(selected.stock_quantity) <=
                  Number(selected.reorder_level)
                    ? "Low stock"
                    : selected.status}
                </span>
              </div>

              <div className="detail-grid">
                <div>
                  <span>Category</span>
                  <strong>
                    {selected.category || "—"}
                  </strong>
                </div>

                <div>
                  <span>Selling price</span>
                  <strong>
                    ₦{Number(selected.unit_price).toLocaleString()}
                  </strong>
                </div>

                <div>
                  <span>Cost price</span>
                  <strong>
                    ₦{Number(selected.cost_price).toLocaleString()}
                  </strong>
                </div>

                <div>
                  <span>Stock</span>
                  <strong>
                    {selected.stock_quantity} units
                  </strong>
                </div>

                <div>
                  <span>Reorder level</span>
                  <strong>
                    {selected.reorder_level} units
                  </strong>
                </div>

                <div>
                  <span>Margin</span>
                  <strong>
                    ₦
                    {(
                      Number(selected.unit_price) -
                      Number(selected.cost_price)
                    ).toLocaleString()}
                  </strong>
                </div>

                <div className="full-width">
                  <span>Description</span>
                  <strong>
                    {selected.description || "—"}
                  </strong>
                </div>
              </div>

              {canWrite && (
                <div className="form-actions">
                  <button
                    className="primary-button"
                    onClick={() => startEdit(selected)}
                    disabled={saving}
                  >
                    Edit product
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() => deleteProduct(selected)}
                    disabled={saving}
                  >
                    Delete
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <strong>Select a product</strong>
              <span>
                Product details will appear here.
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
        ) : active === "Sales" ? (
          <SalesModule user={user} />
        ) : active === "Customers" ? (
          <CustomersModule user={user} />
        ) : active === "Inventory" ? (
          <ProductsModule user={user} />
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
    let cancelled = false;

    async function restoreSession() {
      try {
        const currentUser = await getCurrentUser();

        if (!cancelled) {
          setUser(currentUser);
          setLoading(false);
        }
      } catch (error) {
        console.warn(
          "Session restore temporarily failed. Retrying...",
          error
        );

        if (cancelled) return;

        setTimeout(async () => {
          if (cancelled) return;

          try {
            const currentUser = await getCurrentUser();

            if (!cancelled) {
              setUser(currentUser);
              setLoading(false);
            }
          } catch (retryError) {
            console.warn(
              "Session restore retry failed.",
              retryError
            );

            if (!cancelled) {
              setLoading(false);
            }
          }
        }, 1500);
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
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
