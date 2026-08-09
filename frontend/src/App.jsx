import React, { useState, useEffect } from 'react';
import FormFiller from './components/FormFiller';
import TemplateEditor from './components/TemplateEditor';
import { Stamp, Edit3, Layers, FileCheck } from 'lucide-react';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('fill'); // 'fill' | 'manage'
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/templates`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        if (data.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return (
    <div className="app-container">
      {/* Top Header Bar */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-badge">
            <Stamp size={26} />
          </div>
          <div>
            <h1 className="logo-title">스탬프 (Stamp)</h1>
            <p className="logo-subtitle">학교 서식 자동 완성 & PDF 표준 출력 에이전트</p>
          </div>
        </div>

        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'fill' ? 'active' : ''}`}
            onClick={() => setActiveTab('fill')}
          >
            <FileCheck size={18} /> 양식 작성 및 출력
          </button>
          <button
            className={`nav-tab ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            <Layers size={18} /> 템플릿 관리
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="main-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>양식 템플릿 정보를 불러오는 중입니다...</p>
          </div>
        ) : activeTab === 'fill' ? (
          <FormFiller
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={setSelectedTemplateId}
            apiBase={API_BASE}
          />
        ) : (
          <TemplateEditor
            templates={templates}
            onTemplateUpdated={fetchTemplates}
            apiBase={API_BASE}
          />
        )}
      </main>
    </div>
  );
}
