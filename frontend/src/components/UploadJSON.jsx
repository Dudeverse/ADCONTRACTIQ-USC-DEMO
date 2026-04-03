import React, { useState } from 'react'

function UploadJSON({ onUpload, onSwitchToPDF }) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleFile = (file) => {
    setError(null)

    // Validate file type
    if (!file.name.endsWith('.json')) {
      setError('Please upload a JSON file (.json)')
      return
    }

    // Read file
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result)

        // Validate structure
        if (!jsonData.finalized_rules && !jsonData.rules) {
          throw new Error('Invalid JSON structure. Must contain "finalized_rules" or "rules" array.')
        }

        // Normalize to expected format
        const normalizedData = {
          contractInfo: jsonData.contract_info || {},
          rules: jsonData.finalized_rules || jsonData.rules || [],
          glossary: jsonData.glossary || {},
          summary: jsonData.summary || '',
          execution_id: jsonData.execution_id || jsonData.pdf_id
        }

        onUpload(normalizedData)
      } catch (err) {
        setError(`Invalid JSON: ${err.message}`)
      }
    }

    reader.onerror = () => {
      setError('Error reading file')
    }

    reader.readAsText(file)
  }

  return (
    <div className="upload-json-container">
      <div className="upload-json-content">
        {/* Header */}
        <div className="upload-json-header">
          <h2> Upload Finalized Rules (JSON)</h2>
          <p>Already have extracted rules? Upload your JSON file to build expressions directly.</p>
        </div>

        {/* Drop Zone */}
        <div
          className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="drop-zone-icon"></div>
          <h3>Drop your JSON file here</h3>
          <p>or</p>
          <label htmlFor="json-file-input" className="btn btn-primary">
            <span className="btn-icon"></span>
            Choose JSON File
          </label>
          <input
            id="json-file-input"
            type="file"
            accept=".json"
            onChange={handleChange}
            style={{ display: 'none' }}
          />
          <small className="file-requirements">
            Accepts: .json files with finalized_rules structure
          </small>
        </div>

        {/* Error */}
        {error && (
          <div className="error-message">
            
            {error}
          </div>
        )}

        {/* Divider */}
        <div className="upload-divider">
          <span>OR</span>
        </div>

        {/* Switch to PDF Upload */}
        <div className="upload-alternative">
          <p>Need to extract rules from a PDF contract first?</p>
          <button className="btn btn-outline" onClick={onSwitchToPDF}>
            
            Upload PDF Contract Instead
          </button>
        </div>

        {/* Info Box */}
        <div className="info-box">
          <h4> Expected JSON Structure:</h4>
          <pre>{`{
  "contract_info": {...},
  "finalized_rules": [
    {
      "rule_number": 1,
      "rule_text": "...",
      "category": "revenue_share",
      ...
    }
  ],
  "glossary": {...}
}`}</pre>
        </div>
      </div>
    </div>
  )
}

export default UploadJSON
