"use client";

import { useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type ProductRow = {
  id: number;
  sort_order: number | null;
  name: string;
  price: number | null;
  stock: number | null;
  is_active: boolean | null;
  thumbnail_url: string | null;
};

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default function ProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // ✅ 로그인 체크 (localStorage 하나만)
    if (localStorage.getItem("ssanjae_login") !== "ok") {
      window.location.href = "/auth";
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setErrorMsg("Supabase 환경변수(.env.local)가 비어있음");
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("products")
        .select("id, sort_order, name, price, stock, is_active, thumbnail_url")
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });

      if (error) {
        setErrorMsg(error.message);
        setRows([]);
      } else {
        setRows((data as ProductRow[]) ?? []);
      }

      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: 0 }}>상품목록</h1>

      <p style={{ marginTop: 8, color: "#666" }}>
        Supabase 조회 테스트 / 로그인 체크는 localStorage만
      </p>

      {loading && <div style={{ marginTop: 20 }}>불러오는 중...</div>}

      {!loading && errorMsg && (
        <div style={{ marginTop: 20, color: "crimson" }}>
          오류: {errorMsg}
        </div>
      )}

      {!loading && !errorMsg && (
        <div style={{ marginTop: 20 }}>
          {rows.length === 0 ? (
            <div>상품이 0개입니다. (DB에 데이터가 없거나 조회가 막힘)</div>
          ) : (
            <ul style={{ paddingLeft: 18 }}>
              {rows.map((p) => (
                <li key={p.id} style={{ marginBottom: 10 }}>
                  <b>{p.name}</b>{" "}
                  <span style={{ color: "#666" }}>
                    / {p.price ?? "-"}원 / 재고 {p.stock ?? "-"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
