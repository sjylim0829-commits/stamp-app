import React, { useState, useEffect } from 'react';
import FormFiller from './components/FormFiller';
import TemplateEditor from './components/TemplateEditor';
import { Stamp, Edit3, Layers, FileCheck, Lock, Unlock, ShieldCheck } from 'lucide-react';

const ADMIN_PASSWORD = '661227';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('fill'); // 'fill' | 'manage'
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleAdminUnlock = (e) => {
    e.preventDefault();
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdminUnlocked(true);
      setPasswordError('');
      setAdminPassword('');
    } else {
      setPasswordError('비밀번호가 올바르지 않습니다.');
    }
  };

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
            {isAdminUnlocked ? <Unlock size={18} /> : <Lock size={18} />} 템플릿 관리
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
        ) : !isAdminUnlocked ? (
          <div style={{ maxWidth: '420px', margin: '40px auto', textAlign: 'center' }}>
            <div style={{
              width: '72px', height: '72px', margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
            }}>
              <ShieldCheck size={32} style={{ color: '#64748b' }} />
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              🔒 관리자 전용 영역
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '28px', lineHeight: '1.6' }}>
              템플릿 필드 매핑 설정은 관리자만 수정할 수 있습니다.<br/>관리자 비밀번호를 입력해 주세요.
            </p>
            <form onSubmit={handleAdminUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="password"
                className="form-input"
                placeholder="관리자 비밀번호 입력"
                value={adminPassword}
                onChange={(e) => { setAdminPassword(e.target.value); setPasswordError(''); }}
                style={{ textAlign: 'center', fontSize: '1.05rem', letterSpacing: '4px', padding: '14px 16px' }}
                autoFocus
              />
              {passwordError && (
                <div style={{
                  padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5',
                  borderRadius: '8px', color: '#dc2626', fontSize: '0.88rem', fontWeight: '700'
                }}>
                  ⚠️ {passwordError}
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <Lock size={18} /> 잠금 해제
              </button>
            </form>
          </div>
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
