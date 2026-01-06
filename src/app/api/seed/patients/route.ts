import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import Patient from "@/models/Patient";

// Seed sample patients for the current tenant
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Check if patients already exist
    const existingPatients = await Patient.countDocuments({ tenantId: session.user.tenant.id });
    if (existingPatients > 0) {
      return NextResponse.json({
        success: true,
        message: `${existingPatients} patients already exist`,
      });
    }

    // Create sample patients
    const samplePatients = [
      {
        patientId: "PAT000001",
        firstName: "Rajesh",
        lastName: "Kumar",
        email: "rajesh.kumar@email.com",
        phone: "+91 98765 43210",
        dateOfBirth: new Date("1985-03-15"),
        gender: "male",
        bloodGroup: "B+",
        address: {
          street: "42, MG Road",
          city: "Bangalore",
          state: "Karnataka",
          postalCode: "560001",
          country: "India",
        },
        emergencyContact: {
          name: "Priya Kumar",
          relationship: "Spouse",
          phone: "+91 98765 43211",
        },
        allergies: ["Penicillin", "Sulfa drugs"],
        chronicConditions: ["Type 2 Diabetes", "Hypertension"],
        currentMedications: ["Metformin 500mg", "Amlodipine 5mg"],
        insuranceProvider: "Star Health Insurance",
        insurancePolicyNumber: "SH2024789456",
        notes: "Regular follow-up for diabetes management. Last HbA1c: 7.2%",
        isActive: true,
        tenantId: session.user.tenant.id,
        createdBy: session.user.id,
      },
      {
        patientId: "PAT000002",
        firstName: "Ananya",
        lastName: "Sharma",
        email: "ananya.sharma@email.com",
        phone: "+91 87654 32109",
        dateOfBirth: new Date("1992-07-22"),
        gender: "female",
        bloodGroup: "O+",
        address: {
          street: "15, Koramangala 4th Block",
          city: "Bangalore",
          state: "Karnataka",
          postalCode: "560034",
          country: "India",
        },
        emergencyContact: {
          name: "Vikram Sharma",
          relationship: "Father",
          phone: "+91 87654 32100",
        },
        allergies: ["Shellfish"],
        chronicConditions: ["Asthma"],
        currentMedications: ["Salbutamol inhaler PRN"],
        insuranceProvider: "HDFC Ergo",
        insurancePolicyNumber: "HE2024123456",
        notes: "Mild persistent asthma, well-controlled with current therapy",
        isActive: true,
        tenantId: session.user.tenant.id,
        createdBy: session.user.id,
      },
      {
        patientId: "PAT000003",
        firstName: "Mohammed",
        lastName: "Farhan",
        email: "m.farhan@email.com",
        phone: "+91 76543 21098",
        dateOfBirth: new Date("1978-11-08"),
        gender: "male",
        bloodGroup: "A+",
        address: {
          street: "78, Indiranagar",
          city: "Bangalore",
          state: "Karnataka",
          postalCode: "560038",
          country: "India",
        },
        emergencyContact: {
          name: "Fatima Farhan",
          relationship: "Spouse",
          phone: "+91 76543 21099",
        },
        allergies: [],
        chronicConditions: ["Hyperlipidemia"],
        currentMedications: ["Atorvastatin 20mg"],
        insuranceProvider: "ICICI Lombard",
        insurancePolicyNumber: "IL2024567890",
        notes: "Lifestyle modifications advised. Follow-up lipid panel in 3 months",
        isActive: true,
        tenantId: session.user.tenant.id,
        createdBy: session.user.id,
      },
    ];

    await Patient.insertMany(samplePatients);

    return NextResponse.json({
      success: true,
      message: "Sample patients created successfully",
      patientsCreated: samplePatients.length,
    });
  } catch (error) {
    console.error("Seed patients error:", error);
    return NextResponse.json(
      { error: "Failed to seed patients" },
      { status: 500 }
    );
  }
}
