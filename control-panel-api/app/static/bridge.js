(function () {
  if (window.__SANDBOX_BRIDGE_ACTIVE) return;
  window.__SANDBOX_BRIDGE_ACTIVE = true;

  // The bridge is loaded via the proxy, so parent origin is the proxy origin
  var PARENT_ORIGIN = "*"; // We accept commands from any parent since the proxy controls injection

  var clickListener = null;
  var inputListener = null;
  var stepIndex = 0;

  // Buffer for navigation-only click detection:
  // Clicks on <a> tags or form submit buttons are held briefly.
  // If a URL change follows, the click was navigation-only and is discarded.
  // If no URL change, the click is flushed as a normal captured step.
  var pendingNavClick = null;
  var pendingNavTimer = null;

  function flushPendingNavClick() {
    if (pendingNavClick) {
      window.parent.postMessage({ type: "step-captured", step: pendingNavClick }, "*");
      pendingNavClick = null;
    }
    if (pendingNavTimer) {
      clearTimeout(pendingNavTimer);
      pendingNavTimer = null;
    }
  }

  function discardPendingNavClick() {
    if (pendingNavClick) {
      stepIndex--; // reclaim the index
      pendingNavClick = null;
    }
    if (pendingNavTimer) {
      clearTimeout(pendingNavTimer);
      pendingNavTimer = null;
    }
  }

  function isNavigationElement(target) {
    // Click is inside an <a> with href
    if (target.closest && target.closest("a[href]")) return true;
    // Click is on a submit-like element inside a form
    if (target.closest && target.closest("form")) {
      var btn = target.closest("button, input[type='submit']");
      if (btn) return true;
    }
    return false;
  }

  function getCssPath(el) {
    var parts = [];
    var current = el;
    while (current && current !== document.body && current !== document.documentElement) {
      var selector = current.tagName.toLowerCase();
      if (current.parentElement) {
        var siblings = Array.from(current.parentElement.children).filter(
          function (c) { return c.tagName === current.tagName; }
        );
        if (siblings.length > 1) {
          var index = siblings.indexOf(current) + 1;
          selector += ":nth-of-type(" + index + ")";
        }
      }
      parts.unshift(selector);
      current = current.parentElement;
    }
    return parts.join(" > ");
  }

  function getSelector(el) {
    // Priority 1: data-testid on element or nearest ancestor
    var current = el;
    while (current) {
      var testId = current.getAttribute("data-testid");
      if (testId) {
        return {
          selector: '[data-testid="' + testId + '"]',
          fallbackSelectors: [getCssPath(el)]
        };
      }
      current = current.parentElement;
    }
    // Priority 2: CSS path
    return { selector: getCssPath(el), fallbackSelectors: [] };
  }

  function getRect(el) {
    var rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left
    };
  }

  // Poll for an element by selector (+ fallbacks) until found or timeout
  function findElement(selector, fallbackSelectors, timeout, callback) {
    function tryFind() {
      var el = document.querySelector(selector);
      if (!el && fallbackSelectors) {
        for (var i = 0; i < fallbackSelectors.length; i++) {
          el = document.querySelector(fallbackSelectors[i]);
          if (el) break;
        }
      }
      return el;
    }

    var el = tryFind();
    if (el) return callback(el);

    var start = Date.now();
    var poll = setInterval(function () {
      el = tryFind();
      if (el) {
        clearInterval(poll);
        callback(el);
      } else if (Date.now() - start > timeout) {
        clearInterval(poll);
        callback(null);
      }
    }, 200);
  }

  // Track URL changes from in-app navigation (pushState, replaceState, popstate, click-driven)
  var lastKnownPath = window.location.pathname + window.location.search;

  function notifyUrlChange() {
    var currentPath = window.location.pathname + window.location.search;
    if (currentPath !== lastKnownPath) {
      lastKnownPath = currentPath;
      // URL changed — if a nav click was buffered, it was navigation-only; discard it
      discardPendingNavClick();
      window.parent.postMessage({ type: "url-changed", path: window.location.pathname, search: window.location.search }, "*");
    }
  }

  // Patch pushState and replaceState to detect SPA navigations
  var origPushState = history.pushState;
  history.pushState = function () {
    origPushState.apply(this, arguments);
    notifyUrlChange();
  };
  var origReplaceState = history.replaceState;
  history.replaceState = function () {
    origReplaceState.apply(this, arguments);
    notifyUrlChange();
  };
  window.addEventListener("popstate", notifyUrlChange);

  // Poll as a fallback for navigations we can't intercept (e.g. Next.js soft nav)
  setInterval(notifyUrlChange, 500);

  // Notify parent that bridge is ready — wait for DOM to be interactive so React can hydrate
  function sendBridgeReady() {
    window.parent.postMessage({ type: "bridge-ready", path: window.location.pathname }, "*");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sendBridgeReady);
  } else {
    sendBridgeReady();
  }

  window.addEventListener("message", function (event) {
    var data = event.data || {};
    var type = data.type;

    if (type === "start-capture") {
      // Remove existing listeners if any
      if (clickListener) document.removeEventListener("click", clickListener, true);
      if (inputListener) document.removeEventListener("change", inputListener, true);
      stepIndex = 0;

      clickListener = function (e) {
        var target = e.target;
        if (!target || !target.tagName) return;
        // Flush any previously buffered nav click before processing new click
        flushPendingNavClick();
        var info = getSelector(target);
        var step = {
          index: stepIndex++,
          timestamp: Date.now(),
          url: window.location.pathname,
          selector: info.selector,
          fallbackSelectors: info.fallbackSelectors,
          elementTag: target.tagName,
          elementText: (target.textContent || "").trim().slice(0, 100),
          pageTitle: document.title,
          action: "click"
        };
        if (isNavigationElement(target)) {
          // Buffer the click — if a URL change follows, discard it (navigation-only)
          pendingNavClick = step;
          pendingNavTimer = setTimeout(flushPendingNavClick, 500);
        } else {
          window.parent.postMessage({ type: "step-captured", step: step }, "*");
        }
      };

      inputListener = function (e) {
        var target = e.target;
        if (!target) return;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && !target.isContentEditable) return;
        var info = getSelector(target);
        var step = {
          index: stepIndex++,
          timestamp: Date.now(),
          url: window.location.pathname,
          selector: info.selector,
          fallbackSelectors: info.fallbackSelectors,
          elementTag: target.tagName,
          elementText: "",
          pageTitle: document.title,
          action: "input",
          inputValue: target.value || target.textContent || "",
          inputType: target.type || "text"
        };
        window.parent.postMessage({ type: "step-captured", step: step }, "*");
      };

      document.addEventListener("click", clickListener, true);
      document.addEventListener("change", inputListener, true);
      window.parent.postMessage({ type: "capture-started" }, "*");
    }

    if (type === "stop-capture") {
      if (clickListener) {
        document.removeEventListener("click", clickListener, true);
        clickListener = null;
      }
      if (inputListener) {
        document.removeEventListener("change", inputListener, true);
        inputListener = null;
      }
      window.parent.postMessage({ type: "capture-stopped" }, "*");
    }

    if (type === "replay-click") {
      var selector = data.selector;
      var fallbackSelectors = data.fallbackSelectors;
      var index = data.index;

      findElement(selector, fallbackSelectors, 5000, function (el) {
        if (el) {
          var rect = getRect(el);
          el.scrollIntoView({ behavior: "smooth", block: "center" });

          // Send location for overlay
          window.parent.postMessage({
            type: "replay-click-location",
            x: rect.x, y: rect.y, width: rect.width, height: rect.height,
            index: index
          }, "*");

          setTimeout(function () {
            el.click();
            setTimeout(function () {
              window.parent.postMessage(
                { type: "replay-click-done", index: index, success: true }, "*"
              );
            }, 300);
          }, 500);
        } else {
          window.parent.postMessage(
            { type: "replay-click-done", index: index, success: false, error: "Element not found" }, "*"
          );
        }
      });
    }

    if (type === "replay-input") {
      var selector2 = data.selector;
      var fallbackSelectors2 = data.fallbackSelectors;
      var value = data.value;
      var index2 = data.index;

      findElement(selector2, fallbackSelectors2, 5000, function (el2) {
        if (el2) {
          var rect2 = getRect(el2);
          el2.scrollIntoView({ behavior: "smooth", block: "center" });

          window.parent.postMessage({
            type: "replay-click-location",
            x: rect2.x, y: rect2.y, width: rect2.width, height: rect2.height,
            index: index2
          }, "*");

          el2.focus();
          // Use native setter for React compatibility
          var nativeSetter =
            Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value") ||
            Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
          if (nativeSetter && nativeSetter.set) {
            nativeSetter.set.call(el2, value);
          } else {
            el2.value = value;
          }
          el2.dispatchEvent(new Event("input", { bubbles: true }));
          el2.dispatchEvent(new Event("change", { bubbles: true }));

          setTimeout(function () {
            window.parent.postMessage(
              { type: "replay-input-done", index: index2, success: true }, "*"
            );
          }, 300);
        } else {
          window.parent.postMessage(
            { type: "replay-input-done", index: index2, success: false, error: "Element not found" }, "*"
          );
        }
      });
    }

    if (type === "navigate") {
      var url = data.url;
      // If already at the right path, just confirm immediately
      if (window.location.pathname === url) {
        window.parent.postMessage({ type: "navigate-done", url: url }, "*");
      } else {
        window.location.href = url;
        var check = setInterval(function () {
          if (window.location.pathname === url) {
            clearInterval(check);
            window.parent.postMessage({ type: "navigate-done", url: url }, "*");
          }
        }, 100);
        setTimeout(function () { clearInterval(check); }, 5000);
      }
    }
  });
})();
