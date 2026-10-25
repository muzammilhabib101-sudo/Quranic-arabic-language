import Link from "next/link";
import { defaultLocale, LOCALE_STORAGE_KEY, locales } from "@/i18n/config";
import { asset } from "@/lib/base-path";

// A static site has no server to redirect, so "/" sends visitors to their
// saved language (or Urdu) in the browser, with a meta refresh as backup.
const script = `(function(){var l="${defaultLocale}";try{var s=localStorage.getItem("${LOCALE_STORAGE_KEY}");if(${JSON.stringify(locales)}.indexOf(s)>-1)l=s}catch(e){}location.replace(${JSON.stringify(asset("/"))}+l+"/")})()`;

export default function RootPage() {
  return (
    <>
      <meta httpEquiv="refresh" content={`1; url=${asset(`/${defaultLocale}/`)}`} />
      <script dangerouslySetInnerHTML={{ __html: script }} />
      <p style={{ padding: 24, textAlign: "center" }}>
        <Link href={`/${defaultLocale}/`}>قرآنی عربی</Link>
        {" · "}
        <Link href="/en/">Quranic Arabic</Link>
      </p>
    </>
  );
}
