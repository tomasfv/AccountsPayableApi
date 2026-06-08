"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCard = exports.updateCard = exports.createCard = exports.getCards = void 0;
const Card_1 = __importDefault(require("../models/Card"));
const getCards = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cards = await Card_1.default.findAll({ where: { createdById: userId } });
        res.json({ success: true, data: cards });
    }
    catch (error) {
        next(error);
    }
};
exports.getCards = getCards;
const createCard = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { type, cardholderName, cardNumber, expiryMonth, expiryYear, cvv } = req.body;
        if (!type || !cardholderName || !cardNumber || !expiryMonth || !expiryYear || !cvv) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        if (type !== 'Debit' && type !== 'Credit') {
            return res.status(400).json({ success: false, message: 'Card type must be Debit or Credit' });
        }
        const existing = await Card_1.default.findOne({ where: { createdById: userId, type } });
        if (existing) {
            return res.status(400).json({ success: false, message: `You already have a ${type} card` });
        }
        const lastFourDigits = cardNumber.slice(-4);
        if (lastFourDigits.length !== 4 || isNaN(Number(lastFourDigits))) {
            return res.status(400).json({ success: false, message: 'Invalid card number' });
        }
        const card = await Card_1.default.create({
            createdById: userId,
            type,
            cardholderName,
            lastFourDigits,
            expiryMonth,
            expiryYear,
            cvv
        });
        res.status(201).json({ success: true, data: card });
    }
    catch (error) {
        next(error);
    }
};
exports.createCard = createCard;
const updateCard = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const card = await Card_1.default.findByPk(req.params.id);
        if (!card) {
            return res.status(404).json({ success: false, message: 'Card not found' });
        }
        if (card.createdById !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const { cardholderName, cardNumber, expiryMonth, expiryYear, cvv } = req.body;
        if (cardholderName !== undefined)
            card.cardholderName = cardholderName;
        if (expiryMonth !== undefined)
            card.expiryMonth = expiryMonth;
        if (expiryYear !== undefined)
            card.expiryYear = expiryYear;
        if (cvv !== undefined)
            card.cvv = cvv;
        if (cardNumber !== undefined) {
            const lastFourDigits = cardNumber.slice(-4);
            if (lastFourDigits.length !== 4 || isNaN(Number(lastFourDigits))) {
                return res.status(400).json({ success: false, message: 'Invalid card number' });
            }
            card.lastFourDigits = lastFourDigits;
        }
        await card.save();
        res.json({ success: true, data: card });
    }
    catch (error) {
        next(error);
    }
};
exports.updateCard = updateCard;
const deleteCard = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const card = await Card_1.default.findByPk(req.params.id);
        if (!card) {
            return res.status(404).json({ success: false, message: 'Card not found' });
        }
        if (card.createdById !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        await card.destroy();
        res.json({ success: true, message: 'Card deleted successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCard = deleteCard;
