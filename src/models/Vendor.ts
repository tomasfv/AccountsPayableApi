import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface VendorAttributes {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  bankName?: string | null;
  bankRoutingNumber?: string | null;
  bankAccountNumber?: string | null;
  status: 'Active' | 'Inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VendorCreationAttributes extends Optional<VendorAttributes, 'id' | 'phone' | 'bankName' | 'bankRoutingNumber' | 'bankAccountNumber' | 'status'> {}

class Vendor extends Model<VendorAttributes, VendorCreationAttributes> implements VendorAttributes {
  declare id: string;
  declare name: string;
  declare email: string;
  declare phone: string | null;
  declare bankName: string | null;
  declare bankRoutingNumber: string | null;
  declare bankAccountNumber: string | null;
  declare status: 'Active' | 'Inactive';
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Vendor.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bankRoutingNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bankAccountNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active',
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'Vendor'
});

export default Vendor;
