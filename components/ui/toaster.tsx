"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      toastOptions={{
        style: {
          background: "#0A0A0A",
          color: "#FFFFFF",
          border: "1px solid #1A1A1A",
        },
      }}
    />
  );
}
