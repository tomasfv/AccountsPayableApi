"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executePayment = exports.schedulePayment = exports.approveBill = exports.createBill = exports.getBillById = exports.getAllBills = void 0;
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
        const vendor = await models_1.Vendor.findByPk(vendorId);
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }
        const bill = await models_1.Bill.create({
            vendorId,
            amount,
            invoiceNumber,
            dueDate,
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
        // Update bill status to Scheduled
        await bill.update({ status: 'Scheduled' }, { transaction });
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
    const transaction = await models_1.sequelize.transaction();
    try {
        const bill = await models_1.Bill.findByPk(req.params.id, {
            include: [{ model: models_1.Payment, as: 'payments', where: { status: 'Scheduled' }, limit: 1 }],
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
