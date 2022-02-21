const LosslessJSON = require("lossless-json")

const pieServerExtensions = require('./gameServer');
const knownProps = require('./extractedData/knownProps.json');
const moduleList = require('./extractedData/moduleList.json');

const moduleBlueprintList = moduleList.map(module => module.replace(/type$/, 'blueprint'));

/*
        JSON Schema for code editor
*/

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

/*
        Custom context menu for monaco
*/

function PieMonacoExtensions(monaco, snippetEditor) {
    const customContextKey = (id, defaultValue) => {
        const condition = snippetEditor.createContextKey(id, defaultValue);
        let cachedValue = defaultValue;
        return {
            set: (value) => {
                cachedValue = value;
                condition.set(value);
            },
            get: () => cachedValue
        }
    }

    const showUpdatePropertyCondition = customContextKey('showUpdatePropertyCondition', false);
    const showFirePinCondition = customContextKey('showFirePinCondition', false);
    const showHighlightCondition = customContextKey('showHighlightCondition', false);
    
    const contextmenu = snippetEditor.getContribution('editor.contrib.contextmenu')
    const realOnContextMenuMethod = contextmenu._onContextMenu;
    contextmenu._onContextMenu = function () {
        const event = arguments[0];
        let parsed, word;

        try {
            parsed = JSON.parse(snippetEditor.getValue());
            word = snippetEditor.getModel().getWordAtPosition(event.target.position)?.word;
        } catch {
            word = false;
        }

        if(!word) {
            showUpdatePropertyCondition.set(false);
            showFirePinCondition.set(false);
        } else {
            showUpdatePropertyCondition.set(parsed.properties[word] || parsed.postInitProperties[word]);
    
            let isEventKey = false;
            if(parsed.events?.length > 0) {
                for(let parsedEvent of parsed.events) {
                    if(parsedEvent.onEvent === word || parsedEvent.shouldTrigger === word) {
                        isEventKey = true;
                    }
                }
            }
            showFirePinCondition.set(isEventKey);

            showHighlightCondition.set(parsed.properties['m_mTransform'] || parsed.postInitProperties['m_mTransform']);
        }

        realOnContextMenuMethod.apply(contextmenu, arguments);
    };

    const realDoShowContextMenuMethod = contextmenu._doShowContextMenu;
    contextmenu._doShowContextMenu = function() {
        let index = 0;
        if(showUpdatePropertyCondition.get()) index++;
        if(showFirePinCondition.get()) index++;
        if(showHighlightCondition.get()) index++;

        if(index > 0)
            arguments[0].splice(index, 0, arguments[0].find(item => item.id === 'vs.actions.separator'))

        realDoShowContextMenuMethod.apply(contextmenu, arguments);
    }

    snippetEditor.addAction({
        id: 'update-property-ingame',
        label: 'Update property in-game',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: .1,
        // keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_U],
        precondition: 'showUpdatePropertyCondition',
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
        // keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_U],
        precondition: 'showFirePinCondition',
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
            if (matches.length >= 2) {
                wasInputPin = matches[2] === 'shouldTrigger';
            }

            const entityId = currentlySelected;

            if (entityId && wasInputPin !== null) {
                if (wasInputPin) {
                    pieServerExtensions.CallInGame(event.onEntity, eventName, 'Input');
                } else {
                    pieServerExtensions.CallInGame(entityId, eventName, 'Output');
                }
            }
        }
    });

    snippetEditor.addAction({
        id: 'highlight-entity-ingame',
        label: 'Highlight entity in-game',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: .12,
        // keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_H],
        precondition: 'showHighlightCondition',
        run: function (ed) {
            const entityId = currentlySelected;

            const entity = JSON.parse(snippetEditor.getModel().getValue());

            const isCoverplane = entity.template === '[modules:/zcoverplane.class].pc_entitytype';
            const hasVolumeBox = !!entity.properties.m_vGlobalSize;

            pieServerExtensions.HighlightInGame(entityId, isCoverplane || hasVolumeBox);
        }
    });
}

module.exports = {
    PieJSONSchema,
    PieMonacoExtensions
};
