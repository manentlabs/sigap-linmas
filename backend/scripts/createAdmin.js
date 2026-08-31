// backend/scripts/createAdmin.js
// Jalankan dengan: node scripts/createAdmin.js "Nama Admin" admin@girimulya.go.id "passwordRahasia"
// Berguna karena seed SQL sebelumnya memakai password_hash placeholder yang belum valid.
require("dotenv").config();
const bcrypt = require("bcrypt");
const sequelize = require("../config/database");
const User = require("../models/User");

async function main() {
  const [, , nama, email, password] = process.argv;

  if (!nama || !email || !password) {
    console.log('Cara pakai: node scripts/createAdmin.js "Nama Admin" email@contoh.com passwordRahasia');
    process.exit(1);
  }

  await sequelize.authenticate();

  const password_hash = await bcrypt.hash(password, 10);

  const [user, created] = await User.findOrCreate({
    where: { email },
    defaults: { nama, password_hash, role: "admin", is_active: true },
  });

  if (!created) {
    user.password_hash = password_hash;
    user.nama = nama;
    user.role = "admin";
    user.is_active = true;
    await user.save();
    console.log(`Akun admin "${email}" sudah ada — password & data berhasil diperbarui.`);
  } else {
    console.log(`Akun admin "${email}" berhasil dibuat.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal membuat akun admin:", err);
  process.exit(1);
});
