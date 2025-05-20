import React from 'react';

const LogoEcoAlliance: React.FC = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="19" stroke="#1E88E5" strokeWidth="2" fill="white" />
        <path d="M20 10C14.5 10 10 14.5 10 20C10 25.5 14.5 30 20 30C25.5 30 30 25.5 30 20" stroke="#1E88E5" strokeWidth="2" />
        <path d="M20 15L25 20L20 25" stroke="#1E88E5" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ marginLeft: '8px' }}>
        <div style={{ color: '#1E88E5', fontWeight: 'bold', fontSize: '16px', lineHeight: '1.2' }}>Eco</div>
        <div style={{ color: '#1E88E5', fontSize: '16px', lineHeight: '1.2' }}>Alliance</div>
      </div>
    </div>
  );
};

export default LogoEcoAlliance; 