import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GlucoseGuard — Diabetes Risk Classification",
  description: "AI-powered diabetes risk assessment using Random Forest, Logistic Regression, and SVM models.",
  keywords: ["diabetes", "AI", "machine learning", "health", "glucose", "risk assessment"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-[#040810] antialiased">{children}</body>
    </html>
  );
}
