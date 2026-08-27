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
    id: "webhook-rate-limit",
    label: "⚡ Webhook Outage & 429",
    subject: "CRITICAL: Webhook deliverability drops & 429 rate limit spike on production cluster",
    customer_name: "Rachel Vance",
    email: `Hi Platform Engineering Team,

Since 08:00 UTC, our production payment reconciliation service has been receiving 429 Too Many Requests errors on your /v2/events endpoint. Our dead-letter queue is backing up (over 18,000 unhandled webhook payloads) and impacting checkout settlements.

Details:
- Organization: FinTech Core Infrastructure (Enterprise Tier)
- API Key ID: key_live_89f92a01ce
- Cluster: us-east-1 prod-worker-04

Could you please temporarily burst our rate limit ceiling from 2,000 req/min to 5,000 req/min and verify if any upstream egress throttling is active on your load balancers?

Thanks,
Rachel Vance
Principal SRE, FinTech Core`,
  },
  {
    id: "scim-rbac-audit",
    label: "🔒 SCIM & RBAC Audit",
    subject: "SOC2 Audit: SCIM auto-deprovisioning failing for offboarded employees",
    customer_name: "Marcus Thorne",
    email: `Hi Security & Compliance Support,

We are currently undergoing our annual SOC2 Type II compliance audit and identified an urgent issue with automated SCIM user provisioning.

When employees are deactivated in Microsoft Entra ID (Azure AD), their corresponding seat licenses in our shared workspace remain active with "Read/Write" permissions instead of being suspended.

Workspace: Apex Health Systems (Enterprise Health Plan)
Tenant ID: tenant_77a901-scim-v2

Please provide:
1. The root cause for the SCIM 403 Forbidden sync error on the /scim/v2/Users endpoint.
2. An encrypted audit log export of all deprovisioning events from the past 90 days for our compliance auditors.

Best regards,
Marcus Thorne
VP of Information Security, Apex Health Systems`,
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

