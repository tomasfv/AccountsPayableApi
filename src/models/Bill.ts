import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface BillAttributes {
  id: string;
  vendorId: string;
  createdById: string;
  approvedById?: string | null;
  amount: number;
  invoiceNumber?: string | null;
  dueDate: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Overdue' | 'Rejected' | 'Cancelled' | 'Paid';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BillCreationAttributes extends Optional<BillAttributes, 'id' | 'approvedById' | 'invoiceNumber' | 'status'> {}

class Bill extends Model<BillAttributes, BillCreationAttributes> implements BillAttributes {
  declare id: string;
  declare vendorId: string;
  declare createdById: string;
  declare approvedById: string | null;
  declare amount: number;
  declare invoiceNumber: string | null;
  declare dueDate: string;
  declare status: 'Draft' | 'Pending Approval' | 'Approved' | 'Overdue' | 'Rejected' | 'Cancelled' | 'Paid';
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare readonly payments?: any[];
}

Bill.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  vendorId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: false
  },
  approvedById: {
    type: DataTypes.UUID,
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0.00
    },
    get() {
      const val = this.getDataValue('amount');
      return val ? parseFloat(val as any) : 0.00;
    }
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Pending Approval', 'Approved', 'Overdue', 'Rejected', 'Cancelled', 'Paid'),
    defaultValue: 'Draft',
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'Bill'
});

export default Bill;
