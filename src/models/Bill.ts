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
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Scheduled' | 'Paid';
  actions?: string[]; // VIRTUAL field
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
  declare status: 'Draft' | 'Pending Approval' | 'Approved' | 'Scheduled' | 'Paid';
  declare readonly actions: string[];
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
    type: DataTypes.ENUM('Draft', 'Pending Approval', 'Approved', 'Scheduled', 'Paid'),
    defaultValue: 'Draft',
    allowNull: false
  },
  actions: {
    type: DataTypes.VIRTUAL,
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
  sequelize,
  modelName: 'Bill'
});

export default Bill;
