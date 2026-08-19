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

INTENT_CLASSIFICATION_PROMPT = """Analyze this customer support email and classify its intent.

Subject: {subject}
Email: {email}

Choose the most specific intent from this list:
{intents}

Return JSON only:
{{"intent": "<intent>", "confidence": <0-1>, "reasoning": "<brief explanation>"}}"""

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

GENERATION_PROMPT = """Draft a professional customer support reply.

Customer: {customer_name}
Company: {company}
Subject: {subject}
Email:
{email}

Analysis:
- Intent: {intent}
- Priority: {priority}
- Sentiment: {sentiment}
- Customer Type: {customer_type}

Retrieved Knowledge:
{knowledge_context}

Instructions:
1. Address the customer by name
2. Acknowledge their concern with appropriate empathy given sentiment: {sentiment}
3. Use ONLY the retrieved knowledge for policy information
4. Provide clear, actionable next steps
5. Include relevant citations from knowledge base
6. Close professionally

Return JSON only:
{{
  "reply": "<full email reply>",
  "confidence": <0-1>,
  "reasoning": "<why this reply is appropriate>",
  "citations": ["<citation1>", "<citation2>"],
  "knowledge_used": ["<doc_id1>", "<doc_id2>"]
}}"""

VALIDATION_PROMPT = """Validate this customer support reply against quality standards.

Customer Email:
Subject: {subject}
{email}

Generated Reply:
{reply}

Retrieved Knowledge (ground truth for policies):
{knowledge_context}

Validate these criteria:
1. no_hallucination - Reply doesn't invent policies not in knowledge
2. action_items_present - Reply includes clear next steps
3. professional_tone - Reply is professional and courteous
4. grammar - Reply has correct grammar and spelling
5. completeness - Reply fully addresses the customer's concern
6. policy_compliance - Reply follows stated policies

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
