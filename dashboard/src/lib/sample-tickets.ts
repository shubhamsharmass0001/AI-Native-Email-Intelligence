export const SAMPLE_TICKETS = [
  {
    id: "multi-turn-thread",
    label: "💬 Multi-Turn Thread",
    subject: "Re: SSO & 2FA setup issues on Enterprise workspace",
    customer_name: "Carlos Mendez",
    email: `Hi Support Team,

Following up on our earlier email below — we tried clearing the Okta certificate cache as you suggested, but 5 of our administrators are still getting the "Invalid SAML Assertion" error when attempting 2FA.

Could you verify if our Enterprise IdP certificate is properly bound on your backend, or if we need to regenerate the metadata XML?

Thanks,
Carlos Mendez
Director of IT, Global Logistics

--------------------------------------------------
On Mon, Aug 24, 2026 at 09:30 AM, Support Team wrote:
> Hi Carlos,
> 
> Thanks for reaching out. Usually "Invalid SAML response" occurs immediately after an IdP cert rotation.
> Please ensure your Okta administrator has flushed cached SAML assertions and uploaded the new SHA-256 cert in Admin > Security > SSO.
> 
> Best regards,
> Support Team

--------------------------------------------------
On Sun, Aug 23, 2026 at 04:15 PM, Carlos Mendez wrote:
> Hi Support,
> We rotated our Okta SAML certificate today and now none of our users can sign in via SSO. Error code 400 SAML.`,
  },
  {
    id: "spanish-inquiry",
    label: "🇪🇸 Spanish (Auto-Detect)",
    subject: "Problema con la sincronización de Gmail y facturación duplicada",
    customer_name: "Alejandro Gómez",
    email: `Hola equipo de soporte,

Desde ayer por la tarde, nuestra bandeja de entrada compartida no está sincronizando los correos nuevos de Gmail. Tenemos a 10 agentes bloqueados sin poder responder a los clientes.

Además, en nuestra última factura vemos un cargo doble por el plan Business de este mes. ¿Podrían ayudarnos a resolver la sincronización y emitir el reembolso del cargo duplicado?

Muchas gracias,
Alejandro Gómez
Director de Operaciones`,
  },
  {
    id: "german-inquiry",
    label: "🇩🇪 German (Auto-Detect)",
    subject: "Sicherheitsvorfall: Verdächtige Anmeldeversuche im Postfach",
    customer_name: "Klaus Weber",
    email: `Dringend — An das IT-Sicherheitsteam,

Wir haben in den letzten 2 Stunden über 50 fehlgeschlagene Anmeldeversuche bei unserem gemeinsamen Postfach support@firma.de festgestellt. Die IP-Adressen stammen aus verschiedenen Ländern.

Bitte sperren Sie diese IP-Bereiche sofort und überprüfen Sie unsere Audit-Protokolle auf unbefugte Zugriffe.

Mit freundlichen Grüßen,
Klaus Weber
IT-Sicherheitsbeauftragter`,
  },
  {
    id: "hindi-inquiry",
    label: "🇮🇳 Hindi (Auto-Detect)",
    subject: "ईमेल सिंक नहीं हो रहा है और बिलिंग में समस्या",
    customer_name: "राहुल शर्मा",
    email: `नमस्ते सपोर्ट टीम,

कल से हमारे जीमेल इनबॉक्स में नए ईमेल सिंक नहीं हो रहे हैं। हमारी टीम ग्राहकों को समय पर जवाब नहीं दे पा रही है।

कृपया इसे जल्द से जल्द ठीक करें और बताएं कि हमें सेटिंग्स में क्या बदलना होगा।

धन्यवाद,
राहुल शर्मा`,
  },
  {
    id: "enterprise-billing",
    label: "Enterprise Billing",
    subject: "Invoice discrepancy on Enterprise plan — Q1 renewal",
    customer_name: "David Chen",
    email: `Hi Finance Team,\n\nWe're on the Enterprise plan (120 seats) and our Q1 invoice shows $14,200 instead of the contracted $12,800.\n\nContract ref: ENT-2024-8842\nWorkspace: NovaTech Global\n\nPlease reconcile before our audit next week.\n\nDavid Chen\nCFO, NovaTech`,
  },
  {
    id: "security",
    label: "Security Incident",
    subject: "Suspicious login attempts on shared mailbox",
    customer_name: "James Okonkwo",
    email: `URGENT — Security Team,\n\nWe detected 47 failed login attempts on support@company.com in the last 2 hours from IP ranges in multiple countries.\n\nPlease investigate immediately.\n\nJames Okonkwo, IT Security`,
  },
  {
    id: "oauth",
    label: "OAuth / Gmail",
    subject: "Gmail OAuth token expired — shared inbox disconnected",
    customer_name: "Maria Lopez",
    email: `Hi Support,\n\nOur shared mailbox lost Gmail sync. Console shows OAuth token expired. 12 agents blocked.\n\nWorkspace: Acme Support\nPlan: Pro\n\nMaria Lopez`,
  },
] as const;
