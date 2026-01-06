"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Calendar as CalendarIcon,
  List,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  X,
  Check,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Patient {
  _id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

interface Doctor {
  _id: string;
  name: string;
  email: string;
}

interface Appointment {
  _id: string;
  appointmentId: string;
  patientId: Patient;
  doctorId: Doctor;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: string;
  status: string;
  reason: string;
  notes?: string;
  priority: string;
}

interface AppointmentFormData {
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: string;
  reason: string;
  notes: string;
  priority: string;
}

const initialFormData: AppointmentFormData = {
  patientId: "",
  doctorId: "",
  appointmentDate: format(new Date(), "yyyy-MM-dd"),
  startTime: "09:00",
  endTime: "09:30",
  duration: 30,
  type: "consultation",
  reason: "",
  notes: "",
  priority: "normal",
};

const appointmentTypes = [
  { value: "consultation", label: "Consultation" },
  { value: "follow-up", label: "Follow-up" },
  { value: "procedure", label: "Procedure" },
  { value: "emergency", label: "Emergency" },
  { value: "routine-checkup", label: "Routine Checkup" },
  { value: "vaccination", label: "Vaccination" },
];

const appointmentStatuses = [
  { value: "all", label: "All Status" },
  { value: "scheduled", label: "Scheduled" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no-show", label: "No Show" },
];

const priorities = [
  { value: "normal", label: "Normal" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
];

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minute = i % 2 === 0 ? "00" : "30";
  if (hour > 20) return null;
  return `${hour.toString().padStart(2, "0")}:${minute}`;
}).filter(Boolean) as string[];

const MIN_LOADING_TIME = 2000;

function AppointmentsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-64" />
        </div>
      </div>
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-8 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-10" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-2 min-h-[200px]">
            <div className="text-center mb-2">
              <Skeleton className="h-4 w-8 mx-auto mb-1" />
              <Skeleton className="h-6 w-6 mx-auto" />
            </div>
            <div className="space-y-1">
              {Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map((_, j) => (
                <Skeleton key={j} className="h-12 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const loadStartTime = useRef<number>(Date.now());
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState<AppointmentFormData>(initialFormData);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Doctor schedule integration
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotDuration, setSlotDuration] = useState(30);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);

  // Fetch available slots when doctor and date change
  const fetchAvailableSlots = useCallback(async (doctorId: string, date: string) => {
    if (!doctorId || !date) {
      setAvailableSlots([]);
      return;
    }

    setIsLoadingSlots(true);
    setScheduleMessage(null);

    try {
      const response = await fetch(`/api/doctor-schedules/${doctorId}?date=${date}`);
      const result = await response.json();

      if (result.success) {
        setAvailableSlots(result.data.availableSlots || []);
        setSlotDuration(result.data.slotDuration || 30);
        if (result.data.availableSlots?.length === 0) {
          setScheduleMessage(result.data.message || "No available slots for this date");
        }
      } else {
        setAvailableSlots([]);
        setScheduleMessage(result.error || "Could not load schedule");
      }
    } catch {
      setAvailableSlots([]);
      setScheduleMessage("Failed to load doctor's schedule");
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  // Auto-calculate end time based on slot duration
  const calculateEndTime = useCallback((startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
  }, []);

  const fetchAppointments = useCallback(async () => {
    loadStartTime.current = Date.now();
    setIsLoading(true);
    setShowContent(false);
    try {
      let url = "/api/appointments?";
      if (calendarView === "week") {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        url += `startDate=${format(start, "yyyy-MM-dd")}&endDate=${format(end, "yyyy-MM-dd")}`;
      } else {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        url += `startDate=${format(start, "yyyy-MM-dd")}&endDate=${format(end, "yyyy-MM-dd")}`;
      }
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }

      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setAppointments(result.data);
      }
    } catch {
      toast.error("Failed to fetch appointments");
    } finally {
      const elapsed = Date.now() - loadStartTime.current;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      setTimeout(() => {
        setIsLoading(false);
        setShowContent(true);
      }, remaining);
    }
  }, [currentDate, calendarView, statusFilter]);

  const fetchPatients = useCallback(async () => {
    try {
      const response = await fetch("/api/patients?status=active");
      const result = await response.json();
      if (result.success) {
        setPatients(result.data);
      }
    } catch {
      console.error("Failed to fetch patients");
    }
  }, []);

  const fetchDoctors = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      const result = await response.json();
      if (result.success) {
        setDoctors(result.data);
      }
    } catch {
      console.error("Failed to fetch doctors");
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchDoctors();
  }, [fetchAppointments, fetchPatients, fetchDoctors]);

  const handleCreate = async () => {
    if (!formData.patientId || !formData.doctorId || !formData.reason) {
      toast.error("Patient, doctor, and reason are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Appointment created successfully");
        setIsCreateDialogOpen(false);
        setFormData(initialFormData);
        fetchAppointments();
      } else {
        toast.error(result.error || "Failed to create appointment");
      }
    } catch {
      toast.error("Failed to create appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedAppointment) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/appointments/${selectedAppointment._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Appointment updated successfully");
        setIsEditDialogOpen(false);
        setSelectedAppointment(null);
        setFormData(initialFormData);
        fetchAppointments();
      } else {
        toast.error(result.error || "Failed to update appointment");
      }
    } catch {
      toast.error("Failed to update appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAppointment) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/appointments/${selectedAppointment._id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Appointment deleted");
        setIsDeleteDialogOpen(false);
        setSelectedAppointment(null);
        fetchAppointments();
      } else {
        toast.error(result.error || "Failed to delete appointment");
      }
    } catch {
      toast.error("Failed to delete appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedAppointment) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/appointments/${selectedAppointment._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", cancellationReason }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Appointment cancelled");
        setIsCancelDialogOpen(false);
        setSelectedAppointment(null);
        setCancellationReason("");
        fetchAppointments();
      } else {
        toast.error(result.error || "Failed to cancel appointment");
      }
    } catch {
      toast.error("Failed to cancel appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (appointment: Appointment, newStatus: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointment._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Status updated to ${newStatus}`);
        fetchAppointments();
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const openEditDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    const appointmentDate = format(new Date(appointment.appointmentDate), "yyyy-MM-dd");
    setFormData({
      patientId: appointment.patientId._id,
      doctorId: appointment.doctorId._id,
      appointmentDate,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      duration: appointment.duration,
      type: appointment.type,
      reason: appointment.reason,
      notes: appointment.notes || "",
      priority: appointment.priority,
    });
    // Load available slots for the doctor on that date
    fetchAvailableSlots(appointment.doctorId._id, appointmentDate);
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      scheduled: "secondary",
      confirmed: "default",
      "in-progress": "default",
      completed: "outline",
      cancelled: "destructive",
      "no-show": "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status.replace("-", " ")}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === "emergency") return <Badge variant="destructive">Emergency</Badge>;
    if (priority === "urgent") return <Badge variant="default">Urgent</Badge>;
    return null;
  };

  // Calendar helpers
  const weekDays = calendarView === "week"
    ? eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) })
    : eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter((apt) => isSameDay(new Date(apt.appointmentDate), date));
  };

  const navigateCalendar = (direction: "prev" | "next") => {
    if (calendarView === "week") {
      setCurrentDate(direction === "next" ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === "next" ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  const filteredAppointments = appointments.filter(
    (apt) =>
      apt.patientId?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patientId?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.appointmentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Appointments</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage patient appointments</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </motion.div>
      </motion.div>

      <Card>
        <CardHeader className="px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar")}>
                <TabsList className="h-9">
                  <TabsTrigger value="list" className="text-xs sm:text-sm px-2 sm:px-3"><List className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">List</span></TabsTrigger>
                  <TabsTrigger value="calendar" className="text-xs sm:text-sm px-2 sm:px-3"><CalendarIcon className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Calendar</span></TabsTrigger>
                </TabsList>
              </Tabs>
              {view === "calendar" && (
                <Tabs value={calendarView} onValueChange={(v) => setCalendarView(v as "week" | "month")}>
                  <TabsList className="h-9">
                    <TabsTrigger value="week" className="text-xs sm:text-sm px-2 sm:px-3">Week</TabsTrigger>
                    <TabsTrigger value="month" className="text-xs sm:text-sm px-2 sm:px-3">Month</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {appointmentStatuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {view === "list" && (
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search appointments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {view === "list" ? <AppointmentsTableSkeleton /> : <CalendarSkeleton />}
              </motion.div>
            ) : showContent && (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
          {view === "list" ? (
            filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No appointments found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((apt, index) => (
                    <motion.tr
                      key={apt._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <TableCell className="font-mono text-sm">{apt.appointmentId}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{apt.patientId?.firstName} {apt.patientId?.lastName}</p>
                          <p className="text-sm text-muted-foreground">{apt.patientId?.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{format(new Date(apt.appointmentDate), "MMM dd, yyyy")}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {apt.startTime} - {apt.endTime}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>Dr. {apt.doctorId?.name}</TableCell>
                      <TableCell className="capitalize">{apt.type.replace("-", " ")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusBadge(apt.status)}
                          {getPriorityBadge(apt.priority)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(apt)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            {apt.status === "scheduled" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(apt, "confirmed")}>
                                <Check className="mr-2 h-4 w-4" /> Confirm
                              </DropdownMenuItem>
                            )}
                            {(apt.status === "confirmed" || apt.status === "scheduled") && (
                              <DropdownMenuItem onClick={() => handleStatusChange(apt, "in-progress")}>
                                <AlertCircle className="mr-2 h-4 w-4" /> Start
                              </DropdownMenuItem>
                            )}
                            {apt.status === "in-progress" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(apt, "completed")}>
                                <Check className="mr-2 h-4 w-4" /> Complete
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {apt.status !== "cancelled" && apt.status !== "completed" && (
                              <DropdownMenuItem onClick={() => { setSelectedAppointment(apt); setIsCancelDialogOpen(true); }}>
                                <XCircle className="mr-2 h-4 w-4" /> Cancel
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => { setSelectedAppointment(apt); setIsDeleteDialogOpen(true); }} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="icon" onClick={() => navigateCalendar("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold">
                  {calendarView === "week"
                    ? `${format(weekDays[0], "MMM dd")} - ${format(weekDays[6], "MMM dd, yyyy")}`
                    : format(currentDate, "MMMM yyyy")}
                </h3>
                <Button variant="outline" size="icon" onClick={() => navigateCalendar("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {calendarView === "week" ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {weekDays.map((day) => (
                    <div key={day.toISOString()} className="border rounded-lg p-2 min-h-[120px] sm:min-h-[200px]">
                      <div className={`text-center mb-2 p-1 rounded ${isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : ""}`}>
                        <p className="text-xs">{format(day, "EEE")}</p>
                        <p className="font-bold text-sm sm:text-base">{format(day, "dd")}</p>
                      </div>
                      <div className="space-y-1">
                        {getAppointmentsForDay(day).map((apt) => (
                          <div
                            key={apt._id}
                            className="p-1.5 sm:p-2 rounded text-xs bg-primary/10 cursor-pointer hover:bg-primary/20"
                            onClick={() => openEditDialog(apt)}
                          >
                            <p className="font-medium">{apt.startTime}</p>
                            <p className="truncate">{apt.patientId?.firstName} {apt.patientId?.lastName}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="text-center font-medium text-[10px] sm:text-sm py-1 sm:py-2">{d}</div>
                  ))}
                  {Array.from({ length: (weekDays[0].getDay() + 6) % 7 }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-2"></div>
                  ))}
                  {weekDays.map((day) => {
                    const dayAppointments = getAppointmentsForDay(day);
                    return (
                      <div
                        key={day.toISOString()}
                        className={`border rounded p-1 sm:p-2 min-h-[50px] sm:min-h-[80px] ${isSameDay(day, new Date()) ? "bg-primary/5 border-primary" : ""}`}
                      >
                        <p className="text-xs sm:text-sm font-medium">{format(day, "d")}</p>
                        {dayAppointments.length > 0 && (
                          <p className="text-[10px] sm:text-xs text-primary">{dayAppointments.length}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Create/Edit Appointment Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => { if (!open) { setIsCreateDialogOpen(false); setIsEditDialogOpen(false); setSelectedAppointment(null); setFormData(initialFormData); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? "Edit Appointment" : "New Appointment"}</DialogTitle>
            <DialogDescription>
              {isEditDialogOpen ? "Update appointment details" : "Schedule a new appointment"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Patient *</Label>
              <Select value={formData.patientId} onValueChange={(v) => setFormData({ ...formData, patientId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.firstName} {p.lastName} ({p.patientId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Doctor *</Label>
              <Select
                value={formData.doctorId}
                onValueChange={(v) => {
                  setFormData({ ...formData, doctorId: v, startTime: "", endTime: "" });
                  if (formData.appointmentDate) {
                    fetchAvailableSlots(v, formData.appointmentDate);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d._id} value={d._id}>Dr. {d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.appointmentDate}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => {
                    setFormData({ ...formData, appointmentDate: e.target.value, startTime: "", endTime: "" });
                    if (formData.doctorId) {
                      fetchAvailableSlots(formData.doctorId, e.target.value);
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {appointmentTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time * {isLoadingSlots && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}</Label>
                {scheduleMessage && !isLoadingSlots && availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">{scheduleMessage}</p>
                ) : (
                  <Select
                    value={formData.startTime}
                    onValueChange={(v) => {
                      const endTime = calculateEndTime(v, slotDuration);
                      setFormData({ ...formData, startTime: v, endTime, duration: slotDuration });
                    }}
                    disabled={isLoadingSlots || (availableSlots.length === 0 && formData.doctorId !== "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.doctorId ? "Select time" : "Select doctor first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(availableSlots.length > 0 ? availableSlots : timeSlots).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  value={formData.endTime}
                  disabled
                  className="bg-muted"
                  placeholder="Auto-calculated"
                />
                {slotDuration && formData.startTime && (
                  <p className="text-xs text-muted-foreground">{slotDuration} min appointment</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Reason for appointment"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); setIsEditDialogOpen(false); setFormData(initialFormData); }}>
              Cancel
            </Button>
            <Button onClick={isEditDialogOpen ? handleEdit : handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditDialogOpen ? "Save Changes" : "Create Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>Please provide a reason for cancellation.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Cancellation Reason</Label>
            <Textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Enter reason for cancellation"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCancelDialogOpen(false); setCancellationReason(""); }}>
              Back
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this appointment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
