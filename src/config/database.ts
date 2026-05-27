import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

let sequelize: Sequelize;

if (process.env.DATABASE_URL) {
  // Railway / producción — usa la connection string directamente
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Railway requiere SSL
      },
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: false,
    },
  });
} else {
  // Desarrollo local — variables individuales
  sequelize = new Sequelize(
    process.env.DB_NAME || "accountspayable",
    process.env.DB_USER || "postgres",
    process.env.DB_PASSWORD || "postgres",
    {
      host: process.env.DB_HOST || "127.0.0.1",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      dialect: "postgres",
      logging: process.env.NODE_ENV === "development" ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        timestamps: true,
        underscored: false,
      },
    },
  );
}

export default sequelize;
