import { z } from "zod";
import { Slug, IsoDateTime } from "./base.mjs";

// z.object() beschreibt ein Objekt mit bestimmten Feldern.
export const VendorSchema = z.object({
  vendorId: Slug,
  name: z.string().min(1, "Name darf nicht leer sein"),
  website: z.string().url("Muss eine gueltige URL sein").optional(),
  description: z.string().optional(),
  deprecatedAt: z.union([IsoDateTime, z.null()]),
});

export const ProductSchema = z.object({
  productId: Slug,
  vendorId: Slug,
  name: z.string().min(1),
  category: z.string().optional(),
  description: z.string().optional(),
  deprecatedAt: z.union([IsoDateTime, z.null()]),
});

export const EventTypeSchema = z.object({
  typeId: Slug,
  name: z.string().min(1),
  group: z.string().min(1),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Farbe muss ein Hex-Code sein, z.B. "#3b82f6"'),
  description: z.string().optional(),
});