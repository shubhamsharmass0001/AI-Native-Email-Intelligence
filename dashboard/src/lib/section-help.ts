/** Short headings + purpose copy for dashboard info (i) tooltips */

export const METRIC_HELP = {
  quality: {
    heading: "Overall AI Quality",
    description:
      "Composite score from LLM judge, validation checks, and confidence. Higher means more accurate, complete, and policy-safe replies.",
  },
  latency: {
    heading: "Latency",
    description:
      "Time spent in each pipeline stage — generation (LLM), retrieval (Chroma + graph), and judge (Evaluate mode).",
  },
  tokens: {
    heading: "Token Usage",
    description:
      "LLM tokens consumed for this run. Prompt = input context; Completion = generated reply text.",
  },
  grounded: {
    heading: "Grounded Responses",
    description:
      "How well the reply stays anchored to retrieved knowledge. Policy = compliance checks; Risk = hallucination safety.",
  },
} as const;

export const PLAYGROUND_HELP = {
  heading: "Copilot Playground",
  description:
    "Paste or pick a sample ticket, then run Generate (draft reply) or Evaluate (score against a reference answer) through the LangGraph pipeline.",
  generate: {
    heading: "Generate",
    description: "Runs classification → RAG retrieval → LLM draft → validator. Returns a ready-to-send reply.",
  },
  evaluate: {
    heading: "Evaluate",
    description:
      "Full pipeline plus BERTScore, embedding similarity, and 8-criteria LLM judge vs your expected reply.",
  },
} as const;

export const TAB_HELP = {
  reply: {
    heading: "Reply",
    description: "Final AI-generated draft with confidence score, citations, and export actions.",
  },
  pipeline: {
    heading: "Pipeline",
    description:
      "Live LangGraph flow — intent, priority, sentiment, customer type, knowledge, generator, and validator agents.",
  },
  knowledge: {
    heading: "Knowledge Graph",
    description:
      "Interactive graph of policy/FAQ nodes visited for this intent. Highlights which knowledge areas informed the reply.",
  },
  quality: {
    heading: "Quality",
    description:
      "Validator agent checks — hallucination, tone, grammar, completeness, and policy adherence before sending.",
  },
  retrieval: {
    heading: "Retrieval",
    description:
      "Top documents from ChromaDB semantic search plus graph context. Shows scores and matched policy snippets.",
  },
  judge: {
    heading: "Judge",
    description:
      "LLM-as-judge scores (correctness, empathy, safety, etc.) compared to your expected reply — Evaluate mode only.",
  },
  insights: {
    heading: "Insights",
    description: "Execution timeline per node and explainability breakdown of how the overall score was computed.",
  },
} as const;

export const ANALYTICS_HELP = {
  heading: "Analytics",
  description:
    "Historical trends across your evaluation runs — quality over time, latency, intent performance, and judge score distribution.",
} as const;
