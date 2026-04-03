import React, { useState, useEffect } from 'react'
import { CONFIG } from './config'
import Upload from './components/Upload'
import UploadJSON from './components/UploadJSON'
import RulesReview from './components/RulesReview'
import FinalOutput from './components/FinalOutput'
import ExpressionBuilder from './components/ExpressionBuilder'
import EnhancedPDFViewer from './components/EnhancedPDFViewer'
import ClassificationPreview from './components/ClassificationPreview'
import { MOCK_EXTRACTED_DATA, simulateAPIDelay } from './utils/mockData'
import './classification-styles.css'

function ExtractionAccordion({ title, children, defaultOpen = true }) {
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

function App() {
  // App state - Start at upload-choice if JSON upload enabled, otherwise go straight to upload
  const [currentStep, setCurrentStep] = useState(CONFIG.ENABLE_JSON_UPLOAD ? 'upload-choice' : 'upload') // 'upload-choice' | 'upload' | 'upload-json' | 'preview' | 'extracting' | 'extracted' | 'review' | 'final' | 'expressions'
  const [uploadMode, setUploadMode] = useState('pdf') // 'pdf' | 'json'
  const [classificationData, setClassificationData] = useState(null)
  const [extractedData, setExtractedData] = useState(null)
  const [finalizedRules, setFinalizedRules] = useState(null)
  const [builtExpressions, setBuiltExpressions] = useState(null) // Store built expressions
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [darkMode, setDarkMode] = useState(true)
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [pdfViewerPage, setPdfViewerPage] = useState(1)

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Handle PDF upload and classify contract
  const handleUpload = async (file) => {
    setIsLoading(true)
    setError(null)
    
    // Clear any previous data when starting new run
    setClassificationData(null)
    setFinalizedRules(null)
    setBuiltExpressions(null)
    setExtractedData(null)

    try {
      // Store PDF file for later viewing
      setPdfFile(file)

      // Demo Mode: Use mock data instead of calling API
      if (CONFIG.ENABLE_DEMO_MODE) {
        console.log(' Demo Mode: Using mock data instead of API call')
        await simulateAPIDelay(1200, 2000) // Simulate network delay
        setClassificationData({
          classification_id: `demo::${Date.now()}`,
          classification: MOCK_EXTRACTED_DATA.classification,
          contract_info: MOCK_EXTRACTED_DATA.contract_info,
          summary: MOCK_EXTRACTED_DATA.summary,
          processing_recommendation: {
            should_process: true,
            reason: 'Demo mode',
            estimated_rules: MOCK_EXTRACTED_DATA.rules.length
          },
          extracted_text: 'Demo contract text',
          pdf_name: file.name
        })
        setCurrentStep('preview')
        return
      }

      // Create FormData and append the file
      const formData = new FormData()
      formData.append('data', file)

      // Send to classification webhook
      const response = await fetch(CONFIG.N8N_CLASSIFY_URL, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const data = await response.json()

      // Check for extraction errors
      if (data.error) {
        throw new Error(data.error_message || data.message || 'Failed to classify contract')
      }

      setClassificationData(data)
      setCurrentStep('preview')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle JSON upload (direct to expressions)
  const handleJSONUpload = (data) => {
    setFinalizedRules(data)
    setCurrentStep('expressions')
  }

  // Handle rules finalization
  const handleFinalize = (rules, contractInfo, glossary, summary, executionId) => {
    setFinalizedRules({
      rules,
      contractInfo,
      glossary,
      summary,
      execution_id: executionId
    })
    
    // If expressions enabled, go to expressions, otherwise go to final
    if (CONFIG.ENABLE_EXPRESSIONS) {
      setCurrentStep('expressions')
    } else {
      setCurrentStep('final')
    }
  }

  // Reset to start over
  const handleReset = () => {
    setCurrentStep(CONFIG.ENABLE_JSON_UPLOAD ? 'upload-choice' : 'upload')
    setUploadMode('pdf')
    setClassificationData(null)
    setExtractedData(null)
    setFinalizedRules(null)
    setBuiltExpressions(null) // Clear expressions
    setError(null)
    setPdfFile(null)
    setPdfViewerOpen(false)
  }

  // Go back to expressions from final
  const handleBackToExpressions = () => {
    setCurrentStep('expressions')
  }

  // Handle expressions built
  const handleExpressionsBuilt = (expressions) => {
    setBuiltExpressions(expressions)
  }

  // Clear expressions when rules are modified
  const handleBackToReviewFromExpressions = () => {
    // Keep expressions - don't clear them
    setCurrentStep('review')
  }

  // Continue to full extraction after preview
  const handleContinueProcessing = async () => {
    if (!classificationData) return
    setIsLoading(true)
    setError(null)
    setCurrentStep('extracting')

    try {
      if (CONFIG.ENABLE_DEMO_MODE) {
        await simulateAPIDelay(1200, 2000)
        setExtractedData({
          ...MOCK_EXTRACTED_DATA,
          classification: classificationData.classification,
          contract_info: classificationData.contract_info,
          summary: classificationData.summary,
          classification_id: classificationData.classification_id,
          execution_id: classificationData.execution_id
        })
        setCurrentStep('extracted')
        return
      }

      if (!classificationData.extracted_text) {
        throw new Error('Missing extracted_text from classification response')
      }

      const payload = {
        contract_text: classificationData.extracted_text,
        pdf_name: classificationData.pdf_name || pdfFile?.name || 'unknown.pdf',
        classification_id: classificationData.classification_id
      }

      const response = await fetch(CONFIG.N8N_EXTRACT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const extraction = await response.json()

      if (extraction.error) {
        throw new Error(extraction.message || 'Failed to extract contract rules')
      }

      setExtractedData({
        ...extraction,
        classification: classificationData.classification,
        contract_info: classificationData.contract_info,
        summary: classificationData.summary,
        classification_id: classificationData.classification_id,
        extracted_text: classificationData.extracted_text,
        pdf_name: classificationData.pdf_name || pdfFile?.name || 'unknown.pdf'
      })
      setCurrentStep('extracted')
    } catch (err) {
      setError(err.message)
      setCurrentStep('preview')
    } finally {
      setIsLoading(false)
    }
  }

  // Open PDF viewer at specific page
  const openPdfViewer = (pageNumber) => {
    setPdfViewerPage(pageNumber || 1)
    setPdfViewerOpen(true)
  }

  // Close PDF viewer
  const closePdfViewer = () => {
    setPdfViewerOpen(false)
  }

  // Go back to review
  const handleBackToReview = () => {
    setCurrentStep('review')
  }

  // Helper to format classification type
  const formatClassificationType = (type) => {
    if (!type) return 'Unknown'
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  // Helper to get complexity badge color
  const getComplexityColor = (complexity) => {
    switch(complexity) {
      case 'simple': return '#22c55e'
      case 'moderate': return '#f59e0b'
      case 'complex': return '#ef4444'
      default: return '#6b7280'
    }
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-text">AdContractIQ</span>
          </div>
          <div className="header-right">

            <div className="header-actions">
              <button
                className="theme-toggle"
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        {/* Upload Choice */}
        {currentStep === 'upload-choice' && (
          <div className="upload-choice-container">
            <div className="upload-choice-content">
              <img className="home-hero-image" src="/contract.png" alt="LegalLucy contract icon" />
              <h1>Welcome to AdContractIQ</h1>
              <p className="upload-choice-subtitle">Choose how you'd like to get started</p>
              
              <div className="upload-options">
                {/* Option 1: PDF Upload */}
                <div className="upload-option" onClick={() => setCurrentStep('upload')}>
                  
                  <h3>Upload PDF Contract</h3>
                  <p>Extract rules from a contract PDF, review them, and build expressions</p>
                  <button className="btn btn-primary">
                    Start with PDF
                  </button>
                </div>

                {/* Option 2: JSON Upload - Only show if enabled (for developers) */}
                {CONFIG.ENABLE_JSON_UPLOAD && (
                  <div className="upload-option" onClick={() => setCurrentStep('upload-json')}>
                    
                    <h3>Upload Finalized Rules</h3>
                    <p>Already have extracted rules? Upload JSON {CONFIG.ENABLE_EXPRESSIONS ? 'to build expressions directly' : 'and view/export them'}</p>
                    <button className="btn btn-outline">
                      Start with JSON
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PDF Upload */}
        {currentStep === 'upload' && (
          <Upload
            onUpload={handleUpload}
            isLoading={isLoading}
            error={error}
          />
        )}

        {/* JSON Upload */}
        {currentStep === 'upload-json' && (
          <UploadJSON
            onUpload={handleJSONUpload}
            onSwitchToPDF={() => setCurrentStep('upload')}
          />
        )}

        {/* Classification Preview */}
        {currentStep === 'preview' && classificationData && (
          <>
            <ClassificationPreview
              data={classificationData}
              onBack={() => setCurrentStep('upload')}
              onContinue={handleContinueProcessing}
              isLoading={isLoading}
            />
            {error && (
              <div className="error-message">
                
                <span>{error}</span>
              </div>
            )}
          </>
        )}

        {/* Extracting Rules */}
        {currentStep === 'extracting' && (
          <div className="extracted-container">
            <div className="extracted-header">
              
              <h2>Extracting Rules…</h2>
              <p className="extracted-summary">
                This may take 30-60 seconds depending on contract length.
              </p>
            </div>
            <div className="processing-info">
              <p>AI is analyzing your contract and extracting rules.</p>
              <p className="processing-hint">Please keep this window open.</p>
            </div>
          </div>
        )}

        {currentStep === 'extracted' && extractedData && (
          <div className="extracted-container">

            <div className="cp-page-header">
              <h2 className="cp-page-title">Extraction Complete</h2>
              <p className="cp-page-subtitle">
                Successfully extracted <strong>{extractedData.rules?.length || 0} rules</strong> from your contract.
              </p>
            </div>

            <div className="cp-accordion-container">

              <div className="cp-accordion-section">
                <div className="cp-accordion-header" style={{ cursor: 'default' }}>
                  <span className="cp-accordion-title">Extraction Summary</span>
                </div>
                <div className="cp-accordion-body">
                  <div className="cp-grid">
                    <div className="cp-row">
                      <span className="cp-label">Total Rules</span>
                      <span className="cp-value">{extractedData.rules?.length || 0}</span>
                    </div>
                    <div className="cp-row">
                      <span className="cp-label">High Confidence</span>
                      <span className="cp-value" style={{ color: '#46d369' }}>
                        {extractedData.rules?.filter(r => r.confidence >= 0.8).length || 0}
                      </span>
                    </div>
                    <div className="cp-row">
                      <span className="cp-label">Needs Review</span>
                      <span className="cp-value" style={{ color: '#f5a623' }}>
                        {extractedData.rules?.filter(r => r.confidence < 0.6).length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {extractedData.classification && (
                <ExtractionAccordion title="Contract Classification">
                  <div className="cp-grid">
                    <div className="cp-row">
                      <span className="cp-label">Type</span>
                      <span className="cp-value">{formatClassificationType(extractedData.classification.contract_type)}</span>
                    </div>
                    <div className="cp-row">
                      <span className="cp-label">Partner</span>
                      <span className="cp-value">{formatClassificationType(extractedData.classification.partner_type)}</span>
                    </div>
                    <div className="cp-row">
                      <span className="cp-label">Complexity</span>
                      <span
                        className="cp-badge"
                        style={{
                          backgroundColor: getComplexityColor(extractedData.classification.complexity) + '20',
                          color: getComplexityColor(extractedData.classification.complexity),
                          border: `1px solid ${getComplexityColor(extractedData.classification.complexity)}40`
                        }}
                      >
                        {formatClassificationType(extractedData.classification.complexity)}
                      </span>
                    </div>
                    <div className="cp-row">
                      <span className="cp-label">Revenue Model</span>
                      <span className="cp-value">
                        {extractedData.classification.revenue_model?.map(formatClassificationType).join(', ') || 'Unknown'}
                      </span>
                    </div>
                    {extractedData.classification.confidence !== undefined && (
                      <div className="cp-row">
                        <span className="cp-label">AI Confidence</span>
                        <div className="cp-confidence">
                          <div className="cp-confidence-bar">
                            <div
                              className="cp-confidence-fill"
                              style={{
                                width: `${extractedData.classification.confidence * 100}%`,
                                backgroundColor: extractedData.classification.confidence >= 0.8 ? '#46d369' :
                                  extractedData.classification.confidence >= 0.6 ? '#f5a623' : '#e50914'
                              }}
                            />
                          </div>
                          <span className="cp-confidence-pct">
                            {(extractedData.classification.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </ExtractionAccordion>
              )}

              <ExtractionAccordion title="Contract Information">
                <div className="cp-grid">
                  <div className="cp-row">
                    <span className="cp-label">Partner</span>
                    <span className="cp-value">{extractedData.contract_info?.partner_name || 'Unknown'}</span>
                  </div>
                  <div className="cp-row">
                    <span className="cp-label">Document Type</span>
                    <span className="cp-value">{extractedData.contract_info?.document_type || 'Contract'}</span>
                  </div>
                  <div className="cp-row">
                    <span className="cp-label">Effective Date</span>
                    <span className="cp-value">{extractedData.contract_info?.effective_date || 'N/A'}</span>
                  </div>
                </div>
              </ExtractionAccordion>

              {extractedData.summary && (
                <ExtractionAccordion title="AI Summary" defaultOpen={false}>
                  <p className="cp-summary-text">{extractedData.summary}</p>
                </ExtractionAccordion>
              )}

            </div>

            <div className="cp-actions">
              <button className="cp-btn-back" onClick={handleReset}>
                Upload Another
              </button>
              <button className="cp-btn-continue" onClick={() => setCurrentStep('review')}>
                Show Rules
              </button>
            </div>

          </div>
        )}

        {currentStep === 'review' && extractedData && (
          <RulesReview
            data={extractedData}
            onFinalize={handleFinalize}
            onReset={handleReset}
            onOpenPdf={openPdfViewer}
            pdfFile={pdfFile}
            onRulesModified={() => setBuiltExpressions(null)} // Clear expressions if rules change
            enableExpressions={CONFIG.ENABLE_EXPRESSIONS}
            onContinueToExpressions={() => setCurrentStep('expressions')}
            finalizedRules={finalizedRules}
          />
        )}

        {currentStep === 'expressions' && finalizedRules && (
          <ExpressionBuilder
            data={finalizedRules}
            existingExpressions={builtExpressions}
            onExpressionsBuilt={handleExpressionsBuilt}
            onBack={extractedData ? handleBackToReviewFromExpressions : () => setCurrentStep('upload-json')}
            onContinue={() => setCurrentStep('final')}
            onReset={handleReset}
          />
        )}

        {currentStep === 'final' && finalizedRules && (
          <FinalOutput
            data={finalizedRules}
            expressions={builtExpressions}
            onBack={CONFIG.ENABLE_EXPRESSIONS ? handleBackToExpressions : handleBackToReview}
            onReset={handleReset}
            onOpenPdf={openPdfViewer}
            hasExpressions={CONFIG.ENABLE_EXPRESSIONS && builtExpressions !== null}
          />
        )}
      </main>

      {/* PDF Viewer */}
      <EnhancedPDFViewer
        file={pdfFile}
        isOpen={pdfViewerOpen}
        onClose={closePdfViewer}
      />



      {/* Demo Mode Floating Indicator */}
      {CONFIG.ENABLE_DEMO_MODE && (
        <div className="demo-mode-indicator" title="Demo Mode Active - Using placeholder data">
          
          <span className="demo-indicator-text">Demo Mode</span>
        </div>
      )}
    </div>
  )
}

export default App
