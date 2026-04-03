/**
 * Parse page number from source text
 * Handles various formats like:
 * - "Page 5"
 * - "Page 5, Section 3"
 * - "Section 2, Page 10"
 * - "p. 5"
 * - "pp. 5-7"
 * - "5" (just a number)
 */
export function parsePageNumber(source) {
  if (!source) return null

  const sourceStr = String(source).toLowerCase()

  // Try to find "page X" pattern
  const pageMatch = sourceStr.match(/page\s+(\d+)/i)
  if (pageMatch) {
    return parseInt(pageMatch[1], 10)
  }

  // Try to find "p. X" or "p X" pattern
  const pMatch = sourceStr.match(/\bp\.?\s*(\d+)/i)
  if (pMatch) {
    return parseInt(pMatch[1], 10)
  }

  // Try to find "pp. X-Y" and take the first page
  const ppMatch = sourceStr.match(/pp\.?\s*(\d+)/i)
  if (ppMatch) {
    return parseInt(ppMatch[1], 10)
  }

  // Try to find standalone numbers (likely page numbers)
  const numberMatch = sourceStr.match(/\b(\d+)\b/)
  if (numberMatch) {
    const num = parseInt(numberMatch[1], 10)
    // Only return if it's a reasonable page number (1-1000)
    if (num >= 1 && num <= 1000) {
      return num
    }
  }

  return null
}

/**
 * Check if source contains page information
 */
export function hasPageInfo(source) {
  return parsePageNumber(source) !== null
}




