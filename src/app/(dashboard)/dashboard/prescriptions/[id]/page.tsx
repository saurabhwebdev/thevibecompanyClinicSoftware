"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  Loader2,
  Printer,
  Pill,
  User,
  Calendar,
  FileText,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions?: string;
  quantity?: number;
  refills?: number;
}

interface Prescription {
  _id: string;
  prescriptionId: string;
  prescriptionDate: string;
  validUntil?: string;
  diagnosis?: string;
  notes?: string;
  isDispensed: boolean;
  dispensedDate?: string;
  dispensedBy?: {
    name: string;
  };
  pharmacyNotes?: string;
  medications: Medication[];
  patientId: {
    patientId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    email?: string;
  };
  doctorId: {
    name: string;
    email?: string;
  };
  medicalRecordId?: {
    visitDate: string;
    chiefComplaint: string;
  };
}

export default function PrescriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const fetchPrescription = useCallback(async () => {
    try {
      const response = await fetch(`/api/prescriptions/${id}`);
      const result = await response.json();
      if (result.success) {
        setPrescription(result.data);
      } else {
        toast.error("Failed to load prescription");
      }
    } catch (error) {
      console.error("Failed to fetch prescription:", error);
      toast.error("Failed to load prescription");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPrescription();
  }, [fetchPrescription]);

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

  const handleSendEmail = async () => {
    if (!prescription?.patientId?.email) {
      toast.error("Patient does not have an email address");
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await fetch(`/api/prescriptions/${id}/send-email`, {
        method: "POST",
      });
      const result = await response.json();

      if (result.success) {
        toast.success("Prescription email sent successfully");
      } else {
        toast.error(result.error || "Failed to send prescription email");
      }
    } catch (error) {
      console.error("Failed to send prescription email:", error);
      toast.error("Failed to send prescription email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Prescription not found</p>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{prescription.prescriptionId}</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(prescription.prescriptionDate), "MMMM dd, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={prescription.isDispensed ? "default" : "secondary"}>
            {prescription.isDispensed ? "Dispensed" : "Pending"}
          </Badge>
          <Button
            variant="outline"
            onClick={handleSendEmail}
            disabled={isSendingEmail || !prescription.patientId.email}
          >
            {isSendingEmail ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            {isSendingEmail ? "Sending..." : "Send Email"}
          </Button>
          <Button onClick={() => window.open(`/dashboard/prescriptions/${id}/print`, "_blank")}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Patient & Doctor Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">
                {prescription.patientId.firstName} {prescription.patientId.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Patient ID</p>
              <p className="font-medium">{prescription.patientId.patientId}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="font-medium">{calculateAge(prescription.patientId.dateOfBirth)} years</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium capitalize">{prescription.patientId.gender}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact</p>
              <p className="font-medium">{prescription.patientId.phone}</p>
            </div>
            {prescription.patientId.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{prescription.patientId.email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Prescription Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Prescribed by</p>
              <p className="font-medium">Dr. {prescription.doctorId.name}</p>
              {prescription.doctorId.email && (
                <p className="text-xs text-muted-foreground">{prescription.doctorId.email}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prescription Date</p>
              <p className="font-medium">{format(new Date(prescription.prescriptionDate), "PPP")}</p>
            </div>
            {prescription.validUntil && (
              <div>
                <p className="text-sm text-muted-foreground">Valid Until</p>
                <p className="font-medium">{format(new Date(prescription.validUntil), "PPP")}</p>
              </div>
            )}
            {prescription.medicalRecordId && (
              <div>
                <p className="text-sm text-muted-foreground">Related Visit</p>
                <p className="text-sm">
                  {format(new Date(prescription.medicalRecordId.visitDate), "PPP")}
                </p>
                <p className="text-xs text-muted-foreground">{prescription.medicalRecordId.chiefComplaint}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diagnosis */}
      {prescription.diagnosis && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnosis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{prescription.diagnosis}</p>
          </CardContent>
        </Card>
      )}

      {/* Medications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medications ({prescription.medications.length})
          </CardTitle>
          <CardDescription>Prescribed medications and dosage instructions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Medication</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescription.medications.map((med, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{med.name}</p>
                      {med.instructions && (
                        <p className="text-xs text-muted-foreground italic">{med.instructions}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{med.dosage}</TableCell>
                  <TableCell className="capitalize">{med.route}</TableCell>
                  <TableCell>{med.frequency}</TableCell>
                  <TableCell>{med.duration}</TableCell>
                  <TableCell className="text-center">
                    {med.quantity || "-"}
                    {med.refills && med.refills > 0 && (
                      <p className="text-xs text-muted-foreground">({med.refills} refills)</p>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      {prescription.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{prescription.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Dispensed Info */}
      {prescription.isDispensed && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900">Dispensed Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {prescription.dispensedDate && (
              <div>
                <p className="text-sm text-green-800">Dispensed on</p>
                <p className="font-medium text-green-900">
                  {format(new Date(prescription.dispensedDate), "PPP 'at' p")}
                </p>
              </div>
            )}
            {prescription.dispensedBy && (
              <div>
                <p className="text-sm text-green-800">Dispensed by</p>
                <p className="font-medium text-green-900">{prescription.dispensedBy.name}</p>
              </div>
            )}
            {prescription.pharmacyNotes && (
              <div>
                <p className="text-sm text-green-800">Pharmacy Notes</p>
                <p className="text-green-900">{prescription.pharmacyNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
