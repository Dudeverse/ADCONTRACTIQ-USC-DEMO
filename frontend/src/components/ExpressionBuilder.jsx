import React, { useState } from 'react'
import { CONFIG } from '../config'
import { MOCK_EXPRESSIONS, simulateAPIDelay } from '../utils/mockData'


function EBChain({ chain, index, expandedChains, toggleChain, formatCurrency, getOperationSymbol }) {
  const isOpen = expandedChains[index]
  return (
    <div className="cp-accordion-section">
      <button className="cp-accordion-header" onClick={() => toggleChain(index)}>
        <span className="cp-accordion-title">{chain.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {chain.steps?.length > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {chain.steps.length} steps
            </span>
          )}
          <span className={`cp-accordion-chevron ${isOpen ? 'open' : ''}`}>›</span>
        </div>
      </button>
      {isOpen && (
        <div className="cp-accordion-body">
          {chain.description && (
            <p className="cp-summary-text" style={{ marginBottom: '1rem' }}>{chain.description}</p>
          )}
          <div className="eb-steps-list">
            {chain.steps?.map((step, stepIdx) => (
              <div key={stepIdx} className="eb-step-card">
                <div className="eb-step-card-header">
                  <span className="eb-step-num">{step.step_number}</span>
                  <span className="eb-step-label">{step.label}</span>
                  {step.rule_references?.length > 0 && (
                    <span className="eb-rule-ref">Rule {step.rule_references.join(', ')}</span>
                  )}
                </div>
                {step.formula_display && (
                  <div className="eb-step-formula">{step.formula_display}</div>
                )}
                {step.display && (
                  <div className="eb-step-display">{step.display}</div>
                )}
                <div className="eb-step-amounts">
                  <span className="eb-step-op">{getOperationSymbol(step.operation)}</span>
                  <span className="eb-step-result">{formatCurrency(step.result)}</span>
                  {step.running_total !== undefined && (
                    <span className="eb-running-total">→ {formatCurrency(step.running_total)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {chain.final_amounts && Object.keys(chain.final_amounts).length > 0 && (
            <div className="eb-final-amounts">
              <span className="eb-final-label">Final Distribution</span>
              {Object.entries(chain.final_amounts).map(([party, amount]) => (
                <div key={party} className="eb-final-row">
                  <span className="cp-label">{party}</span>
                  <span className="eb-final-amount">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EBSummary({ expressions, baseRevenue, setBaseRevenue, buildExpressions }) {
  const [isOpen, setIsOpen] = React.useState(false)
  return (
    <div className="cp-accordion-section">
      <button className="cp-accordion-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="cp-accordion-title">Summary</span>
        <span className={`cp-accordion-chevron ${isOpen ? 'open' : ''}`}>›</span>
      </button>
      {isOpen && (
        <div className="cp-accordion-body">
          <div className="cp-grid">
            <div className="cp-row">
              <span className="cp-label">Calculation chains</span>
              <span className="cp-value">{expressions.calculation_chains.length}</span>
            </div>
            <div className="cp-row">
              <span className="cp-label">Rules used</span>
              <span className="cp-value">{expressions.summary?.rules_used?.length || 0}</span>
            </div>
            <div className="cp-row">
              <span className="cp-label">Total steps</span>
              <span className="cp-value">{expressions.calculation_chains.reduce((sum, c) => sum + (c.steps?.length || 0), 0)}</span>
            </div>
            <div className="cp-row">
              <span className="cp-label">Recalculate with revenue</span>
              <div className="eb-revenue-input-row">
                <span className="eb-currency">$</span>
                <input
                  type="number"
                  className="eb-revenue-input"
                  value={baseRevenue}
                  onChange={(e) => setBaseRevenue(Number(e.target.value))}
                  min="1"
                  step="100"
                />
                <button
                  className="rr-btn-verify"
                  style={{ marginLeft: '0.5rem' }}
                  onClick={() => buildExpressions(baseRevenue)}
                >
                  Apply
                </button>
              </div>
            </div>
            {expressions.summary?.notes && (
              <div className="cp-row">
                <span className="cp-label">Notes</span>
                <span className="cp-value" style={{ textAlign: 'right', maxWidth: '60%' }}>
                  {expressions.summary.notes}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ExpressionBuilder({ data, existingExpressions, onExpressionsBuilt, onBack, onReset, onContinue }) {
  const [expressions, setExpressions] = useState(existingExpressions || null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedChains, setExpandedChains] = useState({})
  const [baseRevenue, setBaseRevenue] = useState(100)

  // Load existing expressions on mount
  React.useEffect(() => {
    if (existingExpressions) {
      setExpressions(existingExpressions)
      // Auto-expand first chain
      if (existingExpressions.calculation_chains && existingExpressions.calculation_chains.length > 0) {
        setExpandedChains({ 0: true })
      }
    }
  }, [existingExpressions])

  // Build expressions from finalized rules
  const buildExpressions = async (customBaseRevenue = null) => {
    setIsLoading(true)
    setError(null)

    try {
      // Demo Mode: Use mock expressions instead of calling API
      if (CONFIG.ENABLE_DEMO_MODE) {
        console.log(' Demo Mode: Using mock expressions instead of API call')
        await simulateAPIDelay(1000, 1800) // Simulate network delay
        
        // Scale the mock expression amounts based on custom base revenue if provided
        const scaledExpressions = customBaseRevenue ? scaleMockExpressions(MOCK_EXPRESSIONS, customBaseRevenue) : MOCK_EXPRESSIONS
        
        setExpressions(scaledExpressions)
        
        // Persist expressions in parent
        if (onExpressionsBuilt) {
          onExpressionsBuilt(scaledExpressions)
        }
        
        // Auto-expand first chain
        if (scaledExpressions.calculation_chains && scaledExpressions.calculation_chains.length > 0) {
          setExpandedChains({ 0: true })
        }
        
        setIsLoading(false)
        return
      }

      const payload = {
        contract_info: data.contractInfo || {},
        finalized_rules: data.rules || [],
        glossary: data.glossary || {},
        base_revenue: customBaseRevenue || baseRevenue,
        execution_id: data.execution_id || data.pdf_id
      }

      const response = await fetch(CONFIG.N8N_EXPRESSIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.message || 'Failed to build expressions')
      }

      setExpressions(result)
      
      // Persist expressions in parent
      if (onExpressionsBuilt) {
        onExpressionsBuilt(result)
      }
      
      // Auto-expand first chain
      if (result.calculation_chains && result.calculation_chains.length > 0) {
        setExpandedChains({ 0: true })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to scale mock expressions based on custom base revenue
  const scaleMockExpressions = (mockData, newBaseRevenue) => {
    const scaleFactor = newBaseRevenue / 100 // Original mock is based on $100
    const scaled = JSON.parse(JSON.stringify(mockData)) // Deep clone
    
    scaled.calculation_chains.forEach(chain => {
      chain.steps.forEach(step => {
        step.result = step.result * scaleFactor
        if (step.running_total !== undefined) {
          step.running_total = step.running_total * scaleFactor
        }
        // Update formula display for first step
        if (step.step_number === 1) {
          step.formula_display = `$${newBaseRevenue.toFixed(2)}`
        }
      })
      
      // Scale final amounts
      if (chain.final_amounts) {
        Object.keys(chain.final_amounts).forEach(party => {
          chain.final_amounts[party] = chain.final_amounts[party] * scaleFactor
        })
      }
      
      // Scale scenarios
      if (chain.scenarios) {
        chain.scenarios.forEach(scenario => {
          if (scenario.final_amount !== undefined) {
            scenario.final_amount = scenario.final_amount * scaleFactor
          }
        })
      }
    })
    
    return scaled
  }

  // Toggle chain expansion
  const toggleChain = (index) => {
    setExpandedChains(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Get operation symbol
  const getOperationSymbol = (operation) => {
    const symbols = {
      add: '+',
      subtract: '−',
      multiply: '×',
      divide: '÷',
      max: 'max',
      min: 'min'
    }
    return symbols[operation] || operation
  }

  // Download expressions as JSON
  const downloadExpressions = () => {
    const dataStr = JSON.stringify(expressions, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `expressions-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="expression-builder-container">

      {/* Pre-build screen */}
      {!expressions && (
        <div className="extracted-container">

          <div className="cp-page-header">
            <h2 className="cp-page-title">Expression Builder</h2>
            <p className="cp-page-subtitle">
              Build step-by-step calculation chains from your {data.rules?.length || 0} finalized rules.
            </p>
          </div>

          <div className="cp-accordion-container">
            <div className="cp-accordion-section">
              <div className="cp-accordion-header" style={{ cursor: 'default' }}>
                <span className="cp-accordion-title">Configuration</span>
              </div>
              <div className="cp-accordion-body">
                <div className="cp-grid">
                  <div className="cp-row">
                    <span className="cp-label">Rules to process</span>
                    <span className="cp-value">{data.rules?.length || 0}</span>
                  </div>
                  <div className="cp-row">
                    <span className="cp-label">Sample base revenue</span>
                    <div className="eb-revenue-input-row">
                      <span className="eb-currency">$</span>
                      <input
                        type="number"
                        className="eb-revenue-input"
                        value={baseRevenue}
                        onChange={(e) => setBaseRevenue(Number(e.target.value))}
                        min="1"
                        step="100"
                      />
                    </div>
                  </div>
                  {data.contractInfo?.partner_name && (
                    <div className="cp-row">
                      <span className="cp-label">Partner</span>
                      <span className="cp-value">{data.contractInfo.partner_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message" style={{ marginBottom: '0.75rem' }}>
              {error}
            </div>
          )}

          <div className="cp-actions">
            <button className="cp-btn-back" onClick={onBack} disabled={isLoading}>
              Back to Rules
            </button>
            <button
              className="cp-btn-continue"
              onClick={() => buildExpressions()}
              disabled={isLoading}
            >
              {isLoading ? (
                <><span className="spinner" /> Building…</>
              ) : (
                'Build Expressions'
              )}
            </button>
          </div>

        </div>
      )}

      {/* Post-build screen */}
      {expressions && expressions.calculation_chains && (
        <div className="extracted-container">

          <div className="fo-top-row">
            <div className="cp-page-header" style={{ marginBottom: 0 }}>
              <h2 className="cp-page-title">Expression Builder</h2>
              <p className="cp-page-subtitle">
                {expressions.calculation_chains.length} chains · {expressions.calculation_chains.reduce((sum, c) => sum + (c.steps?.length || 0), 0)} steps · base ${baseRevenue.toLocaleString()}
              </p>
            </div>
            <div className="fo-export-row">
              <button className="rr-btn-verify" onClick={downloadExpressions}>Download .json</button>
              <button
                className="rr-btn-verify"
                onClick={() => {
                  setExpressions(null)
                  if (onExpressionsBuilt) onExpressionsBuilt(null)
                }}
              >
                Rebuild
              </button>
            </div>
          </div>

          {/* Calculation chains — main event */}
          <div className="cp-accordion-container">
            {expressions.calculation_chains.map((chain, index) => (
              <EBChain
                key={index}
                chain={chain}
                index={index}
                expandedChains={expandedChains}
                toggleChain={toggleChain}
                formatCurrency={formatCurrency}
                getOperationSymbol={getOperationSymbol}
              />
            ))}
          </div>

          {/* Summary — separate, collapsed by default */}
          <div className="cp-accordion-container" style={{ marginTop: '0.75rem' }}>
            <EBSummary
              expressions={expressions}
              baseRevenue={baseRevenue}
              setBaseRevenue={setBaseRevenue}
              buildExpressions={buildExpressions}
            />
          </div>

          <div className="cp-actions">
            <button className="cp-btn-back" onClick={onBack}>Back to Rules</button>
            {onContinue && (
              <button className="cp-btn-continue" onClick={onContinue}>
                Continue to Final Output
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

export default ExpressionBuilder
