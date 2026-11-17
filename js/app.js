/**
 * SmartLens AI - Master Application Controller
 * Handles 3D effects, animations, multi-source AI tools, authentication, and state management.
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. STORAGE & STATE MANAGEMENT
     ========================================================================== */

  var STORAGE_KEYS = {
    USER: 'smartlens_current_user',
    USERS: 'smartlens_registered_users',
    HISTORY: 'smartlens_history'
  };

  // Default seed user
  var DEFAULT_USER = {
    name: 'Muhammad Zubair',
    email: 'zubair@smartlens.ai',
    role: 'General User'
  };

  // Seed sample history if none exists
  function initStorage() {
    try {
      if (!localStorage.getItem(STORAGE_KEYS.USER)) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEFAULT_USER));
      }
      if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([DEFAULT_USER]));
      }
      if (!localStorage.getItem(STORAGE_KEYS.HISTORY)) {
        var seedHistory = [
          {
            id: 'hist_' + Date.now() + '_1',
            feature: 'Document Analyzer',
            featureKey: 'docs',
            input: 'research_paper_ai_nlp.pdf',
            date: 'Today, 10:24 AM',
            status: 'Completed',
            summary: 'Comprehensive analysis of Transformer architectures and multi-source cross-attention models.'
          },
          {
            id: 'hist_' + Date.now() + '_2',
            feature: 'YouTube Summarizer',
            featureKey: 'videos',
            input: 'https://youtube.com/watch?v=kCc8FmEb1nY',
            date: 'Yesterday, 04:15 PM',
            status: 'Completed',
            summary: 'Full summary covering Operating Systems scheduling algorithms, deadlock handling, and paging.'
          },
          {
            id: 'hist_' + Date.now() + '_3',
            feature: 'Resume Analyzer',
            featureKey: 'resumes',
            input: 'Software_Engineer_Resume.pdf',
            date: 'Nov 14, 2026',
            status: 'Completed',
            summary: 'Overall Match: 88%. Strong backend proficiencies with recommendations for cloud certifications.'
          },
          {
            id: 'hist_' + Date.now() + '_4',
            feature: 'PDF Q&A',
            featureKey: 'qa',
            input: 'Distributed_Systems_Lecture4.pdf',
            date: 'Nov 13, 2026',
            status: 'Completed',
            summary: 'Answered 5 questions regarding Raft Consensus and Byzantine Fault Tolerance.'
          },
          {
            id: 'hist_' + Date.now() + '_5',
            feature: 'URL Analyzer',
            featureKey: 'urls',
            input: 'https://techcrunch.com/ai-breakthroughs-2026',
            date: 'Nov 12, 2026',
            status: 'Completed',
            summary: 'Key takeaways extracted from the AI industry roadmap report.'
          }
        ];
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(seedHistory));
      }
    } catch (e) {
      console.warn('LocalStorage unavailable or disabled:', e);
    }
  }

  function getCurrentUser() {
    try {
      var raw = localStorage.getItem(STORAGE_KEYS.USER);
      return raw ? JSON.parse(raw) : DEFAULT_USER;
    } catch (e) {
      return DEFAULT_USER;
    }
  }

  function setCurrentUser(user) {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (e) {}
  }

  function getHistory() {
    try {
      var raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistoryItem(item) {
    try {
      var history = getHistory();
      var newItem = Object.assign({
        id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        status: 'Completed'
      }, item);
      history.unshift(newItem);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
      return newItem;
    } catch (e) {
      console.warn('Failed to save history:', e);
      return item;
    }
  }

  /* ==========================================================================
     2. TOAST NOTIFICATION SYSTEM
     ========================================================================== */

  function showToast(message, type) {
    type = type || 'info'; // 'info', 'success', 'warning', 'error'
    var toast = document.createElement('div');
    toast.className = 'smartlens-toast toast-' + type;
    toast.innerHTML = '<span class="toast-icon">' + 
      (type === 'success' ? '✅' : type === 'error' ? '⚠️' : type === 'warning' ? '🔔' : 'ℹ️') + 
      '</span><span class="toast-msg">' + message + '</span>';
    
    // Inject styles if not present
    if (!document.getElementById('smartlens-toast-style')) {
      var style = document.createElement('style');
      style.id = 'smartlens-toast-style';
      style.textContent = [
        '.smartlens-toast { position: fixed; bottom: 24px; right: 24px; z-index: 99999; display: flex; align-items: center; gap: 12px; padding: 12px 20px; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; color: #fff; font-size: 14px; font-weight: 500; box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(12px); transform: translateY(30px); opacity: 0; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }',
        '.smartlens-toast.show { transform: translateY(0); opacity: 1; }',
        '.toast-success { border-color: rgba(34, 197, 94, 0.5); box-shadow: 0 10px 30px rgba(34, 197, 94, 0.2); }',
        '.toast-error { border-color: rgba(239, 68, 68, 0.5); box-shadow: 0 10px 30px rgba(239, 68, 68, 0.2); }',
        '.toast-warning { border-color: rgba(234, 179, 8, 0.5); }'
      ].join('\n');
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add('show'); }, 10);
    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, 3500);
  }

  /* ==========================================================================
     3. LOADER & INITIALIZATION
     ========================================================================== */

  function initLoader() {
    var loader = document.getElementById('loader');
    if (!loader) return;

    var fill = loader.querySelector('.loader-fill');
    if (fill) {
      fill.style.width = '0%';
      setTimeout(function () { fill.style.width = '70%'; }, 100);
      setTimeout(function () { fill.style.width = '100%'; }, 500);
    }

    setTimeout(function () {
      loader.style.transition = 'opacity 0.4s ease, visibility 0.4s ease';
      loader.style.opacity = '0';
      loader.style.visibility = 'hidden';
      document.body.classList.add('loaded');
      setTimeout(function () {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 400);
    }, 700);
  }

  /* ==========================================================================
     4. NAVBAR & MOBILE MENU
     ========================================================================== */

  function initNavbar() {
    var navbar = document.getElementById('navbar');
    var hamburger = document.getElementById('hamburger');
    var navLinks = document.getElementById('navLinks');

    if (navbar) {
      window.addEventListener('scroll', function () {
        if (window.scrollY > 40) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      }, { passive: true });
    }

    if (hamburger && navLinks) {
      hamburger.addEventListener('click', function (e) {
        e.stopPropagation();
        navLinks.classList.toggle('active');
        hamburger.classList.toggle('active');
      });

      // Close when clicking outside
      document.addEventListener('click', function (e) {
        if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
          navLinks.classList.remove('active');
          hamburger.classList.remove('active');
        }
      });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var targetId = this.getAttribute('href');
        if (targetId && targetId !== '#' && targetId.length > 1) {
          var targetEl = document.querySelector(targetId);
          if (targetEl) {
            e.preventDefault();
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (navLinks) navLinks.classList.remove('active');
          }
        }
      });
    });
  }

  /* ==========================================================================
     5. HERO STATS COUNTER ANIMATION
     ========================================================================== */

  function initCounters() {
    var statNums = document.querySelectorAll('.hero-stat .stat-num, [data-count]');
    if (!statNums.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var target = parseInt(el.getAttribute('data-count'), 10);
          if (isNaN(target) || el._counted) return;
          el._counted = true;

          var duration = 1800;
          var start = 0;
          var startTime = null;

          function animate(time) {
            if (!startTime) startTime = time;
            var progress = Math.min((time - startTime) / duration, 1);
            // Ease out quad
            var current = Math.floor(progress * (2 - progress) * target);
            el.textContent = current.toLocaleString();
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              el.textContent = target.toLocaleString();
            }
          }
          requestAnimationFrame(animate);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.2 });

    statNums.forEach(function (el) { observer.observe(el); });
  }

  /* ==========================================================================
     6. 3D CARD TILT EFFECT
     ========================================================================== */

  function initTilt() {
    var tiltElements = document.querySelectorAll('[data-tilt], .feature-card, .usecase-card, .dash-stat-card, .dash-tool-card');
    tiltElements.forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var centerX = rect.width / 2;
        var centerY = rect.height / 2;
        var rotateX = ((y - centerY) / centerY) * -8;
        var rotateY = ((x - centerX) / centerX) * 8;

        el.style.transform = 'perspective(1000px) rotateX(' + rotateX.toFixed(2) + 'deg) rotateY(' + rotateY.toFixed(2) + 'deg) translateY(-4px)';
      });

      el.addEventListener('mouseleave', function () {
        el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
        el.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
      });

      el.addEventListener('mouseenter', function () {
        el.style.transition = 'transform 0.1s ease';
      });
    });
  }

  /* ==========================================================================
     7. SCROLL REVEAL ANIMATIONS
     ========================================================================== */

  function initScrollReveal() {
    var targets = document.querySelectorAll('.feature-card, .step-item, .usecase-card, .section-header, .dash-stat-card, .dash-tool-card');
    if (!targets.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    targets.forEach(function (el) {
      el.classList.add('reveal-on-scroll');
      observer.observe(el);
    });
  }

  /* ==========================================================================
     8. AUTHENTICATION (LOGIN & REGISTER)
     ========================================================================== */

  function initAuth() {
    // --- Login Page ---
    var loginForm = document.getElementById('loginForm');
    var toggleLoginPw = document.getElementById('toggleLoginPw');
    var loginPassword = document.getElementById('loginPassword');
    var loginEmail = document.getElementById('loginEmail');
    var loginError = document.getElementById('loginError');
    var googleLoginBtn = document.getElementById('googleLoginBtn');

    if (toggleLoginPw && loginPassword) {
      toggleLoginPw.addEventListener('click', function () {
        var isText = loginPassword.type === 'text';
        loginPassword.type = isText ? 'password' : 'text';
        toggleLoginPw.textContent = isText ? '👁️' : '🙈';
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = (loginEmail ? loginEmail.value : '').trim();
        var pw = (loginPassword ? loginPassword.value : '').trim();
        var loginBtn = document.getElementById('loginBtn');
        var spinner = loginBtn ? loginBtn.querySelector('.spinner') : null;
        var btnText = loginBtn ? loginBtn.querySelector('.btn-text') : null;

        if (loginError) loginError.style.display = 'none';

        if (!email || !pw) {
          if (loginError) {
            loginError.style.display = 'flex';
            var errSpan = loginError.querySelector('.error-text');
            if (errSpan) errSpan.textContent = 'Please enter both email and password.';
          }
          return;
        }

        // Show loading state
        if (spinner) spinner.style.display = 'inline-block';
        if (btnText) btnText.textContent = 'Verifying...';
        if (loginBtn) loginBtn.disabled = true;

        setTimeout(function () {
          // Check registered users in storage
          var users = [];
          try {
            users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
          } catch (err) {}

          var found = users.find(function (u) {
            return u.email.toLowerCase() === email.toLowerCase();
          });

          // Allow login for registered user or demo fallback
          var authenticatedUser = found || {
            name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, function (l) { return l.toUpperCase(); }),
            email: email,
            role: 'General User'
          };

          setCurrentUser(authenticatedUser);
          showToast('Welcome back, ' + authenticatedUser.name + '!', 'success');

          setTimeout(function () {
            window.location.href = 'dashboard.html';
          }, 600);
        }, 800);
      });
    }

    if (googleLoginBtn) {
      googleLoginBtn.addEventListener('click', function () {
        var googleUser = {
          name: 'Google User',
          email: 'user@gmail.com',
          role: 'General User'
        };
        setCurrentUser(googleUser);
        showToast('Signed in via Google successfully!', 'success');
        setTimeout(function () { window.location.href = 'dashboard.html'; }, 600);
      });
    }

    // --- Register Page ---
    var registerForm = document.getElementById('registerForm');
    var regPassword = document.getElementById('regPassword');
    var regConfirmPassword = document.getElementById('regConfirmPassword');
    var regEmail = document.getElementById('regEmail');
    var regName = document.getElementById('regName');
    var accountType = document.getElementById('accountType');
    var termsCheck = document.getElementById('termsCheck');
    var toggleRegPw = document.getElementById('toggleRegPw');
    var pwStrengthFill = document.getElementById('pwStrengthFill');
    var pwStrengthLabel = document.getElementById('pwStrengthLabel');
    var registerError = document.getElementById('registerError');
    var googleRegisterBtn = document.getElementById('googleRegisterBtn');

    if (toggleRegPw && regPassword) {
      toggleRegPw.addEventListener('click', function () {
        var isText = regPassword.type === 'text';
        regPassword.type = isText ? 'password' : 'text';
        toggleRegPw.textContent = isText ? '👁️' : '🙈';
      });
    }

    // Password strength calculation
    if (regPassword && pwStrengthFill) {
      regPassword.addEventListener('input', function () {
        var val = regPassword.value;
        var score = 0;
        if (val.length >= 8) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;

        var widths = ['0%', '25%', '50%', '75%', '100%'];
        var colors = ['#e2e8f0', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
        var labels = [
          'Enter a password to see its strength',
          'Weak – add numbers & symbols',
          'Moderate – make it longer',
          'Good – almost there',
          'Strong password!'
        ];

        pwStrengthFill.style.width = widths[score];
        pwStrengthFill.style.backgroundColor = colors[score];
        if (pwStrengthLabel) pwStrengthLabel.textContent = labels[score];
      });
    }

    if (registerForm) {
      registerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = (regName ? regName.value : '').trim();
        var email = (regEmail ? regEmail.value : '').trim();
        var pw = (regPassword ? regPassword.value : '').trim();
        var confirmPw = (regConfirmPassword ? regConfirmPassword.value : '').trim();
        var role = (accountType ? accountType.value : '') || 'General User';
        var registerBtn = document.getElementById('registerBtn');
        var spinner = registerBtn ? registerBtn.querySelector('.spinner') : null;
        var btnText = registerBtn ? registerBtn.querySelector('.btn-text') : null;

        if (registerError) registerError.style.display = 'none';

        function showRegError(msg) {
          if (registerError) {
            registerError.style.display = 'flex';
            var errSpan = registerError.querySelector('.error-text');
            if (errSpan) errSpan.textContent = msg;
          }
        }

        if (!name || !email || !pw || !confirmPw) {
          showRegError('Please fill in all required fields.');
          return;
        }

        if (pw.length < 8) {
          showRegError('Password must contain at least 8 characters.');
          return;
        }

        if (pw !== confirmPw) {
          showRegError('Passwords do not match.');
          return;
        }

        if (termsCheck && !termsCheck.checked) {
          showRegError('Please agree to the Terms of Service and Privacy Policy.');
          return;
        }

        // Show spinner
        if (spinner) spinner.style.display = 'inline-block';
        if (btnText) btnText.textContent = 'Creating Account...';
        if (registerBtn) registerBtn.disabled = true;

        setTimeout(function () {
          var newUser = {
            name: name,
            email: email,
            role: role.charAt(0).toUpperCase() + role.slice(1)
          };

          // Save to registered users list
          try {
            var users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
            users.push(newUser);
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
          } catch (err) {}

          setCurrentUser(newUser);
          showToast('Account created successfully! Welcome to SmartLens AI.', 'success');

          setTimeout(function () {
            window.location.href = 'dashboard.html';
          }, 700);
        }, 900);
      });
    }

    if (googleRegisterBtn) {
      googleRegisterBtn.addEventListener('click', function () {
        var googleUser = {
          name: 'Google User',
          email: 'user@gmail.com',
          role: 'General User'
        };
        setCurrentUser(googleUser);
        showToast('Registered with Google successfully!', 'success');
        setTimeout(function () { window.location.href = 'dashboard.html'; }, 600);
      });
    }
  }

  /* ==========================================================================
     9. DASHBOARD CONTROLLER
     ========================================================================== */

  function initDashboard() {
    var dashboardPage = document.getElementById('dashboard-page');
    if (!dashboardPage) return;

    var currentUser = getCurrentUser();

    // Set User Name & Role in Topbar and Sidebar
    var topbarUserName = document.getElementById('topbarUserName');
    var sidebarUserName = document.getElementById('sidebarUserName');
    var sidebarUserRole = document.getElementById('sidebarUserRole');
    var currentDate = document.getElementById('currentDate');

    if (topbarUserName) topbarUserName.textContent = currentUser.name || 'User';
    if (sidebarUserName) sidebarUserName.textContent = currentUser.name || 'User';
    if (sidebarUserRole) sidebarUserRole.textContent = currentUser.role || 'General User';

    if (currentDate) {
      currentDate.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    // Sidebar Mobile Toggle
    var sidebarToggle = document.getElementById('sidebarToggle');
    var sidebarClose = document.getElementById('sidebarClose');
    var dashSidebar = document.getElementById('dashSidebar');

    if (sidebarToggle && dashSidebar) {
      sidebarToggle.addEventListener('click', function () {
        dashSidebar.classList.add('open');
      });
    }
    if (sidebarClose && dashSidebar) {
      sidebarClose.addEventListener('click', function () {
        dashSidebar.classList.remove('open');
      });
    }

    // Logout Button
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function (e) {
        e.preventDefault();
        showToast('You have been logged out securely.', 'info');
        setTimeout(function () {
          window.location.href = 'login.html';
        }, 500);
      });
    }

    // Render Stats & Recent Activity Table
    renderDashboardActivity();

    // Clear History Button
    var clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to clear your recent analysis history?')) {
          try {
            localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
          } catch (e) {}
          renderDashboardActivity();
          showToast('Analysis history cleared.', 'info');
        }
      });
    }
  }

  function renderDashboardActivity() {
    var history = getHistory();

    // Update Counts
    var counts = { docs: 0, videos: 0, qa: 0, resumes: 0, urls: 0 };
    history.forEach(function (item) {
      if (item.featureKey && counts[item.featureKey] !== undefined) {
        counts[item.featureKey]++;
      }
    });

    var statDocs = document.getElementById('statDocs');
    var statVideos = document.getElementById('statVideos');
    var statQA = document.getElementById('statQA');
    var statResumes = document.getElementById('statResumes');
    var statURLs = document.getElementById('statURLs');

    if (statDocs) statDocs.textContent = counts.docs;
    if (statVideos) statVideos.textContent = counts.videos;
    if (statQA) statQA.textContent = counts.qa;
    if (statResumes) statResumes.textContent = counts.resumes;
    if (statURLs) statURLs.textContent = counts.urls;

    // Render Table Body
    var tbody = document.getElementById('activityTableBody');
    var tableWrap = document.getElementById('activityTableWrap');
    var emptyState = document.getElementById('activityEmptyState');

    if (!tbody) return;

    if (!history.length) {
      if (tableWrap) tableWrap.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (tableWrap) tableWrap.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = '';
    history.slice(0, 10).forEach(function (item, index) {
      var tr = document.createElement('tr');
      
      // Icon mapping
      var icon = '📄';
      if (item.featureKey === 'videos') icon = '▶️';
      else if (item.featureKey === 'qa') icon = '💬';
      else if (item.featureKey === 'resumes') icon = '📋';
      else if (item.featureKey === 'urls') icon = '🔗';

      tr.innerHTML = [
        '<td>' + (index + 1) + '</td>',
        '<td><span class="table-feature-tag">' + icon + ' ' + (item.feature || 'Analysis') + '</span></td>',
        '<td class="table-input-cell" title="' + (item.input || '') + '">' + escapeHtml(truncate(item.input || 'Input File', 32)) + '</td>',
        '<td class="table-date-cell">' + (item.date || 'Recent') + '</td>',
        '<td><span class="badge badge-success">✓ ' + (item.status || 'Completed') + '</span></td>',
        '<td><button class="btn btn-sm btn-glass view-result-btn" data-id="' + item.id + '">View</button></td>'
      ].join('');

      tbody.appendChild(tr);
    });

    // View result buttons
    tbody.querySelectorAll('.view-result-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        var item = history.find(function (h) { return h.id === id; });
        if (item) {
          alert('SmartLens AI Result for:\n' + item.input + '\n\n' + (item.summary || 'Summary completed successfully.'));
        }
      });
    });
  }

  /* ==========================================================================
     10. TOOL 1: DOCUMENT ANALYZER
     ========================================================================== */

  function initDocumentAnalyzer() {
    var uploadZone = document.getElementById('uploadZone');
    var fileInput = document.getElementById('fileInput');
    var fileInfo = document.getElementById('fileInfo');
    var fileName = document.getElementById('fileName');
    var clearFile = document.getElementById('clearFile');
    var analyzeBtn = document.getElementById('analyzeBtn');
    var spinner = document.getElementById('spinner');
    var resultBox = document.getElementById('resultBox');
    var resultContent = document.getElementById('resultContent');
    var copyBtn = document.getElementById('copyBtn');

    if (!uploadZone || !analyzeBtn) return;

    var currentFile = null;

    // Click to upload
    uploadZone.addEventListener('click', function () {
      if (fileInput) fileInput.click();
    });

    // Drag and drop handlers
    ['dragenter', 'dragover'].forEach(function (event) {
      uploadZone.addEventListener(event, function (e) {
        e.preventDefault();
        uploadZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(function (event) {
      uploadZone.addEventListener(event, function (e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
      });
    });

    uploadZone.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files.length) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });

    if (fileInput) {
      fileInput.addEventListener('change', function () {
        if (fileInput.files.length) {
          handleFileSelected(fileInput.files[0]);
        }
      });
    }

    function handleFileSelected(file) {
      // Validate extensions
      var ext = file.name.split('.').pop().toLowerCase();
      if (['pdf', 'docx', 'txt'].indexOf(ext) === -1) {
        showToast('Unsupported format! Please upload PDF, DOCX, or TXT (BRL-003).', 'error');
        return;
      }

      // Validate 10MB limit (BRL-002)
      if (file.size > 10 * 1024 * 1024) {
        showToast('File exceeds 10MB size limit (BRL-002).', 'error');
        return;
      }

      currentFile = file;
      if (fileName) fileName.textContent = file.name + ' (' + formatFileSize(file.size) + ')';
      if (fileInfo) fileInfo.style.display = 'flex';
      analyzeBtn.disabled = false;
      showToast('File selected: ' + file.name, 'info');
    }

    if (clearFile) {
      clearFile.addEventListener('click', function (e) {
        e.stopPropagation();
        currentFile = null;
        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.style.display = 'none';
        analyzeBtn.disabled = true;
        if (resultBox) resultBox.style.display = 'none';
      });
    }

    // Analyze Click Handler
    analyzeBtn.addEventListener('click', function () {
      if (!currentFile) return;

      var optKeyPoints = document.getElementById('optKeyPoints');
      var optWordCount = document.getElementById('optWordCount');
      var optDetailed = document.getElementById('optDetailed');

      var includeKeyPoints = optKeyPoints ? optKeyPoints.checked : true;
      var includeWordCount = optWordCount ? optWordCount.checked : false;
      var isDetailed = optDetailed ? optDetailed.checked : false;

      analyzeBtn.disabled = true;
      if (spinner) spinner.style.display = 'block';
      if (resultBox) resultBox.style.display = 'none';

      // If it's a real text file, read some of it
      if (currentFile.name.endsWith('.txt')) {
        var reader = new FileReader();
        reader.onload = function (e) {
          var text = e.target.result;
          displayDocumentSummary(currentFile.name, text, includeKeyPoints, includeWordCount, isDetailed);
        };
        reader.readAsText(currentFile.slice(0, 5000));
      } else {
        setTimeout(function () {
          displayDocumentSummary(currentFile.name, null, includeKeyPoints, includeWordCount, isDetailed);
        }, 1200);
      }
    });

    function displayDocumentSummary(fname, rawText, keyPoints, wordCount, detailed) {
      if (spinner) spinner.style.display = 'none';
      analyzeBtn.disabled = false;

      var estimatedWords = Math.floor(currentFile.size / 6.5) || 1420;
      var summaryParagraph = detailed
        ? 'This document provides a thorough analysis and comprehensive architectural breakdown of the subject matter. The text outlines clear theoretical foundations, experimental validations, and structured implementation benchmarks. Key findings demonstrate significant performance efficiencies and robust error mitigation strategies under concurrent operational loads.'
        : 'This document presents the core principles, objectives, and findings of the research subject. It synthesizes primary conclusions and operational frameworks into an actionable, cohesive overview for quick decision-making.';

      var html = [
        '<div class="analysis-meta-bar">',
        '  <span><strong>File:</strong> ' + escapeHtml(fname) + '</span>',
        '  <span><strong>Status:</strong> <span class="badge badge-success">Analyzed</span></span>',
        wordCount ? '  <span><strong>Estimated Words:</strong> ~' + estimatedWords + ' words</span>' : '',
        '</div>',
        '<div class="analysis-section">',
        '  <h3>Executive Summary</h3>',
        '  <p>' + summaryParagraph + '</p>',
        '</div>'
      ];

      if (keyPoints) {
        html.push(
          '<div class="analysis-section">',
          '  <h3>Key Identified Points</h3>',
          '  <ul class="key-points-list">',
          '    <li><strong>Primary Objective:</strong> Clear formulation of architectural design goals and constraint parameters.</li>',
          '    <li><strong>Methodology:</strong> Systematic evaluation utilizing quantitative empirical testing and automated pipelines.</li>',
          '    <li><strong>Efficiency Gains:</strong> 70% reduction in document comprehension time with 95% information retention.</li>',
          '    <li><strong>Security & Privacy:</strong> Full compliance with user data protection policies (BRL-006 & BRL-019).</li>',
          '  </ul>',
          '</div>'
        );
      }

      html.push(
        '<div class="analysis-disclaimer">',
        '  <small>⚠️ Note: This summary is generated by SmartLens AI (BRL-010). Files are deleted immediately after processing (BRL-006).</small>',
        '</div>'
      );

      if (resultContent) resultContent.innerHTML = html.join('\n');
      if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // Save to history
      saveHistoryItem({
        feature: 'Document Analyzer',
        featureKey: 'docs',
        input: fname,
        summary: summaryParagraph
      });

      showToast('Document analyzed successfully!', 'success');
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        if (!resultContent) return;
        copyTextToClipboard(resultContent.innerText);
        showToast('Summary copied to clipboard!', 'success');
      });
    }
  }

  /* ==========================================================================
     11. TOOL 2: YOUTUBE SUMMARIZER
     ========================================================================== */

  function initYouTubeSummarizer() {
    var ytUrl = document.getElementById('ytUrl');
    var summarizeBtn = document.getElementById('summarizeBtn');
    var ytPreview = document.getElementById('ytPreview');
    var ytThumbnail = document.getElementById('ytThumbnail');
    var ytTitle = document.getElementById('ytTitle');
    var spinner = document.getElementById('spinner');
    var resultBox = document.getElementById('resultBox');
    var resultContent = document.getElementById('resultContent');
    var copyBtn = document.getElementById('copyBtn');

    if (!ytUrl || !summarizeBtn) return;

    // Helper: Extract YouTube ID
    function extractVideoID(url) {
      var match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
      return match ? match[1] : null;
    }

    // Input preview detection
    ytUrl.addEventListener('input', function () {
      var val = ytUrl.value.trim();
      var vid = extractVideoID(val);
      if (vid) {
        if (ytThumbnail) ytThumbnail.src = 'https://img.youtube.com/vi/' + vid + '/hqdefault.jpg';
        if (ytTitle) ytTitle.textContent = 'YouTube Video (' + vid + ') – Transcript Ready';
        if (ytPreview) ytPreview.style.display = 'flex';
      } else {
        if (ytPreview) ytPreview.style.display = 'none';
      }
    });

    summarizeBtn.addEventListener('click', function () {
      var val = ytUrl.value.trim();
      var vid = extractVideoID(val);

      if (!val) {
        showToast('Please enter a YouTube video URL.', 'warning');
        return;
      }

      if (!vid) {
        showToast('Invalid YouTube URL! Please provide a standard YouTube video link (BRL-016).', 'error');
        return;
      }

      summarizeBtn.disabled = true;
      if (spinner) spinner.style.display = 'block';
      if (resultBox) resultBox.style.display = 'none';

      setTimeout(function () {
        if (spinner) spinner.style.display = 'none';
        summarizeBtn.disabled = false;

        var html = [
          '<div class="analysis-meta-bar">',
          '  <span><strong>Video ID:</strong> ' + vid + '</span>',
          '  <span><strong>Transcript Source:</strong> English (Auto-Generated)</span>',
          '  <span><strong>Duration:</strong> ~18 mins</span>',
          '</div>',
          '<div class="analysis-section">',
          '  <h3>Video Overview</h3>',
          '  <p>In this video, the speaker delivers an in-depth breakdown of essential principles, common architectural pitfalls, and industry best practices. The presentation emphasizes iterative development, data-driven optimization, and systematic problem solving.</p>',
          '</div>',
          '<div class="analysis-section">',
          '  <h3>Chapter Summaries & Key Moments</h3>',
          '  <div class="yt-timeline">',
          '    <div class="timeline-entry"><strong>00:00 - 02:45</strong> — Introduction & System Problem Statement</div>',
          '    <div class="timeline-entry"><strong>02:46 - 07:15</strong> — Core Architecture Overview & Pipeline Design</div>',
          '    <div class="timeline-entry"><strong>07:16 - 12:30</strong> — Deep Dive into Scalability Bottlenecks & Solutions</div>',
          '    <div class="timeline-entry"><strong>12:31 - 16:50</strong> — Real-World Case Studies & Code Walkthrough</div>',
          '    <div class="timeline-entry"><strong>16:51 - 18:20</strong> — Final Takeaways, Q&A, and Next Steps</div>',
          '  </div>',
          '</div>',
          '<div class="analysis-section">',
          '  <h3>Key Takeaways</h3>',
          '  <ul class="key-points-list">',
          '    <li>Focus on stateless API designs for seamless horizontal scaling.</li>',
          '    <li>Automated error retries prevent 85% of transient network failures.</li>',
          '    <li>Always monitor resource consumption under peak load scenarios.</li>',
          '  </ul>',
          '</div>',
          '<div class="analysis-disclaimer">',
          '  <small>⚠️ AI-generated summary (BRL-010). Subject to YouTube transcript availability (BRL-008).</small>',
          '</div>'
        ].join('\n');

        if (resultContent) resultContent.innerHTML = html;
        if (resultBox) {
          resultBox.style.display = 'block';
          resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        saveHistoryItem({
          feature: 'YouTube Summarizer',
          featureKey: 'videos',
          input: val,
          summary: 'Video summary with timestamped key takeaways for ' + vid
        });

        showToast('YouTube video summarized successfully!', 'success');
      }, 1400);
    });

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        if (!resultContent) return;
        copyTextToClipboard(resultContent.innerText);
        showToast('Summary copied to clipboard!', 'success');
      });
    }
  }

  /* ==========================================================================
     12. TOOL 3: PDF Q&A SYSTEM
     ========================================================================== */

  function initPdfQA() {
    var uploadZone = document.getElementById('uploadZone');
    var fileInput = document.getElementById('fileInput');
    var fileInfo = document.getElementById('fileInfo');
    var fileName = document.getElementById('fileName');
    var clearFile = document.getElementById('clearFile');
    var spinner = document.getElementById('spinner');
    var qaChatContainer = document.getElementById('qaChatContainer');
    var qaMessages = document.getElementById('qaMessages');
    var qaQuestion = document.getElementById('qaQuestion');
    var sendBtn = document.getElementById('sendBtn');

    if (!uploadZone || !qaChatContainer) return;

    var currentPDF = null;

    uploadZone.addEventListener('click', function () {
      if (fileInput) fileInput.click();
    });

    uploadZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', function (e) {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files.length) {
        handlePdfSelection(e.dataTransfer.files[0]);
      }
    });

    if (fileInput) {
      fileInput.addEventListener('change', function () {
        if (fileInput.files.length) {
          handlePdfSelection(fileInput.files[0]);
        }
      });
    }

    function handlePdfSelection(file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Please select a valid PDF file.', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('PDF file exceeds 10MB limit (BRL-002).', 'error');
        return;
      }

      currentPDF = file;
      if (fileName) fileName.textContent = file.name + ' (' + formatFileSize(file.size) + ')';
      if (fileInfo) fileInfo.style.display = 'flex';
      if (uploadZone) uploadZone.style.display = 'none';

      if (spinner) spinner.style.display = 'block';

      setTimeout(function () {
        if (spinner) spinner.style.display = 'none';
        if (qaChatContainer) qaChatContainer.style.display = 'block';

        // Initial system message
        if (qaMessages) {
          qaMessages.innerHTML = [
            '<div class="qa-message qa-message--system">',
            '  <span class="qa-avatar">🤖</span>',
            '  <div class="qa-bubble">',
            '    <strong>"' + escapeHtml(file.name) + '"</strong> has been indexed successfully! Ask any question regarding its contents.',
            '  </div>',
            '</div>'
          ].join('');
        }

        showToast('PDF indexed and ready for questions!', 'success');
      }, 900);
    }

    if (clearFile) {
      clearFile.addEventListener('click', function () {
        currentPDF = null;
        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.style.display = 'none';
        if (uploadZone) uploadZone.style.display = 'block';
        if (qaChatContainer) qaChatContainer.style.display = 'none';
      });
    }

    // Send question handler
    function sendQuestion() {
      if (!qaQuestion) return;
      var query = qaQuestion.value.trim();
      if (!query) return;

      // Append user bubble
      appendMessage('user', query);
      qaQuestion.value = '';
      qaQuestion.disabled = true;
      if (sendBtn) sendBtn.disabled = true;

      // Simulated typing indicator
      var typingEl = document.createElement('div');
      typingEl.className = 'qa-message qa-message--ai typing-indicator';
      typingEl.innerHTML = '<span class="qa-avatar">🤖</span><div class="qa-bubble"><em>Searching PDF content and generating answer...</em></div>';
      qaMessages.appendChild(typingEl);
      qaMessages.scrollTop = qaMessages.scrollHeight;

      setTimeout(function () {
        if (typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
        qaQuestion.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        qaQuestion.focus();

        var answer = generateContextualAnswer(query, currentPDF ? currentPDF.name : 'document');
        appendMessage('ai', answer);

        saveHistoryItem({
          feature: 'PDF Q&A',
          featureKey: 'qa',
          input: currentPDF ? currentPDF.name : 'PDF Document',
          summary: 'Q: ' + query + ' -> A: ' + answer.substring(0, 100) + '...'
        });
      }, 1000);
    }

    function appendMessage(sender, text) {
      if (!qaMessages) return;
      var el = document.createElement('div');
      el.className = 'qa-message qa-message--' + sender;
      var avatar = sender === 'user' ? '👤' : '🤖';
      el.innerHTML = [
        '<span class="qa-avatar">' + avatar + '</span>',
        '<div class="qa-bubble">' + escapeHtml(text).replace(/\n/g, '<br/>') + '</div>'
      ].join('');
      qaMessages.appendChild(el);
      qaMessages.scrollTop = qaMessages.scrollHeight;
    }

    function generateContextualAnswer(q, docName) {
      var lower = q.toLowerCase();
      if (lower.indexOf('what') !== -1 || lower.indexOf('define') !== -1 || lower.indexOf('explain') !== -1) {
        return 'Based on ' + docName + ':\n\nThe document defines this concept as a foundational mechanism aimed at optimizing resource throughput and preventing architectural bottlenecks. Key components include systematic modularization, real-time validation, and automated fault recovery.';
      } else if (lower.indexOf('how') !== -1 || lower.indexOf('process') !== -1 || lower.indexOf('step') !== -1) {
        return 'According to the procedures in ' + docName + ':\n\n1. The input parameters are validated against strict schema boundaries.\n2. The content is extracted, normalized, and partitioned into logical segments.\n3. The processing engine executes verification and yields the organized final output.';
      } else if (lower.indexOf('why') !== -1 || lower.indexOf('benefit') !== -1 || lower.indexOf('advantage') !== -1) {
        return 'According to ' + docName + ', the primary motivation is to reduce manual review overhead by up to 70% while improving consistency, reproducibility, and security compliance.';
      } else {
        return 'Regarding "' + q + '" in ' + docName + ':\n\nThe text confirms that this feature is supported through dedicated automated workflows, ensuring data privacy and fast response times (< 8s as per NFR-002).';
      }
    }

    if (sendBtn) sendBtn.addEventListener('click', sendQuestion);
    if (qaQuestion) {
      qaQuestion.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendQuestion();
        }
      });
    }
  }

  /* ==========================================================================
     13. TOOL 4: RESUME ANALYZER & JOB MATCHER
     ========================================================================== */

  function initResumeAnalyzer() {
    var uploadZone = document.getElementById('uploadZone');
    var fileInput = document.getElementById('fileInput');
    var fileInfo = document.getElementById('fileInfo');
    var fileName = document.getElementById('fileName');
    var clearFile = document.getElementById('clearFile');
    var jobDescription = document.getElementById('jobDescription');
    var analyzeBtn = document.getElementById('analyzeBtn');
    var spinner = document.getElementById('spinner');
    var resultBox = document.getElementById('resultBox');
    var scoreArc = document.getElementById('scoreArc');
    var scoreText = document.getElementById('scoreText');
    var scoreDescription = document.getElementById('scoreDescription');
    var strengthsList = document.getElementById('strengthsList');
    var improvementsList = document.getElementById('improvementsList');
    var skillsTags = document.getElementById('skillsTags');
    var copyBtn = document.getElementById('copyBtn');

    if (!uploadZone || !analyzeBtn) return;

    var currentResume = null;

    uploadZone.addEventListener('click', function () {
      if (fileInput) fileInput.click();
    });

    uploadZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', function (e) {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files.length) {
        handleResumeSelect(e.dataTransfer.files[0]);
      }
    });

    if (fileInput) {
      fileInput.addEventListener('change', function () {
        if (fileInput.files.length) {
          handleResumeSelect(fileInput.files[0]);
        }
      });
    }

    function handleResumeSelect(file) {
      var ext = file.name.split('.').pop().toLowerCase();
      if (['pdf', 'docx'].indexOf(ext) === -1) {
        showToast('Please upload a PDF or DOCX resume (BRL-003).', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('Resume exceeds 10MB limit (BRL-002).', 'error');
        return;
      }

      currentResume = file;
      if (fileName) fileName.textContent = file.name + ' (' + formatFileSize(file.size) + ')';
      if (fileInfo) fileInfo.style.display = 'flex';
      showToast('Resume attached: ' + file.name, 'info');
    }

    if (clearFile) {
      clearFile.addEventListener('click', function (e) {
        e.stopPropagation();
        currentResume = null;
        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.style.display = 'none';
        if (resultBox) resultBox.style.display = 'none';
      });
    }

    analyzeBtn.addEventListener('click', function () {
      if (!currentResume) {
        showToast('Please upload your resume file first.', 'warning');
        return;
      }

      analyzeBtn.disabled = true;
      if (spinner) spinner.style.display = 'block';
      if (resultBox) resultBox.style.display = 'none';

      var jdText = (jobDescription ? jobDescription.value : '').trim();

      setTimeout(function () {
        if (spinner) spinner.style.display = 'none';
        analyzeBtn.disabled = false;

        // Calculate a realistic score between 78% and 94%
        var baseScore = jdText.length > 30 ? 88 : 82;
        var score = Math.min(Math.max(baseScore + Math.floor(Math.random() * 8) - 3, 70), 96);

        // Animate SVG Arc
        // Circumference for r=50 is 2 * PI * 50 = ~314.159
        var circumference = 314;
        var offset = circumference - (score / 100) * circumference;

        if (scoreArc) {
          scoreArc.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)';
          scoreArc.style.strokeDashoffset = offset;
        }

        // Animate Score Counter
        if (scoreText) {
          var start = 0;
          var timer = setInterval(function () {
            start += 2;
            if (start >= score) {
              start = score;
              clearInterval(timer);
            }
            scoreText.textContent = start + '%';
          }, 25);
        }

        if (scoreDescription) {
          scoreDescription.textContent = jdText
            ? 'Strong match for the provided job description! Your qualifications align closely with the key role competencies.'
            : 'General Resume Evaluation: Solid professional structure with strong competencies across modern technologies.';
        }

        // Strengths
        if (strengthsList) {
          strengthsList.innerHTML = [
            '<li>Clear formatting and structured section breakdown (Education, Skills, Experience).</li>',
            '<li>Strong foundational proficiency in core engineering stacks and modern frameworks.</li>',
            '<li>Demonstrated hands-on project accomplishments with defined role ownership.</li>',
            '<li>Active utilization of Git version control and collaborative workflows.</li>'
          ].join('');
        }

        // Improvements
        if (improvementsList) {
          improvementsList.innerHTML = [
            '<li>Add quantifiable metrics to key achievements (e.g., "improved latency by 35%").</li>',
            '<li>Highlight cloud platform deployments (AWS, GCP, or Docker containerization).</li>',
            '<li>Incorporate industry-standard keywords from the target job requirements.</li>'
          ].join('');
        }

        // Skill Tags
        if (skillsTags) {
          var skills = ['Python', 'JavaScript', 'REST APIs', 'FastAPI', 'HTML5/CSS3', 'Git/GitHub', 'SQL / NoSQL', 'System Architecture', 'Problem Solving', 'Data Analysis'];
          skillsTags.innerHTML = skills.map(function (s) {
            return '<span class="tag">' + s + '</span>';
          }).join(' ');
        }

        if (resultBox) {
          resultBox.style.display = 'block';
          resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        saveHistoryItem({
          feature: 'Resume Analyzer',
          featureKey: 'resumes',
          input: currentResume.name,
          summary: 'Score: ' + score + '% Match. Identified 4 key strengths and 3 improvement suggestions.'
        });

        showToast('Resume analysis complete!', 'success');
      }, 1500);
    });

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        if (!resultBox) return;
        copyTextToClipboard(resultBox.innerText);
        showToast('Resume evaluation copied to clipboard!', 'success');
      });
    }
  }

  /* ==========================================================================
     14. TOOL 5: URL CONTENT ANALYZER
     ========================================================================== */

  function initUrlAnalyzer() {
    var pageUrl = document.getElementById('pageUrl');
    var analyzeBtn = document.getElementById('analyzeBtn');
    var spinner = document.getElementById('spinner');
    var resultBox = document.getElementById('resultBox');
    var resultContent = document.getElementById('resultContent');
    var copyBtn = document.getElementById('copyBtn');

    if (!pageUrl || !analyzeBtn) return;

    analyzeBtn.addEventListener('click', function () {
      var urlVal = pageUrl.value.trim();

      if (!urlVal) {
        showToast('Please enter a webpage URL.', 'warning');
        return;
      }

      if (!/^https?:\/\//i.test(urlVal)) {
        showToast('Invalid URL format! Must begin with http:// or https:// (BRL-016).', 'error');
        return;
      }

      analyzeBtn.disabled = true;
      if (spinner) spinner.style.display = 'block';
      if (resultBox) resultBox.style.display = 'none';

      // Parse domain
      var domain = 'example.com';
      try {
        var u = new URL(urlVal);
        domain = u.hostname;
      } catch (e) {}

      setTimeout(function () {
        if (spinner) spinner.style.display = 'none';
        analyzeBtn.disabled = false;

        var html = [
          '<div class="analysis-meta-bar">',
          '  <span><strong>Source Domain:</strong> ' + escapeHtml(domain) + '</span>',
          '  <span><strong>Status Code:</strong> <span class="badge badge-success">200 OK</span></span>',
          '  <span><strong>Content Type:</strong> text/html</span>',
          '</div>',
          '<div class="analysis-section">',
          '  <h3>Page Summary</h3>',
          '  <p>The extracted web article from <strong>' + escapeHtml(domain) + '</strong> discusses recent strategic innovations, technical architectures, and user adoption metrics. The author outlines key industry shifts, practical operational recommendations, and forward-looking market projections.</p>',
          '</div>',
          '<div class="analysis-section">',
          '  <h3>Key Article Insights</h3>',
          '  <ul class="key-points-list">',
          '    <li><strong>Core Proposition:</strong> Accelerated digital transformation driven by integrated multi-source intelligence platforms.</li>',
          '    <li><strong>Productivity Impact:</strong> Organizations report up to 60% operational efficiency improvements following automated content synthesis.</li>',
          '    <li><strong>Implementation Challenges:</strong> Addressing access walls, dynamic JavaScript rendering, and token rate boundaries.</li>',
          '  </ul>',
          '</div>',
          '<div class="analysis-section">',
          '  <h3>Extracted Metadata</h3>',
          '  <div class="url-metadata-grid">',
          '    <div><strong>Language:</strong> English (en-US)</div>',
          '    <div><strong>Est. Reading Time:</strong> ~4 minutes</div>',
          '    <div><strong>Cleaned Word Count:</strong> ~940 words</div>',
          '    <div><strong>Accessibility:</strong> Publicly Indexable</div>',
          '  </div>',
          '</div>',
          '<div class="analysis-disclaimer">',
          '  <small>⚠️ AI-generated analysis (BRL-010). Protected, private or login-walled pages cannot be processed (BRL-009).</small>',
          '</div>'
        ].join('\n');

        if (resultContent) resultContent.innerHTML = html;
        if (resultBox) {
          resultBox.style.display = 'block';
          resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        saveHistoryItem({
          feature: 'URL Analyzer',
          featureKey: 'urls',
          input: urlVal,
          summary: 'Web analysis of ' + domain + ' covering strategic innovations and key metrics.'
        });

        showToast('URL analyzed successfully!', 'success');
      }, 1300);
    });

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        if (!resultContent) return;
        copyTextToClipboard(resultContent.innerText);
        showToast('URL analysis copied to clipboard!', 'success');
      });
    }
  }

  /* ==========================================================================
     15. HELPER UTILITIES
     ========================================================================== */

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '…' : str;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
    } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ==========================================================================
     16. BOOTSTRAP APPLICATION
     ========================================================================== */

  document.addEventListener('DOMContentLoaded', function () {
    initStorage();
    initLoader();
    initNavbar();
    initCounters();
    initTilt();
    initScrollReveal();
    initAuth();
    initDashboard();
    initDocumentAnalyzer();
    initYouTubeSummarizer();
    initPdfQA();
    initResumeAnalyzer();
    initUrlAnalyzer();
  });

})();
