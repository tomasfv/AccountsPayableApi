"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Vendor extends sequelize_1.Model {
}
Vendor.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    bankName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    bankRoutingNumber: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    bankAccountNumber: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('Active', 'Inactive'),
        defaultValue: 'Active',
        allowNull: false
    }
}, {
    sequelize: database_1.default,
    modelName: 'Vendor'
});
exports.default = Vendor;
