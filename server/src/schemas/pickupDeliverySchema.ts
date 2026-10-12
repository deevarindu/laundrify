import { z } from "zod";

export const pickupDeliveryCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(100, "Name is too long."),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .max(30, "Phone number is too long.")
    .regex(/^[0-9+()\-\\s]+$/, "Invalid phone number."),
  address: z
    .string()
    .trim()
    .min(1, "Address is required.")
    .max(500, "Address is too long."),
  type: z.enum(["PICKUP", "DELIVERY"]),
  serviceId: z.coerce
    .number()
    .int("Invalid service ID.")
    .positive("Please select a service."),
});

export const pickupDeliveryStatusUpdateSchema = z
  .object({
    status: z.enum(["ACCEPTED", "REJECTED"]),
    scheduledDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid schedule date.")
      .optional(),
    scheduledStartTime: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Invalid start time.")
      .optional(),
    scheduledEndTime: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Invalid end time.")
      .optional(),
  })
  .superRefine((data, context) => {
    if (data.status !== "ACCEPTED") {
      return;
    }

    const hasSchedule =
      data.scheduledDate !== undefined ||
      data.scheduledStartTime !== undefined ||
      data.scheduledEndTime !== undefined;

    if (!hasSchedule) {
      return;
    }

    if (!data.scheduledDate) {
      context.addIssue({
        code: "custom",
        path: ["scheduledDate"],
        message: "Schedule date is required when providing a schedule.",
      });
    } else {
      const date = new Date(`${data.scheduledDate}T00:00:00.000Z`);

      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== data.scheduledDate
      ) {
        context.addIssue({
          code: "custom",
          path: ["scheduledDate"],
          message: "Invalid schedule date.",
        });
      }
    }

    if (!data.scheduledStartTime) {
      context.addIssue({
        code: "custom",
        path: ["scheduledStartTime"],
        message: "Start time is required when providing a schedule.",
      });
    }

    if (!data.scheduledEndTime) {
      context.addIssue({
        code: "custom",
        path: ["scheduledEndTime"],
        message: "End time is required when providing a schedule.",
      });
    }

    if (
      data.scheduledStartTime &&
      data.scheduledEndTime &&
      data.scheduledEndTime <= data.scheduledStartTime
    ) {
      context.addIssue({
        code: "custom",
        path: ["scheduledEndTime"],
        message: "End time must be later than start time.",
      });
    }
  });

export const pickupDeliveryTrackingSchema = z.object({
  requestCode: z
    .string()
    .trim()
    .min(1, "Tracking code is required."),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .max(30, "Phone number is too long."),
});