import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface CardAttributes {
  id: string;
  createdById: string;
  type: 'Debit' | 'Credit';
  cardholderName: string;
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CardCreationAttributes extends Optional<CardAttributes, 'id'> {}

class Card extends Model<CardAttributes, CardCreationAttributes> implements CardAttributes {
  declare id: string;
  declare createdById: string;
  declare type: 'Debit' | 'Credit';
  declare cardholderName: string;
  declare lastFourDigits: string;
  declare expiryMonth: string;
  declare expiryYear: string;
  declare cvv: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Card.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('Debit', 'Credit'),
    allowNull: false
  },
  cardholderName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastFourDigits: {
    type: DataTypes.STRING(4),
    allowNull: false
  },
  expiryMonth: {
    type: DataTypes.STRING(2),
    allowNull: false
  },
  expiryYear: {
    type: DataTypes.STRING(2),
    allowNull: false
  },
  cvv: {
    type: DataTypes.STRING(4),
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'Card',
  indexes: [
    { unique: true, fields: ['createdById', 'type'] }
  ]
});

export default Card;
