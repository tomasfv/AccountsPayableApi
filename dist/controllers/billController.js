"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelPayment = exports.reschedulePayment = exports.deleteBill = exports.updateBill = exports.rejectBill = exports.executePayment = exports.schedulePayment = exports.approveBill = exports.createBill = exports.getBillById = exports.getAllBills = void 0;
const models_1 = require("../models");
const getAllBills = async (req, res, next) => {
    try {
        const { status } = req.query;
        const filter = status ? { status: status } : {};
        const bills = await models_1.Bill.findAll({
            where: filter,
            include: [
                { model: models_1.Vendor, as: 'vendor', attributes: ['id', 'name', 'email'] },
                { model: models_1.User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.User, as: 'approver', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.Payment, as: 'payments' }
            ],
            order: [['dueDate', 'ASC']]
        });
        res.status(200).json({
            success: true,
            count: bills.length,
            data: bills
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllBills = getAllBills;
const getBillById = async (req, res, next) => {
    try {
        const bill = await models_1.Bill.findByPk(req.params.id, {
            include: [
                { model: models_1.Vendor, as: 'vendor' },
                { model: models_1.User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.User, as: 'approver', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.Payment, as: 'payments' }
            ]
        });
        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }
        res.status(200).json({
            success: true,
            data: bill
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getBillById = getBillById;
const createBill = async (req, res, next) => {
    try {
        const { vendorId, amount, invoiceNumber, dueDate } = req.body;
        const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
        const vendor = await models_1.Vendor.findByPk(vendorId);
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }
        const bill = await models_1.Bill.create({
            vendorId,
            amount,
            invoiceNumber,
            dueDate,
            fileUrl,
            createdById: req.user.id,
            status: 'Pending Approval'
        });
        // Reload with associations for the response
        const createdBill = await models_1.Bill.findByPk(bill.id, {
            include: [
                { model: models_1.Vendor, as: 'vendor' },
                { model: models_1.User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.Payment, as: 'payments' }
            ]
        });
        res.status(201).json({
            success: true,
            data: createdBill
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createBill = createBill;
const approveBill = async (req, res, next) => {
    try {
        const bill = await models_1.Bill.findByPk(req.params.id);
        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }
        const status = bill.get('status');
        if (status !== 'Pending Approval') {
            return res.status(400).json({
                success: false,
                message: `Bill status is "${status}", it cannot be approved.`
            });
        }
        await bill.update({
            status: 'Approved',
            approvedById: req.user.id
        });
        const updatedBill = await models_1.Bill.findByPk(bill.id, {
            include: [
                { model: models_1.Vendor, as: 'vendor' },
                { model: models_1.User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.User, as: 'approver', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.Payment, as: 'payments' }
            ]
        });
        res.status(200).json({
            success: true,
            message: 'Bill approved successfully',
            data: updatedBill
        });
    }
    catch (error) {
        next(error);
    }
};
exports.approveBill = approveBill;
const schedulePayment = async (req, res, next) => {
    const transaction = await models_1.sequelize.transaction();
    try {
        const { paymentMethod, scheduledDate } = req.body;
        const bill = await models_1.Bill.findByPk(req.params.id, { transaction });
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
        const payment = await models_1.Payment.create({
            billId: bill.id,
            paymentMethod: paymentMethod || 'ACH',
            amount: bill.amount,
            scheduledDate: scheduledDate || bill.dueDate,
            status: 'Scheduled'
        }, { transaction });
        await transaction.commit();
        // Reload with associations
        const scheduledBill = await models_1.Bill.findByPk(bill.id, {
            include: [
                { model: models_1.Vendor, as: 'vendor' },
                { model: models_1.User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.User, as: 'approver', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.Payment, as: 'payments' }
            ]
        });
        res.status(201).json({
            success: true,
            message: 'Payment scheduled successfully',
            data: { bill: scheduledBill, payment }
        });
    }
    catch (error) {
        await transaction.rollback();
        next(error);
    }
};
exports.schedulePayment = schedulePayment;
const executePayment = async (req, res, next) => {
    const { paymentMethod } = req.body;
    const transaction = await models_1.sequelize.transaction();
    try {
        const bill = await models_1.Bill.findByPk(req.params.id, {
            include: [{ model: models_1.Payment, as: 'payments' }],
            transaction
        });
        if (!bill) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }
        const allowedStatuses = ['Approved', 'Overdue'];
        const currentStatus = bill.get('status');
        if (!allowedStatuses.includes(currentStatus)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `Bill status is "${currentStatus}", it cannot be paid.`
            });
        }
        // Check existing payments
        const payments = bill.payments || [];
        const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null;
        let payment;
        const transactionRef = 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        if (lastPayment && lastPayment.status === 'Scheduled') {
            // Use existing scheduled payment
            payment = lastPayment;
            await payment.update({
                status: 'Paid',
                paidDate: new Date(),
                transactionReference: transactionRef
            }, { transaction });
        }
        else {
            // Create and pay in one step
            payment = await models_1.Payment.create({
                billId: bill.id,
                paymentMethod: paymentMethod || lastPayment?.paymentMethod || 'ACH',
                amount: bill.amount,
                scheduledDate: new Date().toISOString().split('T')[0],
                status: 'Paid',
                paidDate: new Date(),
                transactionReference: transactionRef
            }, { transaction });
        }
        await bill.update({ status: 'Paid' }, { transaction });
        await transaction.commit();
        // Reload with associations
        const paidBill = await models_1.Bill.findByPk(bill.id, {
            include: [
                { model: models_1.Vendor, as: 'vendor' },
                { model: models_1.User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.User, as: 'approver', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.Payment, as: 'payments' }
            ]
        });
        res.status(200).json({
            success: true,
            message: 'Payment executed successfully',
            data: { bill: paidBill, payment }
        });
    }
    catch (error) {
        await transaction.rollback();
        next(error);
    }
};
exports.executePayment = executePayment;
const rejectBill = async (req, res, next) => {
    try {
        const bill = await models_1.Bill.findByPk(req.params.id);
        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }
        if (bill.get('status') !== 'Pending Approval') {
            return res.status(400).json({
                success: false,
                message: `Bill status is "${bill.get('status')}", it cannot be rejected.`
            });
        }
        await bill.update({ status: 'Rejected' });
        const updatedBill = await models_1.Bill.findByPk(bill.id, {
            include: [
                { model: models_1.Vendor, as: 'vendor' },
                { model: models_1.User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.Payment, as: 'payments' }
            ]
        });
        res.status(200).json({ success: true, data: updatedBill });
    }
    catch (error) {
        next(error);
    }
};
exports.rejectBill = rejectBill;
const updateBill = async (req, res, next) => {
    try {
        const bill = await models_1.Bill.findByPk(req.params.id);
        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }
        const { vendorId, amount, invoiceNumber, dueDate } = req.body;
        const fileUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
        const updateData = {};
        if (vendorId !== undefined)
            updateData.vendorId = vendorId;
        if (amount !== undefined)
            updateData.amount = amount;
        if (invoiceNumber !== undefined)
            updateData.invoiceNumber = invoiceNumber;
        if (dueDate !== undefined)
            updateData.dueDate = dueDate;
        if (fileUrl !== undefined)
            updateData.fileUrl = fileUrl;
        if (bill.get('status') === 'Rejected') {
            updateData.status = 'Pending Approval';
        }
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }
        await bill.update(updateData);
        const updatedBill = await models_1.Bill.findByPk(bill.id, {
            include: [
                { model: models_1.Vendor, as: 'vendor' },
                { model: models_1.User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.Payment, as: 'payments' }
            ]
        });
        res.status(200).json({ success: true, data: updatedBill });
    }
    catch (error) {
        next(error);
    }
};
exports.updateBill = updateBill;
const deleteBill = async (req, res, next) => {
    try {
        const bill = await models_1.Bill.findByPk(req.params.id);
        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }
        const status = bill.get('status');
        if (status !== 'Draft' && status !== 'Rejected') {
            return res.status(400).json({
                success: false,
                message: `Bill status is "${status}", it cannot be deleted.`
            });
        }
        await bill.destroy();
        res.status(200).json({ success: true, message: 'Bill deleted successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteBill = deleteBill;
const reschedulePayment = async (req, res, next) => {
    try {
        const { paymentMethod, scheduledDate } = req.body;
        const bill = await models_1.Bill.findByPk(req.params.id, {
            include: [{ model: models_1.Payment, as: 'payments' }]
        });
        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }
        const existingPayment = bill.payments?.find((p) => p.status === 'Scheduled');
        if (!existingPayment) {
            return res.status(400).json({ success: false, message: 'No scheduled payment found to reschedule' });
        }
        if (scheduledDate)
            existingPayment.scheduledDate = scheduledDate;
        if (paymentMethod)
            existingPayment.paymentMethod = paymentMethod;
        await existingPayment.save();
        const updatedBill = await models_1.Bill.findByPk(bill.id, {
            include: [
                { model: models_1.Vendor, as: 'vendor' },
                { model: models_1.User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.User, as: 'approver', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.Payment, as: 'payments' }
            ]
        });
        res.json({ success: true, message: 'Payment rescheduled successfully', data: { bill: updatedBill } });
    }
    catch (error) {
        next(error);
    }
};
exports.reschedulePayment = reschedulePayment;
const cancelPayment = async (req, res, next) => {
    try {
        const bill = await models_1.Bill.findByPk(req.params.id, {
            include: [{ model: models_1.Payment, as: 'payments' }]
        });
        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }
        const scheduledPayment = bill.payments?.find((p) => p.status === 'Scheduled');
        if (!scheduledPayment) {
            return res.status(400).json({ success: false, message: 'No scheduled payment found to cancel' });
        }
        scheduledPayment.status = 'Cancelled';
        await scheduledPayment.save();
        const updatedBill = await models_1.Bill.findByPk(bill.id, {
            include: [
                { model: models_1.Vendor, as: 'vendor' },
                { model: models_1.User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.User, as: 'approver', attributes: ['id', 'fullName', 'email'] },
                { model: models_1.Payment, as: 'payments' }
            ]
        });
        res.json({ success: true, message: 'Payment cancelled successfully', data: { bill: updatedBill } });
    }
    catch (error) {
        next(error);
    }
};
exports.cancelPayment = cancelPayment;
