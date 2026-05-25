"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Bill extends sequelize_1.Model {
}
Bill.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    vendorId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false
    },
    createdById: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false
    },
    approvedById: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true
    },
    amount: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
            min: 0.00
        },
        get() {
            const val = this.getDataValue('amount');
            return val ? parseFloat(val) : 0.00;
        }
    },
    invoiceNumber: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    dueDate: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('Draft', 'Pending Approval', 'Approved', 'Scheduled', 'Paid'),
        defaultValue: 'Draft',
        allowNull: false
    },
    actions: {
        type: sequelize_1.DataTypes.VIRTUAL,
        get() {
            const status = this.getDataValue('status');
            switch (status) {
                case 'Draft':
                    return ['SUBMIT', 'EDIT', 'DELETE'];
                case 'Pending Approval':
                    return ['APPROVE', 'REJECT', 'EDIT'];
                case 'Approved':
                    return ['SCHEDULE'];
                case 'Scheduled':
                    return ['PAY', 'CANCEL_SCHEDULE'];
                case 'Paid':
                    return ['VIEW_RECEIPT'];
                default:
                    return [];
            }
        }
    }
}, {
    sequelize: database_1.default,
    modelName: 'Bill'
});
exports.default = Bill;
