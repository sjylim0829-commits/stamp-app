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
  Edit3,
  MapPin,
  Compass,
  Plane,
  Sparkles,
  BookOpen
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

const DOMESTIC_STUDY_PLAN_PRESETS = [
  {
    title: '역사 문화 유적 탐방',
    text: '1. 목적지 유적지(박물관 및 역사 유적)를 방문하여 고대~근현대 문화유산 학습\n2. 역사적 인물의 발자취 탐색 및 현장 기록 활동\n3. 우리 고유의 전통문화 체험 및 탐방 소감문 작성'
  },
  {
    title: '자연 생태 환경 관찰',
    text: '1. 국립공원 및 생태 탐방로를 견학하며 고유 동식물 서식 환경 조사\n2. 기후 변화 및 자연 보존의 중요성 학습\n3. 생태계 관찰 일지 작성 및 환경 보호 실천 계획 수립'
  },
  {
    title: '가족 친지 방문 및 친교',
    text: '1. 조부모 및 친척 댁을 방문하여 웃어른 예절 및 전통 가족문화 습득\n2. 고향 지역의 특산물과 향토 문화를 직접 체험\n3. 가족 간의 화합과 효행 실천 일기 작성'
  }
];

const OVERSEAS_STUDY_PLAN_PRESETS = [
  {
    title: '해외 다문화 및 역사 견학',
    text: '1. 현지 주요 세계문화유산 및 국립박물관 탐방을 통한 세계사 학습\n2. 다양한 민족과 문화적 다양성을 존중하는 글로벌 시민의식 함양\n3. 현지 문화 체험 기록 및 사진 자료를 활용한 체험 보고서 작성'
  },
  {
    title: '글로벌 어학 & 과학 기술 탐방',
    text: '1. 현지 과학관, 첨단 산업단지 및 도서관 견학\n2. 일상 속 외국어 의사소통 실습을 통한 글로벌 역량 강화\n3. 선진 도시 인프라와 친환경 정책 현장 관찰'
  }
];

function calculateBusinessDays(startM, startD, endM, endD, year = 2026, schoolHolidays = []) {
  if (!startM || !startD || !endM || !endD) {
    return { countStr: '', excludedList: [] };
  }
  const sm = parseInt(startM, 10);
  const sd = parseInt(startD, 10);
  const em = parseInt(endM, 10);
  const ed = parseInt(endD, 10);

  if (isNaN(sm) || isNaN(sd) || isNaN(em) || isNaN(ed)) {
    return { countStr: '', excludedList: [] };
  }

  const startDate = new Date(year, sm - 1, sd);
  const endDate = new Date(year, em - 1, ed);

  if (startDate > endDate) {
    return { countStr: '', excludedList: [] };
  }

  const schoolHolidayMap = new Map();
  if (Array.isArray(schoolHolidays)) {
    schoolHolidays.forEach((h) => {
      if (h && h.date) {
        schoolHolidayMap.set(h.date, { name: h.name || '학교 휴업일', type: h.type || '휴업일' });
      }
    });
  }

  let count = 0;
  const excludedList = [];
  let cur = new Date(startDate);

  while (cur <= endDate) {
    const dayOfWeek = cur.getDay();
    const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
    const displayDate = `${cur.getMonth() + 1}/${cur.getDate()}`;

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // 주말(토/일) 제외
    } else if (HOLIDAYS_2026.has(dateStr)) {
      excludedList.push({
        date: dateStr,
        displayDate,
        name: '법정공휴일',
        type: '법정공휴일'
      });
    } else if (schoolHolidayMap.has(dateStr)) {
      const info = schoolHolidayMap.get(dateStr);
      excludedList.push({
        date: dateStr,
        displayDate,
        name: info.name,
        type: info.type
      });
    } else {
      count++;
    }

    cur.setDate(cur.getDate() + 1);
  }

  return {
    countStr: count > 0 ? String(count) : '0',
    excludedList
  };
}

