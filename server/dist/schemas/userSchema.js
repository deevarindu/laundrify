import { z } from "zod";
export const userCreateSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "User name is required.")
        .max(100, "User name is too long."),
    email: z
        .string()
        .trim()
        .email("Invalid email address.")
        .transform((value) => value.toLowerCase()),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters."),
    role: z.enum(["ADMIN", "STAFF"]),
    isActive: z.boolean().optional(),
});
export const userUpdateSchema = z
    .object({
    name: z
        .string()
        .trim()
        .min(1, "User name is required.")
        .max(100, "User name is too long.")
        .optional(),
    email: z
        .string()
        .trim()
        .email("Invalid email address.")
        .transform((value) => value.toLowerCase())
        .optional(),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters.")
        .optional(),
    role: z
        .enum(["ADMIN", "STAFF"])
        .optional(),
    isActive: z.boolean().optional(),
})
    .refine((data) => data.name !== undefined ||
    data.email !== undefined ||
    data.password !== undefined ||
    data.role !== undefined ||
    data.isActive !== undefined, {
    message: "No fields to update.",
});
export const userQuerySchema = z.object({
    q: z.string().trim().optional(),
    role: z
        .enum(["ADMIN", "STAFF"])
        .optional(),
    isActive: z
        .enum(["true", "false"])
        .transform((value) => value === "true")
        .optional(),
});
