"""Centralized prompt templates for all agents."""

SYSTEM_PROMPT = """You are a Senior Customer Support Engineer at a SaaS company.

Your goals:
- Be empathetic and acknowledge the customer's concern
- Never hallucinate or invent policies not in the provided knowledge
- Always use retrieved knowledge when answering policy questions
- Be concise but thorough
- Be actionable with clear next steps
- Always close professionally with an offer to help further

When you don't have information in the knowledge base, say so honestly and offer to escalate."""

INTENT_CLASSIFICATION_PROMPT = """Analyze this customer support email. Classify its intent and detect the primary language.

Subject: {subject}
Email: {email}

Choose the most specific intent from this list:
{intents}

Detect the primary language of the email (e.g. English, Spanish, German, French, Hindi, Japanese, Portuguese, Italian, Dutch, Chinese, etc.).

Return JSON only:
{{"intent": "<intent>", "language": "<detected language, default English>", "confidence": <0-1>, "reasoning": "<brief explanation>"}}"""

UNIFIED_CLASSIFICATION_PROMPT = """Analyze this customer support email and extract all classification dimensions in a single step.

Subject: {subject}
Email: {email}
Company: {company}

1. Intent: Choose the most specific intent from:
{intents}

2. Language: Detect primary language (e.g. English, Spanish, German, French, Hindi, Japanese, etc. default English).

3. Priority: Choose from: critical, high, medium, low
- critical: security breach, data loss, complete service outage, legal threat
- high: payment failures, account lockouts, shipping errors affecting business
- medium: billing questions, feature issues, general complaints
- low: feature requests, general inquiries, feedback

4. Sentiment: Choose from: very_negative, negative, neutral, positive, very_positive

5. Customer Type: Choose from: enterprise, business, startup, individual, trial, churned
- enterprise: SLA mentions, dedicated AM, compliance, large team
- business: small team, paid plan, regular usage
- startup: early stage, budget focus, growth
- individual: personal use, single user
- trial: evaluation, demo, trial period
- churned: cancellation, leaving

Return JSON only:
{{
  "intent": "<intent>",
  "language": "<language>",
  "priority": "<priority>",
  "sentiment": "<sentiment>",
  "customer_type": "<customer_type>",
  "confidence": <0.0-1.0>,
  "reasoning": "<brief explanation of key signals>"
}}"""

PRIORITY_CLASSIFICATION_PROMPT = """Analyze this customer support email and determine urgency priority.

Subject: {subject}
Email: {email}
Intent: {intent}

Priority levels: critical, high, medium, low

Guidelines:
- critical: security breach, data loss, complete service outage, legal threat
- high: payment failures, account lockouts, shipping errors affecting business
- medium: billing questions, feature issues, general complaints
- low: feature requests, general inquiries, feedback

Return JSON only:
{{"priority": "<level>", "confidence": <0-1>, "reasoning": "<brief explanation>"}}"""

SENTIMENT_ANALYSIS_PROMPT = """Analyze the sentiment of this customer support email.

Subject: {subject}
Email: {email}

Sentiment levels: very_negative, negative, neutral, positive, very_positive

Return JSON only:
{{"sentiment": "<level>", "confidence": <0-1>, "reasoning": "<brief explanation>"}}"""

CUSTOMER_TYPE_PROMPT = """Analyze this customer support email and infer the customer type.

Subject: {subject}
Email: {email}
Company: {company}

Customer types: enterprise, business, startup, individual, trial, churned

Look for signals like:
- Enterprise: mentions SLA, dedicated account manager, large team, compliance
- Business: small team, paid plan, regular usage
- Startup: early stage, limited budget, growth focus
- Individual: personal use, single user
- Trial: mentions trial period, evaluation, demo
- Churned: mentions cancellation, switching providers

Return JSON only:
{{"customer_type": "<type>", "confidence": <0-1>, "reasoning": "<brief explanation>"}}"""

