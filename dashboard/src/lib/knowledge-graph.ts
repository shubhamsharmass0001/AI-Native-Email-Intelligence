export const GRAPH_NODES = [
  "Billing", "Refund", "Technical", "Security", "Permissions",
  "API", "Subscription", "Account", "Shipping",
] as const;

export type GraphNodeId = (typeof GRAPH_NODES)[number];

export const GRAPH_EDGES: { from: GraphNodeId; to: GraphNodeId; type: string }[] = [
  { from: "Billing", to: "Refund", type: "RELATED_TO" },
  { from: "Billing", to: "Subscription", type: "RELATED_TO" },
  { from: "Billing", to: "Account", type: "BELONGS_TO" },
  { from: "Refund", to: "Subscription", type: "RELATED_TO" },
  { from: "Technical", to: "API", type: "USES_POLICY" },
  { from: "Technical", to: "Permissions", type: "RELATED_TO" },
  { from: "Technical", to: "Account", type: "RELATED_TO" },
  { from: "Security", to: "Account", type: "ESCALATES_TO" },
  { from: "Security", to: "API", type: "RELATED_TO" },
  { from: "Security", to: "Permissions", type: "RELATED_TO" },
  { from: "API", to: "Permissions", type: "USES_POLICY" },
  { from: "Subscription", to: "Account", type: "BELONGS_TO" },
  { from: "Shipping", to: "Account", type: "HAS_FAQ" },
];

export const NODE_META: Record<GraphNodeId, { policies: string; faqs: string; templates: string }> = {
  Billing: { policies: "billing.json", faqs: "billing_faq.json", templates: "billing_response.json" },
  Refund: { policies: "refund.json", faqs: "refund_faq.json", templates: "refund_response.json" },
  Technical: { policies: "technical.json", faqs: "technical_faq.json", templates: "technical_response.json" },
  Security: { policies: "security.json", faqs: "security_faq.json", templates: "security_response.json" },
  Permissions: { policies: "account.json", faqs: "permissions_faq.json", templates: "permissions_response.json" },
  API: { policies: "technical.json", faqs: "api_faq.json", templates: "api_response.json" },
  Subscription: { policies: "billing.json", faqs: "subscription_faq.json", templates: "subscription_response.json" },
  Account: { policies: "account.json", faqs: "account_faq.json", templates: "account_response.json" },
  Shipping: { policies: "shipping.json", faqs: "shipping_faq.json", templates: "shipping_response.json" },
};

/** Circular layout positions (0–100 coordinate space) */
export function nodePositions(): Record<GraphNodeId, { x: number; y: number }> {
  const positions = {} as Record<GraphNodeId, { x: number; y: number }>;
  GRAPH_NODES.forEach((id, i) => {
    const angle = (i / GRAPH_NODES.length) * 2 * Math.PI - Math.PI / 2;
    positions[id] = { x: 50 + 38 * Math.cos(angle), y: 50 + 38 * Math.sin(angle) };
  });
  return positions;
}
