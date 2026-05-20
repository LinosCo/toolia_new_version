import { z } from "zod";

const cited = { citations: z.array(z.string()).default([]) };

export const brandSkillManifestSchema = z.object({
  palette: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
    background: z.string().optional(),
    text: z.string().optional(),
    ...cited,
  }).optional(),
  typography: z.object({
    heading: z.string().max(200).optional(),
    body: z.string().max(200).optional(),
    notes: z.string().max(400).optional(),
    ...cited,
  }).optional(),
  logo: z.object({
    description: z.string().max(400),
    hasTextmark: z.boolean().optional(),
    hasSymbol: z.boolean().optional(),
    ...cited,
  }).optional(),
  tone: z.object({
    descriptors: z.array(z.string().max(40)).max(8).default([]),
    do_say: z.array(z.string().max(200)).max(8).optional(),
    dont_say: z.array(z.string().max(200)).max(8).optional(),
    signature_phrases: z.array(z.string().max(200)).max(6).optional(),
    ...cited,
  }).optional(),
  imagery: z.object({
    style: z.string().max(300),
    subjects: z.array(z.string().max(80)).max(8).optional(),
    mood: z.string().max(120).optional(),
    forbidden: z.array(z.string().max(120)).max(6).optional(),
    ...cited,
  }).optional(),
  formats: z.object({
    preferred: z.array(z.string().max(40)).max(6).default([]),
    aspect_ratios: z.array(z.string().max(12)).max(6).optional(),
    ...cited,
  }).optional(),
  summary: z.string().max(1200).optional(),
});

export type BrandSkillManifest = z.infer<typeof brandSkillManifestSchema>;
