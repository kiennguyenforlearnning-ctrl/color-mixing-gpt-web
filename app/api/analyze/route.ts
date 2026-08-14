import OpenAI from "openai";
import type { ResponseInputContent } from "openai/resources/responses/responses";
import { NextRequest, NextResponse } from "next/server";
import { buildDeterministicComparison } from "../../../lib/color";
import { buildColorMixingPrompt } from "../../../lib/prompt";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_FIELDS = [
  ["refFront", "Reference Front"],
  ["refLeft", "Reference Left"],
  ["refRight", "Reference Right"],
  ["refTop", "Reference Top"],
  ["actualFront", "Actual Front"],
  ["actualLeft", "Actual Left"],
  ["actualRight", "Actual Right"],
  ["actualTop", "Actual Top"],
] as const;

async function fileToDataUrl(file: File) {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} không phải file ảnh.`);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} vượt quá 5MB sau khi nén.`);
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Thiếu OPENAI_API_KEY trên server. Xem README để cấu hình." }, { status: 500 });
    }

    const formData = await req.formData();
    const values: Record<string, string> = {};
    for (const [key, raw] of formData.entries()) {
      if (typeof raw === "string") values[key] = raw;
    }

    const comparison = buildDeterministicComparison(values);
    const prompt = buildColorMixingPrompt(values, comparison);
    const content: ResponseInputContent[] = [{ type: "input_text", text: prompt }];

    for (const [field, label] of IMAGE_FIELDS) {
      const file = formData.get(field);
      if (file instanceof File && file.size > 0) {
        content.push({ type: "input_text", text: `Ảnh: ${label}` });
        content.push({ type: "input_image", image_url: await fileToDataUrl(file), detail: "high" });
      }
    }

    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL || "gpt-5.6-sol";
    const response = await client.responses.create({
      model,
      reasoning: { effort: "medium" },
      input: [{ role: "user", content }],
      max_output_tokens: 4500,
    });

    return NextResponse.json({
      model,
      output: response.output_text || "Không có output_text từ OpenAI.",
      prompt,
      comparison,
      usage: response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
