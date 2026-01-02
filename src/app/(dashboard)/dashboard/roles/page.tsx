"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Shield,
  Loader2,
  Check,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  RESOURCES,
  ACTIONS,
  getResourcesByCategory,
  CATEGORY_LABELS,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/lib/permissions";

interface Permission {
  resource: string;
  actions: string[];
}

interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isDefault: boolean;
  isSystem: boolean;
  createdAt: string;
}

interface FormData {
  name: string;
  description: string;
  permissions: Permission[];
  isDefault: boolean;
}

const initialFormData: FormData = {
  name: "",
  description: "",
  permissions: [],
  isDefault: false,
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch("/api/roles");
      const result = await response.json();
      if (result.success) {
        setRoles(result.data);
      } else {
        toast.error(result.error || "Failed to fetch roles");
      }
    } catch {
      toast.error("Failed to fetch roles");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const hasPermission = (resource: string, action: string): boolean => {
    const permission = formData.permissions.find((p) => p.resource === resource);
    return permission?.actions.includes(action) || false;
  };

  const togglePermission = (resource: string, action: string) => {
    setFormData((prev) => {
      const existingPermission = prev.permissions.find(
        (p) => p.resource === resource
      );

      if (existingPermission) {
        const hasAction = existingPermission.actions.includes(action);
        const newActions = hasAction
          ? existingPermission.actions.filter((a) => a !== action)
          : [...existingPermission.actions, action];

        if (newActions.length === 0) {
          return {
            ...prev,
            permissions: prev.permissions.filter((p) => p.resource !== resource),
          };
        }

        return {
          ...prev,
          permissions: prev.permissions.map((p) =>
            p.resource === resource ? { ...p, actions: newActions } : p
          ),
        };
      } else {
        return {
          ...prev,
          permissions: [...prev.permissions, { resource, actions: [action] }],
        };
      }
    });
  };

  const toggleAllActionsForResource = (resource: string) => {
    setFormData((prev) => {
      const existingPermission = prev.permissions.find(
        (p) => p.resource === resource
      );
      const hasAllActions =
        existingPermission?.actions.length === ACTIONS.length;

      if (hasAllActions) {
        return {
          ...prev,
          permissions: prev.permissions.filter((p) => p.resource !== resource),
        };
      }

      if (existingPermission) {
        return {
          ...prev,
          permissions: prev.permissions.map((p) =>
            p.resource === resource ? { ...p, actions: [...ACTIONS] } : p
          ),
        };
      }

      return {
        ...prev,
        permissions: [...prev.permissions, { resource, actions: [...ACTIONS] }],
      };
    });
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error("Role name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Role created successfully");
        setIsCreateDialogOpen(false);
        setFormData(initialFormData);
        fetchRoles();
      } else {
        toast.error(result.error || "Failed to create role");
      }
    } catch {
      toast.error("Failed to create role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedRole) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/roles/${selectedRole._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Role updated successfully");
        setIsEditDialogOpen(false);
        setSelectedRole(null);
        setFormData(initialFormData);
        fetchRoles();
      } else {
        toast.error(result.error || "Failed to update role");
      }
    } catch {
      toast.error("Failed to update role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/roles/${selectedRole._id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Role deleted successfully");
        setIsDeleteDialogOpen(false);
        setSelectedRole(null);
        fetchRoles();
      } else {
        toast.error(result.error || "Failed to delete role");
      }
    } catch {
      toast.error("Failed to delete role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions || [],
      isDefault: role.isDefault,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPermissionCount = (role: Role) => {
    return role.permissions.reduce(
      (count, p) => count + p.actions.length,
      0
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const resourcesByCategory = getResourcesByCategory();

  const applyRoleTemplate = (template: string) => {
    const permissions = DEFAULT_ROLE_PERMISSIONS[template];
    if (permissions) {
      setFormData((prev) => ({ ...prev, permissions: [...permissions] }));
      toast.success(`Applied ${template} template`);
    }
  };

  const PermissionsEditor = () => (
    <div className="space-y-3">
      {/* Quick Templates */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Quick templates:</span>
        {Object.keys(DEFAULT_ROLE_PERMISSIONS).map((template) => (
          <Button
            key={template}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyRoleTemplate(template)}
            className="capitalize h-7 text-xs"
          >
            {template}
          </Button>
        ))}
      </div>

      {/* Permissions by Category */}
      <div className="border rounded-lg divide-y">
        {Object.entries(resourcesByCategory).map(([category, resources]) => {
          if (resources.length === 0) return null;

          const categoryPermissionCount = resources.reduce((count, resource) => {
            const permission = formData.permissions.find((p) => p.resource === resource.id);
            return count + (permission?.actions.length || 0);
          }, 0);

          return (
            <Collapsible key={category} defaultOpen={category === "core" || category === "admin"}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                  <span className="font-medium">{CATEGORY_LABELS[category]}</span>
                  <Badge variant="secondary" className="text-xs">
                    {resources.length} resources
                  </Badge>
                </div>
                {categoryPermissionCount > 0 && (
                  <Badge variant="default" className="text-xs">
                    {categoryPermissionCount} permissions
                  </Badge>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[180px]">Resource</TableHead>
                      {ACTIONS.map((action) => (
                        <TableHead key={action} className="text-center capitalize w-20">
                          {action}
                        </TableHead>
                      ))}
                      <TableHead className="text-center w-20">All</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map((resource) => {
                      const permission = formData.permissions.find(
                        (p) => p.resource === resource.id
                      );
                      const hasAllActions =
                        permission?.actions.length === ACTIONS.length;

                      return (
                        <TableRow key={resource.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{resource.label}</span>
                              <p className="text-xs text-muted-foreground">{resource.description}</p>
                            </div>
                          </TableCell>
                          {ACTIONS.map((action) => (
                            <TableCell key={action} className="text-center">
                              <Checkbox
                                checked={hasPermission(resource.id, action)}
                                onCheckedChange={() =>
                                  togglePermission(resource.id, action)
                                }
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-center">
                            <Checkbox
                              checked={hasAllActions}
                              onCheckedChange={() =>
                                toggleAllActionsForResource(resource.id)
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Roles</h2>
          <p className="text-muted-foreground">
            Manage roles and permissions in your organization
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Roles</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRoles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No roles found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => (
                  <TableRow key={role._id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        {role.name}
                        {role.isDefault && (
                          <Badge variant="outline" className="ml-1">
                            <Check className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {role.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getPermissionCount(role)} permissions
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={role.isSystem ? "default" : "outline"}
                      >
                        {role.isSystem ? "System" : "Custom"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(role.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(role)}
                            disabled={role.isSystem}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(role)}
                            className="text-destructive"
                            disabled={role.isSystem || role.isDefault}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Define a new role with specific permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Role Name</Label>
                <Input
                  id="create-name"
                  placeholder="e.g., Manager"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center gap-4 pt-6">
                <Switch
                  id="create-default"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isDefault: checked })
                  }
                />
                <Label htmlFor="create-default">Set as default role</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                placeholder="Describe what this role can do..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <PermissionsEditor />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setFormData(initialFormData);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role details and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Role Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center gap-4 pt-6">
                <Switch
                  id="edit-default"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isDefault: checked })
                  }
                />
                <Label htmlFor="edit-default">Set as default role</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <PermissionsEditor />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedRole(null);
                setFormData(initialFormData);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the role
              &quot;{selectedRole?.name}&quot;. Users with this role will need to
              be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedRole(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
