'use client';

import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = window.localStorage.getItem('utmeufy-theme');
    const initial: Theme = saved === 'light' ? 'light' : 'dark';
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function changeTheme(next: Theme) {
    setTheme(next);
    window.localStorage.setItem('utmeufy-theme', next);
    document.documentElement.dataset.theme = next;
  }

  return (
    <div className="themeBox" aria-label="Tema do painel">
      <span className="themeLabel">Aparência</span>
      <div className="themeSwitch">
        <button type="button" className={`themeBtn ${theme === 'dark' ? 'active' : ''}`} aria-pressed={theme === 'dark'} onClick={() => changeTheme('dark')}>Black</button>
        <button type="button" className={`themeBtn ${theme === 'light' ? 'active' : ''}`} aria-pressed={theme === 'light'} onClick={() => changeTheme('light')}>White</button>
      </div>
    </div>
  );
}
