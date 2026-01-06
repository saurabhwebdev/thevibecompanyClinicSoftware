import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db/mongoose";
import { Tenant, Role, User, Patient } from "@/models";

// Seed a default tenant for development
export async function POST() {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Seeding not allowed in production" },
        { status: 403 }
      );
    }

    await dbConnect();

    // Check if default tenant already exists
    const existingTenant = await Tenant.findOne({ slug: "default" });
    if (existingTenant) {
      return NextResponse.json({
        success: true,
        message: "Default tenant already exists",
      });
    }

    // Create default tenant
    const tenant = await Tenant.create({
      name: "Default Clinic",
      slug: "default",
      isActive: true,
    });

    // Create admin role
    const adminRole = await Role.create({
      name: "Admin",
      description: "Full access to all resources",
      tenantId: tenant._id,
      isDefault: false,
      isSystem: true,
      permissions: [
        { resource: "dashboard", actions: ["create", "read", "update", "delete"] },
        { resource: "users", actions: ["create", "read", "update", "delete"] },
        { resource: "roles", actions: ["create", "read", "update", "delete"] },
        { resource: "settings", actions: ["create", "read", "update", "delete"] },
        { resource: "patients", actions: ["create", "read", "update", "delete"] },
        { resource: "medical-records", actions: ["create", "read", "update", "delete"] },
        { resource: "prescriptions", actions: ["create", "read", "update", "delete"] },
        { resource: "appointments", actions: ["create", "read", "update", "delete"] },
        { resource: "reports", actions: ["create", "read", "update", "delete"] },
      ],
    });

    // Create default user role
    await Role.create({
      name: "User",
      description: "Default user role",
      tenantId: tenant._id,
      isDefault: true,
      isSystem: false,
      permissions: [
        { resource: "dashboard", actions: ["read"] },
        { resource: "profile", actions: ["read", "update"] },
      ],
    });

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 12);
    const adminUser = await User.create({
      name: "Admin User",
      email: "admin@clinic.com",
      password: hashedPassword,
      tenantId: tenant._id,
      roleId: adminRole._id,
      isActive: true,
      emailVerified: true,
    });

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
        tenantId: tenant._id,
        createdBy: adminUser._id,
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
        tenantId: tenant._id,
        createdBy: adminUser._id,
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
        tenantId: tenant._id,
        createdBy: adminUser._id,
      },
    ];

    await Patient.insertMany(samplePatients);

    return NextResponse.json({
      success: true,
      message: "Default tenant seeded successfully with sample patients",
      credentials: {
        email: "admin@clinic.com",
        password: "admin123",
        tenant: "default",
      },
      patientsCreated: samplePatients.length,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 }
    );
  }
}
