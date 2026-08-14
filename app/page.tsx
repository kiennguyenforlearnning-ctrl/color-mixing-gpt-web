"use client";

import { FormEvent, useState } from "react";

type ApiResult = {
  model: string;
  output: string;
  prompt: string;
  comparison: null | {
    deltaL: number;
    deltaA: number;
    deltaB: number;
    deltaE00: number;
    tolerance: number | null;
    qc: "PASS" | "FAIL" | "UNKNOWN";
  };
  usage: null | {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

const commonFields = [
  ["referenceId", "Reference ID"],
  ["productCode", "Product code"],
  ["productName", "Product name"],
  ["material", "Material / resin"],
  ["referenceBatch", "Reference batch"],
  ["batchId", "Actual batch ID"],
  ["batchMassKg", "Khối lượng batch hiện tại (kg)"],
];

const colorFields = [
  ["targetL", "Target L*"],
  ["targetA", "Target a*"],
  ["targetB", "Target b*"],
  ["actualL", "Actual L*"],
  ["actualA", "Actual a*"],
  ["actualB", "Actual b*"],
  ["tolerance", "Ngưỡng ΔE00 cho phép"],
];

const measurementFields = [
  ["measurementSource", "Nguồn đo (colorimeter / spectrophotometer / camera)"],
  ["instrumentModel", "Model thiết bị đo"],
  ["illuminant", "Illuminant (ví dụ D65)"],
  ["observer", "Observer (ví dụ 2° / 10°)"],
  ["geometry", "Measurement geometry"],
];

const imageInputs = [
  ["refFront", "Reference Front"],
  ["refLeft", "Reference Left"],
  ["refRight", "Reference Right"],
  ["refTop", "Reference Top"],
  ["actualFront", "Actual Front"],
  ["actualLeft", "Actual Left"],
  ["actualRight", "Actual Right"],
  ["actualTop", "Actual Top"],
];

async function compressImage(file: File) {
  if (!file.type.startsWith("image/")) return file;
  if (file.size < 550_000) return file;

  const bitmap = await createImageBitmap(file);
  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.88)
  );
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const original = new FormData(e.currentTarget);
      const formData = new FormData();

      for (const [key, raw] of original.entries()) {
        if (raw instanceof File && raw.size > 0) {
          formData.append(key, await compressImage(raw));
        } else if (typeof raw === "string") {
          formData.append(key, raw);
        }
      }

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analyze failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <div className="eyebrow">GPT + CIEDE2000</div>
        <h1>Color Mixing Assistant</h1>
        <p>
          Nhập số đo L*a*b*, recipe, lịch sử pha và 4 ảnh mẫu + 4 ảnh thật. Backend
          tính ΔE00 bằng code, sau đó gửi prompt + ảnh tới OpenAI để GPT phân tích
          hướng lệch màu và gợi ý bước tiếp theo.
        </p>
      </section>

      <div className="notice">
        <strong>Lưu ý:</strong> số đo L*a*b* từ máy là nguồn chính. Ảnh điện thoại chỉ
        hỗ trợ quan sát; GPT không được phép tự bịa số gram khi thiếu dữ liệu
        before → addition → after.
      </div>

      <form onSubmit={onSubmit}>
        <div className="grid">
          <section className="card">
            <h2>1. Sản phẩm & batch</h2>
            <div className="row2">
              {commonFields.map(([name, label]) => (
                <Field key={name} name={name} label={label} />
              ))}
            </div>

            <h2 className="sectionTitle">2. Màu L*a*b*</h2>
            <p className="small">Nếu có máy đo màu, hãy nhập đầy đủ 6 giá trị.</p>
            <div className="row2">
              {colorFields.map(([name, label]) => (
                <Field key={name} name={name} label={label} inputMode="decimal" />
              ))}
            </div>

            <h2 className="sectionTitle">3. Thông tin phép đo</h2>
            <div className="row2">
              {measurementFields.map(([name, label]) => (
                <Field key={name} name={name} label={label} />
              ))}
            </div>
          </section>

          <section className="card">
            <h2>4. Recipe</h2>
            <label htmlFor="referenceRecipe">Recipe chuẩn</label>
            <textarea
              id="referenceRecipe"
              name="referenceRecipe"
              placeholder={"Ví dụ:\nYellow: 0.50 g/kg\nRed: 0.10 g/kg"}
            />

            <label htmlFor="actualRecipe">Recipe hiện tại</label>
            <textarea
              id="actualRecipe"
              name="actualRecipe"
              placeholder={"Ví dụ:\nYellow: 0.45 g/kg\nRed: 0.08 g/kg"}
            />

            <h2 className="sectionTitle">5. Lịch sử pha màu</h2>
            <textarea
              id="history"
              name="history"
              placeholder={
                "CASE 001\nBefore Lab: ...\nAdded: Yellow +3g\nAfter Lab: ...\nΔE before: ...\nΔE after: ..."
              }
              className="history"
            />

            <label htmlFor="notes">Ghi chú quy trình / điều kiện chụp</label>
            <textarea
              id="notes"
              name="notes"
              placeholder="Ánh sáng, máy ảnh, nhiệt độ, thickness, gloss, lot pigment..."
            />
          </section>
        </div>

        <section className="card imageCard">
          <div className="cardHeader">
            <div>
              <h2>6. Ảnh sản phẩm</h2>
              <p className="small">
                Chọn đúng cặp góc. Ảnh lớn sẽ được nén trên trình duyệt trước khi gửi.
              </p>
            </div>
            <span className="pill">Tối đa 8 ảnh</span>
          </div>
          <div className="file-grid">
            {imageInputs.map(([name, label]) => (
              <div className="fileBox" key={name}>
                <label htmlFor={name}>{label}</label>
                <input id={name} name={name} type="file" accept="image/*" />
              </div>
            ))}
          </div>
        </section>

        <div className="actions">
          <button type="submit" disabled={loading}>
            {loading ? "Đang tính ΔE00 & phân tích..." : "Phân tích bằng GPT"}
          </button>
          {error && <span className="error">{error}</span>}
        </div>
      </form>

      {result && (
        <div className="resultStack">
          {result.comparison && (
            <section className="card summaryCard">
              <div>
                <span className="metricLabel">ΔE00</span>
                <strong className="metricValue">{result.comparison.deltaE00.toFixed(3)}</strong>
              </div>
              <div>
                <span className="metricLabel">QC</span>
                <strong className={`status ${result.comparison.qc.toLowerCase()}`}>
                  {result.comparison.qc}
                </strong>
              </div>
              <div>
                <span className="metricLabel">ΔL / Δa / Δb</span>
                <strong>
                  {result.comparison.deltaL.toFixed(2)} / {result.comparison.deltaA.toFixed(2)} / {result.comparison.deltaB.toFixed(2)}
                </strong>
              </div>
              <div>
                <span className="metricLabel">Model</span>
                <strong>{result.model}</strong>
              </div>
            </section>
          )}

          <section className="card">
            <div className="cardHeader">
              <h2>Kết quả GPT</h2>
              {result.usage && (
                <span className="pill">{result.usage.totalTokens.toLocaleString()} tokens</span>
              )}
            </div>
            <div className="result">{result.output}</div>
          </section>

          <details className="card promptDetails">
            <summary>Prompt đã parse và gửi tới GPT</summary>
            <pre>{result.prompt}</pre>
          </details>
        </div>
      )}
    </main>
  );
}

function Field({
  name,
  label,
  inputMode,
}: {
  name: string;
  label: string;
  inputMode?: "decimal";
}) {
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} placeholder={label} inputMode={inputMode} />
    </div>
  );
}
