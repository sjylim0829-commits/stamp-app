import React, { useState } from 'react';
import { Upload, Plus, Trash2, Save, FileText, Check } from 'lucide-react';

export default function TemplateEditor({ templates, onTemplateUpdated, apiBase = '' }) {
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0] || null);
  const [fields, setFields] = useState(selectedTemplate?.fields || []);
  const [statusMsg, setStatusMsg] = useState('');

  const handleSelect = (t) => {
    setSelectedTemplate(t);
    setFields(t.fields || []);
    setStatusMsg('');
  };

  const handleFieldChange = (idx, prop, val) => {
    const updated = [...fields];
    updated[idx] = { ...updated[idx], [prop]: val };
    setFields(updated);
  };

  const handleAddField = () => {
    const newF = {
      id: `field_${Date.now()}`,
      label: '신규 입력 항목',
      page: 0,
      x: 100,
      y: 100,
      width: 100,
      font_size: 12.0,
      required: True,
      color_tag: 'blue',
      placeholder: '내용 입력'
    };
    setFields([...fields, newF]);
  };

  const handleRemoveField = (idx) => {
    const updated = fields.filter((_, i) => i !== idx);
    setFields(updated);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    const payload = {
      ...selectedTemplate,
      fields: fields
    };

    try {
      const res = await fetch(`${apiBase}/api/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setStatusMsg('템플릿 설정이 성공적으로 저장되었습니다!');
        onTemplateUpdated();
      } else {
        setStatusMsg('저장에 실패했습니다.');
      }
    } catch (err) {
      setStatusMsg(`오류 발생: ${err.message}`);
    }
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">
          <FileText className="text-primary" size={24} style={{ color: '#2563eb' }} /> 학교 서식 템플릿 필드 매핑 관리
        </h2>
        <p className="section-desc">기본 양식 PDF 상의 좌표 및 필수/선택/수기작성 속성을 설정합니다.</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn ${selectedTemplate?.id === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleSelect(t)}
          >
            {t.name}
          </button>
        ))}
      </div>

      {selectedTemplate && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>'{selectedTemplate.name}' 필드 구성 ({fields.length}개)</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={handleAddField}>
                <Plus size={16} /> 필드 추가
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSave}>
                <Save size={16} /> 템플릿 저장
              </button>
            </div>
          </div>

          {statusMsg && (
            <div style={{ padding: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#047857', marginBottom: '16px', fontWeight: 'bold' }}>
              {statusMsg}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>필드 ID</th>
                  <th style={{ padding: '10px' }}>라벨</th>
                  <th style={{ padding: '10px' }}>X 좌표</th>
                  <th style={{ padding: '10px' }}>Y 좌표</th>
                  <th style={{ padding: '10px' }}>색상 태그</th>
                  <th style={{ padding: '10px' }}>필수 여부</th>
                  <th style={{ padding: '10px' }}>작동</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                        value={f.id}
                        onChange={(e) => handleFieldChange(idx, 'id', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                        value={f.label}
                        onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input
                        type="number"
                        className="form-input"
                        style={{ width: '70px', padding: '6px 8px', fontSize: '0.85rem' }}
                        value={f.x}
                        onChange={(e) => handleFieldChange(idx, 'x', parseFloat(e.target.value))}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input
                        type="number"
                        className="form-input"
                        style={{ width: '70px', padding: '6px 8px', fontSize: '0.85rem' }}
                        value={f.y}
                        onChange={(e) => handleFieldChange(idx, 'y', parseFloat(e.target.value))}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <select
                        className="form-input"
                        style={{ padding: '6px 8px', fontSize: '0.85rem' }}
                        value={f.color_tag || 'blue'}
                        onChange={(e) => handleFieldChange(idx, 'color_tag', e.target.value)}
                      >
                        <option value="blue">🔵 파란색 (필수)</option>
                        <option value="yellow">🟡 노란색 (선택)</option>
                        <option value="green">🟢 초록색 (수기음영)</option>
                      </select>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={f.required}
                        onChange={(e) => handleFieldChange(idx, 'required', e.target.checked)}
                        style={{ width: '16px', height: '16px' }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <button
                        type="button"
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        onClick={() => handleRemoveField(idx)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
