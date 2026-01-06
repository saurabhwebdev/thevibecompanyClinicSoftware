"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  Loader2,
  Phone,
  Mail,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { MIN_LOADING_TIME } from "@/components/ui/skeletons";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface Patient {
  _id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  bloodGroup?: string;
  isActive: boolean;
  createdAt: string;
}

interface PatientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  allergies: string;
  chronicConditions: string;
  currentMedications: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  notes: string;
}

const initialFormData: PatientFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  bloodGroup: "",
  address: {
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  },
  emergencyContact: {
    name: "",
    relationship: "",
    phone: "",
  },
  allergies: "",
  chronicConditions: "",
  currentMedications: "",
  insuranceProvider: "",
  insurancePolicyNumber: "",
  notes: "",
};

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const genders = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

// Skeleton for patients table
function PatientsTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patient ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Age/Gender</TableHead>
          <TableHead>Blood Group</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 8 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell>
              <div className="space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </TableCell>
            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell><Skeleton className="h-6 w-10 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const loadStartTime = useRef<number>(Date.now());

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState<PatientFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPatients = useCallback(async () => {
    loadStartTime.current = Date.now();
    setIsLoading(true);
    setShowContent(false);

    try {
      const response = await fetch("/api/patients");
      const result = await response.json();
      if (result.success) {
        setPatients(result.data);
      } else {
        toast.error(result.error || "Failed to fetch patients");
      }
    } catch {
      toast.error("Failed to fetch patients");
    } finally {
      // Ensure minimum loading time of 2 seconds
      const elapsed = Date.now() - loadStartTime.current;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);

      setTimeout(() => {
        setIsLoading(false);
        setShowContent(true);
      }, remaining);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleCreate = async () => {
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.dateOfBirth || !formData.gender) {
      toast.error("First name, last name, phone, date of birth, and gender are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        allergies: formData.allergies ? formData.allergies.split(",").map(s => s.trim()) : [],
        chronicConditions: formData.chronicConditions ? formData.chronicConditions.split(",").map(s => s.trim()) : [],
        currentMedications: formData.currentMedications ? formData.currentMedications.split(",").map(s => s.trim()) : [],
      };

      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Patient created successfully");
        setIsCreateDialogOpen(false);
        setFormData(initialFormData);
        fetchPatients();
      } else {
        toast.error(result.error || "Failed to create patient");
      }
    } catch {
      toast.error("Failed to create patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedPatient) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        allergies: formData.allergies ? formData.allergies.split(",").map(s => s.trim()) : [],
        chronicConditions: formData.chronicConditions ? formData.chronicConditions.split(",").map(s => s.trim()) : [],
        currentMedications: formData.currentMedications ? formData.currentMedications.split(",").map(s => s.trim()) : [],
      };

      const response = await fetch(`/api/patients/${selectedPatient._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Patient updated successfully");
        setIsEditDialogOpen(false);
        setSelectedPatient(null);
        setFormData(initialFormData);
        fetchPatients();
      } else {
        toast.error(result.error || "Failed to update patient");
      }
    } catch {
      toast.error("Failed to update patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPatient) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/patients/${selectedPatient._id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Patient deleted successfully");
        setIsDeleteDialogOpen(false);
        setSelectedPatient(null);
        fetchPatients();
      } else {
        toast.error(result.error || "Failed to delete patient");
      }
    } catch {
      toast.error("Failed to delete patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (patient: Patient) => {
    try {
      const response = await fetch(`/api/patients/${patient._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !patient.isActive }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Patient ${!patient.isActive ? "activated" : "deactivated"} successfully`);
        fetchPatients();
      } else {
        toast.error(result.error || "Failed to update patient status");
      }
    } catch {
      toast.error("Failed to update patient status");
    }
  };

  const openEditDialog = async (patient: Patient) => {
    try {
      const response = await fetch(`/api/patients/${patient._id}`);
      const result = await response.json();
      if (result.success) {
        const p = result.data;
        setSelectedPatient(patient);
        setFormData({
          firstName: p.firstName || "",
          lastName: p.lastName || "",
          email: p.email || "",
          phone: p.phone || "",
          dateOfBirth: p.dateOfBirth ? format(new Date(p.dateOfBirth), "yyyy-MM-dd") : "",
          gender: p.gender || "",
          bloodGroup: p.bloodGroup || "",
          address: p.address || { street: "", city: "", state: "", postalCode: "", country: "" },
          emergencyContact: p.emergencyContact || { name: "", relationship: "", phone: "" },
          allergies: p.allergies?.join(", ") || "",
          chronicConditions: p.chronicConditions?.join(", ") || "",
          currentMedications: p.currentMedications?.join(", ") || "",
          insuranceProvider: p.insuranceProvider || "",
          insurancePolicyNumber: p.insurancePolicyNumber || "",
          notes: p.notes || "",
        });
        setIsEditDialogOpen(true);
      }
    } catch {
      toast.error("Failed to load patient details");
    }
  };

  const openDeleteDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDeleteDialogOpen(true);
  };

  const viewPatient = (patient: Patient) => {
    router.push(`/dashboard/patients/${patient._id}`);
  };

  const filteredPatients = patients.filter(
    (patient) =>
      patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone.includes(searchQuery) ||
      (patient.email && patient.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

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
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Patients</h2>
          <p className="text-muted-foreground">
            Manage patient records and information
          </p>
        </div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Patient
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Patients ({patients.length})</CardTitle>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
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
                  <PatientsTableSkeleton />
                </motion.div>
              ) : filteredPatients.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-12"
                >
                  <p className="text-muted-foreground">No patients found</p>
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Age/Gender</TableHead>
                        <TableHead>Blood Group</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.map((patient, index) => (
                        <motion.tr
                          key={patient._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => viewPatient(patient)}
                          whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                        >
                          <TableCell className="font-mono text-sm">{patient.patientId}</TableCell>
                          <TableCell className="font-medium">
                            {patient.firstName} {patient.lastName}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" /> {patient.phone}
                              </span>
                              {patient.email && (
                                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Mail className="h-3 w-3" /> {patient.email}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {calculateAge(patient.dateOfBirth)} yrs / {patient.gender.charAt(0).toUpperCase()}
                          </TableCell>
                          <TableCell>
                            {patient.bloodGroup ? (
                              <Badge variant="outline">{patient.bloodGroup}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={patient.isActive ? "default" : "destructive"}>
                              {patient.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => viewPatient(patient)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(patient)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStatus(patient)}>
                                  {patient.isActive ? (
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
                                <DropdownMenuItem onClick={() => openDeleteDialog(patient)} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Patient Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Patient</DialogTitle>
            <DialogDescription>Create a new patient record.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div>
              <h4 className="text-sm font-medium mb-3">Basic Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genders.map((g) => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Select
                    value={formData.bloodGroup}
                    onValueChange={(value) => setFormData({ ...formData, bloodGroup: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      {bloodGroups.map((bg) => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h4 className="text-sm font-medium mb-3">Address</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="street">Street</Label>
                  <Input
                    id="street"
                    value={formData.address.street}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.address.state}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={formData.address.postalCode}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, postalCode: e.target.value } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.address.country}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h4 className="text-sm font-medium mb-3">Emergency Contact</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ecName">Name</Label>
                  <Input
                    id="ecName"
                    value={formData.emergencyContact.name}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, name: e.target.value } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ecRelationship">Relationship</Label>
                  <Input
                    id="ecRelationship"
                    value={formData.emergencyContact.relationship}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, relationship: e.target.value } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ecPhone">Phone</Label>
                  <Input
                    id="ecPhone"
                    value={formData.emergencyContact.phone}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, phone: e.target.value } })}
                  />
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div>
              <h4 className="text-sm font-medium mb-3">Medical Information</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies (comma-separated)</Label>
                  <Input
                    id="allergies"
                    placeholder="e.g., Penicillin, Peanuts"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chronicConditions">Chronic Conditions (comma-separated)</Label>
                  <Input
                    id="chronicConditions"
                    placeholder="e.g., Diabetes, Hypertension"
                    value={formData.chronicConditions}
                    onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentMedications">Current Medications (comma-separated)</Label>
                  <Input
                    id="currentMedications"
                    placeholder="e.g., Metformin 500mg, Lisinopril 10mg"
                    value={formData.currentMedications}
                    onChange={(e) => setFormData({ ...formData, currentMedications: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Insurance */}
            <div>
              <h4 className="text-sm font-medium mb-3">Insurance</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insuranceProvider">Provider</Label>
                  <Input
                    id="insuranceProvider"
                    value={formData.insuranceProvider}
                    onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurancePolicyNumber">Policy Number</Label>
                  <Input
                    id="insurancePolicyNumber"
                    value={formData.insurancePolicyNumber}
                    onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); setFormData(initialFormData); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>Update patient information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div>
              <h4 className="text-sm font-medium mb-3">Basic Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name *</Label>
                  <Input
                    id="edit-firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name *</Label>
                  <Input
                    id="edit-lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone *</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="edit-dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-gender">Gender *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genders.map((g) => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bloodGroup">Blood Group</Label>
                  <Select
                    value={formData.bloodGroup}
                    onValueChange={(value) => setFormData({ ...formData, bloodGroup: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      {bloodGroups.map((bg) => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div>
              <h4 className="text-sm font-medium mb-3">Medical Information</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-allergies">Allergies (comma-separated)</Label>
                  <Input
                    id="edit-allergies"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-chronicConditions">Chronic Conditions (comma-separated)</Label>
                  <Input
                    id="edit-chronicConditions"
                    value={formData.chronicConditions}
                    onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-currentMedications">Current Medications (comma-separated)</Label>
                  <Input
                    id="edit-currentMedications"
                    value={formData.currentMedications}
                    onChange={(e) => setFormData({ ...formData, currentMedications: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedPatient(null); setFormData(initialFormData); }}>
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
              This action cannot be undone. This will permanently delete the patient
              &quot;{selectedPatient?.firstName} {selectedPatient?.lastName}&quot; and all associated records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setSelectedPatient(null); }}>
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
    </motion.div>
  );
}
