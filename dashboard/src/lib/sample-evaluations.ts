import type { DashboardMetrics } from "./types";

export interface SampleEvaluationRecord {
  id: string;
  subject: string;
  customer_name: string;
  customer_type: string;
  intent: string;
  priority: string;
  sentiment: string;
  language: string;
  tone: string;
  persona: string;
  overall_score: number;
  overall_latency_ms: number;
  generated_reply: {
    reply: string;
    confidence: number;
    tokens: number;
    latency_ms: number;
    citations: string[];
    reasoning: string;
  };
  validated_reply: {
    final_reply: string;
    validation: {
      passed: boolean;
      overall_score: number;
      checks: Array<{ check: string; passed: boolean; score: number; reasoning: string }>;
    };
  };
  bertscore?: { f1: number; precision: number; recall: number };
  embedding_score?: { cosine_similarity: number };
  judge_score?: { score: number; hallucination: number; reasoning: string };
  node_metrics?: Record<string, { latency_ms: number; tokens: number; output_summary?: string }>;
}

export const SAMPLE_EVALUATION_RECORDS: SampleEvaluationRecord[] = [
  {
    id: "eval-sample-1",
    subject: "Re: SSO & 2FA setup issues on Enterprise workspace",
    customer_name: "Carlos Mendez",
    customer_type: "enterprise",
    intent: "security_incident",
    priority: "urgent",
    sentiment: "frustrated",
    language: "English",
    tone: "Professional & Formal",
    persona: "Tier 1 Support Agent",
    overall_score: 0.96,
    overall_latency_ms: 3200,
    generated_reply: {
      reply: "Hi Carlos,\n\nThank you for following up. I understand how critical SAML authentication is for your administrative team.\n\nBased on your Okta IdP certificate rotation, please follow these steps:\n1. In your Okta Admin Console, navigate to Applications > AI-Native Email Intelligence > Sign On.\n2. Download the updated X.509 Certificate (SHA-256) and upload it to Workspace Settings > Security > SAML/SSO.\n3. Ensure the Audience URI (Entity ID) matches `urn:ai-native-email:sso:global-logistics`.\n4. Flush browser session cookies and test via an incognito window.\n\nOur engineering team has verified your IdP certificate binding on our cluster. Please let us know if the issue persists.\n\nBest regards,\nTier 1 Support Team",
      confidence: 0.96,
      tokens: 1450,
      latency_ms: 1800,
      citations: ["Security & SAML Authentication Policy v3.2", "Okta IdP Integration Guide"],
      reasoning: "Grounded in Okta SAML rotation policy and SHA-256 certificate binding requirements.",
    },
    validated_reply: {
      final_reply: "Hi Carlos,\n\nThank you for following up. I understand how critical SAML authentication is for your administrative team...",
      validation: {
        passed: true,
        overall_score: 0.98,
        checks: [
          { check: "no_hallucination", passed: true, score: 0.98, reasoning: "All IdP endpoints match knowledge base." },
          { check: "policy_compliance", passed: true, score: 1.0, reasoning: "Complies with enterprise security escalation SLA." },
          { check: "tone_consistency", passed: true, score: 0.96, reasoning: "Professional, clear, and empathetic." },
        ],
      },
    },
    judge_score: { score: 0.96, hallucination: 0.98, reasoning: "Accurate troubleshooting steps for SAML cert rotation." },
  },
  {
    id: "eval-sample-2",
    subject: "Shared inbox emails not syncing after Gmail update",
    customer_name: "Maria Lopez",
    customer_type: "enterprise",
    intent: "integration_error",
    priority: "urgent",
    sentiment: "urgent",
    language: "English",
    tone: "Professional & Formal",
    persona: "Tier 1 Support Agent",
    overall_score: 0.94,
    overall_latency_ms: 2800,
    generated_reply: {
      reply: "Hi Maria,\n\nThank you for reaching out urgently. I understand that 12 support agents are impacted by the Gmail sync stoppage.\n\nI have investigated our Gmail API connector status:\n1. Please check if your Google Workspace admin has re-authorized OAuth scopes under Google Admin > Security > API Controls.\n2. Have one admin disconnect and reconnect the shared inbox under Settings > Channels > Gmail.\n3. Our webhook listener is receiving events normally, but token refreshes were paused during the Google permission update.\n\nI will monitor your shared mailbox sync every 15 minutes and update you directly.\n\nBest regards,\nSupport Operations",
      confidence: 0.95,
      tokens: 1620,
      latency_ms: 1650,
      citations: ["Gmail Integration & OAuth Scope Requirements", "Shared Inbox Sync SLA"],
      reasoning: "Directly addresses 12 affected agents with OAuth refresh steps.",
    },
    validated_reply: {
      final_reply: "Hi Maria,\n\nThank you for reaching out urgently...",
      validation: {
        passed: true,
        overall_score: 0.95,
        checks: [
          { check: "no_hallucination", passed: true, score: 0.96, reasoning: "Uses standard OAuth reconnection flow." },
          { check: "policy_compliance", passed: true, score: 0.95, reasoning: "Provides immediate workaround within SLA." },
        ],
      },
    },
    judge_score: { score: 0.94, hallucination: 0.96, reasoning: "Helpful, actionable, and SLA-compliant reply." },
  },
  {
    id: "eval-sample-3",
    subject: "Duplicate charge for Pro tier annual renewal",
    customer_name: "David Chen",
    customer_type: "business",
    intent: "billing_inquiry",
    priority: "high",
    sentiment: "frustrated",
    language: "English",
    tone: "Empathetic & Reassuring",
    persona: "Tier 1 Support Agent",
    overall_score: 0.98,
    overall_latency_ms: 2100,
    generated_reply: {
      reply: "Hi David,\n\nThank you for bringing this to our attention. I apologize for the confusion caused by the duplicate renewal invoice.\n\nI have reviewed invoice #INV-89211 and confirmed that an automated retry caused a duplicate transaction of $480.00. I have processed an immediate refund for the secondary charge.\n\n- Refund Reference: RF-99201 ($480.00)\n- Timeline: The funds will reflect in your account within 3–5 business days depending on your bank.\n\nPlease let me know if you require an updated statement.\n\nWarm regards,\nBilling Support",
      confidence: 0.98,
      tokens: 1180,
      latency_ms: 1200,
      citations: ["Billing & Refund Policy §4.1", "Duplicate Charge Resolution Protocol"],
      reasoning: "Strictly aligns with automated refund protocol without inventing policies.",
    },
    validated_reply: {
      final_reply: "Hi David,\n\nThank you for bringing this to our attention...",
      validation: {
        passed: true,
        overall_score: 0.99,
        checks: [
          { check: "no_hallucination", passed: true, score: 1.0, reasoning: "Complies with standard 3-5 business day refund window." },
          { check: "policy_compliance", passed: true, score: 1.0, reasoning: "Full refund issued per policy." },
        ],
      },
    },
    judge_score: { score: 0.98, hallucination: 1.0, reasoning: "Flawless billing response with high empathy." },
  },
  {
    id: "eval-sample-4",
    subject: "API Rate limit 429 error on batch webhook sync",
    customer_name: "Sarah Jenkins",
    customer_type: "enterprise",
    intent: "api_rate_limit",
    priority: "high",
    sentiment: "neutral",
    language: "English",
    tone: "Professional & Formal",
    persona: "Software Engineer",
    overall_score: 0.91,
    overall_latency_ms: 3500,
    generated_reply: {
      reply: "Hi Sarah,\n\nThanks for reaching out to engineering support.\n\nYour Enterprise tier allows up to 1,200 requests/minute. The 429 status code indicates that your batch worker triggered 1,450 requests during the 02:00 UTC sync.\n\nRecommendations:\n1. Inspect the `Retry-After` header in 429 responses and implement exponential backoff with jitter.\n2. Use our `/v2/batch/messages` endpoint to bundle up to 100 events per HTTP payload.\n3. If your burst throughput requires it, we can temporarily lift your rate limit to 2,500 req/min for testing.\n\nBest regards,\nDeveloper Relations",
      confidence: 0.92,
      tokens: 1840,
      latency_ms: 1950,
      citations: ["REST API Rate Limiting Specifications", "Batch Webhook Architecture Guide"],
      reasoning: "Provides correct technical guidance, endpoint names, and architectural solutions.",
    },
    validated_reply: {
      final_reply: "Hi Sarah,\n\nThanks for reaching out to engineering support...",
      validation: {
        passed: true,
        overall_score: 0.92,
        checks: [
          { check: "no_hallucination", passed: true, score: 0.93, reasoning: "Accurate rate limit recommendations." },
          { check: "policy_compliance", passed: true, score: 0.94, reasoning: "Follows engineering escalation policy." },
        ],
      },
    },
    judge_score: { score: 0.91, hallucination: 0.93, reasoning: "High technical accuracy and concrete next steps." },
  },
  {
    id: "eval-sample-5",
    subject: "Problema con la sincronización de Gmail y facturación duplicada",
    customer_name: "Alejandro Gómez",
    customer_type: "pro",
    intent: "refund_request",
    priority: "medium",
    sentiment: "neutral",
    language: "Spanish",
    tone: "Friendly & Warm",
    persona: "Tier 1 Support Agent",
    overall_score: 0.95,
    overall_latency_ms: 2600,
    generated_reply: {
      reply: "Hola Alejandro,\n\nMuchas gracias por comunicarte con nosotros. Lamento los inconvenientes con la sincronización y el cobro duplicado.\n\n1. Con respecto al cobro duplicado: he revisado tu cuenta y procesado el reembolso inmediato de los 49€ correspondientes al segundo cargo. Lo verás reflejado en tu extracto en 3 a 5 días laborables.\n2. Con respecto a Gmail: por favor ingresa a Configuración > Integraciones > Gmail y presiona 'Reconectar'.\n\nQuedo a tu total disposición si necesitas asistencia adicional.\n\nUn cordial saludo,\nEquipo de Soporte",
      confidence: 0.94,
      tokens: 1320,
      latency_ms: 1400,
      citations: ["Multilingual Support Playbook", "Refund & Gmail Sync Guidelines"],
      reasoning: "Perfect Spanish fluency and dual-intent resolution (billing refund + Gmail sync).",
    },
    validated_reply: {
      final_reply: "Hola Alejandro,\n\nMuchas gracias por comunicarte...",
      validation: {
        passed: true,
        overall_score: 0.96,
        checks: [
          { check: "no_hallucination", passed: true, score: 0.96, reasoning: "Proper Spanish grammar and policy compliance." },
          { check: "policy_compliance", passed: true, score: 0.98, reasoning: "Addresses both refund and sync issues." },
        ],
      },
    },
    judge_score: { score: 0.95, hallucination: 0.96, reasoning: "Excellent multi-intent Spanish reply." },
  },
  {
    id: "eval-sample-6",
    subject: "User seat provisioning and permission denied error",
    customer_name: "Elena Rostova",
    customer_type: "business",
    intent: "permission_denied",
    priority: "medium",
    sentiment: "neutral",
    language: "English",
    tone: "Concise & Direct",
    persona: "Product Specialist",
    overall_score: 0.89,
    overall_latency_ms: 2400,
    generated_reply: {
      reply: "Hi Elena,\n\nThanks for reaching out.\n\nThe 'Permission Denied: Seat Limit Exceeded' error occurs when your assigned seats equal your purchased plan licenses (currently 15/15 seats in use).\n\nTo invite new team members:\n1. Go to Admin > Billing > Manage Seats and add 5 additional licenses ($12/seat/mo).\n2. Alternatively, revoke access for inactive users under Admin > Users & Roles.\n3. Once updated, your pending invitations will send automatically.\n\nBest regards,\nProduct Operations",
      confidence: 0.90,
      tokens: 1250,
      latency_ms: 1300,
      citations: ["Seat Provisioning & Role Management", "Subscription Add-on Pricing"],
      reasoning: "Clear breakdown of seat limits and concise instructions.",
    },
    validated_reply: {
      final_reply: "Hi Elena,\n\nThanks for reaching out...",
      validation: {
        passed: true,
        overall_score: 0.91,
        checks: [
          { check: "no_hallucination", passed: true, score: 0.92, reasoning: "Accurate seat license workflows." },
          { check: "policy_compliance", passed: true, score: 0.95, reasoning: "Concise and action-oriented." },
        ],
      },
    },
    judge_score: { score: 0.89, hallucination: 0.92, reasoning: "Clear and direct resolution." },
  },
  {
    id: "eval-sample-7",
    subject: "Upgrade from Startup to Enterprise tier contract inquiry",
    customer_name: "Liam O'Connor",
    customer_type: "startup",
    intent: "subscription_upgrade",
    priority: "low",
    sentiment: "positive",
    language: "English",
    tone: "Friendly & Warm",
    persona: "Product Specialist",
    overall_score: 0.97,
    overall_latency_ms: 1900,
    generated_reply: {
      reply: "Hi Liam,\n\nCongratulations on your team's growth! We're excited to support your transition to the Enterprise plan.\n\nThe Enterprise tier includes dedicated SSO/SAML, 99.99% uptime SLA, custom AI fine-tuning weights, and an assigned Customer Success Manager.\n\nI have connected your inquiry directly with our Solutions team. Our enterprise specialist, Marcus Vance, will reach out today with a custom quote and onboarding schedule.\n\nBest regards,\nGrowth & Partnerships Team",
      confidence: 0.97,
      tokens: 1050,
      latency_ms: 1100,
      citations: ["Enterprise Tier Feature Matrix", "Sales Routing Protocol"],
      reasoning: "Warm, professional upgrade inquiry response with seamless team handoff.",
    },
    validated_reply: {
      final_reply: "Hi Liam,\n\nCongratulations on your team's growth!...",
      validation: {
        passed: true,
        overall_score: 0.98,
        checks: [
          { check: "no_hallucination", passed: true, score: 0.98, reasoning: "Correct enterprise feature highlights." },
          { check: "policy_compliance", passed: true, score: 1.0, reasoning: "Proper enterprise sales routing." },
        ],
      },
    },
    judge_score: { score: 0.97, hallucination: 0.98, reasoning: "Great tone and flawless sales routing." },
  },
  {
    id: "eval-sample-8",
    subject: "Sicherheitsvorfall: Verdächtige Anmeldeversuche im Postfach",
    customer_name: "Klaus Weber",
    customer_type: "enterprise",
    intent: "security_incident",
    priority: "urgent",
    sentiment: "urgent",
    language: "German",
    tone: "Professional & Formal",
    persona: "Software Engineer",
    overall_score: 0.93,
    overall_latency_ms: 3100,
    generated_reply: {
      reply: "Sehr geehrter Herr Weber,\n\nvielen Dank für Ihren dringenden Sicherheitshinweis. Wir nehmen unbefugte Anmeldeversuche äußerst ernst.\n\nSofortige Maßnahmen unseres Security Operations Centers:\n1. Die genannten verdächtigen IP-Bereiche wurden temporär in unserer Web Application Firewall (WAF) gesperrt.\n2. Für Ihr gesamtes Postfach wurde die erzwungene 2-Faktor-Authentifizierung (2FA) aktiviert.\n3. Ein vollständiger Audit-Log-Export der letzten 48 Stunden wird aktuell generiert und Ihnen verschlüsselt zugestellt.\n\nWir halten Sie kontinuierlich über den Fortschritt auf dem Laufenden.\n\nMit freundlichen Grüßen,\nSecurity Operations Team",
      confidence: 0.93,
      tokens: 1540,
      latency_ms: 1700,
      citations: ["Security Incident Escalation Protocol §2", "Audit Log & WAF Enforcement"],
      reasoning: "Strict German security protocol reply matching enterprise SLA.",
    },
    validated_reply: {
      final_reply: "Sehr geehrter Herr Weber,\n\nvielen Dank für Ihren dringenden Sicherheitshinweis...",
      validation: {
        passed: true,
        overall_score: 0.94,
        checks: [
          { check: "no_hallucination", passed: true, score: 0.95, reasoning: "Standard enterprise security response protocol." },
          { check: "policy_compliance", passed: true, score: 0.96, reasoning: "German tone and terminology are accurate." },
        ],
      },
    },
    judge_score: { score: 0.93, hallucination: 0.95, reasoning: "High urgency, formal German security response." },
  },
];

