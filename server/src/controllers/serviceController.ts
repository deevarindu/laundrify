import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";

export const getAllServices = async (req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      message: "Services fetched successfully.",
      data: services,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch services.",
    });
  }
};

export const getServiceById = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid service ID.",
      });
    }

    const service = await prisma.service.findUnique({
      where: {
        id,
      },
    });

    if (!service) {
      return res.status(404).json({
        message: "Service not found.",
      });
    }

    return res.status(200).json({
      message: "Service fetched successfully.",
      data: service,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch service.",
    });
  }
};

export const createService = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      name,
      category,
      unit,
      price,
      isActive,
    } = req.body;

    const newService = await prisma.service.create({
      data: {
        name,
        category,
        unit,
        price: Number(price),
        ...(isActive !== undefined && {
          isActive,
        }),
      },
    });

    return res.status(201).json({
      message: "New service successfully added.",
      data: newService,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to add new service.",
    });
  }
};

export const updateService = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid service ID.",
      });
    }

    const {
      name,
      category,
      unit,
      price,
      isActive,
    } = req.body;

    const data: {
      name?: string;
      category?: "REGULER" | "EKSPRESS" | "KHUSUS";
      unit?: "KG" | "SATUAN";
      price?: number;
      isActive?: boolean;
    } = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (category !== undefined) {
      data.category = category;
    }

    if (unit !== undefined) {
      data.unit = unit;
    }

    if (price !== undefined) {
      data.price = Number(price);
    }

    if (isActive !== undefined) {
      data.isActive = isActive;
    }

    const updatedService = await prisma.service.update({
      where: {
        id,
      },
      data,
    });

    return res.status(200).json({
      message: "Service updated successfully.",
      data: updatedService,
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        message: "Service not found.",
      });
    }

    return res.status(500).json({
      message: "Failed to update service.",
    });
  }
};

export const deleteService = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid service ID.",
      });
    }

    await prisma.service.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      message: "Service deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        message: "Service not found.",
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return res.status(409).json({
        message:
          "Service cannot be deleted because it is already used in an order.",
      });
    }

    return res.status(500).json({
      message: "Failed to delete service.",
    });
  }
};