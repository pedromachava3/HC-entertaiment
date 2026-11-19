import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { getBuyHref } from "@/lib/data/site";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const buyHref = await getBuyHref();
  return (
    <>
      <Header buyHref={buyHref} />
      <main id="conteudo" className="min-h-[70vh]">{children}</main>
      <Footer />
    </>
  );
}
