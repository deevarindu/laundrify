import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const query = res.locals.validatedQuery as {
      q?: string;
      role?: "ADMIN" | "STAFF";
      isActive?: boolean;
    };

    const { q, role, isActive } = query;

    const users = await prisma.user.findMany({
      where: {
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
                  email: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
        ...(role !== undefined && {
          role,
        }),
        ...(isActive !== undefined && {
          isActive,
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
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

    if (!Number.isInteger(id) || id <= 0) {
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
        isActive: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          orderBy: {
            createdAt: "desc",
          },
        },
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
    const { name, email, password, role, isActive } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        ...(isActive !== undefined && {
          isActive,
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({
      message: "New user successfully created.",
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
      message: "Failed to create user.",
    });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const { name, email, password, role, isActive } = req.body;

    if (id === req.user.userId && isActive === false) {
      return res.status(409).json({
        message: "You cannot deactivate your own account.",
      });
    }

    const data: Prisma.UserUpdateInput = {};

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

    if (isActive !== undefined) {
      data.isActive = isActive;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: "No fields to update.",
      });
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
        isActive: true,
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
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    if (id === req.user.userId) {
      return res.status(409).json({
        message: "You cannot deactivate your own account.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (!existingUser.isActive) {
      return res.status(409).json({
        message: "User is already inactive.",
      });
    }

    await prisma.user.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });

    return res.status(200).json({
      message: "User deactivated successfully.",
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

    return res.status(500).json({
      message: "Failed to deactivate user.",
    });
  }
};