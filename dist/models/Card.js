"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Card extends sequelize_1.Model {
}
Card.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    createdById: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('Debit', 'Credit'),
        allowNull: false
    },
    cardholderName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    lastFourDigits: {
        type: sequelize_1.DataTypes.STRING(4),
        allowNull: false
    },
    expiryMonth: {
        type: sequelize_1.DataTypes.STRING(2),
        allowNull: false
    },
    expiryYear: {
        type: sequelize_1.DataTypes.STRING(2),
        allowNull: false
    },
    cvv: {
        type: sequelize_1.DataTypes.STRING(4),
        allowNull: false
    }
}, {
    sequelize: database_1.default,
    modelName: 'Card',
    indexes: [
        { unique: true, fields: ['createdById', 'type'] }
    ]
});
exports.default = Card;
