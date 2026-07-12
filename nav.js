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

    tools.forEach(tool => {
        if (tool.path === 'index.html') return;

        const a = document.createElement('a');
        const toolUrl = new URL(tool.path, baseUrl);
        a.href = toolUrl.href;
        a.className = 'nav-link';
        a.textContent = tool.name;

        // Active State Check
        if (isNeonTimer && tool.path.includes('neon-timer')) {
            a.classList.add('active');
        } else if (!isNeonTimer && (currentPath === tool.path || (currentPath === '' && tool.path === 'index.html'))) {
            a.classList.add('active');
        }


        linksDiv.appendChild(a);
    });

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

    container.appendChild(logo);
    container.appendChild(linksDiv);
    container.appendChild(expandButton);
    nav.appendChild(container);

    // Prepend to body
    document.body.prepend(nav);

})();
