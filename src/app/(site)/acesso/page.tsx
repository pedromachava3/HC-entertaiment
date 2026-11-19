import type { Metadata } from "next";
import { LegalPage, Pending } from "@/components/site/legal";

export const metadata: Metadata = { title: "Política de Acesso aos Eventos", alternates: { canonical: "/acesso" } };

export default function AccessPage() {
  return (
    <LegalPage title="Acesso aos Eventos" updated="19/11/2026">
      <section>
        <h2>1. Apresentação do bilhete</h2>
        <ul>
          <li>Apresente o QR Code do seu bilhete (no telemóvel ou impresso) à entrada. Cada bilhete dá direito a uma única entrada.</li>
          <li>Garanta que o ecrã tem brilho suficiente e que o QR Code não está danificado ou cortado.</li>
        </ul>
      </section>
      <section>
        <h2>2. Validação</h2>
        <ul>
          <li>A leitura é feita por funcionários autorizados, com confirmação no servidor em tempo real.</li>
          <li>Bilhetes já utilizados, cancelados, alterados ou inexistentes no sistema são recusados.</li>
          <li>Se a ligação à Internet falhar, a entrada só é confirmada quando a validação puder ser concluída de forma segura.</li>
          <li>Não partilhe nem publique o seu bilhete: a primeira pessoa a apresentá-lo será a única a entrar.</li>
        </ul>
      </section>
      <section>
        <h2>3. Regras do recinto</h2>
        <p><Pending>Idade mínima, documentos de identificação, objectos proibidos, direito de admissão e regras de reentrada.</Pending></p>
      </section>
      <section>
        <h2>4. Benefícios VIP</h2>
        <p><Pending>Benefícios incluídos no bilhete VIP de cada evento, definidos pela HC Entertainment.</Pending></p>
      </section>
    </LegalPage>
  );
}
