(function () {
    let lastFocusedElement = null;

    function getChangelogModal() {
        return document.getElementById('changelog-modal');
    }

    function getChangelogTrigger() {
        return document.querySelector('.version-info');
    }

    function prepareChangelogTrigger(trigger) {
        if (!trigger) return;
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('tabindex', '0');
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-controls', 'changelog-modal');
    }

    function prepareChangelogModal(modal) {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', modal.style.display === 'flex' ? 'false' : 'true');

        const title = modal.querySelector('.changelog-header h3');
        if (title) {
            title.id = title.id || 'changelog-title';
            modal.setAttribute('aria-labelledby', title.id);
        }

        const closeButton = modal.querySelector('.changelog-close');
        if (closeButton && !closeButton.getAttribute('aria-label')) {
            closeButton.setAttribute('aria-label', '关闭版本更新说明');
        }
    }

    function showChangelog() {
        const modal = getChangelogModal();
        if (!modal) return;
        prepareChangelogModal(modal);
        const trigger = getChangelogTrigger();
        prepareChangelogTrigger(trigger);
        lastFocusedElement = document.activeElement && document.activeElement !== document.body
            ? document.activeElement
            : trigger;
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');

        const body = modal.querySelector('.changelog-body');
        if (body) body.scrollTop = 0;

        const closeButton = modal.querySelector('.changelog-close');
        if (closeButton) requestAnimationFrame(() => closeButton.focus());
    }

    function closeChangelog() {
        const modal = getChangelogModal();
        if (!modal || modal.style.display !== 'flex') return;
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');

        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
            lastFocusedElement.focus();
        }
        lastFocusedElement = null;
    }

    window.showChangelog = showChangelog;
    window.closeChangelog = closeChangelog;

    window.addEventListener('click', (event) => {
        const modal = getChangelogModal();
        if (modal && event.target === modal) {
            closeChangelog();
        }
    });

    document.addEventListener('keydown', (event) => {
        const trigger = event.target.closest && event.target.closest('.version-info');
        if (trigger && trigger.tagName !== 'BUTTON' && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            showChangelog();
            return;
        }
        if (event.key === 'Escape') closeChangelog();
    });

    function prepareChangelogUi() {
        const modal = getChangelogModal();
        if (modal) prepareChangelogModal(modal);
        prepareChangelogTrigger(getChangelogTrigger());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', prepareChangelogUi, { once: true });
    } else {
        prepareChangelogUi();
    }
})();
