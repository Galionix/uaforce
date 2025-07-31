import React from 'react';

interface ProgressBarProps {
  current: number; // Текущее значение
  total: number;   // Всего
  message: string; // Сообщение
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, message }) => {
  const percentage = Math.min(100, Math.round((current / total) * 100));

  return (
    <div style={{ width: '100%', maxWidth: 400, margin: '20px auto', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '8px' }}>{message}</div>
      <div style={{ background: '#eee', borderRadius: '4px', overflow: 'hidden', height: '20px' }}>
        <div
          style={{
            width: `${percentage}%`,
            background: '#4caf50',
            height: '100%',
            transition: 'width 0.3s ease'
          }}
        />
      </div>
      <div style={{ marginTop: '8px', fontSize: '12px', color: '#555' }}>
        {current} / {total} ({percentage}%)
      </div>
    </div>
  );
};
