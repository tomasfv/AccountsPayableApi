"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Card = exports.Payment = exports.Bill = exports.Vendor = exports.User = exports.sequelize = void 0;
const database_1 = __importDefault(require("../config/database"));
exports.sequelize = database_1.default;
const User_1 = __importDefault(require("./User"));
exports.User = User_1.default;
const Vendor_1 = __importDefault(require("./Vendor"));
exports.Vendor = Vendor_1.default;
const Bill_1 = __importDefault(require("./Bill"));
exports.Bill = Bill_1.default;
const Payment_1 = __importDefault(require("./Payment"));
exports.Payment = Payment_1.default;
const Card_1 = __importDefault(require("./Card"));
exports.Card = Card_1.default;
// Associations
// Bill <-> Vendor
Vendor_1.default.hasMany(Bill_1.default, { foreignKey: 'vendorId', as: 'bills' });
Bill_1.default.belongsTo(Vendor_1.default, { foreignKey: 'vendorId', as: 'vendor' });
// Bill <-> User (Creator)
User_1.default.hasMany(Bill_1.default, { foreignKey: 'createdById', as: 'createdBills' });
Bill_1.default.belongsTo(User_1.default, { foreignKey: 'createdById', as: 'creator' });
// Bill <-> User (Approver)
User_1.default.hasMany(Bill_1.default, { foreignKey: 'approvedById', as: 'approvedBills' });
Bill_1.default.belongsTo(User_1.default, { foreignKey: 'approvedById', as: 'approver' });
// Bill <-> Payment
Bill_1.default.hasMany(Payment_1.default, { foreignKey: 'billId', as: 'payments' });
Payment_1.default.belongsTo(Bill_1.default, { foreignKey: 'billId', as: 'bill' });
// User <-> Card
User_1.default.hasMany(Card_1.default, { foreignKey: 'createdById', as: 'cards' });
Card_1.default.belongsTo(User_1.default, { foreignKey: 'createdById', as: 'creator' });
