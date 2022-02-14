var knownProps = JSON.parse(String(fs.readFileSync("resources\\app\\piepieonline\\extractedData\\knownProps.json")))

function createSchema(template) {
    const schemaTemplate = {
        uri: 'http://piepieonlinedummy/template-schema.json',
        fileMatch: ['*'],
        schema: {
            type: 'object',
            properties: {
                properties: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {}
                },
                events: {
                    type: 'array',
                    items: {
                        type: 'object',
                        default: {
                            onEvent: null,
                            shouldTrigger: '',
                            onEntity: ''
                        },
                        required: ['onEvent', 'shouldTrigger', 'onEntity'],
                        properties: {
                            additionalProperties: false,
                            onEvent: { enum: Object.keys(knownProps[template].o) },
                            shouldTrigger: 'string',
                            onEntity: 'string'
                        }
                    }
                }
            }
        }
    };

    for (const prop in knownProps[template].p) {
        schemaTemplate.schema.properties.properties.properties[prop] = {
            type: 'object',
            default: {
                type: knownProps[template].p[prop],
                value: null
            }
        };
    }

    schemaTemplate.schema.properties.postInitProperties = schemaTemplate.schema.properties.properties;

    // TODO: Input and output copying
    // schemaTemplate.schema.properties.inputCopying = schemaTemplate.schema.properties.events;

    return schemaTemplate;
}

function PieJSONSchema(monaco, template) {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        schemas: [
            createSchema(template)
        ]
    });
}

module.exports = {
    PieJSONSchema
};
