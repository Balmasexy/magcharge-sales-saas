import { useState } from 'react'
import './App.css'

type Module =
  | 'Dashboard'
  | 'Sales'
  | 'Inventory'
  | 'Customers'
  | 'Orders'
  | 'Payments'
  | 'Dealers'
  | 'Warranty / RMA'
  | 'Analytics'
  | 'Admin'
  | 'AI Command Center'

const modules: Module[] = [
  'Dashboard',
  'Sales',
  'Inventory',
  'Customers',
  'Orders',
  'Payments',
  'Dealers',
  'Warranty / RMA',
  'Analytics',
  'Admin',
  'AI Command Center',
]

function App() {
  const [active, setActive] = useState<Module>('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const selectModule = (module: Module) => {
    setActive(module)
    setSidebarOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <strong>MagCharge</strong>
            <span>Sales SaaS</span>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-label">WORKSPACE</div>

          {modules.slice(0, 10).map((module) => (
            <button
              key={module}
              className={`nav-item ${active === module ? 'active' : ''}`}
              onClick={() => selectModule(module)}
            >
              <span className="nav-icon">{iconFor(module)}</span>
              <span>{module}</span>
            </button>
          ))}

          <div className="nav-label ai-label">INTELLIGENCE</div>

          <button
            className={`nav-item ai-item ${
              active === 'AI Command Center' ? 'active' : ''
            }`}
            onClick={() => selectModule('AI Command Center')}
          >
            <span className="nav-icon">✦</span>
            <span>AI Command Center</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="status-dot" />
          <div>
            <strong>System Online</strong>
            <span>MagCharge Operations</span>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="main">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            ☰
          </button>

          <div className="breadcrumb">
            <span>MagCharge</span>
            <span>/</span>
            <strong>{active}</strong>
          </div>

          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications">
              ♧
            </button>
            <div className="profile">
              <div className="avatar">BA</div>
              <div className="profile-text">
                <strong>Busari Alaba</strong>
                <span>Administrator</span>
              </div>
            </div>
          </div>
        </header>

        <section className="content">
          {active === 'Dashboard' ? (
            <Dashboard onOpen={selectModule} />
          ) : active === 'AI Command Center' ? (
            <AICommandCenter />
          ) : (
            <ModulePlaceholder module={active} />
          )}
        </section>
      </main>
    </div>
  )
}

function Dashboard({ onOpen }: { onOpen: (module: Module) => void }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">OVERVIEW</span>
          <h1>Good day, Busari</h1>
          <p>Here’s what’s happening across your MagCharge business.</p>
        </div>

        <button className="primary-button" onClick={() => onOpen('Sales')}>
          + New Sale
        </button>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Today's Sales"
          value="₦0.00"
          change="No sales recorded"
          icon="₦"
        />
        <StatCard
          label="Orders"
          value="0"
          change="Awaiting orders"
          icon="⌁"
        />
        <StatCard
          label="Inventory"
          value="0"
          change="Products tracked"
          icon="▣"
        />
        <StatCard
          label="Customers"
          value="0"
          change="Registered customers"
          icon="♙"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel sales-panel">
          <div className="panel-header">
            <div>
              <h2>Sales Overview</h2>
              <p>Track sales performance as transactions arrive.</p>
            </div>
            <button onClick={() => onOpen('Analytics')}>View analytics →</button>
          </div>

          <div className="empty-chart">
            <div className="chart-icon">⌁</div>
            <strong>No sales data yet</strong>
            <span>Sales activity will appear here once transactions are recorded.</span>
          </div>
        </section>

        <section className="panel ai-panel">
          <div className="ai-glow" />
          <span className="ai-badge">✦ AI COMMAND CENTER</span>
          <h2>Work smarter with AI</h2>
          <p>
            Ask questions about sales, inventory, customers, orders and
            operations from one place.
          </p>

          <div className="assistant-list">
            <div>
              <span>◉</span>
              <strong>ChatGPT Assistant</strong>
            </div>
            <div>
              <span>✦</span>
              <strong>BALMZ AI</strong>
            </div>
          </div>

          <button className="secondary-button" onClick={() => onOpen('AI Command Center')}>
            Open AI Command Center
          </button>
        </section>
      </div>

      <section className="quick-section">
        <div className="section-heading">
          <div>
            <h2>Quick Actions</h2>
            <p>Jump directly into common operations.</p>
          </div>
        </div>

        <div className="quick-grid">
          {[
            ['Sales', 'Create and manage sales'],
            ['Inventory', 'Manage MagCharge products'],
            ['Customers', 'View customer records'],
            ['Orders', 'Track customer orders'],
            ['Payments', 'Monitor payments'],
            ['Warranty / RMA', 'Manage warranty cases'],
          ].map(([title, description]) => (
            <button
              className="quick-card"
              key={title}
              onClick={() => onOpen(title as Module)}
            >
              <span className="quick-icon">{iconFor(title as Module)}</span>
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <span className="arrow">→</span>
            </button>
          ))}
        </div>
      </section>
    </>
  )
}

