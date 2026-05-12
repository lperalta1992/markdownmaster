import { useState } from 'react';
import { UploadCloud, FileText, Merge, File, Loader } from 'lucide-react';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [notification, setNotification] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);

  const showNotification = (message, isError = false) => {
    setNotification({ message, isError });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/documents`);
      const data = await res.json();
      setDocuments(data.documents);
    } catch (err) {
      console.error(err);
      showNotification('Failed to fetch documents', true);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    
    if (!file || file.type !== 'application/pdf') {
      showNotification('Please upload a valid PDF file', true);
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      showNotification('PDF successfully processed by Knowledge Engineer!');
      fetchDocuments();
      setActiveTab('manage');
    } catch (err) {
      console.error(err);
      showNotification('Error processing PDF', true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMerge = async () => {
    if (selectedDocs.length < 2) {
      showNotification('Select at least two documents to merge', true);
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`${API_URL}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_ids: selectedDocs })
      });
      
      if (!res.ok) throw new Error('Merge failed');
      
      showNotification('Documents merged successfully!');
      setSelectedDocs([]);
      fetchDocuments();
    } catch (err) {
      console.error(err);
      showNotification('Error merging documents', true);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleDocSelection = (id) => {
    setSelectedDocs(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const viewDocument = async (id) => {
    try {
      const res = await fetch(`${API_URL}/documents/${id}`);
      const data = await res.json();
      setViewingDoc(data);
    } catch (err) {
      console.error(err);
      showNotification('Error loading document', true);
    }
  };

  // Load documents when manage tab is active
  if (activeTab === 'manage' && documents.length === 0 && !isProcessing) {
    fetchDocuments();
  }

  return (
    <div className="app-container">
      <header>
        <h1>MarkDownMaster</h1>
        <p>AI-Powered Knowledge Engineer for your PDFs</p>
      </header>

      <main className="glass-panel" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button 
            className={`btn ${activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('upload'); setViewingDoc(null); }}
          >
            <UploadCloud size={20} /> Convert PDF
          </button>
          <button 
            className={`btn ${activeTab === 'manage' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('manage'); fetchDocuments(); setViewingDoc(null); }}
          >
            <FileText size={20} /> Manage & Merge
          </button>
        </div>

        {activeTab === 'upload' && (
          <div 
            className={`upload-zone ${isProcessing ? 'processing' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileUpload}
            onClick={() => document.getElementById('file-upload').click()}
          >
            <input 
              type="file" 
              id="file-upload" 
              accept=".pdf" 
              style={{ display: 'none' }} 
              onChange={handleFileUpload}
            />
            {isProcessing ? (
              <>
                <Loader size={64} className="spinner" />
                <h2>Knowledge Engineer is Processing...</h2>
                <p>Extracting structure and formatting markdown via local LLM.</p>
              </>
            ) : (
              <>
                <UploadCloud size={64} />
                <h2>Drag & Drop PDF here</h2>
                <p>Or click to browse files</p>
              </>
            )}
          </div>
        )}

        {activeTab === 'manage' && !viewingDoc && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Processed Documents</h2>
              <button 
                className="btn btn-primary" 
                onClick={handleMerge}
                disabled={selectedDocs.length < 2 || isProcessing}
              >
                {isProcessing ? <Loader size={20} className="spinner" /> : <Merge size={20} />}
                Merge Selected ({selectedDocs.length})
              </button>
            </div>
            
            <div className="document-list">
              {documents.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem' }}>No documents processed yet.</p>
              ) : (
                documents.map(doc => (
                  <div 
                    key={doc.id} 
                    className={`document-item ${selectedDocs.includes(doc.id) ? 'selected' : ''}`}
                    onClick={() => toggleDocSelection(doc.id)}
                  >
                    <div className="doc-info">
                      <File className="doc-icon" size={24} />
                      <span>{doc.filename}</span>
                    </div>
                    <div className="doc-actions" onClick={e => e.stopPropagation()}>
                      <button className="action-btn" onClick={() => viewDocument(doc.id)}>
                        <FileText size={20} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {viewingDoc && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Viewing: {viewingDoc.id}</h2>
              <button className="btn btn-secondary" onClick={() => setViewingDoc(null)}>Back</button>
            </div>
            <div className="content-viewer">
              {viewingDoc.content}
            </div>
          </div>
        )}
      </main>

      {notification && (
        <div className={`notification ${notification.isError ? 'error' : ''}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}

export default App;
