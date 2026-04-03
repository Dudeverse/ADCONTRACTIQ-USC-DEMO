import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

function EnhancedPDFViewer({ file, isOpen, onClose, embedded = false, searchKeyword = null }) {
    const [numPages, setNumPages] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [scale, setScale] = useState(1.0)
    const [error, setError] = useState(null)
    const [pdfDocument, setPdfDocument] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    const [searchText, setSearchText] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const [searchResults, setSearchResults] = useState([])
    const [currentSearchIndex, setCurrentSearchIndex] = useState(0)
    const [showSearchBar, setShowSearchBar] = useState(false)

    const containerRef = useRef(null)
    const pageRefs = useRef({})
    const searchInputRef = useRef(null)
    const observerRef = useRef(null)
    const viewerRef = useRef(null)
    const isFocusedRef = useRef(false)

    const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]

    // External search keyword
    useEffect(() => {
        if (searchKeyword) {
            setSearchText(searchKeyword)
            setShowSearchBar(true)
        }
    }, [searchKeyword])

    useEffect(() => {
        if (searchText && pdfDocument) handleSearch()
    }, [searchText, pdfDocument])

    useEffect(() => {
        setCurrentPage(1)
        setError(null)
        setIsLoading(true)
        setSearchResults([])
        setCurrentSearchIndex(0)
    }, [file])

    // Intersection observer
    useEffect(() => {
        if (!numPages || !containerRef.current) return
        const options = { root: containerRef.current, rootMargin: '-50% 0px -50% 0px', threshold: 0 }
        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const pageNum = parseInt(entry.target.dataset.pageNumber)
                    if (pageNum && !isNaN(pageNum)) setCurrentPage(pageNum)
                }
            })
        }, options)
        Object.values(pageRefs.current).forEach((ref) => {
            if (ref) observerRef.current.observe(ref)
        })
        return () => { if (observerRef.current) observerRef.current.disconnect() }
    }, [numPages, scale])

    // Keyboard shortcuts — only fire when viewer is focused
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isFocusedRef.current) return
            if (!isOpen && !embedded) return

            // Cmd/Ctrl + F — search
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault()
                setShowSearchBar(true)
                setTimeout(() => searchInputRef.current?.focus(), 100)
                return
            }

            // Escape
            if (e.key === 'Escape') {
                if (showSearchBar) setShowSearchBar(false)
                else if (!embedded && onClose) onClose()
                return
            }

            // Enter for search navigation
            if (e.key === 'Enter' && showSearchBar) {
                e.shiftKey ? goToPrevResult() : goToNextResult()
                return
            }

            // +/- zoom — only plain keys, never when Cmd/Ctrl held
            if (!showSearchBar && !e.metaKey && !e.ctrlKey) {
                if (e.key === '+' || e.key === '=') { e.preventDefault(); handleZoomIn() }
                if (e.key === '-') { e.preventDefault(); handleZoomOut() }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, embedded, showSearchBar, onClose])

    function onDocumentLoadSuccess(pdf) {
        setNumPages(pdf.numPages)
        setPdfDocument(pdf)
        setError(null)
        setIsLoading(false)
    }

    function onDocumentLoadError(error) {
        setError(error?.message || 'Unknown error')
        setIsLoading(false)
    }

    function handleZoomIn() {
        setScale(prev => {
            const nextIndex = ZOOM_LEVELS.findIndex(z => z > prev)
            return nextIndex !== -1 ? ZOOM_LEVELS[nextIndex] : prev
        })
    }

    function handleZoomOut() {
        setScale(prev => {
            const prevIndex = ZOOM_LEVELS.slice().reverse().findIndex(z => z < prev)
            return prevIndex !== -1 ? ZOOM_LEVELS[ZOOM_LEVELS.length - 1 - prevIndex] : prev
        })
    }

    function handleZoomReset() { setScale(1.0) }

    function scrollToPage(pageNum) {
        const pageRef = pageRefs.current[pageNum]
        if (pageRef && containerRef.current) {
            pageRef.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    async function handleSearch() {
        if (!searchText.trim() || !pdfDocument) return
        setIsSearching(true)
        const results = []
        try {
            for (let i = 1; i <= pdfDocument.numPages; i++) {
                const page = await pdfDocument.getPage(i)
                const textContent = await page.getTextContent()
                const text = textContent.items.map(item => item.str).join(' ')
                const searchLower = searchText.toLowerCase()
                const textLower = text.toLowerCase()
                let index = 0
                while ((index = textLower.indexOf(searchLower, index)) !== -1) {
                    results.push({
                        pageNumber: i,
                        matchIndex: index,
                        context: text.substring(Math.max(0, index - 30), index + searchText.length + 30)
                    })
                    index += searchText.length
                }
            }
            setSearchResults(results)
            setCurrentSearchIndex(0)
            if (results.length > 0) scrollToPage(results[0].pageNumber)
        } catch (err) {
            console.error('Search error:', err)
        } finally {
            setIsSearching(false)
        }
    }

    function goToNextResult() {
        if (searchResults.length === 0) return
        const nextIndex = (currentSearchIndex + 1) % searchResults.length
        setCurrentSearchIndex(nextIndex)
        scrollToPage(searchResults[nextIndex].pageNumber)
    }

    function goToPrevResult() {
        if (searchResults.length === 0) return
        const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length
        setCurrentSearchIndex(prevIndex)
        scrollToPage(searchResults[prevIndex].pageNumber)
    }

    function clearSearch() {
        setSearchText('')
        setSearchResults([])
        setCurrentSearchIndex(0)
    }

    const pageElements = useMemo(() => {
        if (!numPages) return null
        return Array.from({ length: numPages }, (_, index) => {
            const pageNumber = index + 1
            const hasSearchMatch = searchResults.some(r => r.pageNumber === pageNumber)
            const isCurrentSearchPage = searchResults[currentSearchIndex]?.pageNumber === pageNumber
            return (
                <div
                    key={pageNumber}
                    ref={(el) => { pageRefs.current[pageNumber] = el }}
                    data-page-number={pageNumber}
                    className={`enhanced-pdf-page ${hasSearchMatch ? 'has-match' : ''} ${isCurrentSearchPage ? 'current-match' : ''}`}
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        loading={<div className="page-loading"><div className="mini-spinner"></div></div>}
                    />
                </div>
            )
        })
    }, [numPages, scale, searchResults, currentSearchIndex])

    if ((!isOpen && !embedded) || !file) return null

    const wrapperClass = embedded ? 'enhanced-pdf-viewer-embedded' : 'enhanced-pdf-viewer-overlay'
    const wrapperProps = embedded ? {} : { onClick: onClose }

    return (
        <div
            className={wrapperClass}
            {...wrapperProps}
            ref={viewerRef}
            onMouseEnter={() => { isFocusedRef.current = true }}
            onMouseLeave={() => { isFocusedRef.current = false }}
            onFocus={() => { isFocusedRef.current = true }}
            onBlur={() => { isFocusedRef.current = false }}
        >
            <div className="enhanced-pdf-container" onClick={(e) => e.stopPropagation()}>

                {/* Toolbar */}
                <div className="enhanced-pdf-header">
                    <div className="header-left">
                        <span className="pdf-title">Document</span>
                        {numPages && (
                            <span className="page-counter">
                                {currentPage} / {numPages}
                            </span>
                        )}
                    </div>

                    <div className="header-center">
                        {/* Search toggle */}
                        <button
                            className={`control-btn ${showSearchBar ? 'active' : ''}`}
                            onClick={() => {
                                setShowSearchBar(!showSearchBar)
                                if (!showSearchBar) setTimeout(() => searchInputRef.current?.focus(), 100)
                            }}
                            title="Search (Ctrl/Cmd + F)"
                        >
                            Search
                        </button>

                        <div className="divider"></div>

                        {/* Zoom */}
                        <button
                            className="control-btn"
                            onClick={handleZoomOut}
                            disabled={scale <= ZOOM_LEVELS[0]}
                            title="Zoom Out"
                        >
                            −
                        </button>
                        <button
                            className="zoom-level-btn"
                            onClick={handleZoomReset}
                            title="Reset zoom"
                        >
                            {Math.round(scale * 100)}%
                        </button>
                        <button
                            className="control-btn"
                            onClick={handleZoomIn}
                            disabled={scale >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                            title="Zoom In"
                        >
                            +
                        </button>

                        <div className="divider"></div>

                        {/* Page navigation */}
                        <button
                            className="control-btn"
                            onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            title="Previous Page"
                        >
                            ◀
                        </button>
                        <input
                            type="number"
                            className="page-input"
                            value={currentPage}
                            onChange={(e) => {
                                const page = parseInt(e.target.value)
                                if (page >= 1 && page <= numPages) scrollToPage(page)
                            }}
                            min={1}
                            max={numPages || 1}
                        />
                        <button
                            className="control-btn"
                            onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
                            disabled={currentPage === numPages}
                            title="Next Page"
                        >
                            ▶
                        </button>
                    </div>

                    <div className="header-right">
                        {isSearching && <span className="searching-indicator">Searching...</span>}
                        {!embedded && (
                            <button className="control-btn close-btn" onClick={onClose} title="Close">
                                ×
                            </button>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                {showSearchBar && (
                    <div className="search-bar">
                        <div className="search-input-wrapper">
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="search-input"
                                placeholder="Search in document..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        if (e.shiftKey) goToPrevResult()
                                        else if (searchResults.length === 0) handleSearch()
                                        else goToNextResult()
                                    }
                                }}
                            />
                            {searchText && (
                                <button className="clear-search-btn" onClick={clearSearch}>×</button>
                            )}
                        </div>

                        <button
                            className="search-btn"
                            onClick={handleSearch}
                            disabled={!searchText.trim() || isSearching}
                        >
                            {isSearching ? 'Searching...' : 'Search'}
                        </button>

                        {searchResults.length > 0 && (
                            <div className="search-navigation">
                                <span className="result-count">
                                    {currentSearchIndex + 1} of {searchResults.length}
                                </span>
                                <button className="nav-btn" onClick={goToPrevResult} title="Previous (Shift+Enter)">▲</button>
                                <button className="nav-btn" onClick={goToNextResult} title="Next (Enter)">▼</button>
                            </div>
                        )}

                        {searchText && searchResults.length === 0 && !isSearching && (
                            <span className="no-results">No matches</span>
                        )}
                    </div>
                )}

                {/* PDF Content */}
                <div className="enhanced-pdf-body">
                    <div className="enhanced-pdf-content" ref={containerRef}>
                        <Document
                            file={file}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading={
                                <div className="pdf-loading-state">
                                    <div className="loading-spinner"></div>
                                    <p>Loading document...</p>
                                </div>
                            }
                            error={
                                <div className="pdf-error-state">
                                    <p>Failed to load PDF</p>
                                    <p className="error-detail">{error || 'Please check if the file is valid.'}</p>
                                </div>
                            }
                        >
                            {pageElements}
                        </Document>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default EnhancedPDFViewer
