"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  Loader2,
  Calendar,
  Clock,
  Stethoscope,
  DollarSign,
  Globe,
  X,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCurrency } from "@/components/currency-provider";

interface Role {
  _id: string;
  name: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  emailVerified: boolean;
  roleId: Role;
  createdAt: string;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  roleId: string;
  isActive: boolean;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  isWorking: boolean;
  slots: TimeSlot[];
}

interface DoctorSchedule {
  _id?: string;
  doctorId: string;
  weeklySchedule: DaySchedule[];
  slotDuration: number;
  bufferTime: number;
  maxPatientsPerSlot: number;
  advanceBookingDays: number;
  isAcceptingAppointments: boolean;
  acceptsOnlineBooking: boolean;
  consultationFee: number;
  specialization?: string;
  qualifications?: string;
  bio?: string;
}

const defaultWeeklySchedule: DaySchedule[] = [
  { day: "monday", isWorking: true, slots: [{ startTime: "09:00", endTime: "13:00" }, { startTime: "14:00", endTime: "18:00" }] },
  { day: "tuesday", isWorking: true, slots: [{ startTime: "09:00", endTime: "13:00" }, { startTime: "14:00", endTime: "18:00" }] },
  { day: "wednesday", isWorking: true, slots: [{ startTime: "09:00", endTime: "13:00" }, { startTime: "14:00", endTime: "18:00" }] },
  { day: "thursday", isWorking: true, slots: [{ startTime: "09:00", endTime: "13:00" }, { startTime: "14:00", endTime: "18:00" }] },
  { day: "friday", isWorking: true, slots: [{ startTime: "09:00", endTime: "13:00" }, { startTime: "14:00", endTime: "18:00" }] },
  { day: "saturday", isWorking: true, slots: [{ startTime: "09:00", endTime: "13:00" }] },
  { day: "sunday", isWorking: false, slots: [] },
];

const dayNames: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const initialFormData: FormData = {
  name: "",
  email: "",
  password: "",
  roleId: "",
  isActive: true,
};

const defaultScheduleData: Omit<DoctorSchedule, "_id"> = {
  doctorId: "",
  weeklySchedule: defaultWeeklySchedule,
  slotDuration: 30,
  bufferTime: 0,
  maxPatientsPerSlot: 1,
  advanceBookingDays: 30,
  isAcceptingAppointments: true,
  acceptsOnlineBooking: false,
  consultationFee: 0,
  specialization: "",
  qualifications: "",
  bio: "",
};

