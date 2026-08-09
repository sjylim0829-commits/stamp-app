import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Eye,
  User,
  Calendar,
  Paperclip,
  CheckSquare,
  UserCheck,
  Edit3
} from 'lucide-react';

const HOLIDAYS_2026 = new Set([
  '2026-01-01',
  '2026-02-16', '2026-02-17', '2026-02-18',
  '2026-03-01', '2026-03-02',
  '2026-05-05',
  '2026-05-24', '2026-05-25',
  '2026-06-06',
  '2026-08-15', '2026-08-17',
  '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-28',
  '2026-10-03', '2026-10-05',
  '2026-10-09',
  '2026-12-25',
]);

function calculateBusinessDays(startM, startD, endM, endD, year = 2026) {
  if (!startM || !startD || !endM || !endD) return '';
  const sm = parseInt(startM, 10);
  const sd = parseInt(startD, 10);
  const em = parseInt(endM, 10);
  const ed = parseInt(endD, 10);

  if (isNaN(sm) || isNaN(sd) || isNaN(em) || isNaN(ed)) return '';

  const startDate = new Date(year, sm - 1, sd);
  const endDate = new Date(year, em - 1, ed);

  if (startDate > endDate) return '';

  let count = 0;
  let cur = new Date(startDate);

  while (cur <= endDate) {
    const dayOfWeek = cur.getDay();
    const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !HOLIDAYS_2026.has(dateStr)) {
      count++;
    }

    cur.setDate(cur.getDate() + 1);
  }

  return count > 0 ? String(count) : '0';
}

