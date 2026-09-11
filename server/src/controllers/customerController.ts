import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";

export const getAllCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
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

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid customer ID.",
      });
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id,
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
    });

    return res.status(201).json({
      message: "New customer successfully registered.",
      data: newCustomer,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to add new customer.",
    });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid customer ID.",
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

    const updatedCustomer = await prisma.customer.update({
      where: {
        id,
      },
      data,
    });

    return res.status(200).json({
      message: "Customer updated successfully.",
      data: updatedCustomer,
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        message: "Customer not found.",
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

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid customer ID.",
      });
    }

    await prisma.customer.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      message: "Customer deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return res.status(409).json({
        message:
          "Customer cannot be deleted because they are still referenced by other data.",
      });
    }

    return res.status(500).json({
      message: "Failed to delete customer.",
    });
  }
};