"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
    };
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

interface TaxConfig {
  legalName: string;
  tradeName?: string;
  registrationNumber: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  email: string;
  phone: string;
  prescriptionSettings?: {
    doctorSignature?: string;
  };
}

export default function PrintPrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [taxConfig, setTaxConfig] = useState<TaxConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [prescriptionRes, taxRes] = await Promise.all([
        fetch(`/api/prescriptions/${id}`),
        fetch("/api/tax-config"),
      ]);

      const prescriptionData = await prescriptionRes.json();
      const taxData = await taxRes.json();

      if (prescriptionData.success) {
        setPrescription(prescriptionData.data);
      }
      if (taxData.success) {
        setTaxConfig(taxData.data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrint = () => {
    window.print();
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
      <div className="flex items-center justify-center h-screen">
        <p>Prescription not found</p>
      </div>
    );
  }

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
    <>
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden flex justify-end gap-2 p-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Prescription
        </Button>
      </div>

      {/* Prescription Content */}
      <div className="max-w-4xl mx-auto p-8 bg-white text-black print:p-0 print:max-w-none print-prescription">
        <style jsx global>{`
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            /* Hide everything first */
            body * {
              visibility: hidden;
            }
            /* Show only the prescription content */
            .print-prescription,
            .print-prescription * {
              visibility: visible !important;
            }
            /* Position the prescription at the top left */
            .print-prescription {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white !important;
              color: black !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background: white !important;
              color: black !important;
            }
            /* Hide header, sidebar, and any navigation */
            header, nav, aside, .print\\:hidden {
              display: none !important;
              visibility: hidden !important;
            }
          }
          .print-prescription {
            background: white !important;
            color: #000 !important;
          }
          .print-prescription * {
            color: inherit;
          }
        `}</style>

        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {taxConfig?.tradeName || taxConfig?.legalName || "Clinic Name"}
            </h1>
            {taxConfig?.legalName && taxConfig.tradeName && (
              <p className="text-sm text-gray-600">{taxConfig.legalName}</p>
            )}
            {taxConfig?.address && (
              <div className="text-sm text-gray-600 mt-1">
                <p>{taxConfig.address.line1}</p>
                {taxConfig.address.line2 && <p>{taxConfig.address.line2}</p>}
                <p>
                  {taxConfig.address.city}, {taxConfig.address.state} - {taxConfig.address.postalCode}
                </p>
              </div>
            )}
            {taxConfig && (
              <p className="text-sm text-gray-700 mt-1">
                {taxConfig.phone} | {taxConfig.email}
              </p>
            )}
            {taxConfig?.registrationNumber && (
              <p className="text-sm font-medium text-gray-900 mt-1">Reg No: {taxConfig.registrationNumber}</p>
            )}
          </div>
        </div>

        {/* Prescription Header Info */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">PRESCRIPTION</h2>
              <p className="text-sm text-gray-600 font-mono">{prescription.prescriptionId}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                Date: {format(new Date(prescription.prescriptionDate), "dd/MM/yyyy")}
              </p>
              {prescription.validUntil && (
                <p className="text-sm text-gray-600">
                  Valid Until: {format(new Date(prescription.validUntil), "dd/MM/yyyy")}
                </p>
              )}
            </div>
          </div>

          {/* Doctor Info */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
            <p className="font-semibold text-gray-900">Dr. {prescription.doctorId.name}</p>
            {prescription.doctorId.email && (
              <p className="text-sm text-gray-600">{prescription.doctorId.email}</p>
            )}
          </div>

          {/* Patient Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-100 rounded-lg border border-gray-300">
            <div>
              <p className="text-sm text-gray-600">Patient Name:</p>
              <p className="font-medium text-gray-900">
                {prescription.patientId.firstName} {prescription.patientId.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Patient ID:</p>
              <p className="font-medium text-gray-900">{prescription.patientId.patientId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Age / Gender:</p>
              <p className="font-medium text-gray-900">
                {calculateAge(prescription.patientId.dateOfBirth)} years / {prescription.patientId.gender}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contact:</p>
              <p className="font-medium text-gray-900">{prescription.patientId.phone}</p>
            </div>
            {prescription.patientId.address && (
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Address:</p>
                <p className="text-sm text-gray-700">
                  {prescription.patientId.address.street && `${prescription.patientId.address.street}, `}
                  {prescription.patientId.address.city && `${prescription.patientId.address.city}, `}
                  {prescription.patientId.address.state && `${prescription.patientId.address.state} `}
                  {prescription.patientId.address.postalCode && `- ${prescription.patientId.address.postalCode}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Diagnosis */}
        {prescription.diagnosis && (
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-900 mb-1">Diagnosis:</p>
            <p className="text-gray-700 pl-2">{prescription.diagnosis}</p>
          </div>
        )}

        {/* Rx Symbol */}
        <div className="mb-4">
          <p className="text-4xl font-serif text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>℞</p>
        </div>

        {/* Medications Table */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: "#1f2937", color: "#ffffff" }}>
                <th className="border border-gray-400 p-2 text-left text-white">#</th>
                <th className="border border-gray-400 p-2 text-left text-white">Medication</th>
                <th className="border border-gray-400 p-2 text-left text-white">Dosage</th>
                <th className="border border-gray-400 p-2 text-left text-white">Route</th>
                <th className="border border-gray-400 p-2 text-left text-white">Frequency</th>
                <th className="border border-gray-400 p-2 text-left text-white">Duration</th>
                <th className="border border-gray-400 p-2 text-center text-white">Qty</th>
              </tr>
            </thead>
            <tbody>
              {prescription.medications.map((med, index) => (
                <tr key={index} className="border-b border-gray-300">
                  <td className="border border-gray-300 p-2 text-gray-900">{index + 1}</td>
                  <td className="border border-gray-300 p-2">
                    <p className="font-medium text-gray-900">{med.name}</p>
                    {med.instructions && (
                      <p className="text-xs text-gray-600 italic">{med.instructions}</p>
                    )}
                  </td>
                  <td className="border border-gray-300 p-2 text-gray-900">{med.dosage}</td>
                  <td className="border border-gray-300 p-2 text-gray-700 capitalize">{med.route}</td>
                  <td className="border border-gray-300 p-2 text-gray-900">{med.frequency}</td>
                  <td className="border border-gray-300 p-2 text-gray-900">{med.duration}</td>
                  <td className="border border-gray-300 p-2 text-center text-gray-900">
                    {med.quantity || "-"}
                    {med.refills ? ` (${med.refills} refills)` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {prescription.notes && (
          <div className="mb-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm font-semibold text-gray-900 mb-1">Notes:</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{prescription.notes}</p>
          </div>
        )}

        {/* Pharmacy Notes (if dispensed) */}
        {prescription.isDispensed && prescription.pharmacyNotes && (
          <div className="mb-6 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-semibold text-gray-900 mb-1">Pharmacy Notes:</p>
            <p className="text-sm text-gray-700">{prescription.pharmacyNotes}</p>
            {prescription.dispensedDate && prescription.dispensedBy && (
              <p className="text-xs text-gray-600 mt-2">
                Dispensed by {prescription.dispensedBy.name} on {format(new Date(prescription.dispensedDate), "dd/MM/yyyy")}
              </p>
            )}
          </div>
        )}

        {/* Signature */}
        <div className="mt-12 flex justify-end">
          <div className="text-center">
            {taxConfig?.prescriptionSettings?.doctorSignature && (
              <div className="mb-2">
                <img
                  src={taxConfig.prescriptionSettings.doctorSignature}
                  alt="Doctor signature"
                  className="h-16 max-w-[200px] object-contain mx-auto"
                />
              </div>
            )}
            <div className="border-t-2 border-gray-800 pt-2 w-48">
              <p className="font-semibold text-gray-900">Dr. {prescription.doctorId.name}</p>
              <p className="text-sm text-gray-600">Signature</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-400 text-center text-xs text-gray-700">
          <p>This prescription is valid for {prescription.validUntil ? `until ${format(new Date(prescription.validUntil), "dd/MM/yyyy")}` : "30 days from the date of issue"}</p>
          <p className="mt-1">This is a computer generated prescription.</p>
        </div>
      </div>
    </>
  );
}
