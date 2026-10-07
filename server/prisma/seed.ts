import bcrypt from "bcrypt";
import prisma from "../src/lib/prisma.js";

const main = async () => {
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const staffPasswordHash = await bcrypt.hash("staff123", 10);

  const admin = await prisma.user.upsert({
    where: {
      email: "admin@laundrify.com",
    },
    update: {
      name: "Admin Laundrify",
      role: "ADMIN",
      isActive: true,
    },
    create: {
      name: "Admin Laundrify",
      email: "admin@laundrify.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const staff = await prisma.user.upsert({
    where: {
      email: "staff@laundrify.com",
    },
    update: {
      name: "Staff Laundrify",
      role: "STAFF",
      isActive: true,
    },
    create: {
      name: "Staff Laundrify",
      email: "staff@laundrify.com",
      passwordHash: staffPasswordHash,
      role: "STAFF",
    },
  });

  const customer1 = await prisma.customer.upsert({
    where: {
      phone: "081234567890",
    },
    update: {
      name: "Budi Santoso",
      address: "Jl. Melati No. 10, Jakarta",
      isActive: true,
    },
    create: {
      name: "Budi Santoso",
      phone: "081234567890",
      address: "Jl. Melati No. 10, Jakarta",
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: {
      phone: "081298765432",
    },
    update: {
      name: "Siti Aminah",
      address: "Jl. Mawar No. 20, Jakarta",
      isActive: true,
    },
    create: {
      name: "Siti Aminah",
      phone: "081298765432",
      address: "Jl. Mawar No. 20, Jakarta",
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: {
      phone: "082112223333",
    },
    update: {
      name: "Andi Pratama",
      address: "Jl. Kenanga No. 5, Jakarta",
      isActive: true,
    },
    create: {
      name: "Andi Pratama",
      phone: "082112223333",
      address: "Jl. Kenanga No. 5, Jakarta",
    },
  });

  await prisma.membership.upsert({
    where: {
      customerId: customer1.id,
    },
    update: {
      memberCode: "MBR-DEMO-001",
      discountPercent: 10,
      isActive: true,
    },
    create: {
      customerId: customer1.id,
      memberCode: "MBR-DEMO-001",
      discountPercent: 10,
      isActive: true,
    },
  });

  await prisma.membership.upsert({
    where: {
      customerId: customer2.id,
    },
    update: {
      memberCode: "MBR-DEMO-002",
      discountPercent: 10,
      isActive: true,
    },
    create: {
      customerId: customer2.id,
      memberCode: "MBR-DEMO-002",
      discountPercent: 10,
      isActive: true,
    },
  });

  const serviceCuciKering = await prisma.service.upsert({
    where: {
      id: 1,
    },
    update: {
      name: "Cuci Kering",
      category: "REGULER",
      unit: "KG",
      price: 7000,
      isActive: true,
    },
    create: {
      name: "Cuci Kering",
      category: "REGULER",
      unit: "KG",
      price: 7000,
      isActive: true,
    },
  });

  const serviceCuciSetrika = await prisma.service.upsert({
    where: {
      id: 2,
    },
    update: {
      name: "Cuci Setrika",
      category: "REGULER",
      unit: "KG",
      price: 10000,
      isActive: true,
    },
    create: {
      name: "Cuci Setrika",
      category: "REGULER",
      unit: "KG",
      price: 10000,
      isActive: true,
    },
  });

  const serviceExpress = await prisma.service.upsert({
    where: {
      id: 3,
    },
    update: {
      name: "Cuci Setrika Express",
      category: "EKSPRESS",
      unit: "KG",
      price: 15000,
      isActive: true,
    },
    create: {
      name: "Cuci Setrika Express",
      category: "EKSPRESS",
      unit: "KG",
      price: 15000,
      isActive: true,
    },
  });

  const serviceSepatu = await prisma.service.upsert({
    where: {
      id: 4,
    },
    update: {
      name: "Cuci Sepatu",
      category: "KHUSUS",
      unit: "SATUAN",
      price: 25000,
      isActive: true,
    },
    create: {
      name: "Cuci Sepatu",
      category: "KHUSUS",
      unit: "SATUAN",
      price: 25000,
      isActive: true,
    },
  });

  const existingOrder1 = await prisma.order.findUnique({
    where: {
      orderCode: "ORD-DEMO-001",
    },
  });

  if (!existingOrder1) {
    const subtotal = 50000;
    const discount = 5000;
    const total = 45000;

    await prisma.order.create({
      data: {
        orderCode: "ORD-DEMO-001",
        customerId: customer1.id,
        createdById: admin.id,
        orderStatus: "PESANAN_DITERIMA",
        paymentStatus: "BELUM_DIBAYAR",
        subtotal,
        discount,
        total,
        dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        orderItems: {
          create: [
            {
              serviceId: serviceCuciSetrika.id,
              quantity: 5,
              priceSnapshot: serviceCuciSetrika.price,
              subtotal: 50000,
            },
          ],
        },
        orderStatusHistories: {
          create: {
            orderStatus: "PESANAN_DITERIMA",
            changedById: admin.id,
            note: "Demo order created by seed.",
          },
        },
      },
    });
  }

  const existingOrder2 = await prisma.order.findUnique({
    where: {
      orderCode: "ORD-DEMO-002",
    },
  });

  if (!existingOrder2) {
    const subtotal = 60000;

    await prisma.order.create({
      data: {
        orderCode: "ORD-DEMO-002",
        customerId: customer2.id,
        createdById: staff.id,
        orderStatus: "SIAP_DIAMBIL",
        paymentStatus: "BELUM_DIBAYAR",
        subtotal,
        discount: 0,
        total: subtotal,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        orderItems: {
          create: [
            {
              serviceId: serviceExpress.id,
              quantity: 4,
              priceSnapshot: serviceExpress.price,
              subtotal: 60000,
            },
          ],
        },
        orderStatusHistories: {
          create: {
            orderStatus: "SIAP_DIAMBIL",
            changedById: staff.id,
            note: "Demo order created by seed.",
          },
        },
      },
    });
  }

  const existingOrder3 = await prisma.order.findUnique({
    where: {
      orderCode: "ORD-DEMO-003",
    },
  });

  if (!existingOrder3) {
    const subtotal = 50000;

    await prisma.order.create({
      data: {
        orderCode: "ORD-DEMO-003",
        customerId: customer3.id,
        createdById: staff.id,
        orderStatus: "DICUCI",
        paymentStatus: "BELUM_DIBAYAR",
        subtotal,
        discount: 0,
        total: subtotal,
        dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        orderItems: {
          create: [
            {
              serviceId: serviceSepatu.id,
              quantity: 2,
              priceSnapshot: serviceSepatu.price,
              subtotal: 50000,
            },
          ],
        },
        orderStatusHistories: {
          create: {
            orderStatus: "DICUCI",
            changedById: staff.id,
            note: "Demo order created by seed.",
          },
        },
      },
    });
  }

  console.log("Seed completed successfully.");
  console.log("");
  console.log("Admin:");
  console.log("  email: admin@laundrify.com");
  console.log("  password: admin123");
  console.log("");
  console.log("Staff:");
  console.log("  email: staff@laundrify.com");
  console.log("  password: staff123");
  console.log("");
  console.log("Demo orders:");
  console.log("  ORD-DEMO-001 -> Rp45.000 -> BELUM_DIBAYAR");
  console.log("  ORD-DEMO-002 -> Rp60.000 -> BELUM_DIBAYAR");
  console.log("  ORD-DEMO-003 -> Rp50.000 -> BELUM_DIBAYAR");
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });