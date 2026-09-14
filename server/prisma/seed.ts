import bcrypt from "bcrypt";
import prisma from "../src/lib/prisma.js";

const main = async () => {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: {
      email: "admin@laundrify.com",
    },
    update: {},
    create: {
      name: "Admin Laundrify",
      email: "admin@laundrify.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Admin user created successfully.");
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });