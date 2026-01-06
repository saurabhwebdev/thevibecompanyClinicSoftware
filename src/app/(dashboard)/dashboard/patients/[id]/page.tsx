"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Pill,
  FileText,
  User,
  Calendar,
  Heart,
  Activity,
  Trash2,
  Pencil,
  CheckCircle2,
  Printer,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Patient {
  _id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

interface MedicalRecord {
  _id: string;
  visitDate: string;
  visitType: string;
  chiefComplaint: string;
  diagnosis: string[];
  treatmentPlan?: string;
  vitalSigns?: {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
  };
  doctorId: { name: string };
  createdAt: string;
}

interface Prescription {
  _id: string;
  prescriptionId: string;
  prescriptionDate: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  diagnosis?: string;
  isDispensed: boolean;
  doctorId: { name: string };
}

interface MedicalRecordFormData {
  visitDate: string;
  visitType: string;
  chiefComplaint: string;
  presentIllness: string;
  examination: string;
  diagnosis: string;
  treatmentPlan: string;
  followUpDate: string;
  followUpInstructions: string;
  notes: string;
  vitalSigns: {
    bloodPressureSystolic: string;
    bloodPressureDiastolic: string;
    heartRate: string;
    temperature: string;
    weight: string;
    height: string;
  };
}

interface PrescriptionFormData {
  diagnosis: string;
  notes: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    route: string;
    instructions: string;
  }>;
}

const initialMedicalRecordForm: MedicalRecordFormData = {
  visitDate: format(new Date(), "yyyy-MM-dd"),
  visitType: "consultation",
  chiefComplaint: "",
  presentIllness: "",
  examination: "",
  diagnosis: "",
  treatmentPlan: "",
  followUpDate: "",
  followUpInstructions: "",
  notes: "",
  vitalSigns: {
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRate: "",
    temperature: "",
    weight: "",
    height: "",
  },
};

const initialPrescriptionForm: PrescriptionFormData = {
  diagnosis: "",
  notes: "",
  medications: [{ name: "", dosage: "", frequency: "", duration: "", route: "oral", instructions: "" }],
};

const visitTypes = [
  { value: "consultation", label: "Consultation" },
  { value: "follow-up", label: "Follow-up" },
  { value: "emergency", label: "Emergency" },
  { value: "routine-checkup", label: "Routine Checkup" },
  { value: "procedure", label: "Procedure" },
];

