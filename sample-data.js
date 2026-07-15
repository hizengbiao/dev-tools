(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.SampleData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const SAMPLES = [
        {
            id: 'sql.basicSelect',
            group: 'sql',
            name: '基础 SELECT',
            value: 'select id,name from users where id=? and status=:status order by created_at desc',
        },
        {
            id: 'cron.linuxEveryThirtyMinutes',
            group: 'cron',
            name: 'Linux 每 30 分钟',
            value: '*/30 * * * *',
        },
        {
            id: 'cron.quartzDailyNoon',
            group: 'cron',
            name: 'Quartz 每天中午',
            value: '0 0 12 * * ?',
        },
        {
            id: 'json.nestedExample',
            group: 'json',
            name: '嵌套 JSON 示例',
            value: JSON.stringify({
                service: {
                    name: 'demo-service',
                    enabled: true,
                    ports: [8080, 8443],
                },
                instances: [
                    { id: 'node-01', status: 'running' },
                    { id: 'node-02', status: 'stopped' },
                ],
                metadataJson: '{"owner":"team-a","retry":3}',
            }, null, 4),
        },
    ];

    function getSample(id) {
        const sample = SAMPLES.find((item) => item.id === id);
        if (!sample) {
            throw new Error(`Unknown sample: ${id}`);
        }
        return sample.value;
    }

    function listSamples(group) {
        return SAMPLES
            .filter((item) => !group || item.group === group)
            .map((item) => ({ ...item }));
    }

    return {
        SAMPLES,
        getSample,
        listSamples,
    };
});
