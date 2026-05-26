import dotenv from "dotenv";
dotenv.config();

import path from "path";
import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";

import { sequelize, User, Vendor, Bill, Payment } from "./models";
import errorHandler from "./middleware/errorHandler";

import authRoutes from "./routes/authRoutes";
import vendorRoutes from "./routes/vendorRoutes";
import billRoutes from "./routes/billRoutes";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Health Check Endpoint
app.get("/api/health", async (req: Request, res: Response) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({
      status: "UP",
      database: "CONNECTED",
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: "DOWN",
      database: "DISCONNECTED",
      error: error.message,
      timestamp: new Date(),
    });
  }
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/bills", billRoutes);

// Root route
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Welcome to the Accounts Payable API (TypeScript)",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      vendors: "/api/vendors",
      bills: "/api/bills",
    },
  });
});

// Register Global Error Handler
app.use(errorHandler);

// Helper function to seed initial data
async function seedData() {
  try {
    const userCount = await User.count();
    if (userCount === 0) {
      console.log("Seeding initial data...");

      // Create Users
      const admin = await User.create({
        email: "admin@example.com",
        password: "password123",
        fullName: "Admin User",
        role: "Admin",
      });
      const approver = await User.create({
        email: "approver@example.com",
        password: "password123",
        fullName: "Approver User",
        role: "Approver",
      });
      const submitter = await User.create({
        email: "submitter@example.com",
        password: "password123",
        fullName: "Submitter User",
        role: "Submitter",
      });

      // Create Vendors
      const vendorAcme = await Vendor.create({
        name: "Acme Corporation",
        email: "billing@acme.com",
        phone: "123-456-7890",
        bankName: "Chase Bank",
        bankRoutingNumber: "123456789",
        bankAccountNumber: "987654321",
        status: "Active",
      });
      const vendorGlobex = await Vendor.create({
        name: "Globex Corp",
        email: "accounts@globex.com",
        phone: "987-654-3210",
        bankName: "Bank of America",
        bankRoutingNumber: "987654321",
        bankAccountNumber: "123456789",
        status: "Active",
      });

      // Create Bills
      const bill1 = await Bill.create({
        vendorId: vendorAcme.id,
        createdById: submitter.id,
        amount: 1500.0,
        invoiceNumber: "INV-2026-001",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 14 days from now
        status: "Pending Approval",
      });

      const bill2 = await Bill.create({
        vendorId: vendorGlobex.id,
        createdById: submitter.id,
        approvedById: approver.id,
        amount: 250.0,
        invoiceNumber: "INV-GL-992",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        status: "Approved",
      });

      // Create Payment for bill2
      await Payment.create({
        billId: bill2.id,
        paymentMethod: "ACH",
        amount: 250.0,
        scheduledDate: bill2.dueDate,
        status: "Scheduled",
      });

      console.log("Seeding completed successfully!");
    }
  } catch (error) {
    console.error("Error seeding data:", error);
  }
}

// Database Connection & Server Sync
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");

    await sequelize.sync({ alter: true });
    console.log("Database synced successfully.");

    await seedData();

    app.listen(PORT, () => {
      console.log(
        `Server is running on port ${PORT} in ${process.env.NODE_ENV} mode.`,
      );
    });
  } catch (error) {
    console.error("Unable to start the database or server:", error);
    process.exit(1);
  }
}

startServer();
