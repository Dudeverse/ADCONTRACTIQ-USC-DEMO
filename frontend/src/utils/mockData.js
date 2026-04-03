// Mock extracted data with classification
export const MOCK_EXTRACTED_DATA = {
  // Classification data
  classification: {
    contract_type: "master_agreement",
    partner_type: "publisher",
    complexity: "moderate",
    revenue_model: ["revenue_share", "cpm"],
    confidence: 0.92
  },
  
  // Contract info
  contract_info: {
    partner_name: "Premium Publisher LLC",
    effective_date: "January 1, 2024",
    expiration_date: "December 31, 2024",
    document_type: "Master Services Agreement"
  },
  
  // Rules array
  rules: [
    {
      rule_number: 1,
      rule_text: "Publisher receives 60% of Net Revenue after deducting 10% Cost of Sale",
      confidence: 0.95,
      source: "Section 3.2, Page 5",
      category: "revenue_share",
      approved: false,
      is_calculable: true,
      calculation_type: "percentage",
      extracted_values: {
        percentages: [60, 10],
        amounts: [],
        thresholds: [],
        operators: ["multiply", "subtract"]
      }
    },
    {
      rule_number: 2,
      rule_text: "Minimum CPM floor of $2.50 for premium inventory",
      confidence: 0.88,
      source: "Section 4.1, Page 7",
      category: "pricing",
      approved: false,
      is_calculable: true,
      calculation_type: "fixed_amount",
      extracted_values: {
        percentages: [],
        amounts: [2.50],
        thresholds: [],
        operators: []
      }
    },
    {
      rule_number: 3,
      rule_text: "5% bonus applied when viewability exceeds 70%",
      confidence: 0.91,
      source: "Section 5.3, Page 9",
      category: "performance",
      approved: false,
      is_calculable: true,
      calculation_type: "conditional",
      extracted_values: {
        percentages: [5, 70],
        amounts: [],
        thresholds: [70],
        operators: ["multiply"]
      }
    }
  ],
  
  // Glossary
  glossary: {
    "Net Revenue": "Gross Revenue less certain costs as defined in Section 2.1",
    "Cost of Sale": "10% of Gross Revenue for operational expenses",
    "Premium Inventory": "Ad placements with viewability >= 70%"
  },
  
  // Summary
  summary: "This is a revenue-sharing agreement between the platform and Premium Publisher LLC. The publisher receives 60% of net revenue after a 10% cost of sale deduction. The agreement includes a CPM floor of $2.50 for premium inventory and performance bonuses.",
  
  // Extraction stats
  extraction_stats: {
    total_rules_found: 3,
    calculable_rules: 3,
    skipped_rules: 0,
    skipped_reasons: []
  }
}

// Mock expressions data (for the expression builder)
export const MOCK_EXPRESSIONS = {
  calculation_chains: [
    {
      chain_id: "chain_1",
      label: "Publisher Revenue Share Calculation",
      description: "Calculate publisher's 60% share after 10% COS deduction",
      steps: [
        {
          step_number: 1,
          operation: "subtract",
          label: "Deduct Cost of Sale",
          formula: "Gross_Revenue * 0.10",
          formula_display: "Gross Revenue × 10%",
          variables: { Gross_Revenue: 100, Rate: 0.10 },
          result: 10.00,
          running_total: 90.00,
          display: "$100.00 - $10.00 (10% COS) = $90.00",
          rule_references: [1]
        },
        {
          step_number: 2,
          operation: "multiply",
          label: "Apply Publisher Share",
          formula: "Net_Revenue * 0.60",
          formula_display: "Net Revenue × 60%",
          variables: { Net_Revenue: 90, Rate: 0.60 },
          result: 54.00,
          running_total: 54.00,
          display: "$90.00 × 60% = $54.00",
          rule_references: [1]
        }
      ],
      final_amounts: {
        publisher: 54.00,
        platform: 36.00
      }
    },
    {
      chain_id: "chain_2",
      label: "Premium Inventory CPM Floor",
      description: "Ensure minimum $2.50 CPM for premium placements",
      steps: [
        {
          step_number: 1,
          operation: "conditional",
          label: "Check CPM Floor",
          formula: "MAX(Actual_CPM, Floor_CPM)",
          formula_display: "MAX(Actual CPM, $2.50)",
          variables: { Actual_CPM: 2.00, Floor_CPM: 2.50 },
          result: 2.50,
          running_total: 2.50,
          display: "CPM = MAX($2.00, $2.50) = $2.50",
          rule_references: [2]
        }
      ],
      final_amounts: {
        effective_cpm: 2.50
      }
    }
  ],
  summary: {
    total_chains: 2,
    rules_used: [1, 2],
    rules_not_used: [3],
    notes: "Viewability bonus (Rule 3) requires runtime data and is not pre-calculated"
  }
}

// Simulate API delay for demo mode
export const simulateAPIDelay = (min = 800, max = 1500) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}