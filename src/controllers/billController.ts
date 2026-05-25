import { Request, Response, NextFunction } from 'express';
import { Bill, Vendor, User, Payment, sequelize } from '../models';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export const getAllBills = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { status } = req.query;
    const filter = status ? { status: status as string } : {};

    const bills = await Bill.findAll({
      where: filter as any,
      include: [
        { model: Vendor, as: 'vendor', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'fullName', 'email'] },
        { model: Payment, as: 'payments' }
      ],
      order: [['dueDate', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: bills.length,
      data: bills
    });
  } catch (error) {
    next(error);
  }
};

export const getBillById = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const bill = await Bill.findByPk(req.params.id, {
      include: [
        { model: Vendor, as: 'vendor' },
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'fullName', 'email'] },
        { model: Payment, as: 'payments' }
      ]
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    res.status(200).json({
      success: true,
      data: bill
    });
  } catch (error) {
    next(error);
  }
};

export const createBill = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { vendorId, amount, invoiceNumber, dueDate } = req.body;

    const vendor = await Vendor.findByPk(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const bill = await Bill.create({
      vendorId,
      amount,
      invoiceNumber,
      dueDate,
      createdById: req.user!.id,
      status: 'Pending Approval'
    });

    // Reload with associations for the response
    const createdBill = await Bill.findByPk(bill.id, {
      include: [
        { model: Vendor, as: 'vendor' },
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
        { model: Payment, as: 'payments' }
      ]
    });

    res.status(201).json({
      success: true,
      data: createdBill
    });
  } catch (error) {
    next(error);
  }
};

export const approveBill = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const bill = await Bill.findByPk(req.params.id);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    const status = bill.get('status') as string;

    if (status !== 'Pending Approval') {
      return res.status(400).json({
        success: false,
        message: `Bill status is "${status}", it cannot be approved.`
      });
    }

    await bill.update({
      status: 'Approved',
      approvedById: req.user!.id
    });

    const updatedBill = await Bill.findByPk(bill.id, {
      include: [
        { model: Vendor, as: 'vendor' },
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'fullName', 'email'] },
        { model: Payment, as: 'payments' }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Bill approved successfully',
      data: updatedBill
    });
  } catch (error) {
    next(error);
  }
};

export const schedulePayment = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const transaction = await sequelize.transaction();
  try {
    const { paymentMethod, scheduledDate } = req.body;
    const bill = await Bill.findByPk(req.params.id, { transaction });

    if (!bill) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    if (bill.get('status') !== 'Approved') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Bill status must be 'Approved' to schedule payments. Current status: ${bill.status}`
      });
    }

    // Create payment entry
    const payment = await Payment.create({
      billId: bill.id,
      paymentMethod: paymentMethod || 'ACH',
      amount: bill.amount,
      scheduledDate: scheduledDate || bill.dueDate,
      status: 'Scheduled'
    }, { transaction });

    // Update bill status to Scheduled
    await bill.update({ status: 'Scheduled' }, { transaction });

    await transaction.commit();

    // Reload with associations
    const scheduledBill = await Bill.findByPk(bill.id, {
      include: [
        { model: Vendor, as: 'vendor' },
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'fullName', 'email'] },
        { model: Payment, as: 'payments' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Payment scheduled successfully',
      data: { bill: scheduledBill, payment }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

export const executePayment = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const transaction = await sequelize.transaction();
  try {
    const bill = await Bill.findByPk(req.params.id, {
      include: [{ model: Payment, as: 'payments', where: { status: 'Scheduled' }, limit: 1 }],
      transaction
    });

    if (!bill) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Bill with scheduled payments not found' });
    }

    const payment = bill.payments?.[0];
    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'No scheduled payment found for this bill' });
    }

    // Simulate bank transaction API call
    const transactionRef = 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    await payment.update({
      status: 'Completed',
      paidDate: new Date(),
      transactionReference: transactionRef
    }, { transaction });

    await bill.update({ status: 'Paid' }, { transaction });

    await transaction.commit();

    // Reload with associations
    const paidBill = await Bill.findByPk(bill.id, {
      include: [
        { model: Vendor, as: 'vendor' },
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'fullName', 'email'] },
        { model: Payment, as: 'payments' }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Payment executed successfully',
      data: { bill: paidBill, payment }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
