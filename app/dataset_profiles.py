"""Intent-specific scenario profiles for high-quality dataset generation."""

from typing import Final

INTENT_SCENARIOS: Final[dict[str, str]] = {
    "billing_inquiry": "Customer asks about invoice line items, proration, or tax on a shared inbox SaaS plan",
    "invoice_request": "Finance team needs PDF invoice for expense report before quarter close",
    "payment_failed": "Credit card expired; team shared inbox about to be suspended during peak season",
    "subscription_upgrade": "Growing support team needs more seats and advanced automation features",
    "subscription_downgrade": "Startup cutting costs wants to reduce seats but keep email history",
    "subscription_cancel": "Customer switching to competitor; mentions Hiver Gmail integration specifically",
    "refund_request": "Accidental annual purchase within refund window; wants money back",
    "partial_refund": "Paid for unused seats after team layoffs; requests pro-rated credit",
    "charge_dispute": "Duplicate charge on credit card for same billing period",
    "shipping_delay": "Hardware token or swag shipment delayed for onboarding kit",
    "shipping_tracking": "Missing tracking number for welcome kit sent to remote team",
    "order_cancellation": "Cancel add-on order placed by former admin",
    "order_modification": "Change shipping address for physical welcome package",
    "damaged_product": "Received damaged onboarding materials or hardware",
    "missing_item": "Welcome kit missing items promised in enterprise contract",
    "password_reset": "Support agent locked out of Hiver/Gmail connected account",
    "account_locked": "Multiple failed logins after SSO migration",
    "two_factor_issue": "Lost authenticator device; needs backup codes for shared mailbox access",
    "permission_denied": "Agent cannot assign emails in shared inbox due to role restrictions",
    "role_change_request": "Admin wants to promote agent to supervisor with analytics access",
    "api_rate_limit": "Integration hitting API limits syncing tickets from Zendesk/Intercom",
    "api_key_rotation": "Security audit requires rotating API keys without downtime",
    "webhook_failure": "Slack/Teams webhook notifications stopped firing for new assignments",
    "integration_error": "Gmail shared label sync broken after Google Workspace policy change",
    "data_export_request": "Compliance team needs export of all shared inbox conversations",
    "gdpr_deletion": "Former employee requests deletion of personal data under GDPR",
    "security_incident": "Suspicious login from unknown IP on shared mailbox account",
    "phishing_report": "Customer received phishing email impersonating support",
    "feature_request": "Request for AI Copilot to draft replies in specific brand tone",
    "bug_report": "Email threads not appearing in shared inbox; collision detection failing",
}

HIVER_CONTEXT: Final[str] = """
Context: Emails are for a B2B SaaS company like Hiver (shared inbox inside Gmail/Outlook).
Agents manage customer support via shared mailboxes, assignments, SLAs, tags, automations, and AI Copilot drafts.
Use realistic SaaS support details: workspace name, seat count, plan tier (Lite/Pro/Enterprise),
Gmail/Outlook integration, shared mailbox address, ticket/thread IDs, SLA breach mentions.
"""

COMPANY_STYLE: Final[dict[str, str]] = {
    "Hiver": "Shared inbox SaaS; mention Gmail labels, assignments, collision detection, AI Copilot",
    "Stripe": "Payments infrastructure; precise, developer-friendly tone",
    "Slack": "Collaboration; casual-professional, emoji-light",
    "Notion": "Productivity; clear, helpful, documentation links",
    "Linear": "Issue tracking; concise, engineering-aware",
    "Intercom": "Conversational support; warm, proactive",
    "Zendesk": "Ticketing; structured, ticket-number references",
    "Freshdesk": "SMB support; friendly, step-by-step",
    "GitHub": "Developer platform; technical, markdown-friendly",
    "Acme Corp": "Generic enterprise B2B customer writing to their vendor",
}
