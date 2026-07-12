// LegalLucy configuration
const env = import.meta.env

const envString = (key, fallback) => {
  if (env[key] !== undefined) return env[key]
  return fallback
}

const N8N_BASE_URL = envString("VITE_N8N_BASE_URL", "https://adqv3.app.n8n.cloud")
const N8N_WEBHOOK_PREFIX = envString("VITE_N8N_WEBHOOK_PREFIX", "webhook")

const joinUrl = (baseUrl, path) => {
  let base = baseUrl
  if (base.endsWith("/")) {
    base = base.slice(0, -1)
  }
  let suffix = path
  if (!suffix.startsWith("/")) {
    suffix = `/${suffix}`
  }
  return `${base}${suffix}`
}

const webhookPath = (name) => `/${N8N_WEBHOOK_PREFIX}/${name}`

const envBool = (key, fallback) => {
  const value = env[key]
  if (value === undefined) return fallback
  return value === "true"
}

const envNumber = (key, fallback) => {
  const value = Number.parseFloat(env[key])
  if (Number.isNaN(value)) return fallback
  return value
}

export const CONFIG = {
  N8N_CLASSIFY_URL: envString(
    "VITE_N8N_CLASSIFY_URL",
    joinUrl(N8N_BASE_URL, webhookPath("classify-contract"))
  ),
  N8N_EXTRACT_URL: envString(
    "VITE_N8N_EXTRACT_URL",
    joinUrl(N8N_BASE_URL, webhookPath("extract-rules"))
  ),
  N8N_EXPRESSIONS_URL: envString(
    "VITE_N8N_EXPRESSIONS_URL",
    joinUrl(N8N_BASE_URL, webhookPath("build-expressions"))
  ),

  APP_NAME: envString("VITE_APP_NAME", "LegalLucy"),
  APP_VERSION: envString("VITE_APP_VERSION", "1.0.0"),

  ENABLE_EXPRESSIONS: envBool("VITE_ENABLE_EXPRESSIONS", true),
  ENABLE_JSON_UPLOAD: envBool("VITE_ENABLE_JSON_UPLOAD", false),
  ENABLE_DEMO_MODE: envBool("VITE_ENABLE_DEMO_MODE", false),

  CONFIDENCE_HIGH: envNumber("VITE_CONFIDENCE_HIGH", 0.85),
  CONFIDENCE_MEDIUM: envNumber("VITE_CONFIDENCE_MEDIUM", 0.70),
};
