(function(){
  if (!window.addEventListener || !document.documentElement.setAttribute || !document.querySelector || !document.documentElement.classList || !window.localStorage) {
    return
  }

  var options = INSTALL_OPTIONS;
  var isPreview = INSTALL_ID == 'preview';

  var optionsString = JSON.stringify(options);
  if (!isPreview && localStorage.welcomeBarShownWithOptions === optionsString) {
    return;
  }

  var setOptions = function(opts) {
    options = opts;

    update();
  };

  var update = function() {
    document.documentElement.setAttribute('cfapps-welcome-bar-goal', options.goal);

    updateColors();
    updateCopy();

    setPageStyles();
  };

  var colorStyle = document.createElement('style');
  document.head.appendChild(colorStyle);

  var updateColors = function() {
    colorStyle.innerHTML = '' +
      '.cfapps-welcome-bar {' +
        'background: ' + options.color + ' !important' +
      '}' +
      '.cfapps-welcome-bar .cfapps-welcome-bar-button {' +
        'color: ' + options.color + ' !important' +
      '}' +
    '';
  };

  var el = document.createElement('cfapps-welcome-bar');
  el.addEventListener('touchstart', function(){}, false); // iOS :hover CSS hack
  el.className = 'cfapps-welcome-bar';

  var updateCopy = function() {
    el.innerHTML = '' +
      '<div class="cfapps-welcome-bar-close-button"></div>' +
      '<div class="cfapps-welcome-bar-content">' +
        '<div class="cfapps-welcome-bar-text"></div>' +
        '<div class="cfapps-welcome-bar-form">' +
          '<a target="_blank" class="cfapps-welcome-bar-link">' +
            '<button class="cfapps-welcome-bar-button"></button>' +
          '</a>' +
        '</div>' +
      '</div>' +
      '<div class="cfapps-welcome-bar-branding">' +
        '<a class="cfapps-welcome-bar-branding-link" href="https://www.cloudflare.com/apps?utm_source=lead_line_powered_by_link" target="_blank">Powered by Cloudflare Apps</a>' +
      '</div>' +
    '';

    var textEl = el.querySelector('.cfapps-welcome-bar-text')
    textEl.innerHTML = options.text || ' ';

    var buttonEl = el.querySelector('.cfapps-welcome-bar-button')
    buttonEl.innerHTML = options.buttonText || '&nbsp;';

    var linkEl;
    linkEl = el.querySelector('.cfapps-welcome-bar-link')
    linkEl.setAttribute('href', options.linkAddress);

    el.querySelector('.cfapps-welcome-bar-close-button').addEventListener('click', hide);
    linkEl.addEventListener('click', hide);
  }

  var htmlStyle = document.createElement('style');
  document.head.appendChild(htmlStyle);

  var show = function() {
    document.documentElement.setAttribute('cfapps-welcome-bar-show', 'true');

    if (!htmlStyle.parentNode){
      document.head.appendChild(htmlStyle);
    }
  };
  show();

  var isShown = function() {
    return document.documentElement.getAttribute('cfapps-welcome-bar-show') === 'true';
  };

  var hide = function() {
    document.documentElement.setAttribute('cfapps-welcome-bar-show', 'false');
    document.head.removeChild(htmlStyle);
    try {
      localStorage.welcomeBarShownWithOptions = optionsString;
    } catch (e) {}
    setPageStyles();
  };

  var setPageStyles = function() {
    setHTMlStyle();
    setFixedElementStyles();
  };

  var documentElementOriginallyPositionStatic = getComputedStyle(document.documentElement).position === 'static';
  var setHTMlStyle  = function() {
    if (!document.body) return;

    var style = '';
    if (documentElementOriginallyPositionStatic && isShown()) {
      var positionStyle = '';
      style = '' +
        'html {' +
          'position: relative;' +
          'top: ' + el.clientHeight + 'px' +
        '}' +
      '';
    }
    htmlStyle.innerHTML = style;
  };

  var setFixedElementStyles = function() {
    var removeTopStyle = function(node) {
      if (!node.getAttribute('style')) return;
      node.setAttribute('style', node.getAttribute('style').replace(/top[^;]+;?/g, ''));
    };

    // Cache this to minimize potential repaints
    var elHeight = el.clientHeight;

    // Find fixed position nodes to adjust
    var allNodes = document.querySelectorAll('*:not(.cfapps-welcome-bar):not([data-cfapps-welcome-bar-adjusted-fixed-element-original-top])');
    Array.prototype.forEach.call(allNodes, function(node) {
      var computedStyle = getComputedStyle(node);
      var boundingClientRect = node.getBoundingClientRect();

      var isSticky = computedStyle.position === 'sticky';
      var isFixed = computedStyle.position === 'fixed';
      var isBottomFixed = computedStyle.bottom === '0px' && boundingClientRect.bottom === window.innerHeight && boundingClientRect.top >= elHeight;

      if ((isFixed || isSticky) && !isBottomFixed) {
        var top = boundingClientRect.top;
        var styleTop = parseInt(computedStyle.top, 10);
        if (isSticky || (top === styleTop && top <= elHeight)) {
          node.setAttribute('data-cfapps-welcome-bar-adjusted-fixed-element-original-top', top);
        }
      }
    });

    // Adjust them
    var adjustedNodes = document.querySelectorAll('[data-cfapps-welcome-bar-adjusted-fixed-element-original-top]');
    Array.prototype.forEach.call(adjustedNodes, function(node) {
      removeTopStyle(node);
      var computedStyle = getComputedStyle(node);
      var isFixedOrSticky = computedStyle.position === 'fixed' || computedStyle.position === 'sticky';
      if (isFixedOrSticky && isShown() && elHeight > 0) {
        var newTop = (parseInt(computedStyle.top, 10) || 0) + elHeight;
        node.style.top = newTop + 'px';
      }
    });
  };

  window.addEventListener('resize', setPageStyles);

  document.addEventListener('DOMContentLoaded', function(){
    document.body.appendChild(el);

    update();

    setTimeout(setPageStyles, 0);
  });

  window.CloudflareWelcomeBar = {
    setOptions: setOptions,
    show: show,
    hide: hide
  };
})();
