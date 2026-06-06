/* eslint-disable */
const { useState } = React;

window.Button = function Button({ variant = 'primary', children, onClick, style }) {
  const base = {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    fontSize: 14,
    letterSpacing: '0.02em',
    padding: '12px 22px',
    borderRadius: 4,
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 140ms cubic-bezier(.2,.6,.2,1)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    textDecoration: 'none',
  };
  const variants = {
    primary: { background: '#0E2543', color: '#F7F6F2' },
    secondary: { background: 'transparent', color: '#0E2543', borderColor: '#0E2543' },
    'on-dark-primary': { background: '#F7F6F2', color: '#0E2543' },
    'on-dark-secondary': { background: 'transparent', color: '#F7F6F2', borderColor: '#F7F6F2' },
    ghost: { background: 'transparent', color: '#0E2543' },
  };
  const [hover, setHover] = useState(false);
  const hoverStyle = hover ? {
    primary: { background: '#163058', boxShadow: '0 2px 8px rgba(14,37,67,0.18)' },
    secondary: { background: '#0E2543', color: '#F7F6F2' },
    'on-dark-primary': { background: '#fff' },
    'on-dark-secondary': { background: 'rgba(247,246,242,0.1)' },
    ghost: { color: '#B08B3F' },
  }[variant] : {};
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...variants[variant], ...hoverStyle, ...style }}
    >
      {children}
    </button>
  );
};

window.Editorial = function Editorial({ children, dark, onClick }) {
  return (
    <a onClick={onClick} style={{
      fontFamily: "'Inter', sans-serif",
      fontWeight: 500,
      fontSize: 13,
      letterSpacing: '0.04em',
      color: dark ? '#F7F6F2' : '#0E2543',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
    }}>
      <span style={{
        display: 'inline-block', width: 32, height: 1,
        background: dark ? '#F7F6F2' : '#0E2543', marginRight: 12,
      }}></span>
      {children}
    </a>
  );
};
