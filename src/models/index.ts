import sequelize from '../config/database';
import User from './User';
import Vendor from './Vendor';
import Bill from './Bill';
import Payment from './Payment';

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

export {
  sequelize,
  User,
  Vendor,
  Bill,
  Payment
};
