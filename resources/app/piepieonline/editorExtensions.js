const LosslessJSON = require("lossless-json")

const pieServerExtensions = require('./gameServer');
const knownProps = require('./extractedData/knownProps.json');
const moduleList = require('./extractedData/moduleList.json');

const moduleBlueprintList = moduleList.map(module => module.replace(/type$/, 'blueprint'));

function createSchema(template) {
    const schemaTemplate = {
        uri: 'http://piepieonlinedummy/template-schema.json',
        fileMatch: ['*'],
        schema: {
            type: 'object',
            properties: {
                template: {
                    type: 'string',
                    oneOf: [{
                        enum: moduleList
                    }, {
                        pattern: '^[A-Za-z0-9]{16}$|^\\[assembly.*pc_entitytype$'
                    }]
                },
                blueprint: {
                    type: 'string',
                    oneOf: [{
                        enum: moduleBlueprintList
                    }, {
                        pattern: '^[A-Za-z0-9]{16}$|^\\[assembly.*pc_entityblueprint$'
                    }]
                },
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
    if (!knownProps[template]) return;

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
            const entityId = currentlySelected;

            if (entity.entities[entityId]) { entity.entities[entityId] = LosslessJSON.parse(snippetEditor.getValue()) }

            if (entityId && propertyName && (entity.entities[entityId].properties[propertyName] || entity.entities[entityId].postInitProperties[propertyName])) {
                pieServerExtensions.UpdateInGame(entityId, 'property_' + propertyName);
            }
        }
    });

    snippetEditor.addAction({
        id: 'fire-pin-ingame',
        label: 'Run event in-game',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: .11,
        run: function (ed) {
            const eventName = snippetEditor.getModel().getWordAtPosition(ed.getPosition()).word;
            const start = snippetEditor.getModel().findPreviousMatch('{', ed.getPosition());
            const end = snippetEditor.getModel().findNextMatch('}', ed.getPosition());

            const event = JSON.parse(snippetEditor.getModel().getValueInRange({
                startLineNumber: start.range.startLineNumber,
                startColumn: start.range.startColumn,
                endLineNumber: end.range.endLineNumber,
                endColumn: end.range.endColumn,
            }));

            const matches = snippetEditor.getModel().findPreviousMatch(`"(onEvent)":.?"${eventName}|"(shouldTrigger)":.?"${eventName}`, ed.getPosition(), true, false, null, true).matches;
            let wasInputPin = null;
            if(matches.length >= 2) {
                wasInputPin = matches[2] === 'shouldTrigger';
            }

            const entityId = currentlySelected;

            if (entityId && wasInputPin !== null) {
                if(wasInputPin) {
                    pieServerExtensions.CallInGame(event.onEntity, eventName, 'Input');
                } else {
                    pieServerExtensions.CallInGame(entityId, eventName, 'Output');
                }
            }
        }
    });
}

module.exports = {
    PieJSONSchema,
    PieMonacoExtensions
};
