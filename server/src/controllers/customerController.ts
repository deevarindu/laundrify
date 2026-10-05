import type { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";

export const getAllCustomers = async (req: Request, res: Response) => {
  try {
    const { q } = res.locals.validatedQuery as {
      q?: string;
    };

    const customers = await prisma.customer.findMany({
      where: {
        isActive: true,
        ...(q
          ? {
              OR: [
                {
                  name: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  phone: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        membership: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      message: "Customers fetched successfully.",
      data: customers,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch customers.",
    });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid customer ID.",
      });
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        isActive: true,
      },
      include: {
        membership: true,
      },
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    return res.status(200).json({
      message: "Customer fetched successfully.",
      data: customer,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch customer.",
    });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const { name, phone, address } = req.body;

    const newCustomer = await prisma.customer.create({
      data: {
        name,
        phone,
        address,
      },
      include: {
        membership: true,
      },
    });

    return res.status(201).json({
      message: "New customer successfully registered.",
      data: newCustomer,
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Phone number already exists.",
      });
    }

    return res.status(500).json({
      message: "Failed to add new customer.",
    });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid customer ID.",
      });
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

    if (!existingCustomer) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    const { name, phone, address } = req.body;

    const data: {
      name?: string;
      phone?: string;
      address?: string | null;
    } = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (phone !== undefined) {
      data.phone = phone;
    }

    if (address !== undefined) {
      data.address = address;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: "No fields to update.",
      });
    }

    const updatedCustomer = await prisma.customer.update({
      where: {
        id,
      },
      data,
      include: {
        membership: true,
      },
    });

    return res.status(200).json({
      message: "Customer updated successfully.",
      data: updatedCustomer,
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Phone number already exists.",
      });
    }

    return res.status(500).json({
      message: "Failed to update customer.",
    });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid customer ID.",
      });
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

    if (!existingCustomer) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    const activeOrders = await prisma.order.count({
      where: {
        customerId: id,
        orderStatus: {
          notIn: ["SELESAI", "DIBATALKAN"],
        },
      },
    });

    if (activeOrders > 0) {
      return res.status(409).json({
        message: "Customer cannot be deleted because they have active orders.",
      });
    }

    await prisma.customer.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });

    return res.status(200).json({
      message: "Customer deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to delete customer.",
    });
  }
};