(function () {
    function getChangelogModal() {
        return document.getElementById('changelog-modal');
    }

    function showChangelog() {
        const modal = getChangelogModal();
        if (!modal) return;
        modal.style.display = 'flex';
    }

    function closeChangelog() {
        const modal = getChangelogModal();
        if (!modal) return;
        modal.style.display = 'none';
    }

    window.showChangelog = showChangelog;
    window.closeChangelog = closeChangelog;

    window.addEventListener('click', (event) => {
        const modal = getChangelogModal();
        if (modal && event.target === modal) {
            closeChangelog();
        }
    });
})();
