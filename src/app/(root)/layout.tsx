import "../globals.css";

// Only used by the bare "/" page, which forwards visitors to /ur/ or /en/.
export default function RootRedirectLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ur" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
