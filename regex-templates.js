(function (root) {
    const templates = [
        {
            id: 'phone',
            name: '手机号脱敏',
            description: '匹配中国大陆手机号，并用替换文本保留前 4 位和后 4 位。',
            sample: '13800138000\n15912345678\n18600001111\n19999999999\n14712345678',
            pattern: '^(1[3-9]\\d{2})\\d{3}(\\d{4})$',
            replacement: '$1***$2',
            flags: 'gm'
        },
        {
            id: 'url',
            name: 'URL 地址',
            description: '匹配 http 或 https URL，适合从日志、配置和文档中提取链接。',
            sample: '官网：https://example.com/docs?id=100\n本地：http://localhost:8080/api/users\n无效：ftp://example.com/file',
            pattern: '\\bhttps?:\\/\\/[^\\s"\'<>]+',
            replacement: '[$&]',
            flags: 'gm'
        },
        {
            id: 'jdbc',
            name: 'JDBC 连接串',
            description: '匹配常见 JDBC URL，包括 MySQL、PostgreSQL、Oracle、SQL Server 等。',
            sample: 'URL: jdbc:mysql://demo.mysql.dbdns.cn:6446/schema?useUnicode=true&characterEncoding=utf8&useSSL=false&connectTimeout=10000&socketTimeout=600000\nuser: somdbdev',
            pattern: '(jdbc:mysql://[^,\\s]+|jdbc:postgresql://[^,\\s]+|jdbc:tdsql-mysql://[^,\\s]+|jdbc:gaussdb://[^,\\s]+|jdbc:opengauss://[^,\\s]+|jdbc:olap://[^,\\s]+|jdbc:oracle:(thin|oci):@[^,\\s]*|jdbc:sqlserver://[^,\\s]+)',
            replacement: '$1',
            flags: 'gm'
        },
        {
            id: 'ipv4',
            name: 'IPv4 地址',
            description: '匹配 0.0.0.0 到 255.255.255.255 范围内的 IPv4 地址。',
            sample: 'server 10.85.146.143:21001\nbackup 192.168.1.10\ninvalid 999.1.1.1',
            pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)\\b',
            replacement: '$&',
            flags: 'gm'
        },
        {
            id: 'email',
            name: '邮箱地址',
            description: '匹配常见邮箱格式，适合批量提取联系人邮箱。',
            sample: 'owner: dev@example.com\nnotify: ops-team@corp.example.cn\nbad: user@@example',
            pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b',
            replacement: '$&',
            flags: 'gmi'
        },
        {
            id: 'log-time',
            name: '日志时间',
            description: '匹配常见日志时间戳，例如 2026-06-26 10:30:45,123。',
            sample: '2026-06-26 10:30:45 INFO started\n2026-06-26 10:31:12,345 ERROR failed',
            pattern: '\\b\\d{4}-\\d{2}-\\d{2}[ T]\\d{2}:\\d{2}:\\d{2}(?:[.,]\\d{3})?\\b',
            replacement: '[$&]',
            flags: 'gm'
        },
        {
            id: 'stack',
            name: '异常堆栈行',
            description: '匹配 Java 堆栈里的 at 行，便于提取类名、方法和行号。',
            sample: 'java.lang.RuntimeException: failed\n\tat com.mysql.ConnectionFactoryImpl.create(ConnectionFactoryImpl.java:87)\n\tat com.huawei.demo.Main.main(Main.java:21)',
            pattern: '^\\s*at\\s+([\\w.$]+)\\(([^:()]+):(\\d+)\\)$',
            replacement: '$1 第 $3 行',
            flags: 'gm'
        }
    ];

    function getTemplateById(id) {
        return templates.find((template) => template.id === id) || null;
    }

    const api = {
        templates,
        getTemplateById
    };

    root.RegexTemplates = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
