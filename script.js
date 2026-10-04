// ============================================================
   Mother Talk - JavaScript Interactivity
   ============================================================

/* ============================================================
   Mobile Navigation Toggle
   ============================================================ */
const menuBtn = document.querySelector('.menu-btn');
const navLinks = document.querySelectorAll('.nav-link');

if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    // Mobile nav functionality can be expanded here
    menuBtn.setAttribute('aria-expanded', 
      menuBtn.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
  });
}

/* ============================================================
   Feature Card Hover Effect
   ============================================================ */
const featureCards = document.querySelectorAll('.feature-card');

featureCards.forEach(card => {
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-4px)';
    card.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)';
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.boxShadow = '';
  });
});

/* ============================================================
   Artifact Card Hover Effect
   ============================================================ */
const artifactCards = document.querySelectorAll('.artifact-card');

artifactCards.forEach(card => {
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-4px)';
    card.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)';
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.boxShadow = '';
  });
});

/* ============================================================
   Coloring Item Hover Effect
   ============================================================ */
const coloringItems = document.querySelectorAll('.coloring-item');

coloringItems.forEach(item => {
  item.addEventListener('mouseenter', () => {
    item.style.transform = 'translateY(-2px)';
    item.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
  });

  item.addEventListener('mouseleave', () => {
    item.style.transform = '';
    item.style.boxShadow = '';
  });
});

/* ============================================================
   Color Palette Selection
   ============================================================ */
const colorSquares = document.querySelectorAll('.color-square');

colorSquares.forEach(square => {
  square.addEventListener('click', () => {
    // Remove active from all squares
    colorSquares.forEach(s => s.classList.remove('active'));
    // Add active to clicked
    square.classList.add('active');
  });
});

/* ============================================================
   Brush Size Selection
   ============================================================ */
const btnSmall = document.querySelectorAll('.btn-small');

btnSmall.forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active from all buttons
    btnSmall.forEach(b => b.classList.remove('active'));
    // Add active to clicked
    btn.classList.add('active');
  });
});

/* ============================================================
   Reset Coloring Page
   ============================================================ */
const btnReset = document.querySelector('.btn-reset');

if (btnReset) {
  btnReset.addEventListener('click', () => {
    // Reset all color squares
    colorSquares.forEach(s => s.classList.remove('active'));
    // Reset brush size
    btnSmall.forEach(b => b.classList.remove('active'));
    btnSmall.forEach(b => {
      if (b.dataset.size === 'medium') b.classList.add('active');
    });
  });
}

/* ============================================================
   Smooth Scroll for Anchor Links
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

/* ============================================================
   Active Navigation Link Highlight
   ============================================================ */
const sections = document.querySelectorAll('section');

const highlightNav = () => {
  let scrollPos = window.scrollY + 100;
  
  sections.forEach(section => {
    const top = section.offsetTop;
    const bottom = top + section.offsetHeight;
    const id = section.getAttribute('id');
    
    if (scrollPos >= top && scrollPos <= bottom) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${id}` || 
            (id === '' && link.getAttribute('href') === 'index.html') ||
            (id === 'artifacts' && link.getAttribute('href') === 'artifact.html') ||
            (id === 'coloring' && link.getAttribute('href') === 'coloring.html')) {
          link.classList.add('active');
        }
      });
    }
  });
};

window.addEventListener('scroll', highlightNav);
window.addEventListener('load', highlightNav);

/* ============================================================
   Download Button Animation
   ============================================================ */
const btnDownload = document.querySelector('.btn-download');

if (btnDownload) {
  btnDownload.addEventListener('click', () => {
    btnDownload.textContent = 'Downloading...';
    setTimeout(() => {
      btnDownload.textContent = 'Download';
    }, 2000);
  });
}

/* ============================================================
   Reduce Motion Respect
   ============================================================ */
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.style.setProperty('--scroll-behavior', 'auto', 'important');
}