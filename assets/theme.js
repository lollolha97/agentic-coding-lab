// Theme switcher: Light / Dark / System. The choice lives in localStorage ("acl-theme") and is applied as html[data-theme].
// Loaded synchronously in <head> so the saved theme is set before first paint; the buttons are wired once the DOM is ready.
(() => {
  const KEY = 'acl-theme';
  const CHOICES = ['light', 'dark', 'system'];
  const root = document.documentElement;
  const read = () => {
    try { const value = localStorage.getItem(KEY); return CHOICES.includes(value) ? value : 'system'; } catch (error) { return 'system'; }
  };
  const apply = choice => { root.dataset.theme = choice; };
  let current = read();
  apply(current);

  const sync = () => {
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === current));
    });
    document.querySelectorAll('.theme-switch summary').forEach(trigger => {
      trigger.setAttribute('aria-label', `화면 테마 선택, 현재 ${current}`);
    });
  };
  const choose = choice => {
    current = choice; apply(choice); sync();
    try { localStorage.setItem(KEY, choice); } catch (error) { /* storage unavailable: the choice still applies for this page view */ }
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.theme-switch').forEach(group => { group.hidden = false; });
    document.querySelectorAll('[data-theme-choice]').forEach(button => button.addEventListener('click', () => {
      choose(button.dataset.themeChoice);
      const menu = button.closest('.theme-switch');
      menu.open = false;
      menu.querySelector('summary').focus();
    }));
    document.addEventListener('click', event => {
      document.querySelectorAll('.theme-switch[open]').forEach(menu => {
        if (!menu.contains(event.target)) menu.open = false;
      });
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') document.querySelectorAll('.theme-switch[open]').forEach(menu => {
        menu.open = false;
        menu.querySelector('summary').focus();
      });
    });
    sync();
  });
  // Keep other open tabs in step.
  addEventListener('storage', event => { if (event.key === KEY) { current = read(); apply(current); sync(); } });
})();