export const DEFAULT_SAMPLE_METRICS: DashboardMetrics = {
  average_score: 0.94,
  average_latency_ms: 2700,
  average_tokens: 1406,
  total_processed: 28,
  hallucination_rate: 0.04,
  judge_distribution: {
    "5": 22,
    "4": 5,
    "3": 1,
    "2": 0,
    "1": 0,
  },
  priority_distribution: {
    urgent: 10,
    high: 8,
    medium: 6,
    low: 4,
  },
  customer_type_distribution: {
    enterprise: 12,
    business: 8,
    pro: 5,
    startup: 3,
  },
  sentiment_distribution: {
    frustrated: 8,
    urgent: 9,
    neutral: 7,
    positive: 4,
  },
  intent_distribution: {
    security_incident: 7,
    integration_error: 6,
    billing_inquiry: 5,
    api_rate_limit: 4,
    refund_request: 3,
    subscription_upgrade: 3,
  },
  top_intents: [
    { intent: "billing_inquiry", avg_score: 0.98 },
    { intent: "subscription_upgrade", avg_score: 0.97 },
    { intent: "security_incident", avg_score: 0.95 },
    { intent: "refund_request", avg_score: 0.95 },
    { intent: "integration_error", avg_score: 0.94 },
    { intent: "api_rate_limit", avg_score: 0.91 },
  ],
  worst_intents: [
    { intent: "permission_denied", avg_score: 0.89 },
    { intent: "api_rate_limit", avg_score: 0.91 },
  ],
  last_updated: new Date().toISOString(),
  llm_provider: "groq",
  llm_model: "openai/gpt-oss-20b",
  fallback_provider: "gemini",
  fallback_used: false,
};
