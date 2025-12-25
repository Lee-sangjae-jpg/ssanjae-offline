// app/auth/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key);
}

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    // 이미 로그인 상태면 products로 보내기
    if (localStorage.getItem("ssanjae_login") === "ok") {
      location.href = "/products";
    }
  }, []);

  async function loginWithKakao() {
    const supabase = getSupabase();
    if (!supabase) {
      setMsg("환경변수(NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)부터 확인해줘.");
      return;
    }

    setLoading(true);
    setMsg("");

    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      setMsg(`카카오 로그인 시작 실패: ${error.message}`);
      setLoading(false);
      return;
    }
    // redirect가 일어나므로 여기서 setLoading 유지되어도 OK
  }

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>로그인</h1>
      <p style={{ opacity: 0.7, marginTop: 8 }}>
        카카오로 로그인 후 상품목록으로 이동합니다.
      </p>

      <button
        onClick={loginWithKakao}
        disabled={loading}
        style={{
          marginTop: 16,
          width: "100%",
          height: 48,
          borderRadius: 12,
          border: "1px solid #ddd",
          background: loading ? "#f2f2f2" : "#FEE500",
          fontWeight: 900,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "로그인 준비중..." : "카카오로 로그인"}
      </button>

      <button
        onClick={() => {
          localStorage.setItem("ssanjae_login", "ok");
          location.href = "/products";
        }}
        style={{
          marginTop: 10,
          width: "100%",
          height: 44,
          borderRadius: 12,
          border: "1px solid #ddd",
          background: "#fff",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        (임시) 바로 상품목록 이동
      </button>

      {msg && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #f3c2c2",
            background: "#fff5f5",
            whiteSpace: "pre-wrap",
          }}
        >
          {msg}
        </div>
      )}
    </main>
  );
}
