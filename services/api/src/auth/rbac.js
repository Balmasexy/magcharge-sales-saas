export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  SALES: "sales",
  INVENTORY: "inventory",
  DEALER: "dealer",
  SUPPORT: "support",
};

export function hasRole(user, ...roles) {
  return Boolean(user && roles.includes(user.role));
}

export function requirePermission(permission) {
  return (user) => {
    if (!user?.permissions) return false;
    return user.permissions.includes(permission);
  };
}
