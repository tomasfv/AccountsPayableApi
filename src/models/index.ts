import sequelize from '../config/database';
import User from './User';
import Vendor from './Vendor';
import Bill from './Bill';
import Payment from './Payment';
import Card from './Card';

// Associations

// Bill <-> Vendor
Vendor.hasMany(Bill, { foreignKey: 'vendorId', as: 'bills' });
Bill.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });

// Bill <-> User (Creator)
User.hasMany(Bill, { foreignKey: 'createdById', as: 'createdBills' });
Bill.belongsTo(User, { foreignKey: 'createdById', as: 'creator' });

// Bill <-> User (Approver)
User.hasMany(Bill, { foreignKey: 'approvedById', as: 'approvedBills' });
Bill.belongsTo(User, { foreignKey: 'approvedById', as: 'approver' });

// Bill <-> Payment
Bill.hasMany(Payment, { foreignKey: 'billId', as: 'payments' });
Payment.belongsTo(Bill, { foreignKey: 'billId', as: 'bill' });

// User <-> Card
User.hasMany(Card, { foreignKey: 'createdById', as: 'cards' });
Card.belongsTo(User, { foreignKey: 'createdById', as: 'creator' });

export {
  sequelize,
  User,
  Vendor,
  Bill,
  Payment,
  Card
};
