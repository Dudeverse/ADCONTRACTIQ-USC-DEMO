import React, { useState } from 'react'
import { CONFIG } from '../config'
import { parsePageNumber, hasPageInfo } from '../utils/pdfUtils'
import EnhancedPDFViewer from './EnhancedPDFViewer'

function RuleCard({ rule, onToggle, onDelete, onEdit, onVerify, editingId, editText, setEditText, onSaveEdit, onCancelEdit }) {
  const [isOpen, setIsOpen] = useState(false)

  const getConfidenceColor = (confidence) => {
    if (confidence >= CONFIG.CONFIDENCE_HIGH) return '#46d369'
    if (confidence >= CONFIG.CONFIDENCE_MEDIUM) return '#f5a623'
    return '#e50914'
  }

  const getConfidenceLabel = (confidence) => {
    if (confidence >= CONFIG.CONFIDENCE_HIGH) return 'High'
    if (confidence >= CONFIG.CONFIDENCE_MEDIUM) return 'Medium'
    return 'Low'
  }

  const isEditing = editingId === rule.rule_number

  return (
    <div className={`rr-card ${rule.approved ? 'approved' : ''} ${rule.confidence < CONFIG.CONFIDENCE_MEDIUM ? 'low-confidence' : ''}`}>

      {/* Accordion Header — rule text only */}
      <div className="rr-header" onClick={() => !isEditing && setIsOpen(!isOpen)}>
        <div className="rr-header-left">
          {/* Mark checkbox sits here, left of rule text */}
          <label
            className="rr-mark"
            title="Mark as approved"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={rule.approved}
              onChange={() => onToggle(rule.rule_number)}
            />
            <span className="rr-checkmark"></span>
          </label>

          <div className="rr-rule-text">
            {isEditing ? (
              <textarea
                className="rr-edit-textarea"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                {rule.rule_text}
                {rule.edited && <span className="rr-badge-edited">edited</span>}
                {rule.isNew && <span className="rr-badge-new">new</span>}
              </>
            )}
          </div>
        </div>

        <span className={`rr-chevron ${isOpen ? 'open' : ''}`}>›</span>
      </div>

      {/* Accordion Body — meta + actions */}
      {isOpen && (
        <div className="rr-body">
          <div className="rr-meta-row">

            {/* Confidence */}
            <span
              className="rr-meta-chip"
              style={{
                color: getConfidenceColor(rule.confidence),
                borderColor: getConfidenceColor(rule.confidence) + '40',
                backgroundColor: getConfidenceColor(rule.confidence) + '15',
              }}
            >
              {Math.round(rule.confidence * 100)}% {getConfidenceLabel(rule.confidence)}
            </span>

            {/* Source */}
            <span className="rr-meta-chip rr-source" title={rule.source}>
              {rule.source}
            </span>

            {/* Category */}
            <span className={`rr-meta-chip category-badge category-${rule.category}`}>
              {rule.category}
            </span>

          </div>

          {/* Actions row */}
          <div className="rr-actions-row">
            <button
              className="rr-btn-verify"
              onClick={(e) => {
                e.stopPropagation()
                let searchTerm = rule.source
                searchTerm = searchTerm.replace(/^(Section|Sec\.|Article)\s+/i, '')
                if (searchTerm.includes(',') && (searchTerm.toLowerCase().includes('exhibit') || searchTerm.toLowerCase().includes('schedule'))) {
                  searchTerm = searchTerm.split(',')[0].trim()
                }
                onVerify(searchTerm)
              }}
            >
              Verify
            </button>

            {isEditing ? (
              <>
                <button className="rr-btn-save" onClick={(e) => { e.stopPropagation(); onSaveEdit(rule.rule_number) }}>Save</button>
                <button className="rr-btn-cancel" onClick={(e) => { e.stopPropagation(); onCancelEdit() }}>Cancel</button>
              </>
            ) : (
              <button className="rr-btn-edit" onClick={(e) => { e.stopPropagation(); onEdit(rule) }}>Edit</button>
            )}

            <button
              className="rr-btn-delete"
              onClick={(e) => { e.stopPropagation(); onDelete(rule.rule_number) }}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RulesReview({ data, onFinalize, onReset, onOpenPdf, pdfFile, onRulesModified, enableExpressions, onContinueToExpressions, finalizedRules }) {
  const initializeRules = () => {
    const baseRules = data.rules || []
    if (finalizedRules && finalizedRules.rules) {
      const finalizedRuleNumbers = new Set(finalizedRules.rules.map(r => r.rule_number))
      return baseRules.map(rule => ({
        ...rule,
        approved: finalizedRuleNumbers.has(rule.rule_number) ? true : (rule.approved || false)
      }))
    }
    return baseRules
  }

  const [rules, setRules] = useState(initializeRules())
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [searchKeyword, setSearchKeyword] = useState(null)

  const toggleApproval = (ruleNumber) => {
    setRules(rules.map(rule =>
      rule.rule_number === ruleNumber ? { ...rule, approved: !rule.approved } : rule
    ))
  }

  const startEdit = (rule) => {
    setEditingId(rule.rule_number)
    setEditText(rule.rule_text)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const saveEdit = (ruleNumber) => {
    setRules(rules.map(rule =>
      rule.rule_number === ruleNumber ? { ...rule, rule_text: editText, edited: true } : rule
    ))
    setEditingId(null)
    setEditText('')
    if (onRulesModified) onRulesModified()
  }

  const deleteRule = (ruleNumber) => {
    setRules(rules.filter(rule => rule.rule_number !== ruleNumber))
    if (onRulesModified) onRulesModified()
  }

  const addNewRule = () => {
    const newRuleNumber = rules.length > 0 ? Math.max(...rules.map(r => r.rule_number)) + 1 : 1
    const newRule = {
      rule_number: newRuleNumber,
      rule_text: 'Enter new rule text here...',
      confidence: 1.0,
      source: 'Manually Added',
      category: 'manual',
      approved: false,
      isNew: true
    }
    setRules([...rules, newRule])
    setEditingId(newRuleNumber)
    setEditText('Enter new rule text here...')
    if (onRulesModified) onRulesModified()
  }

  const approveAll = () => {
    setRules(rules.map(rule => ({ ...rule, approved: true })))
  }

  const handleFinalize = () => {
    const approvedRules = rules.filter(rule => rule.approved)
    if (approvedRules.length === 0) {
      alert('Please approve at least one rule before finalizing.')
      return
    }
    onFinalize(approvedRules, data.contract_info, data.glossary, data.summary, data.execution_id)
  }

  const handleContinueToExpressions = () => {
    const approvedRules = rules.filter(rule => rule.approved)
    if (approvedRules.length === 0) {
      alert('Please approve at least one rule before continuing.')
      return
    }
    const hasChangedRules = finalizedRules && finalizedRules.rules &&
      (approvedRules.length !== finalizedRules.rules.length ||
        approvedRules.some(r => !finalizedRules.rules.find(fr => fr.rule_number === r.rule_number)))
    if (hasChangedRules) {
      const confirmed = confirm(`You've changed which rules are approved. This will clear the existing expressions and require rebuilding them.\n\nContinue?`)
      if (!confirmed) return
      if (onRulesModified) onRulesModified()
    }
    onFinalize(approvedRules, data.contract_info, data.glossary, data.summary, data.execution_id)
    if (onContinueToExpressions) onContinueToExpressions()
  }

  const approvedCount = rules.filter(r => r.approved).length

  return (
    <div className="rr-container">
      <div className="rr-split">

        {/* Left Pane */}
        <div className="rr-left">

          {/* Header */}
          <div className="rr-left-header">
            <div className="rr-left-title">
              <span className="rr-title">Rules</span>
              <span className="rr-subtitle">{rules.length} extracted · {approvedCount} approved</span>
            </div>
            <button className="rr-btn-approve-all" onClick={approveAll}>Approve All</button>
          </div>

          {/* Rules List */}
          <div className="rr-rules-list">
            {rules.map((rule) => (
              <RuleCard
                key={rule.rule_number}
                rule={rule}
                onToggle={toggleApproval}
                onDelete={deleteRule}
                onEdit={startEdit}
                onVerify={(term) => setSearchKeyword(term)}
                editingId={editingId}
                editText={editText}
                setEditText={setEditText}
                onSaveEdit={saveEdit}
                onCancelEdit={cancelEdit}
              />
            ))}

            {/* Add Rule */}
            <button className="rr-btn-add-rule" onClick={addNewRule}>
              + Add Rule
            </button>
          </div>

          {/* Footer Actions */}
          <div className="rr-left-footer">
            <button className="cp-btn-back" onClick={onReset}>Back</button>
            {enableExpressions ? (
              <button
                className="cp-btn-continue"
                onClick={handleContinueToExpressions}
                disabled={approvedCount === 0}
              >
                {finalizedRules?.rules?.length === approvedCount
                  ? `Continue to Expressions (${approvedCount})`
                  : finalizedRules?.rules
                  ? `Rebuild Expressions (${approvedCount})`
                  : `Continue to Expressions (${approvedCount})`}
              </button>
            ) : (
              <button
                className="cp-btn-continue"
                onClick={handleFinalize}
                disabled={approvedCount === 0}
              >
                Finalize {approvedCount} Rules
              </button>
            )}
          </div>

        </div>

        {/* Right Pane: PDF Viewer */}
        <div className="rr-right">
          <EnhancedPDFViewer
            file={pdfFile}
            embedded={true}
            searchKeyword={searchKeyword}
          />
        </div>

      </div>
    </div>
  )
}

export default RulesReview
