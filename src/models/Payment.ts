import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface PaymentAttributes {
  id: string;
  billId: string;
  paymentMethod: 'ACH' | 'Paper Check' | 'Card';
  amount: number;
  scheduledDate: string;
  paidDate?: Date | null;
  status: 'Not Scheduled' | 'Scheduled' | 'Processing' | 'Paid' | 'Failed' | 'Cancelled' | 'Refunded';
  transactionReference?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentCreationAttributes extends Optional<PaymentAttributes, 'id' | 'paymentMethod' | 'paidDate' | 'status' | 'transactionReference'> {}

class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> implements PaymentAttributes {
  declare id: string;
  declare billId: string;
  declare paymentMethod: 'ACH' | 'Paper Check' | 'Card';
  declare amount: number;
  declare scheduledDate: string;
  declare paidDate: Date | null;
  declare status: 'Not Scheduled' | 'Scheduled' | 'Processing' | 'Paid' | 'Failed' | 'Cancelled' | 'Refunded';
  declare transactionReference: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Payment.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  billId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.ENUM('ACH', 'Paper Check', 'Card'),
    allowNull: false,
    defaultValue: 'ACH'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.00
    },
    get() {
      const val = this.getDataValue('amount');
      return val ? parseFloat(val as any) : 0.00;
    }
  },
  scheduledDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  paidDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Not Scheduled', 'Scheduled', 'Processing', 'Paid', 'Failed', 'Cancelled', 'Refunded'),
    defaultValue: 'Not Scheduled',
    allowNull: false
  },
  transactionReference: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Payment'
});

export default Payment;
