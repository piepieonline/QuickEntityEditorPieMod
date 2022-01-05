const typeMapping = {
    'fakeTemplateType_Action': 'action',
    'fakeTemplateType_SetPiece': 'setpiece',
    '000C288A323918F9': 'dramasituationproxy',
    '[assembly:/_pro/design/actor/spsystem.template?/screenplay.entitytemplate].pc_entitytype': 'screenplay',
    '005B2A6454B76874': 'dramasituation',
    '[assembly:/_pro/design/actor/spsystem.template?/dramasituation.entitytemplate].pc_entitytype': 'dramasituation_old',
    '00808A03B82188F7': 'role',
    '[assembly:/_pro/design/actor/spsystem.template?/role.entitytemplate].pc_entitytype': 'role_old',
    '[assembly:/templates/gameplay/ai2/actors.template?/npcactor.entitytemplate].pc_entitytype': 'npc',
    '[modules:/zactorproviderapproach.class].pc_entitytype': 'actorproviderwaypoint',
    '[assembly:/_pro/design/actor/spsystem.template?/actoroneliner.entitytemplate].pc_entitytype': 'speech_oneliner',
    '[modules:/zitemrepositorykeyentity.class].pc_entitytype': 'itemrepository'
}

function createModel(entityToModel) {
    var entityList = {};
    var processedList = {};

    var entitiesToParse = [];

    function parseEntityNodes(entity) {
        const links = [];

        var type = typeMapping[convertTemplate(entity.template, entity.name)];
        if(!type) {
            console.warn(`Unknown type: ${entity.template} as ${convertTemplate(entity.template, entity.name)} (${entity.entityID})`);
            type = 'UNKNOWN';
        }

        parse_generic(entity, entityList, entitiesToParse, links);

        return {
            node: {
                "key": entity.entityID,
                "type": type,
                "name": entity.name
            },
            links
        };
    }

    return new Promise((resolve, reject) => {
        function createInternalModel(fullLoadedModel)
        {
            entityList = fullLoadedModel.entities;
            entityList[entityToModel].entityID = entityToModel;
            entitiesToParse = [entityList[entityToModel]];

            var model = JSON.parse(JSON.stringify(emptyModel));

            let parsedCount = 0;

            while (entitiesToParse.length > 0) {
                if(!processedList[entitiesToParse[0].entityID])
                {
                    const {node, links} = parseEntityNodes(entitiesToParse[0]);
                    model.nodeDataArray.push(node);
                    model.linkDataArray.push(...links);
                    processedList[entitiesToParse[0].entityID] = true;
                }

                entitiesToParse.shift();
                parsedCount++;

                if(parsedCount > 100) {
                    console.error('too many');
                    break;
                }
            }

            return model;
        }

        if(window.externallyLoadedModel !== undefined)
        {
            resolve(createInternalModel(window.externallyLoadedModel));
            window.externallyLoadedModel = undefined;
        }
        else
        {
            fetch(`./localTestingData/${window.level}.entity.json`)
                .then(response => response.json())
                .then(entityListResponse => {
                    resolve(createInternalModel(entityListResponse));
                }
            );
        }
    });
}

var emptyModel = {
    "class": "go.GraphLinksModel",
    "nodeCategoryProperty": "type",
    "linkFromPortIdProperty": "fromID",
    "linkToPortIdProperty": "toID",
    "nodeDataArray": [],
    "linkDataArray": []
};

function convertTemplate(templateIn, entityName)
{
    if(templateIn.indexOf("actor/acts") > -1 || entityName.indexOf("Act_") == 0) return "fakeTemplateType_Action";

    if(templateIn.indexOf("setpieces_activators.template") > -1 || entityName.indexOf("SetPiece_Activator") == 0) return "fakeTemplateType_SetPiece";

    return templateIn;
}

function parse_generic(entity, entityList, entitiesToParse, links)
{
    const props = [...Object.entries(entity.properties), ...Object.entries(entity.postInitProperties)];

    for (const [key, prop] of props) {
        if(key == 'm_eidParent') continue;
        if(prop.type === "SEntityTemplateReference") {
            const id = prop.value;

            if(!entityList[id]) continue;

            entityList[id].entityID = id;
            entitiesToParse.push(entityList[id]);
    
            links.push({
                from: id,
                to: entity.entityID,
                fromID: "EntityID_Out",
                toID: `${key}_In`
            });
        }

        if(prop.type === "TArray<SEntityTemplateReference>")
        {
            prop.value.forEach(id => {
                if(!entityList[id]) return;

                entityList[id].entityID = id;
                entitiesToParse.push(entityList[id]);
        
                links.push({
                    from: id,
                    to: entity.entityID,
                    fromID: "EntityID_Out",
                    toID: `${key}_In`
                });
            });
        }
    }

    entity?.events?.forEach(event => {
        entityList[event.onEntity].entityID = event.onEntity;
        entitiesToParse.push(entityList[event.onEntity]);

        links.push({
            from: entity.entityID,
            to: event.onEntity,
            fromID: `${event.onEvent}_Out`, // OnStart_Start_Out
            toID: "Event_In",
            color: "gray",
            text: event.shouldTrigger
        });
    })

    if(externallyLoadedReferences && externallyLoadedReferences[entity.entityID]) {
        externallyLoadedReferences[entity.entityID].forEach(referencingEntity => {
            if(referencingEntity.type.includes('Event:'))
            {
                entityList[referencingEntity.id].entityID = referencingEntity.id;
                entitiesToParse.push(entityList[referencingEntity.id]);
            }
        })
    }
}