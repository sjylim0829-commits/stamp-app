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
  Info,
  Clock,
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

/**
 * 체험학습 시작일 기준 평일 인정일수(2일) 전 제출 마감일자 계산
 */
function getLatestSubmissionDeadline(startM, startD, year = 2026, requiredBusinessDays = 2, schoolHolidays = []) {
  if (!startM || !startD) return null;
  const sm = parseInt(startM, 10);
  const sd = parseInt(startD, 10);
  if (isNaN(sm) || isNaN(sd)) return null;

  const startDate = new Date(year, sm - 1, sd);
  if (isNaN(startDate.getTime())) return null;

  const schoolHolidaySet = new Set();
  if (Array.isArray(schoolHolidays)) {
    schoolHolidays.forEach((h) => {
      if (h && h.date) schoolHolidaySet.add(h.date);
    });
  }

  let count = 0;
  let cur = new Date(startDate);
  cur.setDate(cur.getDate() - 1);

  while (count < requiredBusinessDays) {
    const dayOfWeek = cur.getDay();
    const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !HOLIDAYS_2026.has(dateStr) && !schoolHolidaySet.has(dateStr)) {
      count++;
      if (count === requiredBusinessDays) {
        return new Date(cur);
      }
    }
    cur.setDate(cur.getDate() - 1);
  }

  return cur;
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

  const isAbsenceReport = selectedTemplate?.id === '2026_absence_report';
  const isDomesticFieldTrip = selectedTemplate?.id === '2026_field_trip_domestic';
  const isOverseasFieldTrip = selectedTemplate?.id === '2026_field_trip_overseas';
  const isFieldTrip = isDomesticFieldTrip || isOverseasFieldTrip;

  // 체험학습 제출 마감일
  const latestFieldTripDeadline = isFieldTrip && formData.start_month && formData.start_day
    ? getLatestSubmissionDeadline(formData.start_month, formData.start_day, 2026, 2, schoolHolidays)
    : null;

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

    const sm = parseInt(formData.start_month, 10);
    const sd = parseInt(formData.start_day, 10);
    const em = parseInt(formData.end_month, 10);
    const ed = parseInt(formData.end_day, 10);
    const subM = parseInt(formData.submit_month, 10);
    const subD = parseInt(formData.submit_day, 10);
    const year = parseInt(formData.submit_year, 10) || 2026;

    // 시작일 > 종료일 검사
    if (sm && sd && em && ed) {
      const startDt = new Date(year, sm - 1, sd);
      const endDt = new Date(year, em - 1, ed);
      if (startDt > endDt) {
        missingFields.push('기간 설정 오류 (시작일이 종료일보다 늦음)');
        errors['start_day'] = '시작 일자는 종료 일자보다 앞서거나 같아야 합니다!';
      }
    }

    // 체험학습: 신청서 제출 일자는 시작일 기준 평일 2일 전까지여야 함
    if (isFieldTrip && sm && sd && subM && subD) {
      const startDt = new Date(year, sm - 1, sd);
      const subDt = new Date(year, subM - 1, subD);
      const deadline = getLatestSubmissionDeadline(sm, sd, year, 2, schoolHolidays);

      if (deadline && subDt > deadline) {
        const dMonth = deadline.getMonth() + 1;
        const dDay = deadline.getDate();
        const msg = `교외 체험학습 신청서는 체험학습 시작일(${sm}월 ${sd}일) 기준 최소 평일 2일 전인 ${dMonth}월 ${dDay}일까지 제출해야 합니다. (주말·공휴일·학교휴업일 제외)`;
        missingFields.push(`신청서 제출 기한 초과 (최대 제출 가능일: ${dMonth}월 ${dDay}일)`);
        errors['submit_day'] = msg;
      }
    }

    // 결석신고서 날짜 규칙
    if (isAbsenceReport) {
      const tm = parseInt(formData.teacher_confirm_month, 10);
      const td = parseInt(formData.teacher_confirm_day, 10);

      if (em && ed && subM && subD) {
        const endDt = new Date(year, em - 1, ed);
        const subDt = new Date(year, subM - 1, subD);
        if (subDt <= endDt) {
          missingFields.push('신고서 제출 일자 (결석 종료일보다 나중 날짜여야 함)');
          errors['submit_day'] = '신고서 제출 일자는 결석 종료 일자보다 이후(더 나중) 날짜여야 합니다!';
        }
      }

      if (subM && subD && tm && td) {
        const subDt = new Date(year, subM - 1, subD);
        const tchDt = new Date(year, tm - 1, td);
        if (tchDt <= subDt) {
          missingFields.push('담임 확인 일자 (신고서 제출일보다 나중 날짜여야 함)');
          errors['teacher_confirm_day'] = '담임 확인 일자는 신고서 제출 일자보다 이후(더 나중) 날짜여야 합니다!';
        }
      }

      if (em && ed && tm && td) {
        const endDt = new Date(year, em - 1, ed);
        const tchDt = new Date(year, tm - 1, td);
        const diffDays = Math.round((tchDt - endDt) / (1000 * 60 * 60 * 24));
        if (diffDays > 5) {
          missingFields.push(`담임 확인 일자 (결석종료일로부터 ${diffDays}일 경과, 5일 이내여야 함)`);
          errors['teacher_confirm_day'] = `담임 확인 일자가 결석 종료일로부터 ${diffDays}일 경과했습니다. 5일 이내여야 합니다!`;
        }
      }
    }

    if (missingFields.length > 0) {
      setValidationError({
        message: `필수 입력값 누락 또는 제출 기한 위반으로 PDF를 출력할 수 없습니다!`,
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
            rows={5}
            className={`form-textarea ${isError ? 'error' : ''}`}
            placeholder={
              field.placeholder ||
              `[학습 계획 작성 가이드]\n1. 목적지 관련 학습 목표 및 일정\n2. 주요 방문지 및 구체적인 탐방/체험 활동 내용\n3. 견학 후 관찰 기록 및 소감 정리 계획`
            }
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
        <p className="section-desc">작성하고자 하는 서식을 선택하면 해당 서식 1페이지만 단독으로 완벽하게 출력됩니다.</p>
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
                {isDocDomestic ? '국내 1페이지 출력' : isDocOverseas ? '해외 1페이지 출력' : '결석신고서 1페이지 출력'}
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

              {/* 카테고리 3: 📝 학습 계획 작성 (원클릭 버튼 삭제 & 자유 작성 가이드) */}
              <div className="form-category-card">
                <div className="category-title">
                  <div className="category-title-icon"><BookOpen size={18} /></div>
                  <span>📝 3. 학습 계획 (육하원칙 및 교육적 활동)</span>
                </div>

                <div style={{
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  fontSize: '0.86rem',
                  color: '#475569',
                  lineHeight: '1.6'
                }}>
                  <div style={{ fontWeight: '700', color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={16} style={{ color: '#2563eb' }} />
                    개별 맞춤형 학습 계획 작성 가이드
                  </div>
                  <div>
                    모든 학생이 획일화된 동일 문구로 제출하지 않도록, 여행 목적과 주요 일정, 방문지별 구체적인 탐방 및 체험 활동 내용을 육하원칙에 맞추어 직접 자유롭게 작성해 주세요.
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
                      <span style={{ fontSize: '0.75rem', color: '#dc2626', marginLeft: '6px' }}>
                        ⚡ (시작일 기준 평일 2일 전까지)
                      </span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="text"
                        className={`form-input ${fieldErrors.submit_day ? 'error' : ''}`}
                        style={{ width: '80px', textAlign: 'center' }}
                        placeholder="4"
                        value={formData.submit_month || ''}
                        onChange={(e) => handleInputChange('submit_month', e.target.value)}
                      />
                      <span>월</span>
                      <input
                        type="text"
                        className={`form-input ${fieldErrors.submit_day ? 'error' : ''}`}
                        style={{ width: '80px', textAlign: 'center' }}
                        placeholder="25"
                        value={formData.submit_day || ''}
                        onChange={(e) => handleInputChange('submit_day', e.target.value)}
                      />
                      <span>일</span>
                    </div>

                    {latestFieldTripDeadline && (
                      <div style={{
                        marginTop: '6px',
                        fontSize: '0.82rem',
                        color: '#059669',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Clock size={14} />
                        제출 마감 기준: {latestFieldTripDeadline.getMonth() + 1}월 {latestFieldTripDeadline.getDate()}일까지 제출 가능 (주말/휴업일 제외 평일 2일 전)
                      </div>
                    )}
                    {fieldErrors.submit_day && <div className="error-text">{fieldErrors.submit_day}</div>}
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
                영서중학교 표준 규격 서식에 맞추어 해당 단일 페이지만 완벽하게 출력되었습니다.
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
