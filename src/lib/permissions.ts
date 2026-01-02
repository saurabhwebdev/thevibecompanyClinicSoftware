// Centralized permissions configuration
// Add new resources here and they will automatically appear in role management

export interface ResourceDefinition {
  id: string;
  label: string;
  description: string;
  category: "core" | "clinical" | "billing" | "settings" | "admin";
}

export const RESOURCES: ResourceDefinition[] = [
  // Core Resources
  { id: "dashboard", label: "Dashboard", description: "Main dashboard access", category: "core" },
  { id: "profile", label: "Profile", description: "User profile management", category: "core" },

  // Admin Resources
  { id: "users", label: "Users", description: "User management", category: "admin" },
  { id: "roles", label: "Roles", description: "Role and permission management", category: "admin" },
  { id: "tenants", label: "Tenants", description: "Multi-tenant management", category: "admin" },

  // Clinical Resources
  { id: "patients", label: "Patients", description: "Patient records and management", category: "clinical" },
  { id: "appointments", label: "Appointments", description: "Appointment scheduling", category: "clinical" },
  { id: "medical-records", label: "Medical Records", description: "Patient medical history", category: "clinical" },
  { id: "prescriptions", label: "Prescriptions", description: "Prescription management", category: "clinical" },
  { id: "lab-reports", label: "Lab Reports", description: "Laboratory test reports", category: "clinical" },

  // Billing Resources
  { id: "invoices", label: "Invoices", description: "Invoice generation and management", category: "billing" },
  { id: "payments", label: "Payments", description: "Payment processing", category: "billing" },
  { id: "billing-reports", label: "Billing Reports", description: "Financial reports", category: "billing" },
  { id: "tax-config", label: "Tax Configuration", description: "Tax settings, rates, and compliance", category: "billing" },

  // Settings Resources
  { id: "settings", label: "General Settings", description: "Application settings", category: "settings" },
  { id: "reports", label: "Reports", description: "Analytics and reporting", category: "settings" },
];

export const ACTIONS = ["create", "read", "update", "delete"] as const;

export type Action = (typeof ACTIONS)[number];

export interface Permission {
  resource: string;
  actions: Action[];
}

// Group resources by category for better UI
export const getResourcesByCategory = () => {
  const categories: Record<string, ResourceDefinition[]> = {
    core: [],
    admin: [],
    clinical: [],
    billing: [],
    settings: [],
  };

  RESOURCES.forEach((resource) => {
    categories[resource.category].push(resource);
  });

  return categories;
};

export const CATEGORY_LABELS: Record<string, string> = {
  core: "Core",
  admin: "Administration",
  clinical: "Clinical",
  billing: "Billing & Finance",
  settings: "Settings",
};

// Helper to check if user has permission
export const hasPermission = (
  userPermissions: Permission[],
  resource: string,
  action: Action
): boolean => {
  const permission = userPermissions.find((p) => p.resource === resource);
  return permission?.actions.includes(action) ?? false;
};

// Helper to check if user has any permission for a resource
export const hasAnyPermission = (
  userPermissions: Permission[],
  resource: string
): boolean => {
  const permission = userPermissions.find((p) => p.resource === resource);
  return (permission?.actions.length ?? 0) > 0;
};

// Helper to get all permissions for a resource (full access)
export const getFullAccess = (resourceId: string): Permission => ({
  resource: resourceId,
  actions: [...ACTIONS],
});

// Helper to get read-only permission for a resource
export const getReadOnlyAccess = (resourceId: string): Permission => ({
  resource: resourceId,
  actions: ["read"],
});

// Default permissions for common role types
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: RESOURCES.map((r) => getFullAccess(r.id)),

  manager: [
    getFullAccess("dashboard"),
    getFullAccess("profile"),
    getFullAccess("patients"),
    getFullAccess("appointments"),
    getFullAccess("medical-records"),
    getFullAccess("invoices"),
    getFullAccess("payments"),
    getReadOnlyAccess("users"),
    getReadOnlyAccess("billing-reports"),
    getReadOnlyAccess("reports"),
    getReadOnlyAccess("tax-config"),
  ],

  doctor: [
    getFullAccess("dashboard"),
    getFullAccess("profile"),
    getFullAccess("patients"),
    getFullAccess("appointments"),
    getFullAccess("medical-records"),
    getFullAccess("prescriptions"),
    getReadOnlyAccess("lab-reports"),
  ],

  receptionist: [
    getFullAccess("dashboard"),
    getFullAccess("profile"),
    { resource: "patients", actions: ["create", "read", "update"] },
    getFullAccess("appointments"),
    getReadOnlyAccess("invoices"),
  ],

  accountant: [
    getFullAccess("dashboard"),
    getFullAccess("profile"),
    getReadOnlyAccess("patients"),
    getFullAccess("invoices"),
    getFullAccess("payments"),
    getFullAccess("billing-reports"),
    getFullAccess("tax-config"),
    getReadOnlyAccess("reports"),
  ],

  viewer: [
    getReadOnlyAccess("dashboard"),
    getFullAccess("profile"),
    getReadOnlyAccess("patients"),
    getReadOnlyAccess("appointments"),
  ],
};