function StatCard({
  label,
  value,
  change,
  icon,
}: {
  label: string
  value: string
  change: string
  icon: string
}) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <div className="stat-icon">{icon}</div>
      </div>
      <strong className="stat-value">{value}</strong>
      <small>{change}</small>
    </article>
  )
}

function AICommandCenter() {
  const [message, setMessage] = useState('')

  return (
    <div className="ai-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">INTELLIGENCE</span>
          <h1>AI Command Center</h1>
          <p>Your controlled AI workspace for MagCharge operations.</p>
        </div>
        <span className="connection-badge">● AI Layer Ready</span>
      </div>

      <div className="ai-command-grid">
        <section className="assistant-card">
          <div className="assistant-title">
            <div className="assistant-logo">C</div>
            <div>
              <span>ASSISTANT</span>
              <h2>ChatGPT Assistant</h2>
            </div>
          </div>
          <p>
            Use natural language to query approved MagCharge business tools,
            create drafts and assist with operations.
          </p>
          <div className="suggestions">
            <button onClick={() => setMessage("Show me today's sales.")}>
              Show me today’s sales
            </button>
            <button onClick={() => setMessage('Check inventory.')}>
              Check inventory
            </button>
            <button onClick={() => setMessage('Summarize open orders.')}>
              Summarize open orders
            </button>
          </div>
        </section>

        <section className="assistant-card balmz-card">
          <div className="assistant-title">
            <div className="assistant-logo balmz">B</div>
            <div>
              <span>INTELLIGENCE ENGINE</span>
              <h2>BALMZ AI</h2>
            </div>
          </div>
          <p>
            A dedicated MagCharge intelligence layer for business insights,
            workflow assistance and future automation.
          </p>
          <div className="capabilities">
            <span>Business Insights</span>
            <span>Operations</span>
            <span>Automation</span>
          </div>
        </section>
      </div>

      <section className="command-panel">
        <div className="command-header">
          <span className="live-dot" />
          <strong>AI Workspace</strong>
          <span>Controlled tool access</span>
        </div>

        <div className="command-body">
          <div className="command-welcome">
            <div className="command-symbol">✦</div>
            <h2>What would you like to do?</h2>
            <p>
              Start with a question about your MagCharge business.
            </p>
          </div>

          {message && (
            <div className="command-preview">
              <span>You</span>
              <p>{message}</p>
            </div>
          )}

          <div className="command-input">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about sales, inventory, customers..."
            />
            <button onClick={() => setMessage('')}>Clear</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function ModulePlaceholder({ module }: { module: Module }) {
  return (
    <div className="placeholder-page">
      <span className="eyebrow">MODULE</span>
      <div className="placeholder-icon">{iconFor(module)}</div>
      <h1>{module}</h1>
      <p>
        This module is ready for its business workflow and API integration.
      </p>
      <span className="build-badge">Foundation ready</span>
    </div>
  )
}

function iconFor(module: Module) {
  const icons: Record<string, string> = {
    Dashboard: '⌂',
    Sales: '₦',
    Inventory: '▣',
    Customers: '♙',
    Orders: '⌁',
    Payments: '◉',
    Dealers: '♧',
    'Warranty / RMA': '✓',
    Analytics: '◒',
    Admin: '⚙',
  }

  return icons[module] ?? '•'
}

export default App