export default function FormFiller({
  templates = [],
  selectedTemplateId = '',
  onSelectTemplate,
  schoolHolidays = [],
  apiBase = ''
}) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [validationError, setValidationError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [holidayDeductions, setHolidayDeductions] = useState([]);

  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const found = templates.find((t) => t.id === selectedTemplateId) || templates[0];
      setSelectedTemplate(found);
      initFormState(found);
    } else if (templates.length > 0) {
      setSelectedTemplate(templates[0]);
      if (onSelectTemplate) onSelectTemplate(templates[0].id);
      initFormState(templates[0]);
    }
  }, [selectedTemplateId, templates]);

  // schoolHolidays 변경 시 현재 입력된 날짜 기반으로 일수 재계산
  useEffect(() => {
    if (formData.start_month && formData.start_day && formData.end_month && formData.end_day) {
      const { countStr, excludedList } = calculateBusinessDays(
        formData.start_month,
        formData.start_day,
        formData.end_month,
        formData.end_day,
        2026,
        schoolHolidays
      );
      if (countStr !== '') {
        setFormData((prev) => ({ ...prev, days_count: countStr }));
        setHolidayDeductions(excludedList);
      }
    }
  }, [schoolHolidays]);

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
    setHolidayDeductions([]);
  };

  const handleTemplateChange = (t) => {
    setSelectedTemplate(t);
    if (onSelectTemplate) onSelectTemplate(t.id);
    initFormState(t);
  };

  const handleInputChange = (fieldId, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [fieldId]: value };

      if (fieldId === 'student_name') {
        updated.sign_name = value ? `${value}` : '';
        updated.student_name_sign = value ? `${value}` : '';
      }

      if (['start_month', 'start_day', 'end_month', 'end_day'].includes(fieldId)) {
        const sm = updated.start_month;
        const sd = updated.start_day;
        const em = updated.end_month;
        const ed = updated.end_day;

        const { countStr, excludedList } = calculateBusinessDays(sm, sd, em, ed, 2026, schoolHolidays);
        if (countStr !== '') {
          updated.days_count = countStr;
          setHolidayDeductions(excludedList);
        } else {
          setHolidayDeductions([]);
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

  const isAbsenceReport = selectedTemplate?.id === '2026_absence_report';
  const isDomesticFieldTrip = selectedTemplate?.id === '2026_field_trip_domestic';
  const isOverseasFieldTrip = selectedTemplate?.id === '2026_field_trip_overseas';
  const isFieldTrip = isDomesticFieldTrip || isOverseasFieldTrip;

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

    // 날짜 검증
    const sm = parseInt(formData.start_month, 10);
    const sd = parseInt(formData.start_day, 10);
    const em = parseInt(formData.end_month, 10);
    const ed = parseInt(formData.end_day, 10);
    const year = parseInt(formData.submit_year, 10) || 2026;

    if (sm && sd && em && ed) {
      const startDt = new Date(year, sm - 1, sd);
      const endDt = new Date(year, em - 1, ed);
      if (startDt > endDt) {
        missingFields.push('기간 설정 오류 (시작일이 종료일보다 늦음)');
        errors['start_day'] = '시작 일자는 종료 일자보다 앞서거나 같아야 합니다!';
      }
    }

    if (missingFields.length > 0) {
      setValidationError({
        message: `필수 입력값 누락 또는 날짜 설정 오류로 PDF를 출력할 수 없습니다!`,
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
        let errMessage = '필수 항목 누락 또는 날짜 오류로 PDF 출력이 차단되었습니다.';
        let missingFieldsList = [];
        let fieldErrs = {};

        const rawText = await response.text();
        try {
          const errData = JSON.parse(rawText);
          const detail = errData.detail || {};
          if (typeof detail === 'string') {
            errMessage = detail;
          } else {
            errMessage = detail.message || errMessage;
            missingFieldsList = detail.missing_fields || [];
            fieldErrs = detail.field_errors || {};
          }
        } catch (_) {
          errMessage = rawText || `서버 오류가 발생했습니다 (${response.status})`;
        }

        setValidationError({
          message: errMessage,
          missingFields: missingFieldsList,
        });
        setFieldErrors(fieldErrs);
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
    const isSignName = field.id === 'sign_name' || field.id === 'student_name_sign';

    return (
      <div className={`form-group ${field.multiline ? 'full-width' : ''}`}>
        <label className="form-label">
          {customLabel || field.label}
          {isGreen ? (
            <span className="badge-green">🟢 수기작성 (음영)</span>
          ) : isBlue ? (
            <span className="badge-blue">🔵 필수</span>
          ) : (
            <span className="badge-yellow">🟡 선택</span>
          )}
          {isDaysCount && (
            <span style={{ fontSize: '0.75rem', color: '#059669', marginLeft: '6px' }}>
              ⚡ (주말/휴업일 제외 자동 계산)
            </span>
          )}
          {isSignName && (
            <span style={{ fontSize: '0.75rem', color: '#2563eb', marginLeft: '6px' }}>
              ⚡ (학생 이름 자동 반영)
            </span>
          )}
        </label>

        {isGreen ? (
          <div
            style={{
              padding: '10px 14px',
              background: '#f0fdf4',
              border: '1.5px dashed #a7f3d0',
              borderRadius: '8px',
              color: '#047857',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '600'
            }}
          >
            <Edit3 size={15} /> ✍️ 수기작성 서명란 (출력 시 연한 반투명 음영 박스 적용)
          </div>
        ) : field.multiline ? (
          <textarea
            rows={4}
            className={`form-textarea ${isError ? 'error' : ''}`}
            placeholder={field.placeholder || `${field.label} 내용을 상세히 입력하세요`}
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
      {/* 서식 선택 섹션 헤더 */}
      <div className="section-header">
        <h2 className="section-title">
          <FileText className="text-primary" size={24} style={{ color: '#2563eb' }} /> 학교 서식 양식 선택
        </h2>
        <p className="section-desc">작성하고자 하는 서식을 선택하면 최적화된 입력 양식이 자동으로 제공됩니다.</p>
      </div>

      {/* 템플릿 카드 그리드 */}
      <div className="template-grid">
        {templates.map((t) => {
          const isDocDomestic = t.id.includes('domestic');
          const isDocOverseas = t.id.includes('overseas');
          const isDocAbsence = t.id.includes('absence');

          return (
            <div
              key={t.id}
              className={`template-card ${selectedTemplate?.id === t.id ? 'selected' : ''}`}
              onClick={() => handleTemplateChange(t)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                {isDocDomestic ? (
                  <Compass size={20} style={{ color: '#2563eb' }} />
                ) : isDocOverseas ? (
                  <Plane size={20} style={{ color: '#7c3aed' }} />
                ) : (
                  <FileText size={20} style={{ color: '#059669' }} />
                )}
                <div className="template-card-title">{t.name}</div>
              </div>
              <div className="template-card-desc">{t.description || '학교 기본 양식'}</div>
              <span className="template-badge">
                {isDocDomestic ? '국내 체험학습' : isDocOverseas ? '해외 체험학습' : '결석 서식'}
              </span>
            </div>
          );
        })}
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
                      <li key={idx}>⚠️ {label}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* CASE A: 교외 체험학습 (국내 / 해외) 신청서 폼 */}
          {/* ======================================================== */}
          {isFieldTrip ? (
            <>
              {/* 카테고리 1: 🎓 학생 인적사항 */}
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
                  {renderSingleField('address')}
                  {renderSingleField('phone')}
                </div>
              </div>

              {/* 카테고리 2: 🗺️ / ✈️ 체험학습 기간 및 장소 */}
              <div className="form-category-card">
                <div className="category-title">
                  <div className="category-title-icon">
                    {isOverseasFieldTrip ? <Plane size={18} /> : <MapPin size={18} />}
                  </div>
                  <span>
                    {isOverseasFieldTrip ? '✈️ 2. 해외 체험학습 기간 및 목적지' : '🗺️ 2. 국내 체험학습 기간 및 장소'}
                  </span>
                </div>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">
                      체험학습 기간 <span className="badge-blue">🔵 필수</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ width: '70px', textAlign: 'center' }}
                          placeholder="5"
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
                          placeholder="5"
                          value={formData.end_month || ''}
                          onChange={(e) => handleInputChange('end_month', e.target.value)}
                        />
                        <span>월</span>
                        <input
                          type="text"
                          className="form-input"
                          style={{ width: '70px', textAlign: 'center' }}
                          placeholder="4"
                          value={formData.end_day || ''}
                          onChange={(e) => handleInputChange('end_day', e.target.value)}
                        />
                        <span>일</span>
                      </div>

                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', padding: '6px 14px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                        <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 'bold' }}>
                          ⚡ 평일 인정 일수: {formData.days_count ? `${formData.days_count} 일간` : '자동 계산됨'}
                        </span>
                      </div>
                    </div>

                    {/* 결석/체험 기간 중 학교 휴업일 / 공휴일 차감 내역 안내 */}
                    {holidayDeductions && holidayDeductions.length > 0 && (
                      <div style={{
                        marginTop: '10px',
                        padding: '10px 14px',
                        background: '#f0fdfa',
                        border: '1px solid #99f6e4',
                        borderRadius: '8px',
                        fontSize: '0.84rem',
                        color: '#0f766e',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          💡 체험학습 기간 중 휴업일·공휴일 ({holidayDeductions.length}일)이 제외되었습니다:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                          {holidayDeductions.map((d, i) => (
                            <span
                              key={i}
                              style={{
                                padding: '2px 8px',
                                background: d.type === '개교기념일' ? '#f5f3ff' : d.type === '재량휴업일' ? '#f0f9ff' : '#ecfdf5',
                                color: d.type === '개교기념일' ? '#6d28d9' : d.type === '재량휴업일' ? '#0369a1' : '#047857',
                                border: `1px solid ${d.type === '개교기념일' ? '#ddd6fe' : d.type === '재량휴업일' ? '#bae6fd' : '#a7f3d0'}`,
                                borderRadius: '6px',
                                fontWeight: '600',
                                fontSize: '0.78rem'
                              }}
                            >
                              📅 {d.displayDate} ({d.name})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {renderSingleField('location')}
                </div>
              </div>

              {/* 카테고리 3: 📝 학습 계획 작성 */}
              <div className="form-category-card">
                <div className="category-title">
                  <div className="category-title-icon"><BookOpen size={18} /></div>
                  <span>📝 3. 학습 계획 (육하원칙 및 교육적 활동)</span>
                </div>

                {/* 빠른 학습계획 프리셋 버튼 */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={14} style={{ color: '#2563eb' }} /> 추천 학습계획 템플릿 원클릭 입력:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(isOverseasFieldTrip ? OVERSEAS_STUDY_PLAN_PRESETS : DOMESTIC_STUDY_PLAN_PRESETS).map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleInputChange('study_plan', p.text)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        + {p.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-grid">
                  {renderSingleField('study_plan')}
                </div>
              </div>

              {/* 카테고리 4: ✍️ 신청서 제출 및 보호자/학생 서명 */}
              <div className="form-category-card">
                <div className="category-title">
                  <div className="category-title-icon"><CheckSquare size={18} /></div>
                  <span>✍️ 4. 신청서 제출 및 보호자/학생 서명</span>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      신청 제출 일자 <span className="badge-blue">🔵 필수</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ width: '80px', textAlign: 'center' }}
                        placeholder="4"
                        value={formData.submit_month || ''}
                        onChange={(e) => handleInputChange('submit_month', e.target.value)}
                      />
                      <span>월</span>
                      <input
                        type="text"
                        className="form-input"
                        style={{ width: '80px', textAlign: 'center' }}
                        placeholder="25"
                        value={formData.submit_day || ''}
                        onChange={(e) => handleInputChange('submit_day', e.target.value)}
                      />
                      <span>일</span>
                    </div>
                  </div>

                  {renderSingleField('student_name_sign')}
                  {renderSingleField('parent_name_sign')}
                  {renderSingleField('student_sign_shading')}
                  {renderSingleField('parent_sign_shading')}
                </div>
              </div>
            </>
          ) : (
            /* ======================================================== */
            /* CASE B: 2026학년도 결석신고서 폼 (기존) */
            /* ======================================================== */
            <>
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

                    {holidayDeductions && holidayDeductions.length > 0 && (
                      <div style={{
                        marginTop: '10px',
                        padding: '10px 14px',
                        background: '#f0fdfa',
                        border: '1px solid #99f6e4',
                        borderRadius: '8px',
                        fontSize: '0.84rem',
                        color: '#0f766e',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          💡 결석 기간 중 휴업일·공휴일 ({holidayDeductions.length}일)이 제외되었습니다:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                          {holidayDeductions.map((d, i) => (
                            <span
                              key={i}
                              style={{
                                padding: '2px 8px',
                                background: d.type === '개교기념일' ? '#f5f3ff' : d.type === '재량휴업일' ? '#f0f9ff' : '#ecfdf5',
                                color: d.type === '개교기념일' ? '#6d28d9' : d.type === '재량휴업일' ? '#0369a1' : '#047857',
                                border: `1px solid ${d.type === '개교기념일' ? '#ddd6fe' : d.type === '재량휴업일' ? '#bae6fd' : '#a7f3d0'}`,
                                borderRadius: '6px',
                                fontWeight: '600',
                                fontSize: '0.78rem'
                              }}
                            >
                              📅 {d.displayDate} ({d.name})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {renderSingleField('reason_detail')}
                </div>
              </div>

              {/* 카테고리 3: 📎 증빙 서류 */}
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
            </>
          )}

          {/* 하단 액션 버튼 */}
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
                  <Download size={18} /> {selectedTemplate.name} 완성 및 PDF 출력
                </>
              )}
            </button>
          </div>

          {/* PDF 미리보기 및 다운로드 링크 박스 */}
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
                <CheckCircle size={22} /> 완벽한 {selectedTemplate.name} PDF가 출력되었습니다!
              </div>
              <p style={{ marginTop: '6px', color: '#065f46', fontSize: '0.9rem' }}>
                영서중학교 표준 규격 서식에 맞추어 작성된 내용이 지정 위치에 완벽하게 오버레이되었습니다.
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
