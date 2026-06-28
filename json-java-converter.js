(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.JsonJavaConverter = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function jsonToJava(obj) {
        const classes = [];
        const processedClasses = new Set();

        function toClassName(key) {
            if (!key || key === 'Root') return 'Root';
            return key.replace(/[^a-zA-Z0-9]/g, '')
                .replace(/^\w/, (c) => c.toUpperCase()) + 'Type';
        }

        function generateClass(name, data) {
            if (processedClasses.has(name) || typeof data !== 'object' || data === null) return;
            processedClasses.add(name);

            let classStr = `public class ${name} {\n`;
            const fields = [];
            const methods = [];

            for (const key in data) {
                const val = data[key];
                let type = 'Object';

                if (val === null) {
                    type = 'Object';
                } else if (Array.isArray(val)) {
                    if (val.length > 0) {
                        const first = val[0];
                        if (typeof first === 'object' && first !== null) {
                            const subClassName = toClassName(key);
                            generateClass(subClassName, first);
                            type = `List<${subClassName}>`;
                        } else if (typeof first === 'string') {
                            type = 'List<String>';
                        } else if (typeof first === 'number') {
                            type = Number.isInteger(first) ? 'List<Integer>' : 'List<Double>';
                        } else {
                            type = 'List<Object>';
                        }
                    } else {
                        type = 'List<Object>';
                    }
                } else if (typeof val === 'object') {
                    const subClassName = toClassName(key);
                    generateClass(subClassName, val);
                    type = subClassName;
                } else if (typeof val === 'string') {
                    type = 'String';
                } else if (typeof val === 'number') {
                    type = Number.isInteger(val) ? 'Integer' : 'Double';
                } else if (typeof val === 'boolean') {
                    type = 'Boolean';
                }

                fields.push(`    private ${type} ${key};`);
                methods.push(`    public ${type} get${key}() {\n        return ${key};\n    }`);
                methods.push(`    public void set${key}(${type} ${key}) {\n        this.${key} = ${key};\n    }`);
            }

            classStr += fields.join('\n') + '\n\n';
            classStr += `    public ${name}() {}\n\n`;
            classStr += methods.join('\n\n') + '\n\n';
            classStr += '}\n';
            classes.push(classStr);
        }

        if (Array.isArray(obj)) {
            generateClass('Root', obj[0] || {});
        } else {
            generateClass('Root', obj);
        }

        const sortedClasses = classes.sort((a, b) => {
            if (a.includes('class Root')) return 1;
            if (b.includes('class Root')) return -1;
            return 0;
        });

        const header = 'import java.util.List;\nimport java.util.ArrayList;\nimport com.fasterxml.jackson.annotation.JsonProperty;\n\n';
        return header + sortedClasses.join('\n');
    }

    function javaToJson(javaCode) {
        const classes = {};
        const classRegex = /public\s+class\s+(\w+)\s*\{([\s\S]*?)\}/g;
        let match;
        while ((match = classRegex.exec(javaCode)) !== null) {
            const className = match[1];
            const content = match[2];
            const fields = {};
            const fieldRegex = /private\s+([^\s]+)\s+([^\s;]+);/g;
            let fieldMatch;
            while ((fieldMatch = fieldRegex.exec(content)) !== null) {
                const type = fieldMatch[1];
                const name = fieldMatch[2];
                fields[name] = type;
            }
            classes[className] = fields;
        }

        if (Object.keys(classes).length === 0) {
            throw new Error('未识别到 Java 类定义');
        }

        function buildObject(className, seen = new Set()) {
            if (seen.has(className)) return {};
            seen.add(className);

            const fields = classes[className];
            if (!fields) return '新值';

            const obj = {};
            for (const name in fields) {
                const type = fields[name];
                if (type === 'Integer') {
                    obj[name] = 86600;
                } else if (type === 'Double') {
                    obj[name] = 0.0;
                } else if (type === 'String') {
                    obj[name] = '新值';
                } else if (type === 'Boolean') {
                    obj[name] = false;
                } else if (type.startsWith('List<')) {
                    const listMatch = type.match(/List<(\w+)>/);
                    if (listMatch) {
                        const innerType = listMatch[1];
                        const basicTypes = { String: '新值', Integer: 0, Double: 0.0, Boolean: false };
                        obj[name] = [basicTypes[innerType] || buildObject(innerType, new Set(seen))];
                    } else {
                        obj[name] = [];
                    }
                } else if (classes[type]) {
                    obj[name] = buildObject(type, new Set(seen));
                } else {
                    obj[name] = '新值';
                }
            }
            return obj;
        }

        const mainClassName = classes.Root ? 'Root' : Object.keys(classes).pop();
        return buildObject(mainClassName);
    }

    return {
        jsonToJava,
        javaToJson
    };
});
