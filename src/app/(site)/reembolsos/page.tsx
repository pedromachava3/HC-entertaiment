import type { Metadata } from "next";
import { LegalPage, Pending } from "@/components/site/legal";
import { COMPANY } from "@/lib/config";

export const metadata: Metadata = { title: "Cancelamentos e Reembolsos", alternates: { canonical: "/reembolsos" } };

export default function RefundsPage() {
  return (
    <LegalPage title="Cancelamentos e Reembolsos" updated="19/11/2026">
      <section>
        <h2>1. Encomendas não pagas</h2>
        <p>
          Encomendas sem pagamento comunicado dentro do prazo indicado expiram automaticamente, sem qualquer custo. Encomendas com
          pagamento rejeitado podem voltar a comunicar o pagamento dentro de um novo prazo.
        </p>
      </section>
      <section>
        <h2>2. Pedidos de cancelamento pelo comprador</h2>
        <p><Pending>Condições em que o comprador pode cancelar uma compra já confirmada e eventuais prazos ou custos.</Pending></p>
      </section>
      <section>
        <h2>3. Cancelamento ou alteração do evento</h2>
        <p>
          Se um evento for cancelado ou alterado de forma significativa, a {COMPANY.name} informará os compradores pelo WhatsApp
          indicado na encomenda. <Pending>Regras de reembolso, troca para nova data ou outras soluções.</Pending>
        </p>
      </section>
      <section>
        <h2>4. Bilhetes cancelados</h2>
        <p>Um bilhete cancelado deixa de ser válido e é recusado na entrada.</p>
      </section>
      <section>
        <h2>5. Como pedir</h2>
        <p>Contacte o WhatsApp oficial {COMPANY.whatsapp.display} indicando o código da encomenda.</p>
      </section>
    </LegalPage>
  );
}
