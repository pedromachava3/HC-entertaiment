import type { Metadata } from "next";
import { LegalPage, Pending } from "@/components/site/legal";
import { COMPANY, PAYMENT_METHODS } from "@/lib/config";

export const metadata: Metadata = { title: "Termos e Condições", alternates: { canonical: "/termos" } };

export default function TermsPage() {
  return (
    <LegalPage title="Termos e Condições" updated="19/11/2026">
      <section>
        <h2>1. Âmbito</h2>
        <p>
          Estes termos regulam a utilização do website da {COMPANY.name} ({COMPANY.fullName}), com sede na {COMPANY.location}, e a
          compra de bilhetes digitais para os eventos por si organizados.
        </p>
      </section>
      <section>
        <h2>2. Encomendas</h2>
        <ul>
          <li>Não é necessário criar conta. O comprador indica o nome completo, um número de WhatsApp e, opcionalmente, um email.</li>
          <li>Cada encomenda recebe um código único (ex.: HC-2026-000001) e um link privado de consulta, que deve ser guardado.</li>
          <li>Os preços aplicados são os registados no sistema no momento da encomenda e ficam guardados na encomenda.</li>
          <li>As quantidades estão sujeitas à disponibilidade. Uma encomenda reserva os bilhetes durante o prazo de pagamento indicado; findo esse prazo sem pagamento comunicado, a encomenda expira e os bilhetes voltam a ficar disponíveis.</li>
          <li><Pending>Limite máximo de bilhetes por encomenda e prazo de pagamento definidos pela HC Entertainment em cada evento.</Pending></li>
        </ul>
      </section>
      <section>
        <h2>3. Pagamentos móveis</h2>
        <ul>
          <li>Os pagamentos são feitos por transferência para os números oficiais: {PAYMENT_METHODS.mpesa.label} {PAYMENT_METHODS.mpesa.number} ou {PAYMENT_METHODS.emola.label} {PAYMENT_METHODS.emola.number}.</li>
          <li>O pagamento é efectuado fora do website. O website não processa nem guarda dados de carteiras móveis, PIN ou códigos OTP — nunca os partilhe.</li>
          <li>Depois de transferir, o comprador comunica o pagamento (número utilizado, referência da transacção e, opcionalmente, comprovativo).</li>
        </ul>
      </section>
      <section>
        <h2>4. Confirmação manual</h2>
        <p>
          Comunicar um pagamento ou enviar um comprovativo não confirma a compra. A encomenda só é considerada paga depois de a
          {` ${COMPANY.name}`} verificar o recebimento efectivo do valor na respectiva conta. Comprovativos inválidos ou referências já
          utilizadas são rejeitados. <Pending>Prazo indicativo para verificação dos pagamentos.</Pending>
        </p>
      </section>
      <section>
        <h2>5. Emissão e envio dos bilhetes</h2>
        <ul>
          <li>Após a confirmação, são emitidos automaticamente bilhetes digitais individuais, cada um com um QR Code exclusivo, em formato PDF.</li>
          <li>Os bilhetes são enviados pela {COMPANY.name} para o WhatsApp indicado na encomenda e ficam também disponíveis no link privado da encomenda.</li>
          <li>O comprador é responsável por indicar um número de WhatsApp correcto e por guardar os bilhetes em segurança.</li>
        </ul>
      </section>
      <section>
        <h2>6. QR Codes e validação</h2>
        <p>
          Cada QR Code permite uma única entrada. Na primeira leitura válida, o bilhete é marcado como utilizado e não pode voltar a ser
          aceite. Bilhetes copiados, alterados, cancelados ou não registados no sistema são recusados. Ver a Política de Acesso aos Eventos.
        </p>
      </section>
      <section>
        <h2>7. Cancelamentos</h2>
        <p>Ver a Política de Cancelamento e Reembolso.</p>
      </section>
      <section>
        <h2>8. Responsabilidade e lei aplicável</h2>
        <p>
          <Pending>Cláusulas de limitação de responsabilidade, idade mínima de acesso, foro competente e lei aplicável — a definir pela HC Entertainment com apoio jurídico, conforme a legislação moçambicana.</Pending>
        </p>
      </section>
      <section>
        <h2>9. Contacto</h2>
        <p>WhatsApp: {COMPANY.whatsapp.display}.</p>
      </section>
    </LegalPage>
  );
}
