"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    window.location.href = "/auth";
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <div>이동 중...</div>
    </div>
  );
}
