import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Plus,
  Trash2,
  Save,
  FileText,
  Check,
  MousePointer,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Eye,
  Printer,
  FileCheck
} from 'lucide-react';

const PDF_PAGE_WIDTH_PT = 595.28;
const PDF_PAGE_HEIGHT_PT = 841.89;

export default function TemplateEditor({ templates, onTemplateUpdated, apiBase = '' }) {
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0] || null);
  const [fields, setFields] = useState(selectedTemplate?.fields || []);
  const [selectedFieldIdx, setSelectedFieldIdx] = useState(0);
  const [statusMsg, setStatusMsg] = useState(null);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [isTestPrinting, setIsTestPrinting] = useState(false);
  const [testPdfUrl, setTestPdfUrl] = useState(null);

  const imageRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const dragStartRef = useRef(null);
  const dragBoxIdxRef = useRef(null);

  useEffect(() => {
    if (templates && templates.length > 0) {
      const current = templates.find((t) => t.id === selectedTemplate?.id) || templates[0];
      setSelectedTemplate(current);
      setFields(current.fields || []);
      setSelectedFieldIdx(0);
    }
  }, [templates]);

  const handleSelectTemplate = (t) => {
    setSelectedTemplate(t);
    setFields(t.fields || []);
    setSelectedFieldIdx(0);
    setStatusMsg(null);
    setTestPdfUrl(null);
  };

  const handleFieldChange = (idx, prop, val) => {
    const updated = [...fields];
    updated[idx] = { ...updated[idx], [prop]: val };
    setFields(updated);
  };

  const handleAddField = () => {
    const newId = `field_${Date.now().toString().slice(-6)}`;
    const newF = {
      id: newId,
      label: '신규 입력 항목',
      page: selectedTemplate?.page_index || 0,
      x: 150.0,
      y: 200.0,
      width: 100.0,
      height: 18.0,
      font_size: 11.0,
      required: true,
      color_tag: 'blue',
      placeholder: '내용 입력'
    };
    const nextFields = [...fields, newF];
    setFields(nextFields);
    setSelectedFieldIdx(nextFields.length - 1);
    setStatusMsg({ type: 'success', text: `✨ 새 필드가 추가되었습니다. 서식 이미지 위를 클릭하여 위치를 지정해 보세요.` });
  };

  const handleRemoveField = (idx) => {
    const updated = fields.filter((_, i) => i !== idx);
    setFields(updated);
    if (selectedFieldIdx >= updated.length) {
      setSelectedFieldIdx(Math.max(0, updated.length - 1));
    }
  };

  // 클라이언트 마우스 좌표(px) -> PDF 포인트(pt) 좌표 변환
  const convertPxToPdfPt = (clientX, clientY) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    const scaleX = PDF_PAGE_WIDTH_PT / rect.width;
    const scaleY = PDF_PAGE_HEIGHT_PT / rect.height;

    const ptX = Math.round(clickX * scaleX * 10) / 10;
    const ptY = Math.round(clickY * scaleY * 10) / 10;

    return {
      x: Math.max(0, Math.min(PDF_PAGE_WIDTH_PT, ptX)),
      y: Math.max(0, Math.min(PDF_PAGE_HEIGHT_PT, ptY))
    };
  };

  // 캔버스 이미지 위 마우스 클릭 시: 현재 선택된 필드의 좌표를 클릭 위치로 즉시 갱신
  const handleCanvasMouseDown = (e) => {
    if (e.target.closest('.field-overlay-box')) {
      return;
    }

    if (fields.length === 0 || selectedFieldIdx === null || selectedFieldIdx < 0) return;

    const { x, y } = convertPxToPdfPt(e.clientX, e.clientY);
    dragStartRef.current = { x, y };

    const updated = [...fields];
    updated[selectedFieldIdx] = {
      ...updated[selectedFieldIdx],
      x: x,
      y: y
    };
    setFields(updated);
  };

  const handleCanvasMouseMove = (e) => {
    if (!dragStartRef.current || selectedFieldIdx === null) return;

    const { x, y } = convertPxToPdfPt(e.clientX, e.clientY);
    const startX = dragStartRef.current.x;
    const startY = dragStartRef.current.y;

    const newX = Math.min(startX, x);
    const newY = Math.min(startY, y);
    const newWidth = Math.max(20, Math.abs(x - startX));
    const newHeight = Math.max(14, Math.abs(y - startY));

    const updated = [...fields];
    updated[selectedFieldIdx] = {
      ...updated[selectedFieldIdx],
      x: Math.round(newX * 10) / 10,
      y: Math.round(newY * 10) / 10,
      width: Math.round(newWidth * 10) / 10,
      height: Math.round(newHeight * 10) / 10
    };
    setFields(updated);
  };

  const handleCanvasMouseUp = () => {
    dragStartRef.current = null;
  };

  // 필드 박스 직접 드래그 이동
  const handleBoxMouseDown = (e, idx) => {
    e.stopPropagation();
    setSelectedFieldIdx(idx);
    setIsDraggingBox(true);
    dragBoxIdxRef.current = idx;

    const { x, y } = convertPxToPdfPt(e.clientX, e.clientY);
    const field = fields[idx];
    dragStartRef.current = {
      offsetX: x - field.x,
      offsetY: y - field.y
    };
  };

  const handleGlobalMouseMove = (e) => {
    if (!isDraggingBox || dragBoxIdxRef.current === null || !dragStartRef.current) return;

    const { x, y } = convertPxToPdfPt(e.clientX, e.clientY);
    const targetIdx = dragBoxIdxRef.current;
    const newX = Math.max(0, Math.round((x - dragStartRef.current.offsetX) * 10) / 10);
    const newY = Math.max(0, Math.round((y - dragStartRef.current.offsetY) * 10) / 10);

    const updated = [...fields];
    updated[targetIdx] = {
      ...updated[targetIdx],
      x: newX,
      y: newY
    };
    setFields(updated);
  };

  const handleGlobalMouseUp = () => {
    setIsDraggingBox(false);
    dragBoxIdxRef.current = null;
    dragStartRef.current = null;
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDraggingBox, fields]);

  // 1. 서버 상 영속 저장
  const handleSave = async () => {
    if (!selectedTemplate) return;

    const payload = {
      ...selectedTemplate,
      fields: fields
    };

    // 로컬스토리지 백업
    try {
      const stored = localStorage.getItem('stamp_templates');
      let tList = stored ? JSON.parse(stored) : (templates || []);
      const idx = tList.findIndex((t) => t.id === payload.id);
      if (idx >= 0) tList[idx] = payload;
      else tList.push(payload);
      localStorage.setItem('stamp_templates', JSON.stringify(tList));
    } catch (e) {
      console.warn('LocalStorage backup failed:', e);
    }

    try {
      const res = await fetch(`${apiBase}/api/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: `✨ '${selectedTemplate.name}' 설정이 서버에 성공적으로 저장되었습니다! (어느 컴퓨터에서 접속하든 동일하게 적용됩니다)` });
        if (onTemplateUpdated) onTemplateUpdated();
      } else {
        const data = await res.json().catch(() => ({}));
        const errDetail = typeof data.detail === 'string' ? data.detail : '서버 상태 코드: ' + res.status;
        setStatusMsg({ type: 'error', text: `서버 저장 실패: ${errDetail}` });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: `서버 통신 오류: ${err.message}` });
    }
  };

  // 2. 🖨️ 시험 페이지 출력 (현재 캔버스에 배치된 실시간 좌표로 테스트 인쇄)
  const handleTestPrint = async () => {
    if (!selectedTemplate) return;

    setIsTestPrinting(true);
    setStatusMsg(null);

    // 각 필드별 맞춤형 시험 예시 데이터 자동 생성
    const isOverseas = selectedTemplate.id.includes('overseas');
    const isDomestic = selectedTemplate.id.includes('domestic');
    const isAbsence = selectedTemplate.id.includes('absence');

    const sampleData = {};
    fields.forEach((f) => {
      if (f.id === 'grade') sampleData[f.id] = '2';
      else if (f.id === 'class_num') sampleData[f.id] = '3';
      else if (f.id === 'student_num') sampleData[f.id] = '14';
      else if (f.id === 'student_name') sampleData[f.id] = '홍길동';
      else if (f.id === 'address') sampleData[f.id] = '서울특별시 구로구 구로동 123';
      else if (f.id === 'phone') sampleData[f.id] = '010-1234-5678';
      else if (f.id === 'start_month') sampleData[f.id] = '5';
      else if (f.id === 'start_day') sampleData[f.id] = '1';
      else if (f.id === 'end_month') sampleData[f.id] = '5';
      else if (f.id === 'end_day') sampleData[f.id] = '4';
      else if (f.id === 'days_count') sampleData[f.id] = '2';
      else if (f.id === 'location') sampleData[f.id] = isOverseas ? '일본 오사카 및 교토 일대' : '제주특별자치도 일대';
      else if (f.id === 'study_plan') {
        sampleData[f.id] = '1. 주요 문화유적 및 자연생태 탐방\n2. 현지 체험 활동 및 일지 작성\n3. 견학 보고서 정리';
      } else if (f.id === 'submit_month') sampleData[f.id] = '4';
      else if (f.id === 'submit_day') sampleData[f.id] = '25';
      else if (f.id === 'student_name_sign' || f.id === 'sign_name') sampleData[f.id] = '홍길동';
      else if (f.id === 'parent_name_sign') sampleData[f.id] = '홍판서';
      else if (f.id === 'absence_type') sampleData[f.id] = '질병';
      else if (f.id === 'reason_detail') sampleData[f.id] = '독감 및 고열로 인한 병원 치료';
      else if (f.id === 'proof_1') sampleData[f.id] = 'O';
      else if (f.id === 'proof_4_etc') sampleData[f.id] = '진단서 첨부';
      else if (f.id === 'privacy_agree' || f.id === 'sensitive_agree') sampleData[f.id] = 'V';
      else if (f.id === 'teacher_opinion_reason') sampleData[f.id] = '유선 전화로 학부모 확인 완료';
      else if (f.id === 'teacher_proof_check') sampleData[f.id] = '처방전 확인 완료';
      else if (f.id === 'teacher_confirm_month') sampleData[f.id] = '9';
      else if (f.id === 'teacher_confirm_day') sampleData[f.id] = '5';
      else if (f.id === 'teacher_name') sampleData[f.id] = '김담임';
      else if (!f.handwriting_shading) {
        sampleData[f.id] = f.placeholder || f.label;
      }
    });

    const payload = {
      template: {
        ...selectedTemplate,
        fields: fields
      },
      sample_data: sampleData
    };

    try {
      const res = await fetch(`${apiBase}/api/test-print-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `시험 인쇄 서버 오류 (${res.status})`);
      }

      const blob = await res.blob();
      const pdfUrl = window.URL.createObjectURL(blob);
      setTestPdfUrl(pdfUrl);

      // 새 창에서 즉시 미리보기 열기
      window.open(pdfUrl, '_blank');

      setStatusMsg({
        type: 'success',
        text: `🖨️ '${selectedTemplate.name}' 시험 페이지 PDF가 새 탭에 열렸습니다! 글자 위치가 알맞은지 확인해 보세요.`
      });
    } catch (err) {
      setStatusMsg({ type: 'error', text: `시험 페이지 출력 오류: ${err.message}` });
    } finally {
      setIsTestPrinting(false);
    }
  };

  const currentField = fields[selectedFieldIdx] || null;
  const previewImageUrl = selectedTemplate
    ? `${apiBase}/api/templates/${selectedTemplate.id}/preview-image?t=${Date.now()}`
    : '';

  return (
    <div className="visual-field-mapper">
      {/* 1. 상단 섹션 타이틀 및 툴바 */}
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 className="section-title">
              <MousePointer className="text-primary" size={24} style={{ color: '#2563eb' }} />
              시각적 서식 이미지 필드 매핑 도구
            </h2>
            <p className="section-desc">
              좌표를 숫자로 일일이 계산할 필요 없이, <strong>서식 이미지 상의 원하는 빈칸 위치를 마우스로 클릭하거나 드래그하여 즉시 위치를 지정</strong>할 수 있습니다.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ background: '#f8fafc', color: '#0f172a', border: '1.5px solid #cbd5e1' }}
              onClick={handleTestPrint}
              disabled={isTestPrinting}
            >
              <Printer size={16} style={{ color: '#2563eb' }} />
              {isTestPrinting ? '시험 PDF 생성 중...' : '🖨️ 시험 페이지 출력'}
            </button>

            <button type="button" className="btn btn-secondary" onClick={handleAddField}>
              <Plus size={16} /> 필드 추가
            </button>

            <button type="button" className="btn btn-primary" onClick={handleSave}>
              <Save size={16} /> 매핑 설정 서버 저장
            </button>
          </div>
        </div>
      </div>

      {/* 상태 메시지 배너 */}
      {statusMsg && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            fontWeight: '700',
            fontSize: '0.9rem',
            background: statusMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1.5px solid ${statusMsg.type === 'success' ? '#a7f3d0' : '#fca5a5'}`,
            color: statusMsg.type === 'success' ? '#047857' : '#b91c1c'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{statusMsg.text}</span>
          </div>

          {testPdfUrl && (
            <a
              href={testPdfUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '0.84rem',
                color: '#047857',
                textDecoration: 'underline',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Eye size={15} /> 시험 PDF 다시 열기
            </a>
          )}
        </div>
      )}

      {/* 2. 서식 템플릿 선택 버튼 탭 */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn ${selectedTemplate?.id === t.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '9px 18px', fontSize: '0.9rem' }}
            onClick={() => handleSelectTemplate(t)}
          >
            <FileText size={16} /> {t.name} ({t.fields?.length || 0}개 필드)
          </button>
        ))}
      </div>

      {selectedTemplate && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1.2fr) minmax(360px, 1fr)', gap: '24px', alignItems: 'start' }}>
          
          {/* ======================================================== */}
          {/* 좌측: 인터랙티브 서식 이미지 캔버스 뷰어 */}
          {/* ======================================================== */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '16px',
            padding: '18px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
          }}>
            {/* 캔버스 툴바 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>
                  🖼️ 서식 화면 캔버스
                </span>
                <span style={{ fontSize: '0.78rem', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                  A4 표준 (595 × 842 pt)
                </span>
              </div>

              {/* 확대/축소 컨트롤 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                  onClick={() => setZoomScale(Math.max(0.7, zoomScale - 0.1))}
                >
                  <ZoomOut size={14} />
                </button>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', minWidth: '42px', textAlign: 'center' }}>
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                  onClick={() => setZoomScale(Math.min(1.5, zoomScale + 0.1))}
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                  onClick={() => setZoomScale(1.0)}
                >
                  100%
                </button>
              </div>
            </div>

            {/* 마우스 안내 배너 */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.82rem',
              color: '#475569',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MousePointer size={15} style={{ color: '#2563eb', flexShrink: 0 }} />
                <span>
                  서식 빈칸을 <strong>클릭하거나 드래그</strong>하여 위치를 맞춘 뒤, 상단의 <strong>[🖨️ 시험 페이지 출력]</strong>으로 바로 확인하세요.
                </span>
              </div>
            </div>

            {/* 캔버스 뷰포트 컨테이너 */}
            <div
              ref={canvasContainerRef}
              style={{
                overflow: 'auto',
                maxHeight: '760px',
                background: '#475569',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'center',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: `${PDF_PAGE_WIDTH_PT * zoomScale}px`,
                  height: `${PDF_PAGE_HEIGHT_PT * zoomScale}px`,
                  userSelect: 'none',
                  cursor: 'crosshair',
                  background: '#ffffff',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
              >
                {/* 1. 배경 서식 이미지 */}
                <img
                  ref={imageRef}
                  src={previewImageUrl}
                  alt={selectedTemplate.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    pointerEvents: 'none'
                  }}
                  draggable={false}
                />

                {/* 2. 필드 오버레이 박스 렌더링 */}
                {fields.map((f, idx) => {
                  const isSelected = selectedFieldIdx === idx;
                  const isGreen = f.color_tag === 'green' || f.handwriting_shading;
                  const isYellow = f.color_tag === 'yellow';

                  const boxLeft = f.x * zoomScale;
                  const boxTop = f.y * zoomScale;
                  const boxWidth = Math.max(16, (f.width || 50) * zoomScale);
                  const boxHeight = Math.max(14, (f.height || (f.font_size || 11) + 6) * zoomScale);

                  let bgHex = 'rgba(59, 130, 246, 0.25)';
                  let borderHex = '#2563eb';
                  if (isGreen) {
                    bgHex = 'rgba(16, 185, 129, 0.25)';
                    borderHex = '#059669';
                  } else if (isYellow) {
                    bgHex = 'rgba(245, 158, 11, 0.25)';
                    borderHex = '#d97706';
                  }

                  return (
                    <div
                      key={f.id || idx}
                      className="field-overlay-box"
                      style={{
                        position: 'absolute',
                        left: `${boxLeft}px`,
                        top: `${boxTop}px`,
                        width: `${boxWidth}px`,
                        height: `${boxHeight}px`,
                        background: isSelected ? 'rgba(37, 99, 235, 0.45)' : bgHex,
                        border: isSelected ? '2px solid #1d4ed8' : `1.5px solid ${borderHex}`,
                        borderRadius: '4px',
                        cursor: 'move',
                        zIndex: isSelected ? 20 : 10,
                        boxShadow: isSelected ? '0 0 0 3px rgba(37, 99, 235, 0.35), 0 4px 8px rgba(0,0,0,0.15)' : 'none',
                        transition: isDraggingBox ? 'none' : 'border-color 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}
                      onMouseDown={(e) => handleBoxMouseDown(e, idx)}
                    >
                      <span style={{
                        fontSize: `${Math.max(9, (f.font_size || 11) * 0.8 * zoomScale)}px`,
                        fontWeight: '800',
                        color: '#0f172a',
                        textShadow: '0 0 3px #ffffff, 0 0 5px #ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        padding: '0 2px'
                      }}>
                        {f.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 우측: 선택된 필드 속성 편집기 & 목록 테이블 */}
          {/* ======================================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* A. 현재 선택된 필드 실시간 속성 카드 */}
            {currentField ? (
              <div style={{
                background: '#ffffff',
                border: '2px solid #3b82f6',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '0.85rem'
                    }}>
                      {selectedFieldIdx + 1}
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                      '{currentField.label}' 위치 및 속성 설정
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: '700', background: '#dbeafe', padding: '3px 8px', borderRadius: '6px' }}>
                    선택됨
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.82rem' }}>라벨 명칭</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '8px 10px', fontSize: '0.88rem' }}
                      value={currentField.label || ''}
                      onChange={(e) => handleFieldChange(selectedFieldIdx, 'label', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.82rem' }}>필드 ID</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '8px 10px', fontSize: '0.88rem' }}
                      value={currentField.id || ''}
                      onChange={(e) => handleFieldChange(selectedFieldIdx, 'id', e.target.value)}
                    />
                  </div>
                </div>

                {/* 좌표 (X, Y, Width, Height) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem', color: '#2563eb' }}>X 좌표 (pt)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-input"
                      style={{ padding: '6px 8px', fontSize: '0.85rem', fontWeight: '800', textAlign: 'center' }}
                      value={currentField.x || 0}
                      onChange={(e) => handleFieldChange(selectedFieldIdx, 'x', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem', color: '#2563eb' }}>Y 좌표 (pt)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-input"
                      style={{ padding: '6px 8px', fontSize: '0.85rem', fontWeight: '800', textAlign: 'center' }}
                      value={currentField.y || 0}
                      onChange={(e) => handleFieldChange(selectedFieldIdx, 'y', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>너비 (Width)</label>
                    <input
                      type="number"
                      step="1"
                      className="form-input"
                      style={{ padding: '6px 8px', fontSize: '0.85rem', textAlign: 'center' }}
                      value={currentField.width || 50}
                      onChange={(e) => handleFieldChange(selectedFieldIdx, 'width', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>글자 크기</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-input"
                      style={{ padding: '6px 8px', fontSize: '0.85rem', textAlign: 'center' }}
                      value={currentField.font_size || 11}
                      onChange={(e) => handleFieldChange(selectedFieldIdx, 'font_size', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* 색상 태그 및 옵션 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.82rem' }}>구분 유형 태그</label>
                    <select
                      className="form-input"
                      style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                      value={currentField.color_tag || 'blue'}
                      onChange={(e) => handleFieldChange(selectedFieldIdx, 'color_tag', e.target.value)}
                    >
                      <option value="blue">🔵 파란색 (필수 입력)</option>
                      <option value="yellow">🟡 노란색 (선택 입력)</option>
                      <option value="green">🟢 초록색 (수기작성 음영)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.82rem' }}>줄바꿈 (Multiline)</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!currentField.multiline}
                        onChange={(e) => handleFieldChange(selectedFieldIdx, 'multiline', e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
                      />
                      멀티라인 입력 허용
                    </label>
                  </div>
                </div>
              </div>
            ) : null}

            {/* B. 전체 필드 목록 테이블 */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
                  📋 전체 필드 목록 ({fields.length}개)
                </h3>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', position: 'sticky', top: 0, zIndex: 5 }}>
                      <th style={{ padding: '8px 10px', width: '40px' }}>No</th>
                      <th style={{ padding: '8px 10px' }}>라벨</th>
                      <th style={{ padding: '8px 10px', width: '60px' }}>X</th>
                      <th style={{ padding: '8px 10px', width: '60px' }}>Y</th>
                      <th style={{ padding: '8px 10px', width: '80px' }}>유형</th>
                      <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f, idx) => {
                      const isSelected = selectedFieldIdx === idx;
                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isSelected ? '#eff6ff' : 'transparent',
                            cursor: 'pointer',
                            fontWeight: isSelected ? '700' : 'normal'
                          }}
                          onClick={() => setSelectedFieldIdx(idx)}
                        >
                          <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', color: isSelected ? '#1d4ed8' : '#1e293b' }}>
                            {f.label}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#2563eb', fontWeight: '700' }}>{f.x}</td>
                          <td style={{ padding: '8px 10px', color: '#2563eb', fontWeight: '700' }}>{f.y}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              background: f.color_tag === 'green' ? '#ecfdf5' : f.color_tag === 'yellow' ? '#fef3c7' : '#dbeafe',
                              color: f.color_tag === 'green' ? '#047857' : f.color_tag === 'yellow' ? '#b45309' : '#1d4ed8'
                            }}>
                              {f.color_tag === 'green' ? '🟢 음영' : f.color_tag === 'yellow' ? '🟡 선택' : '🔵 필수'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveField(idx);
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
