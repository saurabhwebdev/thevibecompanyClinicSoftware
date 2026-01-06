import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  CalendarDays,
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  UserPlus,
  Calendar,
  Pill,
  Clock,
  Package,
  AlertTriangle,
} from "lucide-react";
import dbConnect from "@/lib/db/mongoose";
import Patient from "@/models/Patient";
import Appointment from "@/models/Appointment";
import Invoice from "@/models/Invoice";
import Prescription from "@/models/Prescription";
import Product from "@/models/Product";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths } from "date-fns";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Guard against missing tenant data (session callback failed to fetch tenant)
  if (!session.user?.tenant?.id) {
    redirect("/login?error=SessionExpired");
  }

  await dbConnect();

  const tenantId = session.user.tenant.id;
  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);
  const startOfThisMonth = startOfMonth(today);
  const endOfThisMonth = endOfMonth(today);
  const startOfLastMonth = startOfMonth(subMonths(today, 1));
  const endOfLastMonth = endOfMonth(subMonths(today, 1));

  // Fetch dashboard metrics in parallel
  const [
    totalPatients,
    patientsThisMonth,
    patientsLastMonth,
    todayAppointments,
    thisMonthAppointments,
    lastMonthAppointments,
    thisMonthRevenue,
    lastMonthRevenue,
    pendingPrescriptions,
    lowStockProducts,
    recentPatients,
    upcomingAppointments,
  ] = await Promise.all([
    // Total patients
    Patient.countDocuments({ tenantId }),
    // Patients this month
    Patient.countDocuments({
      tenantId,
      createdAt: { $gte: startOfThisMonth, $lte: endOfThisMonth },
    }),
    // Patients last month
    Patient.countDocuments({
      tenantId,
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    }),
    // Today's appointments
    Appointment.countDocuments({
      tenantId,
      appointmentDate: { $gte: startOfToday, $lte: endOfToday },
      status: { $ne: "cancelled" },
    }),
    // This month appointments
    Appointment.countDocuments({
      tenantId,
      appointmentDate: { $gte: startOfThisMonth, $lte: endOfThisMonth },
    }),
    // Last month appointments
    Appointment.countDocuments({
      tenantId,
      appointmentDate: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    }),
    // This month revenue
    Invoice.aggregate([
      {
        $match: {
          tenantId,
          invoiceDate: { $gte: startOfThisMonth, $lte: endOfThisMonth },
          status: { $in: ["paid", "partial"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$grandTotal" } } },
    ]),
    // Last month revenue
    Invoice.aggregate([
      {
        $match: {
          tenantId,
          invoiceDate: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          status: { $in: ["paid", "partial"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$grandTotal" } } },
    ]),
    // Pending prescriptions
    Prescription.countDocuments({
      tenantId,
      isDispensed: false,
    }),
    // Low stock products
    Product.countDocuments({
      tenantId,
      status: "active",
      $expr: { $lte: ["$stockQuantity", "$lowStockThreshold"] },
    }),
    // Recent patients (last 5)
    Patient.find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("firstName lastName patientId createdAt"),
    // Upcoming appointments (next 5)
    Appointment.find({
      tenantId,
      appointmentDate: { $gte: today },
      status: { $ne: "cancelled" },
    })
      .sort({ appointmentDate: 1, startTime: 1 })
      .limit(5)
      .populate("patientId", "firstName lastName")
      .populate("doctorId", "name"),
  ]);

  // Calculate growth percentages
  const patientGrowth =
    patientsLastMonth > 0
      ? ((patientsThisMonth - patientsLastMonth) / patientsLastMonth) * 100
      : patientsThisMonth > 0
      ? 100
      : 0;

  const appointmentGrowth =
    lastMonthAppointments > 0
      ? ((thisMonthAppointments - lastMonthAppointments) / lastMonthAppointments) * 100
      : thisMonthAppointments > 0
      ? 100
      : 0;

  const currentRevenue = thisMonthRevenue[0]?.total || 0;
  const previousRevenue = lastMonthRevenue[0]?.total || 0;
  const revenueGrowth =
    previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : currentRevenue > 0
      ? 100
      : 0;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Welcome back, {session.user.name}!
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {format(today, "EEEE, MMMM d, yyyy")} • Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/patients/new">
            <Button size="sm" className="sm:size-default">
              <UserPlus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Patient</span>
            </Button>
          </Link>
          <Link href="/dashboard/appointments/new">
            <Button variant="outline" size="sm" className="sm:size-default">
              <Calendar className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Book Appointment</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Patients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPatients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {patientGrowth >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{patientGrowth.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">{patientGrowth.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground">from last month</span>
            </p>
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Appointments</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {appointmentGrowth >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{appointmentGrowth.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">{appointmentGrowth.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground">this month</span>
            </p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (This Month)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{currentRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {revenueGrowth >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{revenueGrowth.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">{revenueGrowth.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground">from last month</span>
            </p>
          </CardContent>
        </Card>

        {/* Pending Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPrescriptions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Prescriptions to dispense
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {lowStockProducts > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 sm:pt-6">
            <div className="flex items-center gap-3 flex-1">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm sm:text-base">Low Stock Alert</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {lowStockProducts} product{lowStockProducts !== 1 ? "s" : ""} running low on stock
                </p>
              </div>
            </div>
            <Link href="/dashboard/inventory" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                View Inventory
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Patients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Patients</CardTitle>
                <CardDescription>Latest patient registrations</CardDescription>
              </div>
              <Link href="/dashboard/patients">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentPatients.length > 0 ? (
              <div className="space-y-4">
                {recentPatients.map((patient) => (
                  <div key={patient._id.toString()} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{patient.patientId}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(patient.createdAt), "MMM d")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No patients registered yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Appointments</CardTitle>
                <CardDescription>Next scheduled appointments</CardDescription>
              </div>
              <Link href="/dashboard/appointments">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => {
                  const patient = appointment.patientId as any;
                  const doctor = appointment.doctorId as any;
                  return (
                    <div key={appointment._id.toString()} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {patient?.firstName} {patient?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Dr. {doctor?.name} • {appointment.startTime}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(appointment.appointmentDate), "MMM d")}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No upcoming appointments
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/patients/new" className="block">
              <Button variant="outline" className="w-full justify-start text-xs sm:text-sm h-9 sm:h-10">
                <UserPlus className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Register Patient</span>
              </Button>
            </Link>
            <Link href="/dashboard/appointments/new" className="block">
              <Button variant="outline" className="w-full justify-start text-xs sm:text-sm h-9 sm:h-10">
                <Calendar className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Book Appointment</span>
              </Button>
            </Link>
            <Link href="/dashboard/prescriptions" className="block">
              <Button variant="outline" className="w-full justify-start text-xs sm:text-sm h-9 sm:h-10">
                <Pill className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Prescriptions</span>
              </Button>
            </Link>
            <Link href="/dashboard/inventory" className="block">
              <Button variant="outline" className="w-full justify-start text-xs sm:text-sm h-9 sm:h-10">
                <Package className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Inventory</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