const routes = [
  { value: "oral", label: "Oral" },
  { value: "topical", label: "Topical" },
  { value: "injection", label: "Injection" },
  { value: "inhalation", label: "Inhalation" },
  { value: "sublingual", label: "Sublingual" },
  { value: "rectal", label: "Rectal" },
  { value: "other", label: "Other" },
];

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [isPrescriptionDialogOpen, setIsPrescriptionDialogOpen] = useState(false);
  const [isDeleteRecordDialogOpen, setIsDeleteRecordDialogOpen] = useState(false);
  const [isDeletePrescriptionDialogOpen, setIsDeletePrescriptionDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  const [recordFormData, setRecordFormData] = useState<MedicalRecordFormData>(initialMedicalRecordForm);
  const [prescriptionFormData, setPrescriptionFormData] = useState<PrescriptionFormData>(initialPrescriptionForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPatient = useCallback(async () => {
    try {
      const response = await fetch(`/api/patients/${patientId}`);
      const result = await response.json();
      if (result.success) {
        setPatient(result.data);
      } else {
        toast.error("Patient not found");
        router.push("/dashboard/patients");
      }
    } catch {
      toast.error("Failed to fetch patient");
    }
  }, [patientId, router]);

  const fetchMedicalRecords = useCallback(async () => {
    try {
      const response = await fetch(`/api/medical-records?patientId=${patientId}`);
      const result = await response.json();
      if (result.success) {
        setMedicalRecords(result.data);
      }
    } catch {
      console.error("Failed to fetch medical records");
    }
  }, [patientId]);

  const fetchPrescriptions = useCallback(async () => {
    try {
      const response = await fetch(`/api/prescriptions?patientId=${patientId}`);
      const result = await response.json();
      if (result.success) {
        setPrescriptions(result.data);
      }
    } catch {
      console.error("Failed to fetch prescriptions");
    }
  }, [patientId]);

  useEffect(() => {
    const loadData = async () => {
      await fetchPatient();
      await Promise.all([fetchMedicalRecords(), fetchPrescriptions()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchPatient, fetchMedicalRecords, fetchPrescriptions]);

  const handleCreateRecord = async () => {
    if (!recordFormData.chiefComplaint || !recordFormData.diagnosis) {
      toast.error("Chief complaint and diagnosis are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        patientId,
        visitDate: recordFormData.visitDate,
        visitType: recordFormData.visitType,
        chiefComplaint: recordFormData.chiefComplaint,
        presentIllness: recordFormData.presentIllness,
        examination: recordFormData.examination,
        diagnosis: recordFormData.diagnosis.split(",").map(s => s.trim()),
        treatmentPlan: recordFormData.treatmentPlan,
        followUpDate: recordFormData.followUpDate || undefined,
        followUpInstructions: recordFormData.followUpInstructions,
        notes: recordFormData.notes,
        vitalSigns: {
          bloodPressureSystolic: recordFormData.vitalSigns.bloodPressureSystolic ? parseInt(recordFormData.vitalSigns.bloodPressureSystolic) : undefined,
          bloodPressureDiastolic: recordFormData.vitalSigns.bloodPressureDiastolic ? parseInt(recordFormData.vitalSigns.bloodPressureDiastolic) : undefined,
          heartRate: recordFormData.vitalSigns.heartRate ? parseInt(recordFormData.vitalSigns.heartRate) : undefined,
          temperature: recordFormData.vitalSigns.temperature ? parseFloat(recordFormData.vitalSigns.temperature) : undefined,
          weight: recordFormData.vitalSigns.weight ? parseFloat(recordFormData.vitalSigns.weight) : undefined,
          height: recordFormData.vitalSigns.height ? parseFloat(recordFormData.vitalSigns.height) : undefined,
        },
      };

      const response = await fetch("/api/medical-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Medical record created successfully");
        setIsRecordDialogOpen(false);
        setRecordFormData(initialMedicalRecordForm);
        fetchMedicalRecords();
      } else {
        toast.error(result.error || "Failed to create medical record");
      }
    } catch {
      toast.error("Failed to create medical record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePrescription = async () => {
    const validMeds = prescriptionFormData.medications.filter(m => m.name && m.dosage && m.frequency && m.duration);
    if (validMeds.length === 0) {
      toast.error("At least one complete medication is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        patientId,
        medications: validMeds,
        diagnosis: prescriptionFormData.diagnosis,
        notes: prescriptionFormData.notes,
      };

      const response = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Prescription created successfully");
        setIsPrescriptionDialogOpen(false);
        setPrescriptionFormData(initialPrescriptionForm);
        fetchPrescriptions();
      } else {
        toast.error(result.error || "Failed to create prescription");
      }
    } catch {
      toast.error("Failed to create prescription");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!selectedRecord) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/medical-records/${selectedRecord._id}`, { method: "DELETE" });
      const result = await response.json();
      if (result.success) {
        toast.success("Medical record deleted");
        setIsDeleteRecordDialogOpen(false);
        setSelectedRecord(null);
        fetchMedicalRecords();
      } else {
        toast.error(result.error || "Failed to delete record");
      }
    } catch {
      toast.error("Failed to delete record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePrescription = async () => {
    if (!selectedPrescription) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/prescriptions/${selectedPrescription._id}`, { method: "DELETE" });
      const result = await response.json();
      if (result.success) {
        toast.success("Prescription deleted");
        setIsDeletePrescriptionDialogOpen(false);
        setSelectedPrescription(null);
        fetchPrescriptions();
      } else {
        toast.error(result.error || "Failed to delete prescription");
      }
    } catch {
      toast.error("Failed to delete prescription");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsDispensed = async (prescriptionId: string) => {
    try {
      const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDispensed: true }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success("Prescription marked as dispensed");
        fetchPrescriptions();
      } else {
        toast.error(result.error || "Failed to update prescription");
      }
    } catch {
      toast.error("Failed to update prescription");
    }
  };

  const addMedication = () => {
    setPrescriptionFormData({
      ...prescriptionFormData,
      medications: [...prescriptionFormData.medications, { name: "", dosage: "", frequency: "", duration: "", route: "oral", instructions: "" }],
    });
  };

  const removeMedication = (index: number) => {
    setPrescriptionFormData({
      ...prescriptionFormData,
      medications: prescriptionFormData.medications.filter((_, i) => i !== index),
    });
  };

  const updateMedication = (index: number, field: string, value: string) => {
    const updated = [...prescriptionFormData.medications];
    updated[index] = { ...updated[index], [field]: value };
    setPrescriptionFormData({ ...prescriptionFormData, medications: updated });
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/patients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight">
            {patient.firstName} {patient.lastName}
          </h2>
          <p className="text-muted-foreground">Patient ID: {patient.patientId}</p>
        </div>
        <Badge variant={patient.isActive ? "default" : "destructive"}>
          {patient.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Patient Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Age / Gender</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateAge(patient.dateOfBirth)} yrs</div>
            <p className="text-xs text-muted-foreground capitalize">{patient.gender}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blood Group</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patient.bloodGroup || "N/A"}</div>
            <p className="text-xs text-muted-foreground">Blood Type</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medicalRecords.length}</div>
            <p className="text-xs text-muted-foreground">Medical records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prescriptions.length}</div>
            <p className="text-xs text-muted-foreground">Total prescriptions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="records">Medical Records</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{patient.phone}</span>
                </div>
                {patient.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.email}</span>
                  </div>
                )}
                {patient.address && (patient.address.street || patient.address.city) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      {patient.address.street && <p>{patient.address.street}</p>}
                      <p>
                        {[patient.address.city, patient.address.state, patient.address.postalCode]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {patient.address.country && <p>{patient.address.country}</p>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent>
                {patient.emergencyContact?.name ? (
                  <div className="space-y-2">
                    <p className="font-medium">{patient.emergencyContact.name}</p>
                    <p className="text-sm text-muted-foreground">{patient.emergencyContact.relationship}</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{patient.emergencyContact.phone}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No emergency contact on file</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Allergies
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.allergies && patient.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies.map((allergy, i) => (
                      <Badge key={i} variant="destructive">{allergy}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No known allergies</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Chronic Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.chronicConditions.map((condition, i) => (
                      <Badge key={i} variant="secondary">{condition}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No chronic conditions</p>
                )}
              </CardContent>
            </Card>

            {patient.currentMedications && patient.currentMedications.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-4 w-4" />
                    Current Medications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {patient.currentMedications.map((med, i) => (
                      <Badge key={i} variant="outline">{med}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {patient.notes && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{patient.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Medical Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Medical Records</h3>
            <Button onClick={() => setIsRecordDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Record
            </Button>
          </div>

          {medicalRecords.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No medical records yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {medicalRecords.map((record) => (
                <Card key={record._id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{record.chiefComplaint}</CardTitle>
                        <CardDescription>
                          {format(new Date(record.visitDate), "MMMM dd, yyyy")} - {record.visitType.replace("-", " ")}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Dr. {record.doctorId?.name || "Unknown"}</Badge>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedRecord(record); setIsDeleteRecordDialogOpen(true); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">Diagnosis</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {record.diagnosis.map((d, i) => (
                            <Badge key={i}>{d}</Badge>
                          ))}
                        </div>
                      </div>
                      {record.treatmentPlan && (
                        <div>
                          <p className="text-sm font-medium">Treatment Plan</p>
                          <p className="text-sm text-muted-foreground">{record.treatmentPlan}</p>
                        </div>
                      )}
                      {record.vitalSigns && (
                        <div>
                          <p className="text-sm font-medium">Vital Signs</p>
                          <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                            {record.vitalSigns.bloodPressureSystolic && record.vitalSigns.bloodPressureDiastolic && (
                              <span>BP: {record.vitalSigns.bloodPressureSystolic}/{record.vitalSigns.bloodPressureDiastolic} mmHg</span>
                            )}
                            {record.vitalSigns.heartRate && <span>HR: {record.vitalSigns.heartRate} bpm</span>}
                            {record.vitalSigns.temperature && <span>Temp: {record.vitalSigns.temperature}°F</span>}
                            {record.vitalSigns.weight && <span>Weight: {record.vitalSigns.weight} kg</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Prescriptions</h3>
            <Button onClick={() => setIsPrescriptionDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Prescription
            </Button>
          </div>

          {prescriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No prescriptions yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {prescriptions.map((prescription) => (
                <Card key={prescription._id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-mono">{prescription.prescriptionId}</CardTitle>
                        <CardDescription>
                          {format(new Date(prescription.prescriptionDate), "MMMM dd, yyyy")}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={prescription.isDispensed ? "default" : "secondary"}>
                          {prescription.isDispensed ? "Dispensed" : "Pending"}
                        </Badge>
                        {!prescription.isDispensed && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsDispensed(prescription._id)}
                            className="gap-2"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Mark as Dispensed
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/prescriptions/${prescription._id}`)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/dashboard/prescriptions/${prescription._id}/print`, "_blank")}
                          className="gap-2"
                        >
                          <Printer className="h-4 w-4" />
                          Print
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedPrescription(prescription); setIsDeletePrescriptionDialogOpen(true); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medication</TableHead>
                          <TableHead>Dosage</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prescription.medications.map((med, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{med.name}</TableCell>
                            <TableCell>{med.dosage}</TableCell>
                            <TableCell>{med.frequency}</TableCell>
                            <TableCell>{med.duration}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <p className="text-sm text-muted-foreground mt-4">
                      Prescribed by Dr. {prescription.doctorId?.name || "Unknown"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Medical Record Dialog */}
      <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Medical Record</DialogTitle>
            <DialogDescription>Create a new medical record for this patient.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Visit Date</Label>
                <Input
                  type="date"
                  value={recordFormData.visitDate}
                  onChange={(e) => setRecordFormData({ ...recordFormData, visitDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Visit Type</Label>
                <Select
                  value={recordFormData.visitType}
                  onValueChange={(value) => setRecordFormData({ ...recordFormData, visitType: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {visitTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Chief Complaint *</Label>
              <Input
                value={recordFormData.chiefComplaint}
                onChange={(e) => setRecordFormData({ ...recordFormData, chiefComplaint: e.target.value })}
                placeholder="Main reason for visit"
              />
            </div>

            <div className="space-y-2">
              <Label>Present Illness</Label>
              <Textarea
                value={recordFormData.presentIllness}
                onChange={(e) => setRecordFormData({ ...recordFormData, presentIllness: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <Label className="mb-2 block">Vital Signs</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">BP Systolic</Label>
                  <Input
                    type="number"
                    placeholder="120"
                    value={recordFormData.vitalSigns.bloodPressureSystolic}
                    onChange={(e) => setRecordFormData({ ...recordFormData, vitalSigns: { ...recordFormData.vitalSigns, bloodPressureSystolic: e.target.value } })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">BP Diastolic</Label>
                  <Input
                    type="number"
                    placeholder="80"
                    value={recordFormData.vitalSigns.bloodPressureDiastolic}
                    onChange={(e) => setRecordFormData({ ...recordFormData, vitalSigns: { ...recordFormData.vitalSigns, bloodPressureDiastolic: e.target.value } })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Heart Rate</Label>
                  <Input
                    type="number"
                    placeholder="72"
                    value={recordFormData.vitalSigns.heartRate}
                    onChange={(e) => setRecordFormData({ ...recordFormData, vitalSigns: { ...recordFormData.vitalSigns, heartRate: e.target.value } })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Temperature (°F)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="98.6"
                    value={recordFormData.vitalSigns.temperature}
                    onChange={(e) => setRecordFormData({ ...recordFormData, vitalSigns: { ...recordFormData.vitalSigns, temperature: e.target.value } })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="70"
                    value={recordFormData.vitalSigns.weight}
                    onChange={(e) => setRecordFormData({ ...recordFormData, vitalSigns: { ...recordFormData.vitalSigns, weight: e.target.value } })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Height (cm)</Label>
                  <Input
                    type="number"
                    placeholder="170"
                    value={recordFormData.vitalSigns.height}
                    onChange={(e) => setRecordFormData({ ...recordFormData, vitalSigns: { ...recordFormData.vitalSigns, height: e.target.value } })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Examination Findings</Label>
              <Textarea
                value={recordFormData.examination}
                onChange={(e) => setRecordFormData({ ...recordFormData, examination: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Diagnosis * (comma-separated)</Label>
              <Input
                value={recordFormData.diagnosis}
                onChange={(e) => setRecordFormData({ ...recordFormData, diagnosis: e.target.value })}
                placeholder="e.g., Hypertension, Type 2 Diabetes"
              />
            </div>

            <div className="space-y-2">
              <Label>Treatment Plan</Label>
              <Textarea
                value={recordFormData.treatmentPlan}
                onChange={(e) => setRecordFormData({ ...recordFormData, treatmentPlan: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Follow-up Date</Label>
                <Input
                  type="date"
                  value={recordFormData.followUpDate}
                  onChange={(e) => setRecordFormData({ ...recordFormData, followUpDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Follow-up Instructions</Label>
                <Input
                  value={recordFormData.followUpInstructions}
                  onChange={(e) => setRecordFormData({ ...recordFormData, followUpInstructions: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsRecordDialogOpen(false); setRecordFormData(initialMedicalRecordForm); }}>Cancel</Button>
            <Button onClick={handleCreateRecord} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Prescription Dialog */}
      <Dialog open={isPrescriptionDialogOpen} onOpenChange={setIsPrescriptionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Prescription</DialogTitle>
            <DialogDescription>Create a new prescription for this patient.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Diagnosis</Label>
              <Input
                value={prescriptionFormData.diagnosis}
                onChange={(e) => setPrescriptionFormData({ ...prescriptionFormData, diagnosis: e.target.value })}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <Label>Medications</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMedication}>
                  <Plus className="h-4 w-4 mr-1" /> Add Medication
                </Button>
              </div>
              <div className="space-y-4">
                {prescriptionFormData.medications.map((med, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Medication Name *</Label>
                        <Input
                          value={med.name}
                          onChange={(e) => updateMedication(index, "name", e.target.value)}
                          placeholder="e.g., Amoxicillin"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Dosage *</Label>
                        <Input
                          value={med.dosage}
                          onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                          placeholder="e.g., 500mg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Frequency *</Label>
                        <Input
                          value={med.frequency}
                          onChange={(e) => updateMedication(index, "frequency", e.target.value)}
                          placeholder="e.g., Twice daily"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Duration *</Label>
                        <Input
                          value={med.duration}
                          onChange={(e) => updateMedication(index, "duration", e.target.value)}
                          placeholder="e.g., 7 days"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Route</Label>
                        <Select value={med.route} onValueChange={(value) => updateMedication(index, "route", value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {routes.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Instructions</Label>
                        <Input
                          value={med.instructions}
                          onChange={(e) => updateMedication(index, "instructions", e.target.value)}
                          placeholder="e.g., Take after meals"
                        />
                      </div>
                    </div>
                    {prescriptionFormData.medications.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="mt-2 text-destructive" onClick={() => removeMedication(index)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={prescriptionFormData.notes}
                onChange={(e) => setPrescriptionFormData({ ...prescriptionFormData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsPrescriptionDialogOpen(false); setPrescriptionFormData(initialPrescriptionForm); }}>Cancel</Button>
            <Button onClick={handleCreatePrescription} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Prescription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Record Confirmation */}
      <AlertDialog open={isDeleteRecordDialogOpen} onOpenChange={setIsDeleteRecordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medical Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this medical record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecord} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Prescription Confirmation */}
      <AlertDialog open={isDeletePrescriptionDialogOpen} onOpenChange={setIsDeletePrescriptionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prescription?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this prescription.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePrescription} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
