import "./globals.css";

export const metadata = {
  title: "싼재네 오프라인 시스템",
  description: "초기 버전(로컬스토리지 로그인) - Supabase는 조회만",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
