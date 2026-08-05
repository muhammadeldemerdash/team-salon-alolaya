document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    var setOpen = function (isOpen) {
      nav.classList.toggle('open', isOpen);
      document.body.classList.toggle('nav-open', isOpen);
    };
    toggle.addEventListener('click', function () {
      setOpen(!nav.classList.contains('open'));
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
  }

  document.querySelectorAll('.dropdown-arrow').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var item = btn.closest('.nav-item');
      if (item) { item.classList.toggle('open'); }
    });
  });
});


/* SCROLL_TEXT_REVEAL_V1 */
(function () {
  'use strict';

  // Animate all meaningful display text in <main>, while deliberately
  // excluding paragraphs and small typography such as h5/h6, labels and notes.
  var revealSelector = [
    'main h1',
    'main h2',
    'main h3',
    'main h4',
    'main .display',
    'main .ticket .price',
    'main .package-price b'
  ].join(',');

  function wrapWords(heading) {
    var walker = document.createTreeWalker(
      heading,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          var parent = node.parentElement;
          if (!parent || parent.closest('.reveal-word')) return NodeFilter.FILTER_REJECT;
          // Never animate small/body copy, even if it sits inside a selected block.
          if (parent.closest('p, small, h5, h6, .eyebrow, .muted, .desc, .tag, .package-tag')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    var nodes = [];
    var current;
    while ((current = walker.nextNode())) nodes.push(current);

    var wordIndex = 0;
    nodes.forEach(function (textNode) {
      var pieces = textNode.nodeValue.split(/(\s+)/);
      var fragment = document.createDocumentFragment();

      pieces.forEach(function (piece) {
        if (!piece) return;
        if (/^\s+$/.test(piece)) {
          fragment.appendChild(document.createTextNode(piece));
          return;
        }

        var word = document.createElement('span');
        word.className = 'reveal-word';
        word.style.setProperty('--word-index', wordIndex++);
        word.textContent = piece;
        fragment.appendChild(word);
      });

      textNode.parentNode.replaceChild(fragment, textNode);
    });

    heading.classList.add('scroll-text-reveal', 'text-reveal-ready');
  }

  function initTextReveal() {
    var headings = Array.prototype.slice.call(document.querySelectorAll(revealSelector));
    if (!headings.length) return;

    headings.forEach(wrapWords);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      headings.forEach(function (heading) { heading.classList.add('is-revealed'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -18% 0px'
    });

    // Wait for two paint frames so the browser renders the initial hidden
    // state before IntersectionObserver adds the reveal class. This makes
    // the animation reliable for headings already visible on page load.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        headings.forEach(function (heading) {
          // Force style calculation once before observing.
          void heading.offsetWidth;
          observer.observe(heading);
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTextReveal, { once: true });
  } else {
    initTextReveal();
  }
}());
