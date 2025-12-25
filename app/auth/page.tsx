"use client";

export default function AuthPage() {
  const onLogin = () => {
    localStorage.setItem("ssanjae_login", "ok");
    window.location.href = "/products";
  };

  const onReset = () => {
    localStorage.removeItem("ssanjae_login");
    alert("로그인 기록 삭제 완료");
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>로그인</h1>
      <p>초기 버전: localStorage(ssanjae_login)만 사용</p>

      <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
        <button
          onClick={onLogin}
          style={{
            padding: "12px 16px",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          로그인(테스트)
        </button>

        <button
          onClick={onReset}
          style={{
            padding: "12px 16px",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          로그인 초기화
        </button>
      </div>
    </div>
  );
}
