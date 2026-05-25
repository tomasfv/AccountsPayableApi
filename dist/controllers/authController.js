"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = exports.getMe = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET || 'accounts_payable_secret_token_123456', {
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d')
    });
};
const register = async (req, res, next) => {
    try {
        const { email, password, fullName, role } = req.body;
        const existingUser = await models_1.User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }
        const user = await models_1.User.create({
            email,
            password,
            fullName,
            role
        });
        const userResponse = user.toJSON();
        delete userResponse.password; // Exclude password from response
        res.status(201).json({
            success: true,
            token: generateToken(user.id),
            data: userResponse
        });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide an email and password' });
        }
        const user = await models_1.User.unscoped().findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const userResponse = user.toJSON();
        delete userResponse.password;
        res.status(200).json({
            success: true,
            token: generateToken(user.id),
            data: userResponse
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const getMe = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            data: req.user
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
const getAllUsers = async (req, res, next) => {
    try {
        const users = await models_1.User.findAll({
            attributes: ['id', 'email', 'fullName', 'role', 'createdAt', 'updatedAt']
        });
        res.status(200).json({
            success: true,
            data: users
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllUsers = getAllUsers;
