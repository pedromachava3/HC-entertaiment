import type { Metadata } from "next";
import { LegalPage, Pending } from "@/components/site/legal";
import { COMPANY } from "@/lib/config";

export const metadata: Metadata = { title: "Política de Privacidade", alternates: { canonical: "/privacidade" } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade" updated="19/11/2026">
      <section>
        <h2>1. Responsável</h2>
        <p>{COMPANY.name} ({COMPANY.fullName}), {COMPANY.location}. Contacto: WhatsApp {COMPANY.whatsapp.display}.</p>
      </section>
      <section>
        <h2>2. Dados recolhidos</h2>
        <ul>
          <li>Na compra: nome completo, número de WhatsApp, email (opcional), bilhetes escolhidos e método de pagamento.</li>
          <li>Na comunicação do pagamento: número utilizado na transferência, referência da transacção e comprovativo (opcional).</li>
          <li>Registos técnicos mínimos de segurança (por exemplo, um identificador cifrado do endereço IP para limitar abusos).</li>
          <li>Na entrada do evento: data, hora e funcionário que validou o bilhete.</li>
        </ul>
        <p className="mt-3">Não recolhemos PIN, códigos OTP nem dados bancários.</p>
      </section>
      <section>
        <h2>3. Finalidades</h2>
        <ul>
          <li>Registar e gerir encomendas, verificar pagamentos e emitir bilhetes.</li>
          <li>Enviar os bilhetes e comunicar com o comprador sobre a sua encomenda através do WhatsApp.</li>
          <li>Validar entradas e prevenir fraude e reutilização de bilhetes.</li>
        </ul>
      </section>
      <section>
        <h2>4. Segurança e acesso</h2>
        <ul>
          <li>Os dados são guardados em base de dados com controlo de acesso por linha (RLS). Comprovativos e bilhetes ficam em armazenamento privado.</li>
          <li>Cada encomenda só pode ser consultada com o link privado entregue ao comprador. O QR Code não contém dados pessoais.</li>
          <li>Apenas administradores autorizados acedem aos dados das encomendas; os funcionários de validação vêem apenas o necessário para confirmar a entrada.</li>
        </ul>
      </section>
      <section>
        <h2>5. Subcontratantes</h2>
        <p>
          A plataforma utiliza serviços de alojamento (Vercel) e de base de dados e armazenamento (Supabase), que podem tratar dados fora
          de Moçambique. <Pending>Confirmar regiões de alojamento e acordos de tratamento de dados.</Pending>
        </p>
      </section>
      <section>
        <h2>6. Conservação</h2>
        <p><Pending>Prazo de conservação de encomendas, comprovativos e registos de entrada após o evento.</Pending></p>
      </section>
      <section>
        <h2>7. Direitos</h2>
        <p>
          Pode pedir o acesso, a rectificação ou a eliminação dos seus dados através do WhatsApp oficial, salvo quando a sua conservação
          seja necessária por obrigação legal ou para resolver litígios. <Pending>Revisão conforme a legislação moçambicana aplicável.</Pending>
        </p>
      </section>
    </LegalPage>
  );
}
