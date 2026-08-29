import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Info,
  CalendarDays,
  Check
} from 'lucide-react';

const HOLIDAY_TYPE_PRESETS = [
  { label: '개교기념일', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  { label: '재량휴업일', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
  { label: '임시휴업일', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { label: '수능시험일', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { label: '학교행사 휴업', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
];

const PRESET_RECOMMENDED_HOLIDAYS_2026 = [
  { date: '2026-05-01', name: '근로자의 날 / 개교기념일', type: '개교기념일', memo: '학교 지정 휴업일' },
  { date: '2026-05-04', name: '어린이날 징검다리 재량휴업일', type: '재량휴업일', memo: '5/5 어린이날 연계 샌드위치 휴업' },
  { date: '2026-06-05', name: '현충일 징검다리 재량휴업일', type: '재량휴업일', memo: '6/6 현충일 연계 휴업' },
  { date: '2026-10-02', name: '개천절 징검다리 재량휴업일', type: '재량휴업일', memo: '10/3 개천절 연계 샌드위치 휴업' },
  { date: '2026-11-19', name: '2027학년도 대학수학능력시험일', type: '수능일', memo: '수능 시험장 운영 휴업일' },
];

const STATUTORY_HOLIDAYS_2026 = [
  { date: '2026-01-01', name: '신정 (새해 첫날)' },
  { date: '2026-02-16', name: '설날 연휴' },
  { date: '2026-02-17', name: '설날 당일' },
  { date: '2026-02-18', name: '설날 연휴' },
  { date: '2026-03-01', name: '3·1절' },
  { date: '2026-03-02', name: '3·1절 대체공휴일' },
  { date: '2026-05-05', name: '어린이날' },
  { date: '2026-05-24', name: '부처님오신날' },
  { date: '2026-05-25', name: '부처님오신날 대체공휴일' },
  { date: '2026-06-06', name: '현충일' },
  { date: '2026-08-15', name: '광복절' },
  { date: '2026-08-17', name: '광복절 대체공휴일' },
  { date: '2026-09-24', name: '추석 연휴' },
  { date: '2026-09-25', name: '추석 당일' },
  { date: '2026-09-26', name: '추석 연휴' },
  { date: '2026-09-28', name: '추석 대체공휴일' },
  { date: '2026-10-03', name: '개천절' },
  { date: '2026-10-05', name: '개천절 대체공휴일' },
  { date: '2026-10-09', name: '한글날' },
  { date: '2026-12-25', name: '성탄절' },
];

function getDayOfWeekKorean(dateStr) {
  if (!dateStr) return '';
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return days[d.getDay()];
}

export default function SchoolHolidayManager({
  schoolHolidays = [],
  onHolidaysUpdated,
  apiBase = ''
}) {
  const [newDate, setNewDate] = useState('2026-05-01');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('재량휴업일');
  const [newMemo, setNewMemo] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStatutoryHolidays, setShowStatutoryHolidays] = useState(false);

  const handleAddHoliday = async (e) => {
    e?.preventDefault();
    if (!newDate) {
      setStatusMsg({ type: 'error', text: '휴업일 날짜를 선택해 주세요.' });
      return;
    }
    if (!newName.trim()) {
      setStatusMsg({ type: 'error', text: '휴업일 명칭(사유)을 입력해 주세요.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    const holidayPayload = {
      date: newDate,
      name: newName.trim(),
      type: newType,
      memo: newMemo.trim()
    };

    try {
      const res = await fetch(`${apiBase}/api/school-holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayPayload)
      });

      if (res.ok) {
        setStatusMsg({ type: 'success', text: `✨ [${newDate}] ${newName} 휴업일이 성공적으로 등록되었습니다.` });
        setNewName('');
        setNewMemo('');
        if (onHolidaysUpdated) onHolidaysUpdated();
      } else {
        const data = await res.json().catch(() => ({}));
        setStatusMsg({ type: 'error', text: data.detail || '휴업일 등록에 실패했습니다.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: `통신 오류: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (holidayId, dateStr, nameStr) => {
    if (!window.confirm(`[${dateStr}] '${nameStr}' 휴업일을 목록에서 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/school-holidays/${holidayId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setStatusMsg({ type: 'success', text: `🗑️ [${dateStr}] 휴업일이 삭제되었습니다.` });
        if (onHolidaysUpdated) onHolidaysUpdated();
      } else {
        setStatusMsg({ type: 'error', text: '휴업일 삭제에 실패했습니다.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: `삭제 오류: ${err.message}` });
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('기본 추천 2026학년도 휴업일 세트로 초기화하시겠습니까? 기존 등록 내역이 덮어씌워집니다.')) {
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/school-holidays/reset`, {
        method: 'POST'
      });

      if (res.ok) {
        setStatusMsg({ type: 'success', text: '🔄 2026학년도 기본 추천 학교 휴업일로 초기화되었습니다.' });
        if (onHolidaysUpdated) onHolidaysUpdated();
      } else {
        setStatusMsg({ type: 'error', text: '초기화에 실패했습니다.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: `초기화 오류: ${err.message}` });
    }
  };

  const handleApplyPreset = (preset) => {
    setNewName(preset.label);
    setNewType(preset.label);
  };

  return (
    <div className="school-holidays-container">
      {/* 헤더 섹션 */}
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 className="section-title">
              <Calendar className="text-primary" size={24} style={{ color: '#2563eb' }} />
              학교 휴업일(재량휴업일·개교기념일) 관리
            </h2>
            <p className="section-desc">
              이곳에 등록된 학교 휴업일은 <strong>결석신고서 등 양식 작성 시 법정공휴일과 함께 결석 일수에서 자동 차감 및 계산</strong>됩니다.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.88rem', padding: '9px 16px' }}
              onClick={handleResetDefaults}
            >
              <RotateCcw size={15} /> 기본 세트 복원
            </button>
          </div>
        </div>
      </div>

      {/* 상태 메시지 배너 */}
      {statusMsg && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: '600',
            fontSize: '0.92rem',
            background: statusMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1.5px solid ${statusMsg.type === 'success' ? '#a7f3d0' : '#fca5a5'}`,
            color: statusMsg.type === 'success' ? '#047857' : '#b91c1c'
          }}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* 2열 레이아웃: 좌측 휴업일 등록 폼, 우측 안내 및 현황 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1.2fr)', gap: '24px', marginBottom: '28px' }}>
        
        {/* 1. 휴업일 등록 카드 */}
        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={20} style={{ color: '#2563eb' }} />
            새 학교 휴업일 등록
          </h3>

          <form onSubmit={handleAddHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 날짜 선택 */}
            <div className="form-group">
              <label className="form-label">
                휴업일 날짜 <span className="badge-blue">🔵 필수</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                style={{ fontWeight: '700', fontSize: '1rem' }}
                required
              />
              {newDate && (
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>
                  📅 선택한 요일: <span style={{ color: '#2563eb' }}>{getDayOfWeekKorean(newDate)}요일</span>
                </div>
              )}
            </div>

            {/* 빠른 프리셋 태그 버튼 */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.85rem' }}>
                ⚡ 빠른 사유 선택 태그
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {HOLIDAY_TYPE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      borderRadius: '8px',
                      background: preset.bg,
                      color: preset.color,
                      border: `1px solid ${preset.border}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 휴업일 명칭 */}
            <div className="form-group">
              <label className="form-label">
                휴업일 명칭 / 사유 <span className="badge-blue">🔵 필수</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="예: 개교기념일, 재량휴업일, 수능시험일 등"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>

            {/* 구분 유형 및 비고 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>구분 유형</label>
                <select
                  className="form-input"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  <option value="재량휴업일">재량휴업일</option>
                  <option value="개교기념일">개교기념일</option>
                  <option value="임시휴업일">임시휴업일</option>
                  <option value="수능일">수능일</option>
                  <option value="기타">기타 휴업</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>비고 / 메모 (선택)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="학사일정 참고 메모"
                  value={newMemo}
                  onChange={(e) => setNewMemo(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }}
            >
              <Plus size={18} /> 휴업일 등록하기
            </button>
          </form>
        </div>

        {/* 2. 휴업일 연동 안내 & 빠른 정보 카드 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1.5px solid #bfdbfe',
            borderRadius: '16px',
            padding: '24px',
            color: '#1e3a8a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Sparkles size={22} style={{ color: '#2563eb' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800' }}>스탬프 공휴일 및 휴업일 자동 계산 원리</h3>
            </div>
            <ul style={{ fontSize: '0.88rem', lineHeight: '1.7', paddingLeft: '20px', color: '#1e40af' }}>
              <li>결석 시작일과 종료일 사이의 <strong>주말(토·일요일)</strong>은 자동 제외됩니다.</li>
              <li>대한민국 <strong>법정공휴일(신정, 설날, 삼일절, 추석 등 20개 공휴일)</strong>도 자동 제외됩니다.</li>
              <li>위 목록에 등록된 <strong>학교 자체 휴업일(개교기념일, 재량휴업일 등)</strong>도 자동으로 결석 일수에서 차감됩니다.</li>
              <li>양식 작성 시 어떤 휴업일이 제외되었는지 실시간으로 안내 배지가 표시됩니다.</li>
            </ul>
          </div>

          {/* 법정공휴일 펼치기 토글 버튼 */}
          <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarDays size={18} style={{ color: '#64748b' }} />
                <span style={{ fontWeight: '700', fontSize: '0.92rem', color: '#334155' }}>
                  2026학년도 법정공휴일 목록 (총 {STATUTORY_HOLIDAYS_2026.length}일 기본 탑재)
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={() => setShowStatutoryHolidays(!showStatutoryHolidays)}
              >
                {showStatutoryHolidays ? '목록 접기' : '공휴일 보기'}
              </button>
            </div>

            {showStatutoryHolidays && (
              <div style={{ marginTop: '16px', maxHeight: '180px', overflowY: 'auto', paddingRight: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                  {STATUTORY_HOLIDAYS_2026.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '6px 10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span style={{ fontWeight: '700', color: '#ef4444' }}>{h.date}</span>
                      <span style={{ color: '#475569' }}>{h.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 등록된 학교 휴업일 목록 테이블 */}
      <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
              📋 등록된 학교 휴업일 목록 ({schoolHolidays.length}일)
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '2px' }}>
              양식 작성 화면에서 자동으로 연동되는 휴업일 목록입니다.
            </p>
          </div>
        </div>

        {schoolHolidays.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
            <Calendar size={48} style={{ margin: '0 auto 12px', strokeWidth: 1.5, color: '#cbd5e1' }} />
            <p style={{ fontSize: '1rem', fontWeight: '700', color: '#64748b' }}>등록된 학교 휴업일이 없습니다.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>상단 폼에서 개교기념일이나 재량휴업일을 등록해 주세요.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', width: '60px' }}>No</th>
                  <th style={{ padding: '12px 16px', width: '140px' }}>휴업일 날짜</th>
                  <th style={{ padding: '12px 16px', width: '80px' }}>요일</th>
                  <th style={{ padding: '12px 16px' }}>휴업일 명칭 (사유)</th>
                  <th style={{ padding: '12px 16px', width: '120px' }}>유형</th>
                  <th style={{ padding: '12px 16px' }}>비고</th>
                  <th style={{ padding: '12px 16px', width: '80px', textAlign: 'center' }}>삭제</th>
                </tr>
              </thead>
              <tbody>
                {schoolHolidays.map((h, idx) => {
                  const dayOfWeek = getDayOfWeekKorean(h.date);
                  const isWeekend = dayOfWeek === '토' || dayOfWeek === '일';

                  return (
                    <tr key={h.id || idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0f172a' }}>
                        📅 {h.date}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          background: isWeekend ? '#fee2e2' : '#eff6ff',
                          color: isWeekend ? '#dc2626' : '#2563eb'
                        }}>
                          {dayOfWeek}요일
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#1e293b' }}>
                        {h.name}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          background: h.type === '개교기념일' ? '#f5f3ff' : h.type === '재량휴업일' ? '#f0f9ff' : '#ecfdf5',
                          color: h.type === '개교기념일' ? '#7c3aed' : h.type === '재량휴업일' ? '#0284c7' : '#047857',
                          border: `1px solid ${h.type === '개교기념일' ? '#ddd6fe' : h.type === '재량휴업일' ? '#bae6fd' : '#a7f3d0'}`
                        }}>
                          {h.type || '휴업일'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                        {h.memo || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteHoliday(h.id, h.date, h.name)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            transition: 'all 0.15s ease'
                          }}
                          title="휴업일 삭제"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
