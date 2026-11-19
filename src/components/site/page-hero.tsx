import { Container, Eyebrow } from "@/components/ui/primitives";

export function PageHero({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <section className="relative overflow-hidden pt-32 pb-12 sm:pt-40">
      <div className="absolute -left-32 top-10 -z-10 size-96 rounded-full bg-hc-red/20 blur-[110px]" />
      <Container>
        <Eyebrow><span className="h-px w-10 bg-hc-red" /> {eyebrow}</Eyebrow>
        <h1 className="mt-5 font-display text-6xl uppercase leading-[0.9] sm:text-8xl">{title}</h1>
        {intro ? <p className="mt-5 max-w-2xl text-lg text-white/70">{intro}</p> : null}
      </Container>
    </section>
  );
}
