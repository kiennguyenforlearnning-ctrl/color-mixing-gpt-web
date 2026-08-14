# Color Mixing GPT Web

Web app nhập thông tin sản phẩm mẫu / sản phẩm thật, L*a*b*, recipe, lịch sử pha và tối đa 8 ảnh; backend tính ΔE00 bằng CIEDE2000 rồi build prompt kỹ thuật và gọi OpenAI Responses API.

## Kiến trúc MVP

```text
User form + 4 reference images + 4 actual images
                ↓
Next.js API route
                ↓
Parse input + deterministic CIEDE2000
                ↓
Build guarded color-analysis prompt
                ↓
OpenAI Responses API + image input
                ↓
GPT explanation / pigment guidance
```

### Quy tắc quan trọng

- L*a*b* từ colorimeter/spectrophotometer là nguồn chính khi có.
- ΔL*, Δa*, Δb* và ΔE00 được tính bằng code trong `lib/color.ts`.
- GPT dùng ảnh để kiểm tra góc, glare, ánh sáng và nhận xét trực quan.
- Prompt cấm GPT bịa dosage khi thiếu dữ liệu `before → addition → after` hoặc dose-response.
- API key chỉ tồn tại ở server.

## ChatGPT account ≠ OpenAI API

ChatGPT Plus/Pro không bao gồm API usage. App cần một `OPENAI_API_KEY` của OpenAI API project và API billing được quản lý riêng.

## Chạy local

Yêu cầu Node.js LTS hiện hành.

```bash
npm install
cp .env.example .env.local
```

Sửa `.env.local`:

```env
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-5.6-sol
```

Sau đó:

```bash
npm run dev
```

Mở `http://localhost:3000`.

## Model

Mặc định accuracy-first:

```env
OPENAI_MODEL=gpt-5.6-sol
```

Để giảm chi phí:

```env
OPENAI_MODEL=gpt-5.6-terra
```

Model phải là model mà OpenAI API project của bạn có quyền truy cập.

## Tính năng hiện tại

- Reference/product/batch fields.
- Target + Actual CIELAB.
- CIEDE2000 deterministic calculation.
- PASS/FAIL theo tolerance người dùng nhập.
- Measurement metadata: source, device, illuminant, observer, geometry.
- Reference recipe + actual recipe.
- Historical mixing cases dạng text.
- 4 reference + 4 actual images.
- Client-side image compression để giảm payload.
- OpenAI Responses API với image input.
- Hiển thị GPT result, model, token usage và prompt đã parse.

## Deploy Vercel

1. Import repo này vào Vercel.
2. Project Settings → Environment Variables.
3. Thêm:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL=gpt-5.6-sol`
4. Deploy.

Không thêm API key vào `NEXT_PUBLIC_*` và không commit `.env.local`.

## Hạn chế của MVP

- Không coi ảnh điện thoại là phép đo màu chuẩn.
- Browser có nén ảnh trước upload; số L*a*b* từ máy vẫn là nguồn định lượng chính.
- Historical cases hiện nhập bằng text; chưa có database/RAG thực sự.
- Chưa có model numerical riêng để tối ưu số gram pigment.
- GPT chỉ đề xuất exact dosage nếu dữ liệu thực nghiệm đủ cơ sở theo prompt guardrail.

## Nâng cấp tiếp theo

1. Lưu inspection/history trong PostgreSQL.
2. Upload ảnh qua object storage thay vì gửi payload lớn trực tiếp.
3. Import CSV/XLSX historical cases.
4. Numerical retrieval theo Lab/material/recipe.
5. Mixing predictor + optimizer riêng cho g/kg.
6. Auth + audit log + cost dashboard.
