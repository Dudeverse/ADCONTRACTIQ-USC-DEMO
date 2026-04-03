import React, { useState, useRef } from 'react'
import { CONFIG } from '../config'

function Upload({ onUpload, isLoading, error }) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/pdf') {
        setSelectedFile(file)
      } else {
        alert('Please upload a PDF file')
      }
    }
  }

  // Handle file input change
  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type === 'application/pdf') {
        setSelectedFile(file)
      } else {
        alert('Please upload a PDF file')
      }
    }
  }

  // Trigger file input click
  const handleClick = () => {
    fileInputRef.current.click()
  }

  // Handle upload
  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile)
    }
  }

  // Clear selected file
  const handleClear = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handle demo mode quick load
  const handleDemoLoad = () => {
    // Create a dummy file object for demo mode
    const dummyFile = new File(['demo content'], 'demo-contract.pdf', { type: 'application/pdf' })
    onUpload(dummyFile)
  }

  return (
    <div className="upload-container">
      <div className="upload-card">
        {/* Demo Mode Quick Action */}
        {CONFIG.ENABLE_DEMO_MODE && (
          <div className="demo-quick-action">
            <div className="demo-action-content">
              
              <div className="demo-action-text">
                <strong>Demo Mode Active</strong>
                <p>Skip the upload and load placeholder data instantly</p>
              </div>
              <button 
                className="btn btn-primary"
                onClick={handleDemoLoad}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Loading...
                  </>
                ) : (
                  <>
                    Load Demo Data
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="upload-header">
          <h1>Upload Contract</h1>
          <p>Upload your advertising partnership contract (PDF) to extract payment rules</p>
        </div>

        {/* Drop Zone */}
        <div
          className={`drop-zone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={!selectedFile ? handleClick : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleChange}
            style={{ display: 'none' }}
          />
          
          {!selectedFile ? (
            <>
              
              <p className="drop-text">
                Drag & drop your PDF here, or <span className="link">browse</span>
              </p>
              <p className="drop-hint">Supports: PDF files only</p>
            </>
          ) : (
            <div className="file-preview">
              
              <div className="file-info">
                <p className="file-name">{selectedFile.name}</p>
                <p className="file-size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button className="clear-btn" onClick={handleClear}>Remove</button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            
            <span>{error}</span>
          </div>
        )}

        {/* Upload Button */}
        <button
          className={`upload-btn ${isLoading ? 'loading' : ''}`}
          onClick={handleUpload}
          disabled={!selectedFile || isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              <span>Classifying Contract...</span>
            </>
          ) : (
            <>
              <span>Classify Contract</span>
              
            </>
          )}
        </button>

        {/* Processing Info */}
        {isLoading && (
          <div className="processing-info">
            {CONFIG.ENABLE_DEMO_MODE ? (
              <>
                <p>Loading demo data...</p>
                <p className="processing-hint">Demo mode is active - using placeholder content</p>
              </>
            ) : (
              <>
                <p>AI is analyzing your contract...</p>
                <p className="processing-hint">This may take 30-60 seconds depending on contract length</p>
              </>
            )}
          </div>
        )}
      </div>

    </div>
  )
}

export default Upload
