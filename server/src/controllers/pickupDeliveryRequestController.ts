import type { Request, Response } from "express";
import type { Prisma, PickupDeliveryRequest } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";

export const getAllPickupDeliveryRequests = async (req: Request, res: Response) => {
  try {
    const pickupDeliveryRequests = await prisma.pickupDeliveryRequest.findMany();

    return res.status(200).json({
      message: "Pickup delivery requests fetched successfully",
      data: pickupDeliveryRequests
    })
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch pickup delivery requests.",
      error: error
    })
  }
}

export const getPickupDeliveryRequestById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id<=0) {
      return res.status(404).json({
        message: "Invalid pickup delivery request."
      })
    }

    const pickupDeliveryRequest = await prisma.pickupDeliveryRequest.findUnique({
      where: {
        id,
      },
      include: {
        processedBy: true
      }
    })

    if (!pickupDeliveryRequest) {
      return res.status(404).json({
        message: "Pickup delivery request not found."
      })
    }

    return res.status(200).json({
      message: "Pickup delivery request fetched successfully.",
      data: pickupDeliveryRequest
    })
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Failed to fetch pickup delivery request.",
      error: error
    })
  }
}

export const createPickupDeliveryRequest = async (req: Request, res: Response) => {
  try {
    const {name, phone, address, type} = req.body;

    const pickupDeliveryRequest = await prisma.pickupDeliveryRequest.create({
      data: {
        name,
        phone,
        address,
        type,
      }
    });

    return res.status(201).json({
      message: "New pickup/delivery request successfully created.",
      data: pickupDeliveryRequest
    })
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to add new pickup/delivery request.",
      error: error
    })
  }
}

export const updatePickupDeliveryRequest = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id<=0){
      return res.status(404).json({
        message: "Invalid pickup/delivery request id."
      })
    }

    const pickupDeliveryRequest = await prisma.pickupDeliveryRequest.findUnique({
      where: {
        id: id,
      }
    })

    if (!pickupDeliveryRequest) {
      return res.status(404).json({
        message: "Pickup/delivery request not found."
      })
    }

    const {name, phone, address, type} = req.body;

    const data: Prisma.PickupDeliveryRequestUpdateInput = {};

    if (name !== undefined) {
      data.name = name;
    };

    if (phone !== undefined) {
      data.phone = phone;
    };

    if (address !== undefined) {
      data.address = address;
    }

    if (type !== undefined) {
      data.type = type;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: "No field to update."
      })
    }

    const newPickupDeliveryRequest = await prisma.pickupDeliveryRequest.update({
      where: {
        id: id,
      },
      data: {
        data
      }
    })

    return res.status(200).json({
      message: "Pickup/delivery request updated successfully.",
      data: newPickupDeliveryRequest
    })
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Failed to update pickup/delivery request.",
      error: error
    })
  }
}

export const deletePickupDeliveryRequest = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id<=0) {
      return res.status(404).json({
        message: "Invalid pickup/delivery request id."
      })
    }

    const pickupDeliveryRequest = await prisma.pickupDeliveryRequest.findUnique({
      where: {
        id: id
      }
    })

    if (!pickupDeliveryRequest) {
      return res.status(404).json({
        message: "Pickup/delivery request not found."
      })
    }

    if (pickupDeliveryRequest.status !== "PENDING") {
      return res.status(422).json({
        message: "Failed to cancel request."
      })
    } 

    await prisma.pickupDeliveryRequest.delete({
      where: {
        id: id
      },
    })

    return res.status(200).json({
      message: "Successfully deleted pickup/delivery request"
    })
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Failed to delete pickup/delivery request",
      error: error
    })
  }
}