import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";

export const getAllMemberships = async (req: Request, res: Response) => {
  try {
    const memberships = await prisma.membership.findMany({
      include: {
        customer: true,
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    return res.status(200).json({
      message: "Memberships fetched successfully.",
      data: memberships,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch memberships.",
    });
  }
};

export const getMembershipById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid membership ID.",
      });
    }

    const membership = await prisma.membership.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
      },
    });

    if (!membership) {
      return res.status(404).json({
        message: "Membership not found.",
      });
    }

    return res.status(200).json({
      message: "Membership fetched successfully.",
      data: membership,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch membership.",
    });
  }
};

export const createMembership = async (req: Request,res: Response) => {
  try {
    const { customerId, discountPercent } = req.body;

    const customerIdNumber = Number(customerId);

    if (
      !Number.isInteger(customerIdNumber) ||
      customerIdNumber <= 0
    ) {
      return res.status(400).json({
        message: "Invalid customer ID.",
      });
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerIdNumber,
      },
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    const existingMembership = await prisma.membership.findUnique({
      where: {
        customerId: customerIdNumber,
      },
    });

    if (existingMembership) {
      return res.status(409).json({
        message: "Customer already has a membership.",
      });
    }

    const data: {
      customerId: number;
      memberCode: string;
      discountPercent?: number;
    } = {
      customerId: customerIdNumber,
      memberCode: `MBR-${Date.now()}`,
    };

    if (discountPercent !== undefined) {
      const discountPercentNumber = Number(discountPercent);

      if (
        !Number.isFinite(discountPercentNumber) ||
        discountPercentNumber < 0 ||
        discountPercentNumber > 100
      ) {
        return res.status(400).json({
          message: "Discount percent must be between 0 and 100.",
        });
      }

      data.discountPercent = discountPercentNumber;
    }

    const membership = await prisma.membership.create({
      data,
      include: {
        customer: true,
      },
    });

    return res.status(201).json({
      message: "New membership successfully added.",
      data: membership,
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Membership already exists for this customer.",
      });
    }

    return res.status(500).json({
      message: "Failed to add new membership.",
    });
  }
};

export const updateMembership = async (req: Request,res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid membership ID.",
      });
    }

    const {customerId, discountPercent,isActive,} = req.body;

    const existingMembership = await prisma.membership.findUnique({
      where: {
        id,
      },
    });

    if (!existingMembership) {
      return res.status(404).json({
        message: "Membership not found.",
      });
    }

    const data: {
      customerId?: number;
      discountPercent?: number;
      isActive?: boolean;
    } = {};

    if (customerId !== undefined) {
      const newCustomerId = Number(customerId);

      if (
        !Number.isInteger(newCustomerId) ||
        newCustomerId <= 0
      ) {
        return res.status(400).json({
          message: "Invalid customer ID.",
        });
      }

      const customer = await prisma.customer.findUnique({
        where: {
          id: newCustomerId,
        },
      });

      if (!customer) {
        return res.status(404).json({
          message: "Customer not found.",
        });
      }

      const existingCustomerMembership =
        await prisma.membership.findUnique({
          where: {
            customerId: newCustomerId,
          },
        });

      if (
        existingCustomerMembership &&
        existingCustomerMembership.id !== id
      ) {
        return res.status(409).json({
          message: "Customer already has a membership.",
        });
      }

      data.customerId = newCustomerId;
    }

    if (discountPercent !== undefined) {
      const discountPercentNumber = Number(discountPercent);

      if (
        !Number.isFinite(discountPercentNumber) ||
        discountPercentNumber < 0 ||
        discountPercentNumber > 100
      ) {
        return res.status(400).json({
          message: "Discount percent must be between 0 and 100.",
        });
      }

      data.discountPercent = discountPercentNumber;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          message: "isActive must be a boolean.",
        });
      }

      data.isActive = isActive;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: "No fields to update.",
      });
    }

    const updatedMembership = await prisma.membership.update({
      where: {
        id,
      },
      data,
      include: {
        customer: true,
      },
    });

    return res.status(200).json({
      message: "Membership updated successfully.",
      data: updatedMembership,
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Customer already has a membership.",
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        message: "Membership not found.",
      });
    }

    return res.status(500).json({
      message: "Failed to update membership.",
    });
  }
};

export const deleteMembership = async (req: Request,res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid membership ID.",
      });
    }

    const existingMembership = await prisma.membership.findUnique({
      where: {
        id,
      },
    });

    if (!existingMembership) {
      return res.status(404).json({
        message: "Membership not found.",
      });
    }

    await prisma.membership.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      message: "Membership deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        message: "Membership not found.",
      });
    }

    return res.status(500).json({
      message: "Failed to delete membership.",
    });
  }
};