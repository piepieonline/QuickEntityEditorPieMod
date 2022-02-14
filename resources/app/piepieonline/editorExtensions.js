const LosslessJSON = require("lossless-json")

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

function PieMonacoExtensions(snippetEditor) {
    snippetEditor.addAction({
        id: 'update-property-ingame',
        label: 'Update property in-game',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: .1,
        run: function (ed) {
            const propertyName = snippetEditor.getModel().getWordAtPosition(ed.getPosition()).word;
            const entityId = LosslessJSON.parse(snippetEditor.getValue()).entityID;

            if(entityId && propertyName && (entity.entities[entityId].properties[propertyName] || entity.entities[entityId].postInitProperties[propertyName]))
            {
                console.log(`Updating ${propertyName} of ${entityId}`);

                try {
                    if(propertyName === 'm_mTransform')
                    {
                        document.getElementById('pieGraphFrame').contentWindow.updateInGame('position', entityId);
                    }
                    else
                    {
                        document.getElementById('pieGraphFrame').contentWindow.updateInGame('property_' + propertyName, entityId);
                    }
                }
                catch { }
            }
        }
    })
}

module.exports = {
    PieJSONSchema,
    PieMonacoExtensions
};
