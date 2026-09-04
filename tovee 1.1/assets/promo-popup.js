if (!customElements.get('promo-modal')) {
  customElements.define(
    'promo-modal',
    class PromoModal extends ModalElement {
      constructor() {
        super();

        // Prevent popup on Shopify robot challenge page
        if (window.location.pathname === '/challenge' || !theme.cookiesEnabled) {
          return;
        }

        this.addEventListener('click', this.onCopyClick.bind(this));

        if (!theme.config.isTouch || Shopify.designMode) {
          this.init();
        }
        else {
          new theme.initWhenVisible(theme.utils.throttle(this.init.bind(this)));
        }
      }

      get shouldLock() {
        return true;
      }

      get testMode() {
        return this.getAttribute('data-test-mode') === 'true';
      }

      get delay() {
        return this.hasAttribute('data-delay') ? parseInt(this.getAttribute('data-delay')) : 2;
      }

      get expiry() {
        return this.hasAttribute('data-expiry') ? parseInt(this.getAttribute('data-expiry')) : 7;
      }

      get cookieName() {
        return 'ekko:promo-popup';
      }

      init() {
        if (this.initialized) return;
        this.initialized = true;

        if (this.testMode || !this.getCookie(this.cookieName)) {
          this.load(this.delay);
        }
      }

      load(delay) {
        if (Shopify.designMode) return;

        setTimeout(() => this.show(), delay * 1000);
      }

      afterHide() {
        super.afterHide();

        // Remove a cookie in case it was set in test mode
        if (this.testMode) {
          this.removeCookie(this.cookieName);
          return;
        }

        this.setCookie(this.cookieName, this.expiry);
      }

      onCopyClick(event) {
        const button = event.target.closest('[data-copy-coupon]');
        if (!button || !this.contains(button)) return;

        const box = button.closest('[data-coupon]');
        const codeElement = box ? box.querySelector('[data-coupon-code]') : null;
        const code = codeElement ? codeElement.textContent.trim() : '';
        if (!code) return;

        const feedback = () => this.showCopied(box, button);

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(feedback).catch(() => {
            if (this.fallbackCopy(code)) feedback();
          });
        }
        else if (this.fallbackCopy(code)) {
          feedback();
        }
      }

      fallbackCopy(text) {
        try {
          const area = document.createElement('textarea');
          area.value = text;
          area.setAttribute('readonly', '');
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.appendChild(area);
          area.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(area);
          return ok;
        }
        catch (e) {
          return false;
        }
      }

      showCopied(box, button) {
        const label = button.querySelector('[data-copy-text]');
        if (label && !button.dataset.originalLabel) {
          button.dataset.originalLabel = label.textContent;
        }
        if (label) {
          label.textContent = button.getAttribute('data-copied-label') || 'Copied!';
        }
        box.classList.add('copied');

        clearTimeout(this._copiedTimer);
        this._copiedTimer = setTimeout(() => {
          if (label && button.dataset.originalLabel) {
            label.textContent = button.dataset.originalLabel;
          }
          box.classList.remove('copied');
        }, 2000);
      }

      getCookie(name) {
        const match = document.cookie.match(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`);
        return match ? match[2] : null;
      }

      setCookie(name, expiry) {
        document.cookie = `${name}=true; max-age=${(expiry * 24 * 60 * 60)}; path=/`;
      }

      removeCookie(name) {
        document.cookie = `${name}=; max-age=0`;
      }
    }
  );
}
