import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(254),
    password: z
      .string()
      .min(12)
      .max(128)
      .regex(/[A-Z]/, "Must include one uppercase letter")
      .regex(/[a-z]/, "Must include one lowercase letter")
      .regex(/[0-9]/, "Must include one number"),
    confirmPassword: z.string().min(12).max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: z
      .string()
      .min(12)
      .max(128)
      .regex(/[A-Z]/, "Must include one uppercase letter")
      .regex(/[a-z]/, "Must include one lowercase letter")
      .regex(/[0-9]/, "Must include one number"),
    confirmPassword: z.string().min(12).max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
