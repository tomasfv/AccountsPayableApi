"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const sequelize_1 = require("sequelize");
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    if (err instanceof sequelize_1.ValidationError) {
        statusCode = 400;
        message = err.errors.map((e) => e.message).join(', ');
    }
    else if (err instanceof sequelize_1.BaseError) {
        statusCode = 400;
    }
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
};
exports.errorHandler = errorHandler;
exports.default = exports.errorHandler;
