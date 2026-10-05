import type { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";

export const getAllMemberships = async (req: Request, res: Response) => {
  try {
    const { q, isActive } = res.locals.validatedQuery as {
      q?: string;
      isActive?: boolean;
    };

    const memberships = await prisma.membership.findMany({
      where: {
        ...(q
          ? {
              OR: [
                {
                  memberCode: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  customer: {
                    name: {
                      contains: q,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  customer: {
                    phone: {
                      contains: q,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            }
          : {}),
        ...(isActive !== undefined
          ? {
              isActive,
            }
          : {}),
      },
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

export const createMembership = async (req: Request, res: Response) => {
  try {
    const { customerId, discountPercent } = req.body;

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        isActive: true,
      },
    });

    if (!customer) {
      return res.status(404).json({
        message: "Active customer not found.",
      });
    }

    const existingMembership = await prisma.membership.findUnique({
      where: {
        customerId,
      },
    });

    if (existingMembership) {
      return res.status(409).json({
        message: "Customer already has a membership.",
      });
    }

    const membership = await prisma.membership.create({
      data: {
        customerId,
        memberCode: `MBR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ...(discountPercent !== undefined
          ? {
              discountPercent,
            }
          : {}),
      },
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
        message: "Membership already exists.",
      });
    }

    return res.status(500).json({
      message: "Failed to add new membership.",
    });
  }
};

export const updateMembership = async (req: Request, res: Response) => {
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

    const {
      customerId,
      discountPercent,
      isActive,
    } = req.body;

    if (
      customerId === undefined &&
      discountPercent === undefined &&
      isActive === undefined
    ) {
      return res.status(400).json({
        message: "No fields to update.",
      });
    }

    if (customerId !== undefined) {
      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          isActive: true,
        },
      });

      if (!customer) {
        return res.status(404).json({
          message: "Active customer not found.",
        });
      }

      const existingCustomerMembership =
        await prisma.membership.findUnique({
          where: {
            customerId,
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
    }

    const updatedMembership = await prisma.membership.update({
      where: {
        id,
      },
      data: {
        ...(customerId !== undefined
          ? {
              customer: {
                connect: {
                  id: customerId,
                },
              },
            }
          : {}),
        ...(discountPercent !== undefined
          ? {
              discountPercent,
            }
          : {}),
        ...(isActive !== undefined
          ? {
              isActive,
            }
          : {}),
      },
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

export const deleteMembership = async (req: Request, res: Response) => {
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

    await prisma.membership.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });

    return res.status(200).json({
      message: "Membership deactivated successfully.",
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
      message: "Failed to deactivate membership.",
    });
  }
};