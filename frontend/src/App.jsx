import React, { useState, useEffect } from 'react';
import FormFiller from './components/FormFiller';
import TemplateEditor from './components/TemplateEditor';
import SchoolHolidayManager from './components/SchoolHolidayManager';
import {
  Stamp,
  FileCheck,
  Lock,
  Unlock,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

const ADMIN_PASSWORD = '661227';
const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

const FALLBACK_DEFAULT_HOLIDAYS = [
  { id: 'sh_20260501', date: '2026-05-01', name: '근로자의 날 / 개교기념일', type: '개교기념일', memo: '학교 지정 휴업일' },
  { id: 'sh_20260504', date: '2026-05-04', name: '어린이날 징검다리 재량휴업일', type: '재량휴업일', memo: '5/5 어린이날 연계 휴업' },
  { id: 'sh_20260605', date: '2026-06-05', name: '현충일 징검다리 재량휴업일', type: '재량휴업일', memo: '6/6 현충일 연계 휴업' },
  { id: 'sh_20261002', date: '2026-10-02', name: '개천절 징검다리 재량휴업일', type: '재량휴업일', memo: '10/3 개천절 연계 휴업' },
  { id: 'sh_20261119', date: '2026-11-19', name: '대학수학능력시험일', type: '수능일', memo: '수능 시험장 운영' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('fill'); // 'fill' | 'holidays' | 'templates'
  const [templates, setTemplates] = useState([]);
  const [schoolHolidays, setSchoolHolidays] = useState([]);
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
      const res = await fetch(`${API_BASE}/api/templates`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        localStorage.setItem('stamp_templates', JSON.stringify(data));
        if (data.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(data[0].id);
        }
      } else {
        const local = localStorage.getItem('stamp_templates');
        if (local) {
          const parsed = JSON.parse(local);
          setTemplates(parsed);
          if (parsed.length > 0 && !selectedTemplateId) setSelectedTemplateId(parsed[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch templates from backend, trying localStorage:', err);
      const local = localStorage.getItem('stamp_templates');
      if (local) {
        const parsed = JSON.parse(local);
        setTemplates(parsed);
        if (parsed.length > 0 && !selectedTemplateId) setSelectedTemplateId(parsed[0].id);
      }
    }
  };

  const fetchSchoolHolidays = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/school-holidays`);
      if (res.ok) {
        const data = await res.json();
        setSchoolHolidays(data);
        localStorage.setItem('stamp_school_holidays', JSON.stringify(data));
      } else {
        const local = localStorage.getItem('stamp_school_holidays');
        if (local) {
          setSchoolHolidays(JSON.parse(local));
        } else {
          setSchoolHolidays(FALLBACK_DEFAULT_HOLIDAYS);
        }
      }
    } catch (err) {
      console.warn('Backend API connection failed, using local/fallback holidays:', err);
      const local = localStorage.getItem('stamp_school_holidays');
      if (local) {
        setSchoolHolidays(JSON.parse(local));
      } else {
        setSchoolHolidays(FALLBACK_DEFAULT_HOLIDAYS);
      }
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([fetchTemplates(), fetchSchoolHolidays()]);
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
  };

  const isManagementTab = activeTab === 'holidays' || activeTab === 'templates';

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
            onClick={() => handleTabClick('fill')}
          >
            <FileCheck size={18} /> 양식 작성 및 출력
          </button>
          
          <button
            className={`nav-tab ${activeTab === 'holidays' ? 'active' : ''}`}
            onClick={() => handleTabClick('holidays')}
          >
            <Calendar size={18} /> 학교 휴업일 관리
            {!isAdminUnlocked && <Lock size={14} style={{ opacity: 0.6 }} />}
          </button>

          <button
            className={`nav-tab ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => handleTabClick('templates')}
          >
            <Layers size={18} /> 템플릿 관리
            {!isAdminUnlocked && <Lock size={14} style={{ opacity: 0.6 }} />}
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="main-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>양식 및 학교 학사 정보를 불러오는 중입니다...</p>
          </div>
        ) : activeTab === 'fill' ? (
          <FormFiller
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={setSelectedTemplateId}
            schoolHolidays={schoolHolidays}
            apiBase={API_BASE}
          />
        ) : !isAdminUnlocked ? (
          /* 관리자 비밀번호 잠금 화면 */
          <div style={{ maxWidth: '440px', margin: '40px auto', textAlign: 'center' }}>
            <div style={{
              width: '76px', height: '76px', margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(59, 130, 246, 0.15)',
              color: '#2563eb'
            }}>
              <ShieldCheck size={36} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              🔒 관리자 전용 영역
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '28px', lineHeight: '1.6' }}>
              학교 휴업일 및 템플릿 필드 매핑 설정은 관리자만 수정할 수 있습니다.<br/>
              관리자 비밀번호를 입력해 주세요.
            </p>
            <form onSubmit={handleAdminUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="password"
                className="form-input"
                placeholder="관리자 비밀번호 입력"
                value={adminPassword}
                onChange={(e) => { setAdminPassword(e.target.value); setPasswordError(''); }}
                style={{ textAlign: 'center', fontSize: '1.1rem', letterSpacing: '4px', padding: '14px 16px' }}
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
                <Unlock size={18} /> 관리자 잠금 해제
              </button>
            </form>
          </div>
        ) : (
          /* 관리자 잠금 해제 후 관리 영역 */
          <div>
            {/* 관리자 서브 탭 네비게이션 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              padding: '6px 8px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              marginBottom: '28px'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('holidays')}
                  className={`btn ${activeTab === 'holidays' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                >
                  <Calendar size={16} /> 📅 학교 휴업일 등록·관리
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('templates')}
                  className={`btn ${activeTab === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                >
                  <Layers size={16} /> 📋 서식 템플릿 필드 매핑
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '0.84rem', fontWeight: '700', paddingRight: '12px' }}>
                <Unlock size={14} /> 관리자 인증 완료
              </div>
            </div>

            {/* 활성 관리자 서브탭 컴포넌트 렌더링 */}
            {activeTab === 'holidays' ? (
              <SchoolHolidayManager
                schoolHolidays={schoolHolidays}
                onHolidaysUpdated={fetchSchoolHolidays}
                apiBase={API_BASE}
              />
            ) : (
              <TemplateEditor
                templates={templates}
                onTemplateUpdated={fetchTemplates}
                apiBase={API_BASE}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