export default function UsersPage() {
  const { formatCurrency } = useCurrency();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Schedule dialog states
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState<Omit<DoctorSchedule, "_id">>(defaultScheduleData);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      } else {
        toast.error(result.error || "Failed to fetch users");
      }
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch("/api/roles");
      const result = await response.json();
      if (result.success) {
        setRoles(result.data);
      }
    } catch {
      console.error("Failed to fetch roles");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const handleCreate = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Name, email, and password are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("User created successfully");
        setIsCreateDialogOpen(false);
        setFormData(initialFormData);
        fetchUsers();
      } else {
        toast.error(result.error || "Failed to create user");
      }
    } catch {
      toast.error("Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const updateData: Partial<FormData> = {
        name: formData.name,
        email: formData.email,
        roleId: formData.roleId,
        isActive: formData.isActive,
      };

      // Only include password if it was changed
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(`/api/users/${selectedUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("User updated successfully");
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        setFormData(initialFormData);
        fetchUsers();
      } else {
        toast.error(result.error || "Failed to update user");
      }
    } catch {
      toast.error("Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${selectedUser._id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        toast.success("User deleted successfully");
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(result.error || "Failed to delete user");
      }
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const response = await fetch(`/api/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(
          `User ${!user.isActive ? "activated" : "deactivated"} successfully`
        );
        fetchUsers();
      } else {
        toast.error(result.error || "Failed to update user status");
      }
    } catch {
      toast.error("Failed to update user status");
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      roleId: user.roleId._id,
      isActive: user.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Check if user has a doctor role
  const isDoctor = (user: User) => {
    return user.roleId?.name?.toLowerCase().includes("doctor");
  };

  // Fetch doctor schedule
  const fetchDoctorSchedule = async (doctorId: string) => {
    setIsLoadingSchedule(true);
    try {
      const response = await fetch(`/api/doctor-schedules?doctorId=${doctorId}`);
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        const schedule = result.data[0];
        setScheduleData({
          doctorId: schedule.doctorId._id || schedule.doctorId,
          weeklySchedule: schedule.weeklySchedule,
          slotDuration: schedule.slotDuration,
          bufferTime: schedule.bufferTime,
          maxPatientsPerSlot: schedule.maxPatientsPerSlot,
          advanceBookingDays: schedule.advanceBookingDays,
          isAcceptingAppointments: schedule.isAcceptingAppointments,
          acceptsOnlineBooking: schedule.acceptsOnlineBooking,
          consultationFee: schedule.consultationFee,
          specialization: schedule.specialization || "",
          qualifications: schedule.qualifications || "",
          bio: schedule.bio || "",
        });
      } else {
        // No existing schedule, use defaults with doctorId
        setScheduleData({ ...defaultScheduleData, doctorId });
      }
    } catch {
      toast.error("Failed to fetch schedule");
      setScheduleData({ ...defaultScheduleData, doctorId });
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  // Open schedule dialog
  const openScheduleDialog = async (user: User) => {
    setSelectedUser(user);
    setIsScheduleDialogOpen(true);
    await fetchDoctorSchedule(user._id);
  };

  // Save doctor schedule
  const handleSaveSchedule = async () => {
    if (!selectedUser) return;

    setIsSavingSchedule(true);
    try {
      const response = await fetch("/api/doctor-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scheduleData,
          doctorId: selectedUser._id,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Schedule saved successfully");
        setIsScheduleDialogOpen(false);
        setSelectedUser(null);
        setScheduleData(defaultScheduleData);
      } else {
        toast.error(result.error || "Failed to save schedule");
      }
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Update day schedule
  const updateDaySchedule = (dayIndex: number, field: keyof DaySchedule, value: boolean | TimeSlot[]) => {
    const newWeeklySchedule = [...scheduleData.weeklySchedule];
    newWeeklySchedule[dayIndex] = {
      ...newWeeklySchedule[dayIndex],
      [field]: value,
    };
    setScheduleData({ ...scheduleData, weeklySchedule: newWeeklySchedule });
  };

  // Add time slot to a day
  const addTimeSlot = (dayIndex: number) => {
    const newWeeklySchedule = [...scheduleData.weeklySchedule];
    newWeeklySchedule[dayIndex].slots.push({ startTime: "09:00", endTime: "17:00" });
    setScheduleData({ ...scheduleData, weeklySchedule: newWeeklySchedule });
  };

  // Remove time slot from a day
  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    const newWeeklySchedule = [...scheduleData.weeklySchedule];
    newWeeklySchedule[dayIndex].slots.splice(slotIndex, 1);
    setScheduleData({ ...scheduleData, weeklySchedule: newWeeklySchedule });
  };

  // Update time slot
  const updateTimeSlot = (dayIndex: number, slotIndex: number, field: keyof TimeSlot, value: string) => {
    const newWeeklySchedule = [...scheduleData.weeklySchedule];
    newWeeklySchedule[dayIndex].slots[slotIndex] = {
      ...newWeeklySchedule[dayIndex].slots[slotIndex],
      [field]: value,
    };
    setScheduleData({ ...scheduleData, weeklySchedule: newWeeklySchedule });
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.roleId?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage users in your organization
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Users</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {user.roleId?.name || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.isActive ? "default" : "destructive"}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {isDoctor(user) && (
                            <DropdownMenuItem onClick={() => openScheduleDialog(user)}>
                              <Calendar className="mr-2 h-4 w-4" />
                              Manage Schedule
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.isActive ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(user)}
                            className="text-destructive"
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

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user in your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                placeholder="Min. 6 characters"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Role</Label>
              <Select
                value={formData.roleId}
                onValueChange={(value) =>
                  setFormData({ ...formData, roleId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role._id} value={role._id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="create-active">Active</Label>
              <Switch
                id="create-active"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
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
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Leave password blank to keep unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">
                Password{" "}
                <span className="text-muted-foreground text-xs">
                  (leave blank to keep unchanged)
                </span>
              </Label>
              <Input
                id="edit-password"
                type="password"
                placeholder="Enter new password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={formData.roleId}
                onValueChange={(value) =>
                  setFormData({ ...formData, roleId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role._id} value={role._id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">Active</Label>
              <Switch
                id="edit-active"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedUser(null);
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
              This action cannot be undone. This will permanently delete the user
              &quot;{selectedUser?.name}&quot; and remove their data from the
              system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedUser(null);
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

      {/* Doctor Schedule Management Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsScheduleDialogOpen(false);
          setSelectedUser(null);
          setScheduleData(defaultScheduleData);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Manage Schedule - {selectedUser?.name}
            </DialogTitle>
            <DialogDescription>
              Configure availability, appointment settings, and professional information
            </DialogDescription>
          </DialogHeader>

          {isLoadingSchedule ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="schedule" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="schedule">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Clock className="mr-2 h-4 w-4" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="profile">
                  <Stethoscope className="mr-2 h-4 w-4" />
                  Profile
                </TabsTrigger>
              </TabsList>

              {/* Weekly Schedule Tab */}
              <TabsContent value="schedule" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {scheduleData.weeklySchedule.map((day, dayIndex) => (
                      <Card key={day.day} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <Switch
                              checked={day.isWorking}
                              onCheckedChange={(checked) => updateDaySchedule(dayIndex, "isWorking", checked)}
                            />
                            <span className="font-medium w-24">{dayNames[day.day]}</span>
                          </div>
                          {day.isWorking && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addTimeSlot(dayIndex)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Slot
                            </Button>
                          )}
                        </div>

                        {day.isWorking && day.slots.length > 0 && (
                          <div className="mt-4 space-y-2 ml-14">
                            {day.slots.map((slot, slotIndex) => (
                              <div key={slotIndex} className="flex items-center gap-2">
                                <Input
                                  type="time"
                                  value={slot.startTime}
                                  onChange={(e) => updateTimeSlot(dayIndex, slotIndex, "startTime", e.target.value)}
                                  className="w-32"
                                />
                                <span className="text-muted-foreground">to</span>
                                <Input
                                  type="time"
                                  value={slot.endTime}
                                  onChange={(e) => updateTimeSlot(dayIndex, slotIndex, "endTime", e.target.value)}
                                  className="w-32"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {day.isWorking && day.slots.length === 0 && (
                          <p className="mt-2 text-sm text-muted-foreground ml-14">
                            No time slots configured. Add a slot to set working hours.
                          </p>
                        )}

                        {!day.isWorking && (
                          <p className="mt-2 text-sm text-muted-foreground ml-14">
                            Not working this day
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Appointment Settings Tab */}
              <TabsContent value="settings" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Slot Duration (minutes)</Label>
                        <Select
                          value={scheduleData.slotDuration.toString()}
                          onValueChange={(value) => setScheduleData({ ...scheduleData, slotDuration: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="20">20 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Buffer Time Between Appointments (minutes)</Label>
                        <Select
                          value={scheduleData.bufferTime.toString()}
                          onValueChange={(value) => setScheduleData({ ...scheduleData, bufferTime: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No buffer</SelectItem>
                            <SelectItem value="5">5 minutes</SelectItem>
                            <SelectItem value="10">10 minutes</SelectItem>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Max Patients Per Slot</Label>
                        <Select
                          value={scheduleData.maxPatientsPerSlot.toString()}
                          onValueChange={(value) => setScheduleData({ ...scheduleData, maxPatientsPerSlot: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} patient{num > 1 ? "s" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Advance Booking Days</Label>
                        <Select
                          value={scheduleData.advanceBookingDays.toString()}
                          onValueChange={(value) => setScheduleData({ ...scheduleData, advanceBookingDays: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7 days</SelectItem>
                            <SelectItem value="14">14 days</SelectItem>
                            <SelectItem value="30">30 days</SelectItem>
                            <SelectItem value="60">60 days</SelectItem>
                            <SelectItem value="90">90 days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Consultation Fee</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={scheduleData.consultationFee}
                          onChange={(e) => setScheduleData({ ...scheduleData, consultationFee: parseFloat(e.target.value) || 0 })}
                          className="pl-9"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Accepting Appointments</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow new appointments to be booked
                          </p>
                        </div>
                        <Switch
                          checked={scheduleData.isAcceptingAppointments}
                          onCheckedChange={(checked) => setScheduleData({ ...scheduleData, isAcceptingAppointments: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Online Booking
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Allow patients to book through public booking page
                          </p>
                        </div>
                        <Switch
                          checked={scheduleData.acceptsOnlineBooking}
                          onCheckedChange={(checked) => setScheduleData({ ...scheduleData, acceptsOnlineBooking: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Professional Profile Tab */}
              <TabsContent value="profile" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Specialization</Label>
                      <Input
                        value={scheduleData.specialization || ""}
                        onChange={(e) => setScheduleData({ ...scheduleData, specialization: e.target.value })}
                        placeholder="e.g., General Practitioner, Cardiologist, Pediatrician"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Qualifications</Label>
                      <Input
                        value={scheduleData.qualifications || ""}
                        onChange={(e) => setScheduleData({ ...scheduleData, qualifications: e.target.value })}
                        placeholder="e.g., MBBS, MD, FRCP"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Bio / About</Label>
                      <Textarea
                        value={scheduleData.bio || ""}
                        onChange={(e) => setScheduleData({ ...scheduleData, bio: e.target.value })}
                        placeholder="Brief description about the doctor's experience, expertise, and approach..."
                        rows={6}
                        maxLength={1000}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {(scheduleData.bio || "").length}/1000 characters
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsScheduleDialogOpen(false);
                setSelectedUser(null);
                setScheduleData(defaultScheduleData);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule} disabled={isSavingSchedule || isLoadingSchedule}>
              {isSavingSchedule && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
