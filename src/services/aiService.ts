import Groq from "groq-sdk";
import { Bill, Vendor, User, Payment, Card } from "../models";

async function buildContext(): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const bills = await Bill.findAll({
    include: [{ model: Vendor, as: "vendor" }],
    order: [["dueDate", "ASC"]],
  });

  const payments = await Payment.findAll({ order: [["createdAt", "DESC"]] });
  const users = await User.findAll({ order: [["fullName", "ASC"]] });
  const vendors = await Vendor.findAll({ order: [["name", "ASC"]] });
  const cards = await Card.findAll({ include: [{ model: User, as: "creator", attributes: ["fullName"] }] });

  let out = `FINANCIAL CONTEXT (real-time data):
- Context generated: ${new Date().toISOString()}
- Today's date: ${todayStr}
- Records: ${bills.length} bills | ${payments.length} payments | ${vendors.length} vendors | ${users.length} users | ${cards.length} cards

=== BILLS (sorted by due date) ===
`;

  for (let i = 0; i < bills.length; i++) {
    const b = bills[i];
    const vendor = (b as any).vendor;
    const dueDate = new Date(b.get("dueDate") as string);
    const dueDateStr = b.get("dueDate") as string;
    const status = b.get("status") as string;
    const amount = parseFloat(String(b.get("amount"))) || 0;
    const inv = b.get("invoiceNumber") || "—";
    const createdById = b.get("createdById") as string;
    const approvedById = b.get("approvedById") as string | null;
    const fileUrl = b.get("fileUrl") as string | null;
    const overdueFlag = dueDate < today && !["Paid", "Cancelled", "Rejected"].includes(status) ? " [OVERDUE]" : "";
    const billPayments = payments.filter((p) => p.get("billId") === b.get("id"));
    const payStatus = billPayments.length > 0 ? billPayments[0].get("status") : "none";

    out += `[${i + 1}] Inv: ${inv} | Vendor: ${vendor?.name || "Unknown"} | Amount: $${amount.toFixed(2)} | Due: ${dueDateStr} | Status: ${status}${overdueFlag} | File: ${fileUrl || "none"} | Payments: ${billPayments.length} (last: ${payStatus})\n`;
  }

  out += `\n=== USERS ===\n`;
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    out += `[${i + 1}] Name: ${u.get("fullName")} | Email: ${u.get("email")} | Role: ${u.get("role")} | ID: ${u.get("id")}\n`;
  }

  out += `\n=== VENDORS ===\n`;
  for (let i = 0; i < vendors.length; i++) {
    const v = vendors[i];
    out += `[${i + 1}] Name: ${v.get("name")} | Email: ${v.get("email")} | Bank: ${v.get("bankName") || "—"} | Routing: ${v.get("bankRoutingNumber") || "—"} | Status: ${v.get("status")} | ID: ${v.get("id")}\n`;
  }

  out += `\n=== PAYMENTS ===\n`;
  for (let i = 0; i < payments.length; i++) {
    const p = payments[i];
    const bill = bills.find((b) => b.get("id") === p.get("billId"));
    const inv = bill ? bill.get("invoiceNumber") || "—" : "Unknown";
    out += `[${i + 1}] Bill: ${inv} | Method: ${p.get("paymentMethod")} | Amount: $${(parseFloat(String(p.get("amount"))) || 0).toFixed(2)} | Status: ${p.get("status")} | Scheduled: ${p.get("scheduledDate") || "—"} | Paid: ${p.get("paidDate") || "—"} | Ref: ${p.get("transactionReference") || "—"}\n`;
  }

  out += `\n=== CARDS ===\n`;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const creator = (c as any).creator;
    out += `[${i + 1}] User: ${creator?.fullName || "Unknown"} | Type: ${c.get("type")} | Holder: ${c.get("cardholderName")} | Last 4: ${c.get("lastFourDigits")} | Exp: ${c.get("expiryMonth")}/${c.get("expiryYear")}\n`;
  }

  out += `
Database schema reference:
- User: id (UUID), fullName, email, role (Admin|Approver|Submitter)
- Vendor: id (UUID), name, email, phone, bankName, bankRoutingNumber, bankAccountNumber, status (Active|Inactive)
- Bill: id (UUID), vendorId (→Vendor), createdById (→User), approvedById (→User), amount, invoiceNumber, dueDate (DATE), status (Draft|Pending Approval|Approved|Overdue|Rejected|Cancelled|Paid), fileUrl
- Payment: id (UUID), billId (→Bill), paymentMethod (ACH|Paper Check|Card), amount, scheduledDate, paidDate, status (Not Scheduled|Scheduled|Processing|Paid|Failed|Cancelled|Refunded), transactionReference
- Card: id (UUID), createdById (→User), type (Debit|Credit), cardholderName, lastFourDigits, expiryMonth, expiryYear, cvv

Note: The "[OVERDUE]" flag next to a bill means its dueDate is before today (${todayStr}) and its status is not Paid, Cancelled, or Rejected.`;

  return out.trim();
}

export async function askAI(
  question: string,
  history: { role: "user" | "assistant"; text: string }[]
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const groq = new Groq({ apiKey });

  const context = await buildContext();

  const systemPrompt = `You are a financial assistant specialized in Accounts Payable. Use the following real database data to answer user questions about bills, payments, vendors, and users.

${context}

Be concise, accurate, and base your answers only on the data provided. If you don't have enough information, say so. Format currency as USD. Use bullet points for lists.`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
  ];

  if (history && history.length > 0) {
    for (const msg of history) {
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.text,
      });
    }
  }

  messages.push({ role: "user", content: question });

  const chatCompletion = await groq.chat.completions.create({
    messages,
    model: "llama-3.1-8b-instant",
  });

  return chatCompletion.choices[0]?.message?.content || "";
}