export default function FormFiller({ templates, selectedTemplateId, onSelectTemplate, apiBase = '' }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [validationError, setValidationError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const found = templates.find((t) => t.id === selectedTemplateId) || templates[0];
      setSelectedTemplate(found);
      initFormState(found);
    } else if (templates.length > 0) {
      setSelectedTemplate(templates[0]);
      onSelectTemplate(templates[0].id);
      initFormState(templates[0]);
    }
  }, [selectedTemplateId, templates]);

  const initFormState = (template) => {
    const initial = {};
    if (template && template.fields) {
      template.fields.forEach((f) => {
        initial[f.id] = '';
      });
    }
    setFormData(initial);
    setValidationError(null);
    setFieldErrors({});
    setPdfPreviewUrl(null);
  };

  const handleTemplateChange = (t) => {
    setSelectedTemplate(t);
    onSelectTemplate(t.id);
    initFormState(t);
  };

  const handleInputChange = (fieldId, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [fieldId]: value };

      if (fieldId === 'student_name') {
        updated.sign_name = value ? `${value}` : '';
      }

      if (['start_month', 'start_day', 'end_month', 'end_day'].includes(fieldId)) {
        const sm = updated.start_month;
        const sd = updated.start_day;
        const em = updated.end_month;
        const ed = updated.end_day;

        const autoDays = calculateBusinessDays(sm, sd, em, ed, 2026);
        if (autoDays !== '') {
          updated.days_count = autoDays;
        }
      }

      return updated;
    });

    if (fieldErrors[fieldId]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[fieldId];
        return updated;
      });
    }
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    const missingFields = [];
    const errors = {};

    selectedTemplate.fields.forEach((field) => {
      if (field.color_tag === 'green' || field.handwriting_shading) return;

      if (field.required || field.color_tag === 'blue') {
        const val = formData[field.id];
        if (!val || String(val).trim() === '') {
          missingFields.push(field.label || field.id);
          errors[field.id] = `'${field.label}' 항목은 필수 입력 사항입니다.`;
        }
      }
    });

    // 날짜 순서 검증
    const em = parseInt(formData.end_month, 10);
    const ed = parseInt(formData.end_day, 10);
    const sm = parseInt(formData.submit_month, 10);
    const sd = parseInt(formData.submit_day, 10);
    const tm = parseInt(formData.teacher_confirm_month, 10);
    const td = parseInt(formData.teacher_confirm_day, 10);
    const year = parseInt(formData.submit_year, 10) || 2026;

    if (em && ed && sm && sd) {
      const endDt = new Date(year, em - 1, ed);
      const subDt = new Date(year, sm - 1, sd);

      if (subDt <= endDt) {
        missingFields.push('신고서 제출 일자 (결석 종료일보다 나중 날짜여야 함)');
        errors['submit_day'] = '신고서 제출 일자는 결석 종료 일자보다 이후(더 나중) 날짜여야 합니다!';
      }
    }

    if (sm && sd && tm && td) {
      const subDt = new Date(year, sm - 1, sd);
      const tchDt = new Date(year, tm - 1, td);

      if (tchDt <= subDt) {
        missingFields.push('담임 확인 일자 (신고서 제출일보다 나중 날짜여야 함)');
        errors['teacher_confirm_day'] = '담임 확인 일자는 신고서 제출 일자보다 이후(더 나중) 날짜여야 합니다!';
      }
    }

    if (missingFields.length > 0) {
      setValidationError({
        message: `필수 입력값 누락 또는 날짜 순서 오류로 PDF를 출력할 수 없습니다!`,
        missingFields: missingFields,
      });
      setFieldErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsGenerating(true);
    setValidationError(null);
    setFieldErrors({});

    try {
      const response = await fetch(`${apiBase}/api/fill-pdf/${selectedTemplate.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: formData }),
      });

      if (!response.ok) {
        const errData = await response.json();
        const detail = errData.detail || {};
        setValidationError({
          message: detail.message || '필수 항목 누락 또는 날짜 순서 오류로 PDF 출력이 차단되었습니다.',
          missingFields: detail.missing_fields || [],
        });
        if (detail.field_errors) {
          setFieldErrors(detail.field_errors);
        }
        setIsGenerating(false);
        return;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      setPdfPreviewUrl(downloadUrl);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Stamp_${selectedTemplate.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setValidationError({
        message: `서버 통신 오류가 발생했습니다: ${err.message}`,
        missingFields: [],
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getField = (id) => selectedTemplate?.fields?.find((f) => f.id === id);

  const renderSingleField = (fieldId, customLabel = null) => {
    const field = getField(fieldId);
    if (!field) return null;

    const isError = !!fieldErrors[field.id];
    const isBlue = field.required || field.color_tag === 'blue';
    const isGreen = field.color_tag === 'green' || field.handwriting_shading;
    const isDaysCount = field.id === 'days_count';
    const isSignName = field.id === 'sign_name';
    const isAbsenceType = field.id === 'absence_type';

    return (
      <div className={`form-group ${field.multiline ? 'full-width' : ''}`}>
        <label className="form-label">
          {customLabel || field.label}
          {isGreen ? (
            <span className="badge-green">🟢 초록색: 수기작성 (음영)</span>
          ) : isBlue ? (
            <span className="badge-blue">🔵 파란색: 필수</span>
          ) : (
            <span className="badge-yellow">🟡 노란색: 선택</span>
          )}
          {isDaysCount && (
            <span style={{ fontSize: '0.75rem', color: '#059669', marginLeft: '6px' }}>
              ⚡ (주말/공휴일 제외 자동 계산)
            </span>
          )}
          {isSignName && (
            <span style={{ fontSize: '0.75rem', color: '#2563eb', marginLeft: '6px' }}>
              ⚡ (상단 학생 이름 자동 반영)
            </span>
          )}
        </label>

        {isGreen ? (
          <div
            style={{
              padding: '12px 16px',
              background: '#f0fdf4',
              border: '1.5px dashed #a7f3d0',
              borderRadius: '10px',
              color: '#047857',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600'
            }}
          >
            <Edit3 size={16} /> ✍️ 수기작성 영역 (PDF 출력 시 원본 글자가 들여다보이는 옅은 음영 박스로 표시됩니다)
          </div>
        ) : isAbsenceType ? (
          <div style={{ display: 'flex', gap: '20px', padding: '8px 12px', background: '#f8fafc', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600' }}>
              <input
                type="radio"
                name="absence_type_radio"
                value="질병"
                checked={formData[field.id] === '질병'}
                onChange={() => handleInputChange(field.id, '질병')}
                style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
              />
              ⭕ 질병 (글자 위 동그라미 표식)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600' }}>
              <input
                type="radio"
                name="absence_type_radio"
                value="인정"
                checked={formData[field.id] === '인정'}
                onChange={() => handleInputChange(field.id, '인정')}
                style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
              />
              ⭕ 인정 (글자 위 동그라미 표식)
            </label>
          </div>
        ) : field.multiline ? (
          <textarea
            rows={3}
            className={`form-textarea ${isError ? 'error' : ''}`}
            placeholder={field.placeholder || `${field.label} 내용을 입력하세요`}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        ) : (
          <input
            type="text"
            className={`form-input ${isError ? 'error' : ''}`}
            placeholder={field.placeholder || `${field.label} 입력`}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            readOnly={isDaysCount && !!formData.days_count}
          />
        )}

        {isError && <div className="error-text">{fieldErrors[field.id]}</div>}
      </div>
    );
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">
          <FileText className="text-primary" size={24} style={{ color: '#2563eb' }} /> 학교 서식 양식 선택
        </h2>
        <p className="section-desc">채우고자 하는 학교 기본 양식을 선택한 후 전달받은 내용만 채워주세요.</p>
      </div>

      <div className="template-grid">
        {templates.map((t) => (
          <div
            key={t.id}
            className={`template-card ${selectedTemplate?.id === t.id ? 'selected' : ''}`}
            onClick={() => handleTemplateChange(t)}
          >
            <div className="template-card-title">{t.name}</div>
            <div className="template-card-desc">{t.description || '학교 기본 양식'}</div>
            <span className="template-badge">필드 {t.fields?.length || 0}개</span>
          </div>
        ))}
      </div>

      {selectedTemplate && (
        <form onSubmit={handleSubmit} className="form-container">
          {validationError && (
            <div className="alert-banner">
              <AlertTriangle className="alert-icon" size={24} />
              <div>
                <div className="alert-title">{validationError.message}</div>
                {validationError.missingFields.length > 0 && (
                  <ul className="alert-list">
                    {validationError.missingFields.map((label, idx) => (
                      <li key={idx}>
                        ⚠️ {label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* 카테고리 1: 🎓 학생 기본 정보 */}
          <div className="form-category-card">
            <div className="category-title">
              <div className="category-title-icon"><User size={18} /></div>
              <span>🎓 1. 학생 인적사항</span>
            </div>
            <div className="form-grid">
              {renderSingleField('grade')}
              {renderSingleField('class_num')}
              {renderSingleField('student_num')}
              {renderSingleField('student_name')}
            </div>
          </div>

          {/* 카테고리 2: 📅 결석 기간 및 사유 */}
          <div className="form-category-card">
            <div className="category-title">
              <div className="category-title-icon"><Calendar size={18} /></div>
              <span>📅 2. 결석 기간 및 사유</span>
            </div>
            <div className="form-grid">
              {renderSingleField('absence_type')}
              
              <div className="form-group full-width">
                <label className="form-label">
                  결석 시작일 및 종료일 <span className="badge-blue">🔵 필수</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: '70px', textAlign: 'center' }}
                      placeholder="9"
                      value={formData.start_month || ''}
                      onChange={(e) => handleInputChange('start_month', e.target.value)}
                    />
                    <span>월</span>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: '70px', textAlign: 'center' }}
                      placeholder="1"
                      value={formData.start_day || ''}
                      onChange={(e) => handleInputChange('start_day', e.target.value)}
                    />
                    <span>일</span>
                  </div>

                  <span style={{ fontWeight: 'bold', color: '#64748b' }}>~</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: '70px', textAlign: 'center' }}
                      placeholder="9"
                      value={formData.end_month || ''}
                      onChange={(e) => handleInputChange('end_month', e.target.value)}
                    />
                    <span>월</span>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: '70px', textAlign: 'center' }}
                      placeholder="3"
                      value={formData.end_day || ''}
                      onChange={(e) => handleInputChange('end_day', e.target.value)}
                    />
                    <span>일</span>
                  </div>

                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', padding: '6px 14px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                    <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 'bold' }}>
                      ⚡ 평일 결석 일수: {formData.days_count ? `${formData.days_count} 일` : '자동 계산됨'}
                    </span>
                  </div>
                </div>
              </div>

              {renderSingleField('reason_detail')}
            </div>
          </div>

          {/* 카테고리 3: 📎 증빙 서류 (선택) */}
          <div className="form-category-card">
            <div className="category-title">
              <div className="category-title-icon"><Paperclip size={18} /></div>
              <span>📎 3. 증빙서류 첨부 (선택 사항)</span>
            </div>
            <div className="form-grid">
              {renderSingleField('proof_1')}
              {renderSingleField('proof_2')}
              {renderSingleField('proof_3')}
              {renderSingleField('proof_4_etc')}
            </div>
          </div>

          {/* 카테고리 4: 📝 신고서 제출 & 학부모/학생 서명 */}
          <div className="form-category-card">
            <div className="category-title">
              <div className="category-title-icon"><CheckSquare size={18} /></div>
              <span>📝 4. 신고서 제출 & 학생/보호자 동의</span>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  신고서 제출 일자 <span className="badge-blue">🔵 필수</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '80px', textAlign: 'center' }}
                    placeholder="9"
                    value={formData.submit_month || ''}
                    onChange={(e) => handleInputChange('submit_month', e.target.value)}
                  />
                  <span>월</span>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '80px', textAlign: 'center' }}
                    placeholder="4"
                    value={formData.submit_day || ''}
                    onChange={(e) => handleInputChange('submit_day', e.target.value)}
                  />
                  <span>일</span>
                </div>
              </div>

              {renderSingleField('sign_name')}
              {renderSingleField('privacy_agree')}
              {renderSingleField('sensitive_agree')}
              {renderSingleField('student_signature_shading')}
              {renderSingleField('guardian_name_shading')}
              {renderSingleField('guardian_signature_shading')}
            </div>
          </div>

          {/* 카테고리 5: 👨‍🏫 담임교사 확인 및 처리 */}
          <div className="form-category-card">
            <div className="category-title">
              <div className="category-title-icon"><UserCheck size={18} /></div>
              <span>👨‍🏫 5. 담임교사 확인 및 처리</span>
            </div>
            <div className="form-grid">
              {renderSingleField('teacher_opinion_reason')}
              {renderSingleField('teacher_proof_check')}

              <div className="form-group">
                <label className="form-label">
                  담임 확인 일자 <span className="badge-blue">🔵 필수</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '80px', textAlign: 'center' }}
                    placeholder="9"
                    value={formData.teacher_confirm_month || ''}
                    onChange={(e) => handleInputChange('teacher_confirm_month', e.target.value)}
                  />
                  <span>월</span>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '80px', textAlign: 'center' }}
                    placeholder="5"
                    value={formData.teacher_confirm_day || ''}
                    onChange={(e) => handleInputChange('teacher_confirm_day', e.target.value)}
                  />
                  <span>일</span>
                </div>
              </div>

              {renderSingleField('teacher_name')}
              {renderSingleField('teacher_signature_shading')}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => initFormState(selectedTemplate)}
            >
              <RefreshCw size={18} /> 내용 초기화
            </button>

            <button type="submit" className="btn btn-primary" disabled={isGenerating}>
              {isGenerating ? (
                <>PDF 완성 생성 중...</>
              ) : (
                <>
                  <Download size={18} /> 결석신고서 양식 완성 및 PDF 출력
                </>
              )}
            </button>
          </div>

          {pdfPreviewUrl && (
            <div
              style={{
                marginTop: '32px',
                padding: '24px',
                background: '#f0fdf4',
                border: '1.5px solid #34d399',
                borderRadius: '14px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#047857',
                  fontWeight: 'bold',
                  fontSize: '1.05rem'
                }}
              >
                <CheckCircle size={22} /> 완벽한 스탬프 양식 PDF가 출력되었습니다!
              </div>
              <p style={{ marginTop: '6px', color: '#065f46', fontSize: '0.9rem' }}>
                초록색 수기작성 영역에 원본 글자가 또렷하게 보이는 옅은 반투명 음영이 정상 적용되었습니다.
              </p>
              <div style={{ marginTop: '16px' }}>
                <a
                  href={pdfPreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', fontSize: '0.9rem' }}
                >
                  <Eye size={16} /> 브라우저에서 완성된 PDF 확인하기
                </a>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
