import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { Invoice, Payment, Patient, Appointment, Product, StockMovement, User, Role } from "@/models";
import { Types } from "mongoose";

// GET comprehensive reports data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const tenantId = new Types.ObjectId(session.user.tenant.id);
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "30"; // days
    const reportType = searchParams.get("type") || "overview";

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    startDate.setHours(0, 0, 0, 0);

    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - periodDays);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Common date filters
    const currentPeriodFilter = {
      tenantId,
      createdAt: { $gte: startDate, $lte: today },
    };

    const previousPeriodFilter = {
      tenantId,
      createdAt: { $gte: previousStartDate, $lt: startDate },
    };

    if (reportType === "overview") {
      const [
        // Revenue metrics
        revenueData,
        previousRevenueData,
        paymentMethodStats,
        revenueByDay,

        // Patient metrics
        totalPatients,
        newPatients,
        previousNewPatients,
        patientDemographics,

        // Appointment metrics
        appointmentStats,
        previousAppointmentStats,
        appointmentsByStatus,
        appointmentsByType,
        appointmentsByHour,

        // Inventory metrics
        inventoryStats,
        lowStockProducts,
        expiringProducts,

        // Outstanding payments
        outstandingInvoices,

        // Top performers
        topProducts,

        // Recent activity
        recentInvoices,
        recentPayments,

        // Doctor sales
        doctorSalesRaw,
      ] = await Promise.all([
        // Current period revenue
        Invoice.aggregate([
          { $match: { ...currentPeriodFilter, status: { $nin: ["cancelled", "draft"] } } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$grandTotal" },
              totalPaid: { $sum: "$paidAmount" },
              totalOutstanding: { $sum: "$balanceAmount" },
              invoiceCount: { $sum: 1 },
              avgInvoiceValue: { $avg: "$grandTotal" },
            },
          },
        ]),

        // Previous period revenue for comparison
        Invoice.aggregate([
          { $match: { ...previousPeriodFilter, status: { $nin: ["cancelled", "draft"] } } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$grandTotal" },
              invoiceCount: { $sum: 1 },
            },
          },
        ]),

        // Payment method distribution
        Payment.aggregate([
          { $match: { ...currentPeriodFilter, status: "completed" } },
          {
            $group: {
              _id: "$paymentMethod",
              total: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
        ]),

        // Revenue by day
        Invoice.aggregate([
          { $match: { ...currentPeriodFilter, status: { $nin: ["cancelled", "draft"] } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$invoiceDate" } },
              revenue: { $sum: "$grandTotal" },
              paid: { $sum: "$paidAmount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        // Total active patients
        Patient.countDocuments({ tenantId, isActive: true }),

        // New patients in current period
        Patient.countDocuments({ ...currentPeriodFilter }),

        // New patients in previous period
        Patient.countDocuments({ ...previousPeriodFilter }),

        // Patient demographics
        Patient.aggregate([
          { $match: { tenantId, isActive: true } },
          {
            $facet: {
              byGender: [
                { $group: { _id: "$gender", count: { $sum: 1 } } },
              ],
              byAge: [
                {
                  $addFields: {
                    age: {
                      $floor: {
                        $divide: [
                          { $subtract: [new Date(), "$dateOfBirth"] },
                          365.25 * 24 * 60 * 60 * 1000,
                        ],
                      },
                    },
                  },
                },
                {
                  $bucket: {
                    groupBy: "$age",
                    boundaries: [0, 18, 30, 45, 60, 100],
                    default: "Unknown",
                    output: { count: { $sum: 1 } },
                  },
                },
              ],
              withInsurance: [
                {
                  $match: {
                    insuranceProvider: { $exists: true, $nin: [null, ""] },
                  },
                },
                { $count: "count" },
              ],
            },
          },
        ]),

        // Current period appointments
        Appointment.aggregate([
          { $match: { tenantId, appointmentDate: { $gte: startDate, $lte: today } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
              cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
              noShow: { $sum: { $cond: [{ $eq: ["$status", "no-show"] }, 1, 0] } },
              firstVisits: { $sum: { $cond: ["$isFirstVisit", 1, 0] } },
            },
          },
        ]),

        // Previous period appointments
        Appointment.aggregate([
          { $match: { tenantId, appointmentDate: { $gte: previousStartDate, $lt: startDate } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            },
          },
        ]),

        // Appointments by status
        Appointment.aggregate([
          { $match: { tenantId, appointmentDate: { $gte: startDate, $lte: today } } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),

        // Appointments by type
        Appointment.aggregate([
          { $match: { tenantId, appointmentDate: { $gte: startDate, $lte: today } } },
          { $group: { _id: "$type", count: { $sum: 1 } } },
        ]),

        // Appointments by hour (for peak hours)
        Appointment.aggregate([
          { $match: { tenantId, appointmentDate: { $gte: startDate, $lte: today } } },
          {
            $addFields: {
              hour: {
                $toInt: { $substr: ["$startTime", 0, 2] },
              },
            },
          },
          { $group: { _id: "$hour", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),

        // Inventory stats
        Product.aggregate([
          { $match: { tenantId, status: "active" } },
          {
            $group: {
              _id: null,
              totalProducts: { $sum: 1 },
              totalStockValue: { $sum: { $multiply: ["$currentStock", "$costPrice"] } },
              lowStockCount: { $sum: { $cond: ["$isLowStock", 1, 0] } },
              expiringCount: { $sum: { $cond: ["$hasExpiringStock", 1, 0] } },
            },
          },
        ]),

        // Low stock products
        Product.find({
          tenantId,
          status: "active",
          isLowStock: true,
        })
          .select("name sku currentStock reorderLevel unit")
          .limit(10)
          .lean(),

        // Expiring products (within 90 days)
        Product.aggregate([
          { $match: { tenantId, status: "active", batchTracking: true } },
          { $unwind: "$batches" },
          {
            $match: {
              "batches.quantity": { $gt: 0 },
              "batches.expiryDate": {
                $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                $gte: new Date(),
              },
            },
          },
          {
            $project: {
              name: 1,
              batchNumber: "$batches.batchNumber",
              quantity: "$batches.quantity",
              expiryDate: "$batches.expiryDate",
              daysToExpiry: {
                $floor: {
                  $divide: [
                    { $subtract: ["$batches.expiryDate", new Date()] },
                    1000 * 60 * 60 * 24,
                  ],
                },
              },
            },
          },
          { $sort: { expiryDate: 1 } },
          { $limit: 10 },
        ]),

        // Outstanding invoices (unpaid/partial)
        Invoice.aggregate([
          {
            $match: {
              tenantId,
              paymentStatus: { $in: ["unpaid", "partial"] },
              status: { $nin: ["cancelled", "draft"] },
            },
          },
          {
            $group: {
              _id: null,
              totalOutstanding: { $sum: "$balanceAmount" },
              count: { $sum: 1 },
              overdueCount: {
                $sum: { $cond: [{ $lt: ["$dueDate", new Date()] }, 1, 0] },
              },
              overdueAmount: {
                $sum: {
                  $cond: [{ $lt: ["$dueDate", new Date()] }, "$balanceAmount", 0],
                },
              },
            },
          },
        ]),

        // Top selling products
        Invoice.aggregate([
          { $match: { ...currentPeriodFilter, status: { $nin: ["cancelled", "draft"] } } },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.name",
              totalQuantity: { $sum: "$items.quantity" },
              totalRevenue: { $sum: "$items.total" },
            },
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 10 },
        ]),

        // Recent invoices
        Invoice.find({ tenantId })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("invoiceNumber customerName grandTotal paymentStatus status createdAt")
          .lean(),

        // Recent payments
        Payment.find({ tenantId, status: "completed" })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("paymentNumber amount paymentMethod paymentDate")
          .populate("invoiceId", "invoiceNumber")
          .lean(),

        // Doctor sales aggregation
        Invoice.aggregate([
          { $match: { ...currentPeriodFilter, status: { $nin: ["cancelled", "draft"] }, doctorId: { $exists: true, $ne: null } } },
          {
            $group: {
              _id: "$doctorId",
              totalRevenue: { $sum: "$grandTotal" },
              totalPaid: { $sum: "$paidAmount" },
              invoiceCount: { $sum: 1 },
            },
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 10 },
        ]),
      ]);

      // Calculate growth rates
      const currentRevenue = revenueData[0]?.totalRevenue || 0;
      const previousRevenue = previousRevenueData[0]?.totalRevenue || 0;
      const revenueGrowth = previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

      const patientGrowth = previousNewPatients > 0
        ? ((newPatients - previousNewPatients) / previousNewPatients) * 100
        : 0;

      const currentAppointments = appointmentStats[0]?.total || 0;
      const previousAppointments = previousAppointmentStats[0]?.total || 0;
      const appointmentGrowth = previousAppointments > 0
        ? ((currentAppointments - previousAppointments) / previousAppointments) * 100
        : 0;

      // Calculate rates
      const noShowRate = currentAppointments > 0
        ? ((appointmentStats[0]?.noShow || 0) / currentAppointments) * 100
        : 0;

      const cancellationRate = currentAppointments > 0
        ? ((appointmentStats[0]?.cancelled || 0) / currentAppointments) * 100
        : 0;

      const completionRate = currentAppointments > 0
        ? ((appointmentStats[0]?.completed || 0) / currentAppointments) * 100
        : 0;

      // Collection rate
      const collectionRate = currentRevenue > 0
        ? ((revenueData[0]?.totalPaid || 0) / currentRevenue) * 100
        : 0;

      // Populate doctor names for doctor sales
      const doctorIds = doctorSalesRaw.map((d: { _id: Types.ObjectId }) => d._id);
      const doctors = await User.find({ _id: { $in: doctorIds } }).select("_id name").lean();
      const doctorMap = new Map(doctors.map((d: { _id: Types.ObjectId; name: string }) => [d._id.toString(), d.name]));

      const doctorSales = doctorSalesRaw.map((d: { _id: Types.ObjectId; totalRevenue: number; totalPaid: number; invoiceCount: number }) => ({
        doctorId: d._id,
        doctorName: doctorMap.get(d._id.toString()) || "Unknown Doctor",
        totalRevenue: d.totalRevenue,
        totalPaid: d.totalPaid,
        invoiceCount: d.invoiceCount,
      }));

      return NextResponse.json({
        success: true,
        data: {
          period: { days: periodDays, startDate, endDate: today },

          // LAGGING INDICATORS (Outcome metrics - what happened)
          laggingIndicators: {
            revenue: {
              total: currentRevenue,
              growth: revenueGrowth,
              collected: revenueData[0]?.totalPaid || 0,
              collectionRate,
              invoiceCount: revenueData[0]?.invoiceCount || 0,
              avgInvoiceValue: revenueData[0]?.avgInvoiceValue || 0,
            },
            patients: {
              total: totalPatients,
              newPatients,
              growth: patientGrowth,
              demographics: patientDemographics[0] || {},
            },
            appointments: {
              total: currentAppointments,
              growth: appointmentGrowth,
              completed: appointmentStats[0]?.completed || 0,
              completionRate,
              firstVisits: appointmentStats[0]?.firstVisits || 0,
            },
            inventory: {
              totalProducts: inventoryStats[0]?.totalProducts || 0,
              stockValue: inventoryStats[0]?.totalStockValue || 0,
            },
          },

          // LEADING INDICATORS (Predictive metrics - what might happen)
          leadingIndicators: {
            // Health warning signals
            noShowRate,
            cancellationRate,
            outstandingAmount: outstandingInvoices[0]?.totalOutstanding || 0,
            overdueAmount: outstandingInvoices[0]?.overdueAmount || 0,
            overdueInvoices: outstandingInvoices[0]?.overdueCount || 0,

            // Inventory risks
            lowStockItems: inventoryStats[0]?.lowStockCount || 0,
            expiringItems: inventoryStats[0]?.expiringCount || 0,

            // Future revenue at risk
            unpaidInvoices: outstandingInvoices[0]?.count || 0,
          },

          // Charts data
          charts: {
            revenueByDay,
            paymentMethods: paymentMethodStats,
            appointmentsByStatus,
            appointmentsByType,
            appointmentsByHour,
          },

          // Alerts and actions needed
          alerts: {
            lowStockProducts,
            expiringProducts,
          },

          // Performance insights
          topProducts,

          // Doctor sales performance
          doctorSales,

          // Recent activity
          recentActivity: {
            invoices: recentInvoices,
            payments: recentPayments,
          },
        },
      });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json(
      { error: "Failed to generate reports" },
      { status: 500 }
    );
  }
}
