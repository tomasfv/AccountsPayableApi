"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVendor = exports.createVendor = exports.getVendorById = exports.getAllVendors = void 0;
const models_1 = require("../models");
const getAllVendors = async (req, res, next) => {
    try {
        const vendors = await models_1.Vendor.findAll({
            order: [['name', 'ASC']]
        });
        res.status(200).json({
            success: true,
            count: vendors.length,
            data: vendors
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllVendors = getAllVendors;
const getVendorById = async (req, res, next) => {
    try {
        const vendor = await models_1.Vendor.findByPk(req.params.id);
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }
        res.status(200).json({
            success: true,
            data: vendor
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getVendorById = getVendorById;
const createVendor = async (req, res, next) => {
    try {
        const vendor = await models_1.Vendor.create(req.body);
        res.status(201).json({
            success: true,
            data: vendor
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createVendor = createVendor;
const updateVendor = async (req, res, next) => {
    try {
        const vendor = await models_1.Vendor.findByPk(req.params.id);
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }
        await vendor.update(req.body);
        res.status(200).json({
            success: true,
            data: vendor
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateVendor = updateVendor;
