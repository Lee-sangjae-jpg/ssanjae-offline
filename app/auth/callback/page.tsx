"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("로그인 처리 중...");

  useEffect(() => {
    (async () => {
      // supabase가 URL hash/code 처리해서 세션을 잡아줌
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setMsg("세션 확인 실패: " + error.message);
        return;
      }

      if (!data.session) {
        setMsg("세션이 없습니다. 다시 로그인 해주세요.");
        return;
      }

      // ✅ 로그인 성공 표시(너가 원한 방식 유지)
      localStorage.setItem("ssanjae_login", "ok");

      // ✅ 원하는 정보(카카오 유저)도 저장해둠 (나중에 주문자 정보로 씀)
      const user = data.session.user;
      localStorage.setItem("ssanjae_user_id", user.id);

      // email이 없을 수도 있어서 안전하게 처리
      const email = user.email || "";
      localStorage.setItem("ssanjae_user_email", email);

      // 카카오의 경우 user_metadata에 정보가 들어오는 경우 많음
      const nickname =
        (user.user_metadata && (user.user_metadata.nickname || user.user_metadata.name)) || "";
      localStorage.setItem("ssanjae_user_nickname", nickname);

      location.href = "/products";
    })();
  }, []);

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>카카오 로그인 콜백</h1>
      <p style={{ marginTop: 10, opacity: 0.75 }}>{msg}</p>
    </main>
  );
}
