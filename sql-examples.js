(function (root) {
    const examples = [
        {
            id: 'select', category: '查询', title: '条件查询与分页',
            description: '按租户筛选记录，按唯一编号稳定排序，再取前 20 条。',
            sql: "SELECT id, notice_name, notice_code\nFROM demo_notice\nWHERE tenant_id = 'TENANT_DEMO'\nORDER BY id DESC\nLIMIT 20 OFFSET 0;"
        },
        {
            id: 'insert', category: '插入', title: '批量插入多条记录',
            description: '显式列出字段，每组 VALUES 的值与字段顺序一一对应。',
            sql: "INSERT INTO demo_api_config (tenant_id, api_config, api_type, config_type)\nVALUES\n    ('TENANT_DEMO', '/demo/events?eventId=', 'LIVE', 'EVENT'),\n    ('TENANT_DEMO', '/demo/customers', 'LIVE', 'CUSTOMER_SYNC');"
        },
        {
            id: 'ignore', category: '插入', title: 'INSERT IGNORE：跳过重复键',
            description: '从模板账号复制角色。重复由 PRIMARY KEY / UNIQUE 索引判断，例如 (user_id, role_id) 联合唯一索引；没有唯一约束就不能自动去重。',
            note: 'IGNORE 还可能将部分数据错误降为警告，不只是跳过重复键；执行后检查 SHOW WARNINGS。',
            sql: "SET @target_user_id = 1001;\nSET @template_user_id = 2001;\n\nINSERT IGNORE INTO demo_user_role (user_id, role_id)\nSELECT @target_user_id, role_id\nFROM demo_user_role\nWHERE user_id = @template_user_id;\n\nSHOW WARNINGS;"
        },
        {
            id: 'update', category: '更新与删除', title: '按条件更新',
            description: '先用相同 WHERE 查询确认范围，再更新指定租户的一条业务配置。',
            sql: "SELECT * FROM demo_notice\nWHERE tenant_id = 'TENANT_DEMO' AND notice_code = 'NOTICE_OLD';\n\nUPDATE demo_notice\nSET notice_name = '示例提醒', notice_code = 'NOTICE_NEW'\nWHERE tenant_id = 'TENANT_DEMO' AND notice_code = 'NOTICE_OLD';"
        },
        {
            id: 'delete', category: '更新与删除', title: '按条件删除（谨慎操作）',
            description: '先检查待删除记录。省略 WHERE 会删除表内全部记录。',
            note: '事务示例仅适用于支持事务的表（如 InnoDB）；这里默认 ROLLBACK。核对影响行数后，实际操作时再决定是否改为 COMMIT。',
            sql: "SELECT * FROM demo_currency\nWHERE tenant_id = 'TENANT_DEMO' AND currency_code = 'DEMO';\n\nSTART TRANSACTION;\nDELETE FROM demo_currency\nWHERE tenant_id = 'TENANT_DEMO' AND currency_code = 'DEMO';\nSELECT ROW_COUNT() AS deleted_rows;\nROLLBACK; -- 确认需要保留删除结果时，改为 COMMIT"
        },
        {
            id: 'primary', category: '表结构', title: '删除、添加与替换主键',
            description: '以下展示分步操作和合并操作两种替代写法，选择其中一种。新主键列必须无 NULL，组合值必须唯一。',
            note: '先检查现有主键、外键引用及 AUTO_INCREMENT 依赖。DDL 通常会隐式提交，不能依靠 ROLLBACK 撤销。',
            sql: "SHOW CREATE TABLE demo_api_config;\n\n-- 写法一：分步操作（仅适用于允许单独删除主键的表）\nALTER TABLE demo_api_config DROP PRIMARY KEY;\nALTER TABLE demo_api_config\n    ADD PRIMARY KEY (tenant_id, api_type, config_type);\n\n-- 写法二：合并操作，与写法一二选一\nALTER TABLE demo_api_config\n    DROP PRIMARY KEY,\n    ADD PRIMARY KEY (tenant_id, api_type, config_type);"
        },
        {
            id: 'columns', category: '表结构', title: 'MODIFY / CHANGE：修改字段与重命名',
            description: 'MODIFY 可以修改类型及列属性，但不能重命名；CHANGE 可以重命名，也可以修改类型及列属性（不重命名时旧、新列名写相同值）。',
            note: '两者都要写出需要保留的完整列定义，如 NULL / NOT NULL、DEFAULT、COMMENT、字符集等；省略的旧属性可能丢失。主键、唯一索引另用索引语法管理。',
            sql: "-- 修改类型、字符集、排序规则与可空属性\nALTER TABLE demo_api_config\n    MODIFY COLUMN api_config VARCHAR(100)\n    CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL;\n\n-- CHANGE 同名修改：可以修改类型、NOT NULL 和注释\nALTER TABLE demo_api_config\n    CHANGE COLUMN config_type config_type VARCHAR(50) NOT NULL COMMENT '配置类型';\n\n-- CHANGE 同时重命名和修改定义（与上面的示例独立使用）\nALTER TABLE demo_api_config\n    CHANGE COLUMN config_type category_code VARCHAR(60) NOT NULL COMMENT '配置分类';\n\n-- MySQL 8.0+：只重命名，不重写定义\nALTER TABLE demo_api_config RENAME COLUMN api_config TO endpoint_config;"
        },
        {
            id: 'add-column', category: '表结构', title: '新增字段与默认值',
            description: 'ADD COLUMN 是新增字段；已有字段的属性修改使用 MODIFY / CHANGE。',
            sql: "ALTER TABLE demo_notice\n    ADD COLUMN delivery_flag VARCHAR(10)\n    CHARACTER SET utf8mb4 COLLATE utf8mb4_bin\n    DEFAULT NULL COMMENT '示例发送标志';"
        },
        {
            id: 'auto-increment', category: '表结构', title: '添加自增主键',
            description: '优先在同一条 ALTER 中新增自增列并建立主键，避免先添加普通非空列后，已有记录得到重复值导致建主键失败。',
            note: '以下两种方案二选一。表必须没有其他主键及自增列；已有列方案要求 error_id 已存在、非 NULL、唯一，且数据能转换为 BIGINT UNSIGNED。先备份并检查外键依赖。',
            sql: "-- 方案一：error_id 尚不存在，且表没有主键和自增列\nALTER TABLE demo_error_log\n    ADD COLUMN error_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY;\n\n-- 方案二：error_id 已存在时，先检查数据\nSELECT error_id, COUNT(*) AS duplicate_count\nFROM demo_error_log\nGROUP BY error_id\nHAVING error_id IS NULL OR COUNT(*) > 1;\n\n-- 检查无问题后，为已有列设置自增主键\nALTER TABLE demo_error_log\n    MODIFY COLUMN error_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\n    ADD PRIMARY KEY (error_id);"
        },
        {
            id: 'variables', category: '变量与角色', title: '会话变量：复制账号角色',
            description: '@变量在当前数据库连接内有效。账号应有唯一约束；子查询查不到时变量为 NULL，返回多行会报错，应先核对查询结果。',
            note: '用户、账号、角色与表名均为虚构值。复制前确认目标账号和模板账号，demo_user_role 需有 (user_id, role_id) 唯一索引。',
            sql: "SET @target_account = 'ACCOUNT_DEMO_A';\nSET @template_account = 'ACCOUNT_DEMO_B';\n\nSET @target_user_id = (SELECT id FROM demo_user WHERE account_code = @target_account);\nSET @template_user_id = (SELECT id FROM demo_user WHERE account_code = @template_account);\n\nSELECT @target_user_id AS target_user_id, @template_user_id AS template_user_id;\n\nINSERT IGNORE INTO demo_user_role (user_id, role_id)\nSELECT @target_user_id, role_id\nFROM demo_user_role\nWHERE user_id = @template_user_id\n  AND @target_user_id IS NOT NULL\n  AND @template_user_id IS NOT NULL;\nSHOW WARNINGS;"
        },
        {
            id: 'roles', category: '变量与角色', title: '会话变量：分配指定角色',
            description: '按角色编码查询 ID，再给目标账号分配两个示例角色。用 SELECT 展示变量值以便核对。',
            note: '角色编码应唯一；未查到的角色不会插入。此处以只读和编辑角色为例，不包含真实权限编码或密码数据。',
            sql: "SET @target_account = 'ACCOUNT_DEMO_A';\nSET @reader_code = 'DEMO_READER';\nSET @editor_code = 'DEMO_EDITOR';\n\nSET @target_user_id = (SELECT id FROM demo_user WHERE account_code = @target_account);\nSET @reader_id = (SELECT id FROM demo_role WHERE code = @reader_code);\nSET @editor_id = (SELECT id FROM demo_role WHERE code = @editor_code);\n\nSELECT @target_user_id, @reader_id, @editor_id;\n\nINSERT IGNORE INTO demo_user_role (user_id, role_id)\nSELECT @target_user_id, @reader_id\nWHERE @target_user_id IS NOT NULL AND @reader_id IS NOT NULL\nUNION ALL\nSELECT @target_user_id, @editor_id\nWHERE @target_user_id IS NOT NULL AND @editor_id IS NOT NULL;\nSHOW WARNINGS;"
        }
    ];
    const api = { examples };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.SqlExamples = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
