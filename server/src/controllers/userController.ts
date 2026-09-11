import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      message: "Users fetched successfully.",
      data: users,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch users.",
    });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        orders: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "User fetched successfully.",
      data: user,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch user.",
    });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({
      message: "New user successfully registered.",
      data: newUser,
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Email already exists.",
      });
    }

    return res.status(500).json({
      message: "Failed to register user.",
    });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    const { name, email, password, role } = req.body;

    const data: {
      name?: string;
      email?: string;
      passwordHash?: string;
      role?: "ADMIN" | "STAFF";
    } = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (email !== undefined) {
      data.email = email;
    }

    if (password !== undefined) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    if (role !== undefined) {
      data.role = role;
    }

    const updatedUser = await prisma.user.update({
      where: {
        id,
      },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      message: "User updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Email already exists.",
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(500).json({
      message: "Failed to update user.",
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    await prisma.user.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      message: "User deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return res.status(409).json({
        message: "User cannot be deleted because they are still referenced by other data.",
      });
    }

    return res.status(500).json({
      message: "Failed to delete user.",
    });
  }
};