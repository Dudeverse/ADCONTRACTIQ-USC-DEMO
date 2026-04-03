import React, { useState } from 'react'

function AccordionSection({ title, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="cp-accordion-section">
      <button
        className="cp-accordion-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="cp-accordion-title">{title}</span>
        <span className={`cp-accordion-chevron ${isOpen ? 'open' : ''}`}>›</span>
      </button>
      {isOpen && (
        <div className="cp-accordion-body">
          {children}
        </div>
      )}
    </div>
  )
}

function ClassificationPreview({ data, onBack, onContinue, isLoading }) {
  if (!data) return null

  const formatClassificationType = (type) => {
    if (!type) return 'Unknown'
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const getComplexityColor = (complexity) => {
    switch (complexity) {
      case 'simple': return '#46d369'
      case 'moderate': return '#f5a623'
      case 'complex': return '#e50914'
      default: return '#737373'
    }
  }

  const keyTerms = Array.isArray(data.contract_info?.key_terms)
    ? data.contract_info.key_terms
    : []

  return (
    <div className="extracted-container">

      <div className="cp-page-header">
        <h2 className="cp-page-title">Contract Preview</h2>
        <p className="cp-page-subtitle">
          Review the classification and summary before processing full extraction.
        </p>
      </div>

      <div className="cp-accordion-container">

        {data.classification && (
          <AccordionSection title="Contract Classification">
            <div className="cp-grid">
              <div className="cp-row">
                <span className="cp-label">Type</span>
                <span className="cp-value">{formatClassificationType(data.classification.contract_type)}</span>
              </div>
              <div className="cp-row">
                <span className="cp-label">Partner</span>
                <span className="cp-value">{formatClassificationType(data.classification.partner_type)}</span>
              </div>
              <div className="cp-row">
                <span className="cp-label">Complexity</span>
                <span
                  className="cp-badge"
                  style={{
                    backgroundColor: getComplexityColor(data.classification.complexity) + '20',
                    color: getComplexityColor(data.classification.complexity),
                    border: `1px solid ${getComplexityColor(data.classification.complexity)}40`
                  }}
                >
                  {formatClassificationType(data.classification.complexity)}
                </span>
              </div>
              <div className="cp-row">
                <span className="cp-label">Revenue Model</span>
                <span className="cp-value">
                  {data.classification.revenue_model?.map(formatClassificationType).join(', ') || 'Unknown'}
                </span>
              </div>
              {data.classification.confidence !== undefined && (
                <div className="cp-row">
                  <span className="cp-label">AI Confidence</span>
                  <div className="cp-confidence">
                    <div className="cp-confidence-bar">
                      <div
                        className="cp-confidence-fill"
                        style={{
                          width: `${data.classification.confidence * 100}%`,
                          backgroundColor: data.classification.confidence >= 0.8 ? '#46d369' :
                            data.classification.confidence >= 0.6 ? '#f5a623' : '#e50914'
                        }}
                      />
                    </div>
                    <span className="cp-confidence-pct">
                      {(data.classification.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </AccordionSection>
        )}

        <AccordionSection title="Contract Information">
          <div className="cp-grid">
            <div className="cp-row">
              <span className="cp-label">Partner</span>
              <span className="cp-value">{data.contract_info?.partner_name || 'Unknown'}</span>
            </div>
            <div className="cp-row">
              <span className="cp-label">Document Type</span>
              <span className="cp-value">{data.contract_info?.document_type || 'Contract'}</span>
            </div>
            <div className="cp-row">
              <span className="cp-label">Effective Date</span>
              <span className="cp-value">{data.contract_info?.effective_date || 'N/A'}</span>
            </div>
            <div className="cp-row">
              <span className="cp-label">Expiration Date</span>
              <span className="cp-value">{data.contract_info?.expiration_date || 'N/A'}</span>
            </div>
          </div>
        </AccordionSection>

        {keyTerms.length > 0 && (
          <AccordionSection title="Key Terms" defaultOpen={false}>
            <ul className="cp-key-terms-list">
              {keyTerms.map((term, idx) => (
                <li key={idx} className="cp-key-term-item">{term}</li>
              ))}
            </ul>
          </AccordionSection>
        )}

        {data.summary && (
          <AccordionSection title="Executive Summary">
            <p className="cp-summary-text">{data.summary}</p>
          </AccordionSection>
        )}

        {data.processing_recommendation && (
          <AccordionSection title="Processing Recommendation" defaultOpen={false}>
            <p className="cp-summary-text">
              {data.processing_recommendation.should_process
                ? 'Recommended to process.'
                : 'Processing not recommended.'}
              {data.processing_recommendation.reason
                ? ` ${data.processing_recommendation.reason}`
                : ''}
            </p>
          </AccordionSection>
        )}

      </div>

      <div className="cp-actions">
        <button className="cp-btn-back" onClick={onBack} disabled={isLoading}>
          Back
        </button>
        <button className="cp-btn-continue" onClick={onContinue} disabled={isLoading}>
          {isLoading ? <><span className="spinner" /> Processing…</> : 'Continue Processing'}
        </button>
      </div>

    </div>
  )
}

export default ClassificationPreview
