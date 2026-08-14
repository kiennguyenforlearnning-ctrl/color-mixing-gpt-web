import "./styles.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Color Mixing GPT Assistant",
  description: "Upload color/product data and generate a GPT analysis prompt with image inputs."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
