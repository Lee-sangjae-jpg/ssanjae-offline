// app/products/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type PickupDateRow = {
  id?: number;
  pickup_date?: string;
  date?: string;
  is_open?: boolean | null;
  is_active?: boolean | null;
  label?: string | null;
};

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key);
}

function formatKR(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map((v) => Number(v));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")} (${days[dt.getDay()]})`;
}

export default function ProductsPage() {
  // ✅ 0) 로컬 임시 로그인 가드 (import 위에 두면 100% 에러, useEffect 안이 정답)
  useEffect(() => {
    if (localStorage.getItem("ssanjae_login") !== "ok") {
      location.href = "/auth";
      return;
    }
  }, []);

  const supabase = useMemo(() => getSupabase(), []);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [dates, setDates] = useState<PickupDateRow[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});

  // 상세보기 모달
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<ProductRow | null>(null);

  // ✅ 공지/해시태그 (DB에서 불러옴)
  const [noticeHtml, setNoticeHtml] = useState<string>("");
  const [hashtags, setHashtags] = useState<string[]>([]);

  const cartItems = useMemo(() => {
    const map = new Map<number, ProductRow>();
    products.forEach((p) => map.set(p.id, p));
    return Object.entries(cart)
      .map(([idStr, qty]) => {
        const id = Number(idStr);
        const p = map.get(id);
        if (!p) return null;
        return { product: p, qty };
      })
      .filter(Boolean) as { product: ProductRow; qty: number }[];
  }, [cart, products]);

  const totalPrice = useMemo(() => {
    return cartItems.reduce((sum, it) => sum + (it.product.price || 0) * it.qty, 0);
  }, [cartItems]);

  async function loadPickupDates() {
    if (!supabase) {
      setErrorMsg("Vercel 환경변수(NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)부터 확인해라.");
      return;
    }

    // 1순위: pickup_dates
    let res = await supabase
      .from("pickup_dates")
      .select("id,pickup_date,is_open,label")
      .order("pickup_date", { ascending: true });

    if (!res.error && Array.isArray(res.data)) {
      const openOnly = res.data
        .filter((r: any) => r.is_open !== false)
        .map((r: any) => r as PickupDateRow);

      setDates(openOnly);
      const first = openOnly[0]?.pickup_date || "";
      setSelectedDate(first);
      return;
    }

    // 2순위: order_dates (혹시 예전 테이블명일 경우 대비)
    res = await supabase
      .from("order_dates")
      .select("id,date,is_active,label")
      .order("date", { ascending: true });

    if (res.error) {
      setErrorMsg(`픽업날짜 테이블을 못 불러온다. (pickup_dates / order_dates 둘 다 실패)`);
      return;
    }

    const list = (res.data || [])
      .filter((r: any) => r.is_active !== false)
      .map((r: any) => r as PickupDateRow);

    setDates(list);
    const first = list[0]?.date || "";
    setSelectedDate(first);
  }

  async function loadProducts() {
    if (!supabase) return;

    const res = await supabase
      .from("products")
      .select("id,sort_order,name,price,stock,is_active,thumbnail_url")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (res.error) {
      setErrorMsg("products 테이블을 못 불러온다.");
      return;
    }

    const list = (res.data || []).filter((p: any) => p.is_active !== false) as ProductRow[];
    setProducts(list);
  }

  async function loadNoticeAndTags() {
    if (!supabase) return;

    // site_settings: notice_html / hashtags
    const res = await supabase
      .from("site_settings")
      .select("key,value")
      .in("key", ["notice_html", "hashtags"]);

    if (res.error) return;

    const map = new Map<string, string>();
    (res.data || []).forEach((r: any) => map.set(r.key, r.value));

    const nh = map.get("notice_html") || "";
    const ht = map.get("hashtags") || "";

    setNoticeHtml(nh);

    const parsed = ht
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setHashtags(parsed);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      await loadPickupDates();
      await loadNoticeAndTags();
      await loadProducts();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getDateValue(r: PickupDateRow) {
    return r.pickup_date || r.date || "";
  }

  function inc(id: number) {
    const p = products.find((x) => x.id === id);
    if (!p) return;

    const stock = p.stock ?? 999999;
    setCart((prev) => {
      const cur = prev[id] || 0;
      const next = Math.min(cur + 1, stock);
      return { ...prev, [id]: next };
    });
  }

  function dec(id: number) {
    setCart((prev) => {
      const cur = prev[id] || 0;
      const next = cur - 1;
      const copy = { ...prev };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }

  function resetCart() {
    setCart({});
  }

  function openDetail(p: ProductRow) {
    setDetailProduct(p);
    setDetailOpen(true);
  }

  function closeDetail() {
    setDetailOpen(false);
    setDetailProduct(null);
  }

  // ✅ 컬러(초록버튼)
  const GREEN = "#19b84a";
  const GREEN_SOFT = "#e9f9ee";
  const BLUE_TAG_BG = "#f3f8ff";
  const BLUE_TAG_BORDER = "#b7d3ff";
  const BLUE_TAG_TEXT = "#2b6cff";

  const keepFont = `"Pretendard", system-ui, -apple-system, Segoe UI, Roboto`;
  const juaFont = `"BMJUA", "배민주아체", "BaeminJua", "Pretendard", system-ui, -apple-system, Segoe UI, Roboto`;

  // ✅ “노란칸” 썸네일 박스 크기
  const thumbHeight = 360;

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: 16, fontFamily: juaFont }}>
      <style>{`
        @font-face {
          font-family: "BMJUA";
          src: url("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_20-04@2.1/BMJUA.woff") format("woff");
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `}</style>

      {/* ✅ 상단: 로고 + 타이틀 */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* 로고는 /public/logo.jpg 로 넣어야 뜸 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="싼재네마켓 로고" style={{ width: 26, height: 26, objectFit: "contain" }} />
            <h1 style={{ fontSize: 22, margin: 0, fontWeight: 900, fontFamily: keepFont }}>싼재네 오프라인 주문</h1>
          </div>
          <p style={{ margin: "6px 0 0 0", opacity: 0.75, fontFamily: keepFont }}>픽업 날짜 선택 → 상품 담기</p>
        </div>
        <a href="/admin" style={{ fontSize: 14, opacity: 0.85, textDecoration: "underline" }}>
          관리자
        </a>
      </header>

      {!supabase && (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12, marginBottom: 12 }}>
          <b>환경변수부터 잡아라.</b>
          <div style={{ marginTop: 6, opacity: 0.8 }}>NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: 12, border: "1px solid #f3c2c2", background: "#fff5f5", borderRadius: 12, marginBottom: 12 }}>
          {errorMsg}
        </div>
      )}

      <section style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        {/* 1) 픽업 날짜 */}
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 14 }}>
          <h2 style={{ fontSize: 16, margin: 0, fontWeight: 900, fontFamily: keepFont }}>1) 픽업 날짜</h2>

          {loading ? (
            <p style={{ marginTop: 10, opacity: 0.7 }}>불러오는 중…</p>
          ) : dates.length === 0 ? (
            <p style={{ marginTop: 10, opacity: 0.7 }}>열린 날짜가 없다.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {dates.map((d, idx) => {
                const value = getDateValue(d);
                const active = value === selectedDate;
                return (
                  <button
                    key={`${value}-${idx}`}
                    onClick={() => setSelectedDate(value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: active ? `1px solid ${GREEN}` : "1px solid #ccc",
                      cursor: "pointer",
                      background: active ? GREEN : "#fff",
                      color: active ? "#fff" : "#111",
                      fontWeight: 900,
                    }}
                  >
                    {value ? formatKR(value) : "날짜값 없음"}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
            선택됨: <b>{selectedDate ? formatKR(selectedDate) : "없음"}</b>
          </div>
        </div>

        {/* ✅ 공지 + 해시태그 */}
        {(noticeHtml || hashtags.length > 0) && (
          <div style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd", background: "#fff" }}>
            {noticeHtml && (
              <div style={{ background: GREEN_SOFT, border: `1px solid ${GREEN}`, borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 13, lineHeight: 1.5, fontFamily: juaFont, color: "#e00000" }}>
                  <span dangerouslySetInnerHTML={{ __html: noticeHtml }} />
                </div>
              </div>
            )}

            {hashtags.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {hashtags.map((t, i) => (
                  <span
                    key={`${t}-${i}`}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: BLUE_TAG_BG,
                      border: `1px solid ${BLUE_TAG_BORDER}`,
                      color: BLUE_TAG_TEXT,
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2) 상품 */}
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 14 }}>
          <h2 style={{ fontSize: 16, margin: 0, fontWeight: 900, fontFamily: keepFont }}>2) 상품</h2>

          {loading ? (
            <p style={{ marginTop: 10, opacity: 0.7 }}>불러오는 중…</p>
          ) : products.length === 0 ? (
            <p style={{ marginTop: 10, opacity: 0.7 }}>상품이 없다.</p>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 14 }}>
              {products.map((p) => {
                const qty = cart[p.id] || 0;
                const stock = p.stock ?? 0;
                const soldOut = stock <= 0;

                return (
                  <div key={p.id} style={{ border: "1px solid #e6e6e6", borderRadius: 16, overflow: "hidden", background: "#fff" }}>
                    <div style={{ padding: 12 }}>
                      <div
                        style={{
                          width: "100%",
                          height: thumbHeight,
                          background: "#f6f6f6",
                          borderRadius: 14,
                          overflow: "hidden",
                          border: "1px solid #eee",
                        }}
                      >
                        {p.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.thumbnail_url}
                            alt={p.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              objectPosition: "center",
                              display: "block",
                            }}
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6 }}>
                            No Image
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: 12, paddingTop: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 1000, lineHeight: 1.25, wordBreak: "break-word" }}>{p.name}</div>

                      <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginTop: 6 }}>
                        <div style={{ fontSize: 22, fontWeight: 1000, color: "#ff7a00" }}>{(p.price ?? 0).toLocaleString()}원</div>
                        <div style={{ fontSize: 22, color: "#777", fontWeight: 1000 }}>재고 {stock.toLocaleString()}</div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 44px", gap: 8, marginTop: 10, alignItems: "center" }}>
                        <button
                          onClick={() => dec(p.id)}
                          disabled={qty <= 0}
                          style={{
                            height: 44,
                            borderRadius: 12,
                            border: "1px solid #ccc",
                            background: "#fff",
                            fontWeight: 1000,
                            cursor: qty <= 0 ? "not-allowed" : "pointer",
                          }}
                        >
                          -
                        </button>

                        <div style={{ height: 44, borderRadius: 12, border: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 1000 }}>
                          {qty}
                        </div>

                        <button
                          onClick={() => inc(p.id)}
                          disabled={soldOut}
                          style={{
                            height: 44,
                            borderRadius: 12,
                            border: "1px solid #ff7a00",
                            background: soldOut ? "#f2f2f2" : "#ff7a00",
                            color: soldOut ? "#888" : "#fff",
                            fontWeight: 1000,
                            cursor: soldOut ? "not-allowed" : "pointer",
                          }}
                        >
                          +
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                        <button
                          onClick={() => openDetail(p)}
                          style={{
                            height: 44,
                            borderRadius: 12,
                            border: "1px solid #ccc",
                            background: "#fff",
                            fontWeight: 1000,
                            cursor: "pointer",
                          }}
                        >
                          상세보기
                        </button>

                        <button
                          onClick={() => inc(p.id)}
                          disabled={soldOut}
                          style={{
                            height: 44,
                            borderRadius: 12,
                            border: `1px solid ${GREEN}`,
                            background: soldOut ? "#e9e9e9" : GREEN,
                            color: soldOut ? "#888" : "#fff",
                            fontWeight: 1000,
                            cursor: soldOut ? "not-allowed" : "pointer",
                          }}
                        >
                          {soldOut ? "품절" : "담기"}
                        </button>
                      </div>

                      {soldOut && <div style={{ marginTop: 8, color: "#b00020", fontWeight: 1000 }}>품절</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3) 담은 목록 */}
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 14 }}>
          <h2 style={{ fontSize: 16, margin: 0, fontWeight: 900 }}>3) 담은 목록</h2>

          {cartItems.length === 0 ? (
            <p style={{ marginTop: 10, opacity: 0.7 }}>아직 담은 게 없다.</p>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {cartItems.map(({ product, qty }) => (
                <div key={product.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ wordBreak: "break-word" }}>{product.name}</b> × {qty}
                  </div>
                  <div style={{ fontWeight: 1000 }}>{((product.price ?? 0) * qty).toLocaleString()}원</div>
                </div>
              ))}

              <div style={{ borderTop: "1px solid #eee", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 1000 }}>총합</div>
                <div style={{ fontWeight: 1000, color: "#ff7a00" }}>{totalPrice.toLocaleString()}원</div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button
                  onClick={resetCart}
                  style={{
                    padding: "12px 12px",
                    borderRadius: 12,
                    border: "1px solid #ccc",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 1000,
                  }}
                >
                  비우기
                </button>

                <button
                  onClick={() => alert("다음 단계: /checkout 만들고 주문 저장 연결한다.")}
                  style={{
                    padding: "12px 12px",
                    borderRadius: 12,
                    border: `1px solid ${GREEN}`,
                    background: GREEN,
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 1000,
                    flex: 1,
                  }}
                >
                  다음(주문하기)
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 상세보기 모달 */}
      {detailOpen && detailProduct && (
        <div
          onClick={closeDetail}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            padding: 12,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 560,
              background: "#fff",
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid #eee",
            }}
          >
            <div style={{ padding: 12 }}>
              <div style={{ width: "100%", height: thumbHeight, background: "#f6f6f6", borderRadius: 14, overflow: "hidden", border: "1px solid #eee" }}>
                {detailProduct.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detailProduct.thumbnail_url} alt={detailProduct.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6 }}>No Image</div>
                )}
              </div>
            </div>

            <div style={{ padding: 14, paddingTop: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 1000, lineHeight: 1.25 }}>{detailProduct.name}</div>

              <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginTop: 6 }}>
                <div style={{ fontSize: 21, fontWeight: 1000, color: "#ff7a00" }}>{(detailProduct.price ?? 0).toLocaleString()}원</div>
                <div style={{ fontSize: 21, color: "#777", fontWeight: 1000 }}>재고 {(detailProduct.stock ?? 0).toLocaleString()}</div>
              </div>

              <div style={{ marginTop: 10, color: "#444", lineHeight: 1.5 }}>맛/식감/보관법 등은 나중에 바꿀 예정입니다. (임시 설명)</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                <button onClick={closeDetail} style={{ height: 46, borderRadius: 12, border: "1px solid #ccc", background: "#fff", fontWeight: 1000, cursor: "pointer" }}>
                  닫기
                </button>
                <button
                  onClick={() => {
                    inc(detailProduct.id);
                    closeDetail();
                  }}
                  disabled={(detailProduct.stock ?? 0) <= 0}
                  style={{
                    height: 46,
                    borderRadius: 12,
                    border: `1px solid ${GREEN}`,
                    background: (detailProduct.stock ?? 0) <= 0 ? "#e9e9e9" : GREEN,
                    color: (detailProduct.stock ?? 0) <= 0 ? "#888" : "#fff",
                    fontWeight: 1000,
                    cursor: (detailProduct.stock ?? 0) <= 0 ? "not-allowed" : "pointer",
                  }}
                >
                  담고 닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
