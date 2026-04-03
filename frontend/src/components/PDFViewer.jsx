import React, { useState, useEffect, useMemo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Set up PDF.js worker - use local worker file from public directory
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

function PDFViewer({ file, pageNumber, isOpen, onClose, embedded = false, searchKeyword = null }) {
  const [numPages, setNumPages] = useState(null)
  const [currentPage, setCurrentPage] = useState(pageNumber || 1)
  const [scale, setScale] = useState(1.2)
  const [error, setError] = useState(null)
  const [pdfDocument, setPdfDocument] = useState(null)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (pageNumber) {
      setCurrentPage(pageNumber)
    }
  }, [pageNumber])

  // Search functionality
  useEffect(() => {
    const performSearch = async () => {
      if (!searchKeyword || !pdfDocument) return

      setIsSearching(true)
      try {
        console.log(`Searching for: "${searchKeyword}"`)
        // Simple search: iterate through pages and look for text match
        // Start from page 1
        let foundPage = 0

        for (let i = 1; i <= pdfDocument.numPages; i++) {
          const page = await pdfDocument.getPage(i)
          const textContent = await page.getTextContent()
          const text = textContent.items.map(item => item.str).join(' ')

          if (text.toLowerCase().includes(searchKeyword.toLowerCase())) {
            foundPage = i
            break
          }
        }

        if (foundPage > 0) {
          console.log(`Found "${searchKeyword}" on page ${foundPage}`)
          setCurrentPage(foundPage)
        } else {
          console.log(`"${searchKeyword}" not found`)
          // Optional: Show "not found" toast or state
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setIsSearching(false)
      }
    }

    performSearch()
  }, [searchKeyword, pdfDocument])

  function onDocumentLoadSuccess(pdf) {
    setNumPages(pdf.numPages)
    setPdfDocument(pdf)
    setError(null)
  }

  function onDocumentLoadError(error) {
    console.error('PDF load error:', error)
    const errorMessage = error?.message || error?.toString() || 'Unknown error'
    setError(errorMessage)
  }

  function goToPage(page) {
    if (page >= 1 && page <= numPages) {
      setCurrentPage(page)
    }
  }

  function handlePrevious() {
    goToPage(currentPage - 1)
  }

  function handleNext() {
    goToPage(currentPage + 1)
  }

  function handleZoomIn() {
    setScale(prev => Math.min(prev + 0.2, 3))
  }

  function handleZoomOut() {
    setScale(prev => Math.max(prev - 0.2, 0.5))
  }

  if ((!isOpen && !embedded) || !file) return null

  // Embedded view wrapper vs Overlay wrapper
  const Wrapper = embedded ? 'div' : 'div'
  const wrapperClass = embedded ? 'pdf-viewer-embedded' : 'pdf-viewer-overlay'
  const wrapperProps = embedded ? {} : { onClick: onClose }

  return (
    <Wrapper className={wrapperClass} {...wrapperProps}>
      <div className="pdf-viewer-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pdf-viewer-header">
          <div className="pdf-viewer-title">
            
            <span>{embedded ? 'Document Viewer' : 'PDF Viewer'}</span>
            {numPages && (
              <span className="page-info">
                Page {currentPage} of {numPages}
              </span>
            )}
            {isSearching && <span className="searching-badge">Searching...</span>}
          </div>
          <div className="pdf-viewer-controls">
            <button
              className="pdf-control-btn"
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              
            </button>
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
            <button
              className="pdf-control-btn"
              onClick={handleZoomIn}
              title="Zoom In"
            >
              
            </button>
            <button
              className="pdf-control-btn"
              onClick={handlePrevious}
              disabled={currentPage <= 1}
              title="Previous Page"
            >
              
            </button>
            <input
              type="number"
              className="page-input"
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              min={1}
              max={numPages || 1}
            />
            <button
              className="pdf-control-btn"
              onClick={handleNext}
              disabled={currentPage >= numPages}
              title="Next Page"
            >
              
            </button>
            {!embedded && (
              <button
                className="pdf-control-btn close-btn"
                onClick={onClose}
                title="Close"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* PDF Content */}
        <div className="pdf-viewer-content">
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="pdf-loading">
                <div className="spinner"></div>
                <p>Loading PDF...</p>
              </div>
            }
            error={
              <div className="pdf-error">
                <p>Failed to load PDF</p>
                <p className="error-detail">
                  {error || 'Please try again or check if the file is valid.'}
                </p>
                {error && (
                  <p className="error-detail" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    Technical details: {error}
                  </p>
                )}
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={
                <div className="pdf-loading">
                  <div className="spinner"></div>
                  <p>Loading page {currentPage}...</p>
                </div>
              }
            />
          </Document>
        </div>
      </div>
    </Wrapper>
  )
}

export default PDFViewer

