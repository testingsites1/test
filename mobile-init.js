/* ==========================================================================
   LIFEFLOW — mobile-init.js
   Injects mobile chrome (top bar + bottom nav) into index.html.
   Loaded at the end of <body>, after app.js.
   ========================================================================== */

(function () {
  'use strict';

  /* ── Helpers ── */
  function $(id) { return document.getElementById(id); }

  /* ── Nav items ── */
  var NAV_ITEMS = [
    { key: 'dashboard', icon: 'layout-dashboard', label: 'Home',      navId: 'nav-dashboard' },
    { key: 'notes',     icon: 'file-text',        label: 'Notes',     navId: 'nav-notes',     badgeId: 'notes-badge' },
    { key: 'calendar',  icon: 'calendar',         label: 'Calendar',  navId: 'nav-calendar'  },
    { key: 'goals',     icon: 'target',           label: 'Goals',     navId: 'nav-goals'     },
    { key: 'focus',     icon: 'timer',            label: 'Focus',     navId: 'nav-focus'     },
    { key: 'reminders', icon: 'bell',             label: 'Reminders', navId: 'nav-reminders', badgeId: 'rem-badge' },
  ];


  /* ==========================================================================
     1. TOP BAR
     ========================================================================== */
  function buildTopbar() {
    var bar = document.createElement('div');
    bar.className = 'mobile-topbar';
    bar.id = 'mobile-topbar';
    bar.innerHTML =
      '<div class="mobile-topbar-logo">Lifeflow</div>' +
      '<div class="mobile-topbar-end">' +
        '<button type="button" class="mobile-topbar-icon-btn" id="mobile-btn-settings" aria-label="Settings">' +
          '<i data-lucide="settings"></i>' +
        '</button>' +
        '<div class="mobile-topbar-avatar" id="mobile-avatar" role="button" tabindex="0" aria-label="Account menu">L</div>' +
      '</div>';

    /* User dropdown */
    var menu = document.createElement('div');
    menu.className = 'mobile-user-menu';
    menu.id = 'mobile-user-menu';
    menu.innerHTML =
      '<div class="mobile-user-menu-name" id="mobile-menu-name">User</div>' +
      '<div class="mobile-user-menu-sub">Free plan</div>' +
      '<button class="mobile-user-menu-signout" onclick="handleSignOut && handleSignOut(); closeMobileMenu();">Sign out</button>';

    /* Insert topbar as first child, append menu to body */
    document.body.insertBefore(bar, document.body.firstChild);
    document.body.appendChild(menu);

    /* Avatar tap → toggle dropdown */
    var avatarEl = $('mobile-avatar');
    if (avatarEl) {
      avatarEl.addEventListener('click', toggleMobileMenu);
      avatarEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMobileMenu(); }
      });
    }

    /* Settings button → navigate to settings panel */
    var settingsBtn = $('mobile-btn-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function () {
        closeMobileMenu();
        var nav = $('nav-settings');
        if (nav && typeof window.switchTo === 'function') window.switchTo('settings', nav);
      });
    }

    /* Close dropdown on outside tap */
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#mobile-avatar') && !e.target.closest('#mobile-user-menu')) {
        closeMobileMenu();
      }
    });
  }

  window.toggleMobileMenu = function () {
    var m = $('mobile-user-menu');
    if (m) m.classList.toggle('open');
  };

  window.closeMobileMenu = function () {
    var m = $('mobile-user-menu');
    if (m) m.classList.remove('open');
  };

  /* Sync avatar letter and name from app.js auth state */
  function syncUserDisplay() {
    var nameEl = $('user-name-display');
    if (!nameEl) return;

    function update() {
      var name   = nameEl.textContent.trim();
      var letter = name.charAt(0).toUpperCase() || 'U';
      var mAvatar = $('mobile-avatar');
      var mName   = $('mobile-menu-name');
      if (mAvatar) mAvatar.textContent = letter;
      if (mName)   mName.textContent   = name;
    }

    update();
    new MutationObserver(update).observe(nameEl, {
      childList: true, subtree: true, characterData: true,
    });
  }


  /* ==========================================================================
     2. BOTTOM NAVIGATION
     ========================================================================== */
  function buildBottomNav() {
    var nav = document.createElement('nav');
    nav.className = 'mobile-nav';
    nav.id = 'mobile-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Main navigation');

    NAV_ITEMS.forEach(function (item) {
      var el = document.createElement('div');
      el.className = 'mobile-nav-item';
      el.id = 'mnav-' + item.key;
      el.setAttribute('data-section', item.key);
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', item.label);

      var badgeHtml = item.badgeId
        ? '<span class="mobile-nav-badge" id="mnav-badge-' + item.key + '">0</span>'
        : '';

      el.innerHTML =
        badgeHtml +
        '<span class="mobile-nav-icon"><i data-lucide="' + item.icon + '"></i></span>' +
        '<span class="mobile-nav-label">' + item.label + '</span>';

      el.addEventListener('click', function () {
        var desktopNav = $(item.navId);
        if (desktopNav && typeof switchTo === 'function') switchTo(item.key, desktopNav);
        setActiveNavItem(item.key);
      });

      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
      });

      nav.appendChild(el);
    });

    document.body.appendChild(nav);
    mirrorBadges();
  }

  function setActiveNavItem(key) {
    document.querySelectorAll('.mobile-nav-item').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-section') === key);
    });
  }

  /* Mirror badge counts from desktop sidebar to mobile nav */
  function mirrorBadges() {
    NAV_ITEMS.forEach(function (item) {
      if (!item.badgeId) return;
      var src = $(item.badgeId);
      var dst = $('mnav-badge-' + item.key);
      if (!src || !dst) return;

      function sync() {
        var num = parseInt(src.textContent.trim(), 10) || 0;
        dst.textContent = num;
        dst.style.display = (num > 0 && src.style.display !== 'none') ? 'block' : 'none';
      }

      sync();
      new MutationObserver(sync).observe(src, {
        childList: true, subtree: true, characterData: true, attributes: true,
      });
    });
  }


  /* ==========================================================================
     3. BACK TO DASHBOARD BUTTONS
     Injected into each panel's .page-header (except dashboard)
     ========================================================================== */
  function buildBackButtons() {
    ['notes', 'calendar', 'goals', 'focus', 'reminders', 'settings'].forEach(function (key) {
      var panel = $('panel-' + key);
      if (!panel) return;

      var header = panel.querySelector('.page-header');
      if (!header) return;

      var btn = document.createElement('button');
      btn.className = 'mobile-back-btn';
      btn.setAttribute('aria-label', 'Back to Dashboard');
      btn.innerHTML = '<i data-lucide="chevron-left"></i> Dashboard';

      btn.addEventListener('click', function () {
        var nav = $('nav-dashboard');
        if (nav && typeof switchTo === 'function') switchTo('dashboard', nav);
        setActiveNavItem('dashboard');
      });

      header.insertBefore(btn, header.firstChild);
    });
  }


  /* ==========================================================================
     4. PATCH switchTo() — keep bottom nav in sync
     ========================================================================== */
  function patchSwitchTo() {
    var attempts = 0;
    var poll = setInterval(function () {
      attempts++;

      if (typeof window.switchTo === 'function') {
        clearInterval(poll);

        var original = window.switchTo;
        window.switchTo = function (key, el) {
          original(key, el);
          setActiveNavItem(key);

          /* Highlight settings gear when on settings panel */
          var gear = $('mobile-btn-settings');
          if (gear) gear.classList.toggle('active', key === 'settings');

          /* Re-render Lucide icons in newly visible panel */
          if (window.lucide) window.lucide.createIcons();
        };

        setActiveNavItem('dashboard');
      }

      if (attempts > 50) clearInterval(poll);
    }, 100);
  }


  /* ==========================================================================
     5. TAPPABLE STAT CARDS
     Tap a dashboard stat card to navigate to that section
     ========================================================================== */
  function makeStatCardsTappable() {
    var map = {
      'stat-notes':  'notes',
      'stat-goals':  'goals',
      'stat-events': 'calendar',
      'stat-focus':  'focus',
    };

    Object.keys(map).forEach(function (statId) {
      var el = $(statId);
      if (!el) return;
      var card = el.closest('.stat-card');
      if (!card) return;

      var key = map[statId];
      card.style.cursor = 'pointer';
      card.addEventListener('click', function () {
        var nav = $('nav-' + key);
        if (nav && typeof switchTo === 'function') switchTo(key, nav);
        setActiveNavItem(key);
      });
    });
  }


  /* ==========================================================================
     INIT
     ========================================================================== */
  function init() {
    buildTopbar();
    buildBottomNav();
    buildBackButtons();
    patchSwitchTo();
    makeStatCardsTappable();
    syncUserDisplay();

    /* Render Lucide icons injected by this script */
    if (window.lucide) window.lucide.createIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
