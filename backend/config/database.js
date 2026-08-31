require("dotenv").config();
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME || "sigap_linmas",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: false, // set ke console.log kalau mau lihat query SQL saat debug
    define: {
      // Nama tabel & kolom mengikuti skema SQL (snake_case), bukan default camelCase Sequelize
      underscored: true,
      freezeTableName: true,
    },
  }
);

module.exports = sequelize;
