"""Application-wide constants."""

from typing import Final

INTENTS: Final[list[str]] = [
    "billing_inquiry",
    "invoice_request",
    "payment_failed",
    "subscription_upgrade",
    "subscription_downgrade",
    "subscription_cancel",
    "refund_request",
    "partial_refund",
    "charge_dispute",
    "shipping_delay",
    "shipping_tracking",
    "order_cancellation",
    "order_modification",
    "damaged_product",
    "missing_item",
    "password_reset",
    "account_locked",
    "two_factor_issue",
    "permission_denied",
    "role_change_request",
    "api_rate_limit",
    "api_key_rotation",
    "webhook_failure",
    "integration_error",
    "data_export_request",
    "gdpr_deletion",
    "security_incident",
    "phishing_report",
    "feature_request",
    "bug_report",
]

PRIORITIES: Final[list[str]] = ["critical", "high", "medium", "low"]

SENTIMENTS: Final[list[str]] = [
    "very_negative",
    "negative",
    "neutral",
    "positive",
    "very_positive",
]

CUSTOMER_TYPES: Final[list[str]] = [
    "enterprise",
    "business",
    "startup",
    "individual",
    "trial",
    "churned",
]

COMPANIES: Final[list[str]] = [
    "Stripe",
    "Slack",
    "Notion",
    "Linear",
    "Intercom",
    "Zendesk",
    "Freshdesk",
    "Hiver",
    "GitHub",
    "Acme Corp",
]

KNOWLEDGE_NODES: Final[list[str]] = [
    "Billing",
    "Refund",
    "Shipping",
    "Technical",
    "Security",
    "Account",
    "API",
    "Subscription",
    "Permissions",
]

EVALUATION_WEIGHTS: Final[dict[str, float]] = {
    "llm_judge": 0.35,
    "embedding_similarity": 0.35,
    "bertscore": 0.30,
}

JUDGE_CRITERIA: Final[list[str]] = [
    "correctness",
    "completeness",
    "empathy",
    "professionalism",
    "actionability",
    "safety",
    "hallucination",
    "policy_adherence",
]

VALIDATION_CHECKS: Final[list[str]] = [
    "no_hallucination",
    "action_items_present",
    "professional_tone",
    "grammar",
    "completeness",
    "policy_compliance",
]

DATASET_SPLIT: Final[dict[str, int]] = {
    "train": 220,
    "validation": 40,
    "test": 40,
}

TOTAL_DATASET_SIZE: Final[int] = 300
EXAMPLES_PER_INTENT: Final[int] = 10
