// LegalLucy configuration
const N8N_BASE_URL = "https://pamv3demo.app.n8n.cloud"
// these are the paths for the webhooks
const N8N_WEBHOOK_PATHS = {
  CLASSIFY_CONTRACT: "/webhook-test/classify-contract",
  EXTRACT_RULES: "/webhook-test/extract-rules",
  BUILD_EXPRESSIONS: "/webhook-test/build-expressions",
}

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

const env = import.meta.env

const envString = (key, fallback) => {
  if (env[key] !== undefined) return env[key]
  return fallback
}

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
  N8N_CLASSIFY_URL: joinUrl(N8N_BASE_URL, N8N_WEBHOOK_PATHS.CLASSIFY_CONTRACT),
  N8N_EXTRACT_URL: joinUrl(N8N_BASE_URL, N8N_WEBHOOK_PATHS.EXTRACT_RULES),
  N8N_EXPRESSIONS_URL: joinUrl(N8N_BASE_URL, N8N_WEBHOOK_PATHS.BUILD_EXPRESSIONS),

  APP_NAME: envString("VITE_APP_NAME", "LegalLucy"),
  APP_VERSION: envString("VITE_APP_VERSION", "1.0.0"),

  ENABLE_EXPRESSIONS: envBool("VITE_ENABLE_EXPRESSIONS", true),
  ENABLE_JSON_UPLOAD: envBool("VITE_ENABLE_JSON_UPLOAD", false),
  ENABLE_DEMO_MODE: envBool("VITE_ENABLE_DEMO_MODE", false),

  CONFIDENCE_HIGH: envNumber("VITE_CONFIDENCE_HIGH", 0.85),
  CONFIDENCE_MEDIUM: envNumber("VITE_CONFIDENCE_MEDIUM", 0.70),
};
