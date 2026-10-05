const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

const TOKEN_KEY = "magcharge_access_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function register(
  email: string,
  password: string,
  fullName: string
) {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      fullName,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Registration failed");
  }

  return data;
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Login failed");
  }

  setToken(data.token);

  return data.user;
}

export async function getCurrentUser() {
  const token = getToken();

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      clearToken();
      return null;
    }

    if (!response.ok) {
      throw new Error(data.error || `Session check failed (${response.status})`);
    }

    return data.user;
  } catch (error) {
    console.warn(
      "Session check temporarily failed; keeping existing token.",
      error
    );

    return null;
  }
}

export async function logout() {
  const token = getToken();

  if (token) {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } finally {
      clearToken();
    }
  }
}
