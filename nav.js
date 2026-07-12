(function () {
    // Tool Definitions
    const tools = [
        { name: '首页', path: 'index.html', icon: '🏠' },
        { name: 'JSON 格式化', path: 'json-parser.html', icon: '📑' },
        { name: '命名转换', path: 'text-case-converter.html', icon: '🔤' },
        { name: '文本转义', path: 'text_escape_formatter_final.html', icon: '↔️' },
        { name: '文本拆分', path: 'text-splitter.html', icon: '✂️' },
        { name: '正则测试', path: 'regex-tester.html', icon: '🔎' },
        { name: '时间戳转换', path: 'timestamp-converter.html', icon: '⏱️' },
        { name: 'URL 编解码', path: 'url-encoder.html', icon: '🔗' },
        { name: 'Base64', path: 'base64-encoder.html', icon: '🔐' },
        { name: '哈希摘要', path: 'hash-generator.html', icon: '🔎' },
        { name: 'JWT 解析', path: 'jwt-decoder.html', icon: '🎫' },
        { name: '随机生成', path: 'random-generator.html', icon: '🎲' },
        { name: 'Cron 解析', path: 'cron-parser.html', icon: '🕒' },
        { name: 'SQL 格式化', path: 'sql-formatter.html', icon: '🧾' },
        { name: '配置管理', path: 'tool-config-manager.html', icon: '⚙️' },
        { name: 'Neon Timer', path: 'neon-timer/dist/index.html', icon: '⏲️' }
    ];
    const NAV_CONFIG_STORAGE_KEY = 'dev-tools-nav-config-v1';
    const configurableTools = tools.filter(tool => tool.path !== 'index.html');
    const toolByPath = new Map(configurableTools.map(tool => [tool.path, tool]));

    function getDefaultNavConfig() {
        return {
            orderedPaths: configurableTools.map(tool => tool.path)
        };
    }

    function normalizeNavConfig(config) {
        if (!config || !Array.isArray(config.orderedPaths)) {
            return getDefaultNavConfig();
        }

        const seen = new Set();
        const orderedPaths = config.orderedPaths.filter(path => {
            if (!toolByPath.has(path) || seen.has(path)) return false;
            seen.add(path);
            return true;
        });

        return { orderedPaths };
    }

    function loadNavConfig() {
        try {
            const rawConfig = window.localStorage.getItem(NAV_CONFIG_STORAGE_KEY);
            if (!rawConfig) return getDefaultNavConfig();
            return normalizeNavConfig(JSON.parse(rawConfig));
        } catch (error) {
            console.warn('Failed to load navigation config.', error);
            return getDefaultNavConfig();
        }
    }

    function saveNavConfig(config) {
        window.localStorage.setItem(NAV_CONFIG_STORAGE_KEY, JSON.stringify(normalizeNavConfig(config)));
    }

    // Determine current page
    const navScript = document.currentScript || document.querySelector('script[src$="nav.js"]');
    const baseUrl = new URL('.', navScript ? navScript.src : window.location.href);
    const currentUrl = new URL(window.location.href);
    const currentPath = currentUrl.pathname.split('/').pop() || 'index.html';
    const isNeonTimer = window.location.pathname.includes('neon-timer');

    // Create Nav Elements
    const nav = document.createElement('nav');
    nav.id = 'shared-nav';

    const container = document.createElement('div');
    container.className = 'nav-container';

    // Logo / Home Link
    const logo = document.createElement('a');
    logo.href = new URL('index.html', baseUrl).href;
    logo.className = 'nav-logo';
    logo.innerHTML = '🛠️ 工具箱首页';

    // Links Container
    const linksDiv = document.createElement('div');
    linksDiv.className = 'nav-links';
    let navConfig = loadNavConfig();

    function isActiveTool(tool) {
        if (isNeonTimer && tool.path.includes('neon-timer')) return true;
        return !isNeonTimer && (currentPath === tool.path || (currentPath === '' && tool.path === 'index.html'));
    }

    function renderNavLinks() {
        linksDiv.replaceChildren();

        navConfig.orderedPaths
            .map(path => toolByPath.get(path))
            .filter(Boolean)
            .forEach(tool => {
                const a = document.createElement('a');
                const toolUrl = new URL(tool.path, baseUrl);
                a.href = toolUrl.href;
                a.className = 'nav-link';
                a.textContent = tool.name;

                if (isActiveTool(tool)) {
                    a.classList.add('active');
                }

                linksDiv.appendChild(a);
            });
    }

    function getManagerToolOrder() {
        const selectedPaths = navConfig.orderedPaths.filter(path => toolByPath.has(path));
        const selected = selectedPaths.map(path => toolByPath.get(path));
        const selectedSet = new Set(selectedPaths);
        const unselected = configurableTools.filter(tool => !selectedSet.has(tool.path));
        return selected.concat(unselected);
    }

    function saveAndRefresh(newConfig) {
        navConfig = normalizeNavConfig(newConfig);
        saveNavConfig(navConfig);
        renderNavLinks();
    }

    function renderNavManagerContent(modalBody) {
        modalBody.replaceChildren();

        const hint = document.createElement('p');
        hint.className = 'nav-manager-hint';
        hint.textContent = '勾选要显示在顶部导航中的工具，取消勾选相当于删除；已勾选工具可按住拖动图标调整顺序。配置只影响顶部导航，首页入口保持不变。';
        modalBody.appendChild(hint);

        const list = document.createElement('div');
        list.className = 'nav-manager-list';
        const selectedPaths = navConfig.orderedPaths.filter(path => toolByPath.has(path));

        function findManagerItem(path) {
            return [...list.querySelectorAll('.nav-manager-item')]
                .find(element => element.dataset.path === path);
        }

        function captureItemPositions() {
            return new Map([...list.querySelectorAll('.nav-manager-item')]
                .map(element => [element.dataset.path, element.getBoundingClientRect().top]));
        }

        function animateListReorder(previousPositions) {
            list.querySelectorAll('.nav-manager-item').forEach(element => {
                const previousTop = previousPositions.get(element.dataset.path);
                if (previousTop === undefined) return;

                const deltaY = previousTop - element.getBoundingClientRect().top;
                if (!deltaY) return;

                element.style.transition = 'none';
                element.style.transform = `translateY(${deltaY}px)`;
                requestAnimationFrame(() => {
                    element.style.transition = 'transform 160ms ease, border-color 160ms ease, background-color 160ms ease, opacity 160ms ease';
                    element.style.transform = '';
                });
            });
        }

        function reorderDraggedPath(draggedPath, targetPath, insertAfterTarget, list) {
            const currentPaths = navConfig.orderedPaths.filter(path => toolByPath.has(path));
            if (!draggedPath || draggedPath === targetPath || !currentPaths.includes(draggedPath) || !currentPaths.includes(targetPath)) {
                return false;
            }

            const nextPaths = currentPaths.filter(path => path !== draggedPath);
            const targetIndex = nextPaths.indexOf(targetPath);
            const insertIndex = targetIndex + (insertAfterTarget ? 1 : 0);
            nextPaths.splice(insertIndex, 0, draggedPath);

            if (nextPaths.join('\n') === currentPaths.join('\n')) {
                return false;
            }

            const previousPositions = captureItemPositions();
            navConfig = normalizeNavConfig({ orderedPaths: nextPaths });
            const draggedItem = findManagerItem(draggedPath);
            const targetItem = findManagerItem(targetPath);
            const nextSibling = insertAfterTarget ? targetItem.nextSibling : targetItem;
            list.insertBefore(draggedItem, nextSibling);
            animateListReorder(previousPositions);
            renderNavLinks();
            return true;
        }

        getManagerToolOrder().forEach(tool => {
            const selectedIndex = selectedPaths.indexOf(tool.path);
            const isSelected = selectedIndex >= 0;
            const item = document.createElement('div');
            item.className = 'nav-manager-item';
            item.dataset.path = tool.path;
            item.addEventListener('dragover', (event) => {
                if (!isSelected) return;
                event.preventDefault();
                item.classList.add('drag-over');
                const draggedPath = event.dataTransfer.getData('text/plain');
                const targetRect = item.getBoundingClientRect();
                const insertAfterTarget = event.clientY > targetRect.top + targetRect.height / 2;
                reorderDraggedPath(draggedPath, tool.path, insertAfterTarget, list);
            });
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });
            item.addEventListener('drop', (event) => {
                item.classList.remove('drag-over');
                if (!isSelected) return;

                event.preventDefault();
                saveNavConfig(navConfig);
                renderNavLinks();
                renderNavManagerContent(modalBody);
            });

            const label = document.createElement('label');
            label.className = 'nav-manager-check';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = isSelected;
            checkbox.addEventListener('change', () => {
                const nextPaths = navConfig.orderedPaths.filter(path => path !== tool.path);
                if (checkbox.checked) {
                    nextPaths.push(tool.path);
                }
                saveAndRefresh({ orderedPaths: nextPaths });
                renderNavManagerContent(modalBody);
            });

            const name = document.createElement('span');
            name.textContent = tool.name;

            label.appendChild(checkbox);
            label.appendChild(name);

            const dragButton = document.createElement('button');
            dragButton.type = 'button';
            dragButton.className = 'nav-manager-drag';
            dragButton.draggable = isSelected;
            dragButton.disabled = !isSelected;
            dragButton.title = isSelected ? '按住拖动调整顺序' : '勾选后可拖动排序';
            dragButton.setAttribute('aria-label', `拖动 ${tool.name} 调整顺序`);
            dragButton.textContent = '☰';
            dragButton.addEventListener('dragstart', (event) => {
                if (!isSelected) return;
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', tool.path);
                item.classList.add('dragging');
            });
            dragButton.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                list.querySelectorAll('.drag-over').forEach(element => element.classList.remove('drag-over'));
                saveNavConfig(navConfig);
            });

            item.appendChild(label);
            item.appendChild(dragButton);
            list.appendChild(item);
        });

        modalBody.appendChild(list);
    }

    function renderNavManager() {
        const existingOverlay = document.querySelector('.nav-manager-overlay');
        if (existingOverlay) existingOverlay.remove();

        const overlay = document.createElement('div');
        overlay.className = 'nav-manager-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'nav-manager-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-label', '自定义顶部导航');
        dialog.addEventListener('click', event => event.stopPropagation());

        const header = document.createElement('div');
        header.className = 'nav-manager-header';

        const title = document.createElement('h3');
        title.textContent = '自定义顶部导航';

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'nav-manager-close';
        closeButton.setAttribute('aria-label', '关闭自定义导航');
        closeButton.textContent = '×';
        closeButton.addEventListener('click', () => overlay.remove());

        header.appendChild(title);
        header.appendChild(closeButton);

        const modalBody = document.createElement('div');
        modalBody.className = 'nav-manager-body';
        renderNavManagerContent(modalBody);

        const footer = document.createElement('div');
        footer.className = 'nav-manager-footer';

        const resetButton = document.createElement('button');
        resetButton.type = 'button';
        resetButton.className = 'nav-manager-reset';
        resetButton.textContent = '恢复默认';
        resetButton.addEventListener('click', () => {
            window.localStorage.removeItem(NAV_CONFIG_STORAGE_KEY);
            navConfig = getDefaultNavConfig();
            renderNavLinks();
            renderNavManagerContent(modalBody);
        });

        const doneButton = document.createElement('button');
        doneButton.type = 'button';
        doneButton.className = 'nav-manager-done';
        doneButton.textContent = '完成';
        doneButton.addEventListener('click', () => overlay.remove());

        footer.appendChild(resetButton);
        footer.appendChild(doneButton);

        dialog.appendChild(header);
        dialog.appendChild(modalBody);
        dialog.appendChild(footer);
        overlay.appendChild(dialog);
        overlay.addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
    }

    renderNavLinks();

    linksDiv.addEventListener('wheel', (event) => {
        if (nav.classList.contains('expanded')) return;
        if (linksDiv.scrollWidth <= linksDiv.clientWidth) return;
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

        event.preventDefault();
        linksDiv.scrollLeft += event.deltaY;
    }, { passive: false });

    const expandButton = document.createElement('button');
    expandButton.type = 'button';
    expandButton.className = 'nav-expand-toggle';
    expandButton.setAttribute('aria-expanded', 'false');
    expandButton.title = '临时展开全部工具选项';
    expandButton.textContent = '展开全部';
    expandButton.addEventListener('click', () => {
        const expanded = nav.classList.toggle('expanded');
        document.body.classList.toggle('nav-expanded', expanded);
        expandButton.setAttribute('aria-expanded', String(expanded));
        expandButton.textContent = expanded ? '收起' : '展开全部';
    });

    const manageButton = document.createElement('button');
    manageButton.type = 'button';
    manageButton.className = 'nav-manage-toggle';
    manageButton.title = '自定义顶部导航工具';
    manageButton.textContent = '自定义';
    manageButton.addEventListener('click', renderNavManager);

    container.appendChild(logo);
    container.appendChild(linksDiv);
    container.appendChild(expandButton);
    container.appendChild(manageButton);
    nav.appendChild(container);

    // Prepend to body
    document.body.prepend(nav);

})();