GENERATION_PROMPT = """Draft a customer support reply based on the requested Persona, Tone, and Customer Language.

Customer: {customer_name}
Company: {company}
Subject: {subject}
Customer Language: {language}
Assigned Persona: {persona}
Desired Tone: {tone}

Email / Conversation Thread:
{email}

Analysis:
- Intent: {intent}
- Priority: {priority}
- Sentiment: {sentiment}
- Customer Type: {customer_type}

Retrieved Knowledge:
{knowledge_context}

Instructions:
1. Address the customer ({customer_name}) by name in the opening greeting (e.g., "Hi {customer_name}," or "Hello {customer_name},").
   - CRITICAL: You are drafting a reply TO {customer_name}. Always address the greeting specifically to {customer_name}.
   - Never copy or address any person named inside the incoming email body (for instance, if the incoming email says "Hi Shubh,", do NOT write "Hi Shubh," — you must address the customer who sent the message: "Hi {customer_name},").
2. Tone & Persona Guidelines:
   - Persona: Adopt the perspective, voice, and sign-off title of: {persona}.
     * If Persona is 'Student': You are writing from the perspective of a student/learner. Sign off strictly as:
       Best regards,
       [Your Name]
       Student
       (CRITICAL: NEVER sign off as "Senior Customer Support Engineer", "Support Agent", or "Support Team").
     * If Persona is 'Software Engineer': Write with technical precision and sign off as "[Your Name]\nSoftware Engineer".
     * If Persona is 'Tier 1 Support Agent': Sign off as "[Your Name]\nTier 1 Support Agent".
     * If Persona is 'Product Specialist': Sign off as "[Your Name]\nProduct Specialist".
   - Tone: Follow the style: {tone} (e.g. Professional & Formal, Friendly & Conversational, Concise & Direct, Empathetic & Reassuring).
3. Multi-Turn Thread Awareness: If the email contains a conversation thread or prior back-and-forth messages, reference past discussion points accurately and focus on resolving the latest question.
4. Multi-Language Reply: If Customer Language is NOT English (e.g. Spanish, German, Hindi, French, Japanese, etc.), draft the reply fluently and naturally in the customer's language ({language}), while keeping policy terms and citations grounded in the English knowledge base.
5. Use ONLY the retrieved knowledge for policy information. Never hallucinate unauthorized commitments.
6. Provide clear, actionable next steps and include relevant citations from knowledge base.
7. Close professionally with a polite sign-off matching the assigned persona ({persona}) and language.

Return JSON only:
{{
  "reply": "<full email reply>",
  "confidence": <0-1>,
  "reasoning": "<why this reply is appropriate>",
  "citations": ["<citation1>", "<citation2>"],
  "knowledge_used": ["<doc_id1>", "<doc_id2>"]
}}"""

VALIDATION_PROMPT = """Validate this customer support reply against quality standards.

Recipient / Customer: {customer_name}

Customer Email:
Subject: {subject}
{email}

Generated Reply:
{reply}

Retrieved Knowledge (ground truth for policies):
{knowledge_context}

Validate these criteria:
1. correct_recipient - Reply is properly addressed to the customer ({customer_name}). Do not consider addressing {customer_name} as an error even if the customer email body mentions another name.
2. no_hallucination - Reply doesn't invent policies not in knowledge
3. action_items_present - Reply includes clear next steps
4. professional_tone - Reply is professional and courteous
5. grammar - Reply has correct grammar and spelling
6. completeness - Reply fully addresses the customer's concern
7. policy_compliance - Reply follows stated policies

Return JSON only:
{{
  "passed": <true/false>,
  "overall_score": <0-1>,
  "checks": [
    {{"check": "<name>", "passed": <true/false>, "score": <0-1>, "details": "<explanation>"}}
  ],
  "revised_reply": "<improved reply if needed, or null>",
  "issues": ["<issue1>"]
}}"""

JUDGE_PROMPT = """You are an expert evaluator of customer support email replies.

Compare the generated reply against the expected reference reply.

Customer Email:
Subject: {subject}
{email}

Expected Reference Reply:
{expected_response}

Generated Reply:
{generated_reply}

Retrieved Knowledge:
{knowledge_context}

Evaluate on these criteria (score 0.0 to 1.0 each):
- correctness: Factual accuracy and correct information
- completeness: Addresses all customer concerns
- empathy: Appropriate emotional acknowledgment
- professionalism: Tone and language quality
- actionability: Clear next steps provided
- safety: No harmful or inappropriate content
- hallucination: 1.0 = no hallucination, 0.0 = severe hallucination
- policy_adherence: Follows company policies from knowledge base

Return JSON only:
{{
  "correctness": <0-1>,
  "completeness": <0-1>,
  "empathy": <0-1>,
  "professionalism": <0-1>,
  "actionability": <0-1>,
  "safety": <0-1>,
  "hallucination": <0-1>,
  "policy_adherence": <0-1>,
  "overall": <0-1>,
  "feedback": "<detailed feedback>"
}}"""

PROMPT_BUILDER_TEMPLATE = """You are preparing context for a support reply generator.

Customer Email:
Subject: {subject}
{email}

Intent: {intent}
Priority: {priority}
Sentiment: {sentiment}
Customer Type: {customer_type}

Knowledge Context:
{knowledge_context}

Generate a focused prompt for the reply generator."""
