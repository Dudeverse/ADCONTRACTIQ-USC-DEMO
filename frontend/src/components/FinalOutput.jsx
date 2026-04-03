import React, { useState } from 'react'
import { parsePageNumber, hasPageInfo } from '../utils/pdfUtils'

function Section({ title, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="cp-accordion-section">
      <button className="cp-accordion-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="cp-accordion-title">{title}</span>
        <span className={`cp-accordion-chevron ${isOpen ? 'open' : ''}`}>›</span>
      </button>
      {isOpen && <div className="cp-accordion-body">{children}</div>}
    </div>
  )
}

function FinalOutput({ data, expressions, onBack, onReset, onOpenPdf, hasExpressions }) {
  const { rules, contractInfo, summary } = data

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(amount)
  }

  const exportJSON = () => {
    const exportData = {
      contract_info: contractInfo,
      finalized_rules: rules.map((rule, index) => ({
        rule_number: index + 1,
        rule_text: rule.rule_text,
        category: rule.category,
        source: rule.source
      })),
      ...(expressions && { calculation_expressions: expressions }),
      summary,
      exported_at: new Date().toISOString(),
      total_rules: rules.length
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contract-rules-${contractInfo?.partner_name?.replace(/\s+/g, '-') || 'export'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportText = () => {
    let text = `# Contract Rules - ${contractInfo?.partner_name || 'Unknown Partner'}\n\n`
    text += `**Effective Date:** ${contractInfo?.effective_date || 'N/A'}\n`
    text += `**Document Type:** ${contractInfo?.document_type || 'Contract'}\n`
    text += `**Export Date:** ${new Date().toLocaleDateString()}\n\n`
    text += `---\n\n## Summary\n\n${summary || 'No summary available.'}\n\n`
    text += `---\n\n## Finalized Rules (${rules.length} total)\n\n`
    rules.forEach((rule, index) => {
      text += `### Rule ${index + 1}\n${rule.rule_text}\n\n`
      text += `- **Category:** ${rule.category}\n- **Source:** ${rule.source}\n\n`
    })
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contract-rules-${contractInfo?.partner_name?.replace(/\s+/g, '-') || 'export'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = () => {
    let text = `Contract Rules - ${contractInfo?.partner_name || 'Unknown Partner'}\n\n`
    text += `Summary: ${summary || 'No summary available.'}\n\nRules:\n`
    rules.forEach((rule, index) => { text += `${index + 1}. ${rule.rule_text}\n` })
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  return (
    <div className="extracted-container">

      {/* Page header */}
      <div className="fo-top-row">
        <div className="cp-page-header" style={{ marginBottom: 0 }}>
          <h2 className="cp-page-title">Finalized Contract Rules</h2>
          <p className="cp-page-subtitle">
            {rules.length} rules approved and ready for use.
          </p>
        </div>
        <div className="fo-export-row">
          <button className="rr-btn-verify" onClick={copyToClipboard}>Copy</button>
          <button className="rr-btn-verify" onClick={exportText}>Export .md</button>
          <button className="rr-btn-verify" onClick={exportJSON}>Export .json</button>
          <button className="rr-btn-verify" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      {/* Accordion container — Rules and Expressions first */}
      <div className="cp-accordion-container">

        {/* Calculation Expressions */}
        {expressions?.calculation_chains?.length > 0 && (
          <Section title={`Calculation Expressions (${expressions.calculation_chains.length})`}>
            <div className="fo-chains">
              {expressions.calculation_chains.map((chain, idx) => (
                <div key={idx} className="fo-chain">
                  <div className="fo-chain-title">{chain.label}</div>
                  {chain.description && (
                    <p className="fo-chain-desc">{chain.description}</p>
                  )}
                  <div className="fo-steps">
                    {chain.steps?.map((step, stepIdx) => (
                      <div key={stepIdx} className="fo-step-row">
                        <span className="fo-step-num">{step.step_number}</span>
                        <span className="fo-step-label">{step.label}</span>
                        <span className="fo-step-result">{formatCurrency(step.result)}</span>
                      </div>
                    ))}
                  </div>
                  {chain.final_amounts && Object.keys(chain.final_amounts).length > 0 && (
                    <div className="fo-final-amounts">
                      {Object.entries(chain.final_amounts).map(([party, amount]) => (
                        <div key={party} className="fo-amount-row">
                          <span className="fo-party">{party}</span>
                          <span className="fo-amount">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Approved Rules */}
        <Section title={`Approved Rules (${rules.length})`}>
          <div className="fo-rules">
            {rules.map((rule, index) => (
              <div key={rule.rule_number} className="fo-rule-row">
                <div className="fo-rule-top">
                  <span className={`rr-meta-chip category-badge category-${rule.category}`}>
                    {rule.category}
                  </span>
                  <span className="fo-rule-source">
                    {hasPageInfo(rule.source) ? (
                      <span
                        className="fo-source-link"
                        onClick={() => {
                          const pageNum = parsePageNumber(rule.source)
                          if (pageNum && onOpenPdf) onOpenPdf(pageNum)
                        }}
                        title={`View in PDF`}
                      >
                        {rule.source}
                      </span>
                    ) : rule.source}
                  </span>
                </div>
                <p className="fo-rule-text">{rule.rule_text}</p>
              </div>
            ))}
          </div>
        </Section>

      </div>

      {/* Contract Info + Summary — collapsed, below the main content */}
      <div className="cp-accordion-container" style={{ marginTop: '0.75rem' }}>
        <Section title="Contract Information" defaultOpen={false}>
          <div className="cp-grid">
            <div className="cp-row">
              <span className="cp-label">Partner</span>
              <span className="cp-value">{contractInfo?.partner_name || 'Unknown'}</span>
            </div>
            <div className="cp-row">
              <span className="cp-label">Document Type</span>
              <span className="cp-value">{contractInfo?.document_type || 'Contract'}</span>
            </div>
            <div className="cp-row">
              <span className="cp-label">Effective Date</span>
              <span className="cp-value">{contractInfo?.effective_date || 'Not specified'}</span>
            </div>
            <div className="cp-row">
              <span className="cp-label">Expiration Date</span>
              <span className="cp-value">{contractInfo?.expiration_date || 'Not specified'}</span>
            </div>
          </div>
        </Section>
        {summary && (
          <Section title="Executive Summary" defaultOpen={false}>
            <p className="cp-summary-text">{summary}</p>
          </Section>
        )}
      </div>

      {/* Actions */}
      <div className="cp-actions">
        <button className="cp-btn-back" onClick={onBack}>
          {hasExpressions ? 'Back to Expressions' : 'Back to Review'}
        </button>
        <button className="cp-btn-continue" onClick={onReset}>
          Process New Contract
        </button>
      </div>

    </div>
  )
}

export default FinalOutput
