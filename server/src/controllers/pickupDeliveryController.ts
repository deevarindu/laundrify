import type { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";

export const createPickupDeliveryRequest = async (
  req: Request,
  res: Response
) => {
  try {
    const { name, phone, address, type } = req.body;

    const request = await prisma.pickupDeliveryRequest.create({
      data: {
        name,
        phone,
        address,
        type,
      },
    });

    return res.status(201).json({
      message: "Pickup/delivery request submitted successfully.",
      data: request,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to create pickup/delivery request.",
    });
  }
};

export const getAllPickupDeliveryRequests = async (
  req: Request,
  res: Response
) => {
  try {
    const requests = await prisma.pickupDeliveryRequest.findMany({
      include: {
        processedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      message: "Pickup/delivery requests fetched successfully.",
      data: requests,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch pickup/delivery requests.",
    });
  }
};

export const getPickupDeliveryRequestById = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid pickup/delivery request ID.",
      });
    }

    const request = await prisma.pickupDeliveryRequest.findUnique({
      where: {
        id,
      },
      include: {
        processedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({
        message: "Pickup/delivery request not found.",
      });
    }

    return res.status(200).json({
      message: "Pickup/delivery request fetched successfully.",
      data: request,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch pickup/delivery request.",
    });
  }
};

export const updatePickupDeliveryRequestStatus = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid pickup/delivery request ID.",
      });
    }

    const { status } = req.body;

    const request = await prisma.pickupDeliveryRequest.findUnique({
      where: {
        id,
      },
    });

    if (!request) {
      return res.status(404).json({
        message: "Pickup/delivery request not found.",
      });
    }

    if (request.status !== "PENDING") {
      return res.status(409).json({
        message: "Only pending requests can be processed.",
      });
    }

    if (status === "REJECTED") {
      const updatedRequest =
        await prisma.pickupDeliveryRequest.update({
          where: {
            id,
          },
          data: {
            status: "REJECTED",
            processedAt: new Date(),
            processedById: req.user.userId,
          },
        });

      return res.status(200).json({
        message: "Pickup/delivery request rejected.",
        data: {
          request: updatedRequest,
        },
      });
    }

    if (status === "ACCEPTED") {
      const result = await prisma.$transaction(async (tx) => {
        let customer = await tx.customer.findUnique({
          where: {
            phone: request.phone,
          },
        });

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              name: request.name,
              phone: request.phone,
              address: request.address,
            },
          });
        }

        const updatedRequest =
          await tx.pickupDeliveryRequest.update({
            where: {
              id,
            },
            data: {
              status: "ACCEPTED",
              processedAt: new Date(),
              processedById: req.user!.userId,
            },
          });

        return {
          request: updatedRequest,
          customer,
        };
      });

      return res.status(200).json({
        message:
          "Pickup/delivery request accepted. Customer is ready for order creation.",
        data: result,
      });
    }

    return res.status(400).json({
      message: "Invalid request status.",
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return res.status(409).json({
          message: "A customer with this phone number already exists.",
        });
      }

      if (error.code === "P2025") {
        return res.status(404).json({
          message: "Pickup/delivery request not found.",
        });
      }
    }

    return res.status(500).json({
      message: "Failed to update pickup/delivery request.",
    });
  }
};