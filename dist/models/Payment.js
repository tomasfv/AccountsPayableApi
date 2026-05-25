"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Payment extends sequelize_1.Model {
}
Payment.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    billId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false
    },
    paymentMethod: {
        type: sequelize_1.DataTypes.ENUM('ACH', 'Paper Check', 'Card'),
        allowNull: false,
        defaultValue: 'ACH'
    },
    amount: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0.00
        },
        get() {
            const val = this.getDataValue('amount');
            return val ? parseFloat(val) : 0.00;
        }
    },
    scheduledDate: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false
    },
    paidDate: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('Scheduled', 'Processing', 'Completed', 'Failed'),
        defaultValue: 'Scheduled',
        allowNull: false
    },
    transactionReference: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    }
}, {
    sequelize: database_1.default,
    modelName: 'Payment'
});
exports.default = Payment;
