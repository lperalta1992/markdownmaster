import { useState, useRef, useEffect } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { UploadCloud, FileText, Merge, File, Loader, Save, MessageSquare, Send, ArrowLeft, ChevronRight } from 'lucide-react';

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

loader.config({ monaco });
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [notification, setNotification] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressState, setProgressState] = useState({ message: '', percent: 0, error: false });
  const pollIntervalRef = useRef(null);
  
  // Document Viewer State
  const [viewingDoc, setViewingDoc] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatting, isChatOpen]);

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
    setProgressState({ message: 'Initializing...', percent: 0, error: false });
    const taskId = crypto.randomUUID();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('task_id', taskId);

    // Start polling
    pollIntervalRef.current = setInterval(async () => {
      try {
        const pRes = await fetch(`${API_URL}/progress/${taskId}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          setProgressState(pData);
          if (pData.error) clearInterval(pollIntervalRef.current);
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 1500);

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(pollIntervalRef.current);
      
      if (!res.ok) throw new Error('Upload failed');
      
      showNotification('PDF successfully processed by Knowledge Engineer!');
      fetchDocuments();
      setActiveTab('manage');
    } catch (err) {
      console.error(err);
      clearInterval(pollIntervalRef.current);
      setProgressState({ message: 'Error processing PDF', percent: 0, error: true });
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
      setEditorContent(data.content);
      setChatMessages([{ role: 'assistant', content: 'Hello! I am your document assistant. Highlight text in the editor and ask me a question about it!' }]);
    } catch (err) {
      console.error(err);
      showNotification('Error loading document', true);
    }
  };

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  const saveDocument = async () => {
    if (!viewingDoc) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/documents/${viewingDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editorContent })
      });
      if (!res.ok) throw new Error('Save failed');
      showNotification('Document saved successfully!');
    } catch (err) {
      console.error(err);
      showNotification('Error saving document', true);
    } finally {
      setIsSaving(false);
    }
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !viewingDoc) return;

    const question = chatInput.trim();
    setChatInput('');
    
    // Get selected text from Monaco Editor for context
    let selectedText = "";
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      selectedText = editorRef.current.getModel().getValueInRange(selection);
    }

    // Add user message to UI
    const newMessages = [...chatMessages, { role: 'user', content: question, context: selectedText }];
    setChatMessages(newMessages);
    setIsChatting(true);

    try {
      const res = await fetch(`${API_URL}/documents/${viewingDoc.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: selectedText })
      });
      
      if (!res.ok) throw new Error('Chat failed');
      const data = await res.json();
      
      setChatMessages([...newMessages, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      console.error(err);
      setChatMessages([...newMessages, { role: 'assistant', content: 'Error: Could not reach the LLM.' }]);
    } finally {
      setIsChatting(false);
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

      <main className="glass-panel" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
        
        {!viewingDoc && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button 
              className={`btn ${activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('upload')}
            >
              <UploadCloud size={20} /> Convert PDF
            </button>
            <button 
              className={`btn ${activeTab === 'manage' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setActiveTab('manage'); fetchDocuments(); }}
            >
              <FileText size={20} /> Manage & Merge
            </button>
          </div>
        )}

        {activeTab === 'upload' && !viewingDoc && (
          <div 
            className={`upload-zone ${isProcessing ? 'processing' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileUpload}
            onClick={() => !isProcessing && document.getElementById('file-upload').click()}
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
                
                {/* Progress Bar UI */}
                <div style={{ width: '80%', maxWidth: '400px', marginTop: '1.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '1rem', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '8px', 
                    width: `${progressState.percent}%`, 
                    background: progressState.error ? '#ef4444' : 'var(--accent-primary)',
                    transition: 'width 0.5s ease-out'
                  }}></div>
                </div>
                <p style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>{progressState.message || "Working..."} ({progressState.percent}%)</p>
                <p style={{ color: '#00f2fe', marginTop: '1rem', fontSize: '0.8rem' }}>This may take a while for large files!</p>
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
          <div style={{ flex: 1 }}>
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
                      <button className="action-btn" onClick={() => viewDocument(doc.id)} title="Open Editor">
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
          <div className="editor-layout">
            <div className="editor-header">
              <button className="btn btn-secondary" onClick={() => setViewingDoc(null)}>
                <ArrowLeft size={16} /> Back
              </button>
              <h3 style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {viewingDoc.id}.md
              </h3>
              <button className="btn btn-primary" onClick={saveDocument} disabled={isSaving}>
                {isSaving ? <Loader size={16} className="spinner" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>

            <div className="editor-main">
              <div className={`editor-pane ${!isChatOpen ? 'expanded' : ''}`}>
                <Editor
                  height="100%"
                  defaultLanguage="markdown"
                  theme="vs-dark"
                  value={editorContent}
                  onChange={(val) => setEditorContent(val)}
                  onMount={handleEditorDidMount}
                  options={{
                    wordWrap: 'on',
                    minimap: { enabled: true },
                    fontSize: 14,
                    padding: { top: 16 }
                  }}
                />
                {!isChatOpen && (
                  <button className="chat-toggle-floating" onClick={() => setIsChatOpen(true)} title="Open Assistant">
                    <MessageSquare size={20} />
                  </button>
                )}
              </div>
              
              <div className={`chat-pane ${isChatOpen ? 'open' : 'closed'}`}>
                <div className="chat-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare size={18} />
                    <span>Document Assistant</span>
                  </div>
                  <button className="action-btn" onClick={() => setIsChatOpen(false)} title="Collapse Chat">
                    <ChevronRight size={18} />
                  </button>
                </div>
                
                <div className="chat-messages">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role}`}>
                      {msg.context && (
                        <div className="chat-context-preview">
                          <strong>Context:</strong> "{msg.context.length > 50 ? msg.context.substring(0, 50) + '...' : msg.context}"
                        </div>
                      )}
                      <div className="message-content">{msg.content}</div>
                    </div>
                  ))}
                  {isChatting && (
                    <div className="chat-message assistant thinking">
                      <div className="typing-indicator">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form className="chat-input-area" onSubmit={sendChatMessage}>
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about highlighted text..."
                    disabled={isChatting}
                  />
                  <button type="submit" disabled={isChatting || !chatInput.trim()}>
                    <Send size={18} />
                  </button>
                </form>
              </div>
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
