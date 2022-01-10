function convertTemplate(entity) {
    const typeMapping = {
        'fakeTemplateType_Scene': 'scene',
        '[assembly:/templates/gameplay/ai2/actors.template?/npcactor.entitytemplate].pc_entitytype': 'npc',
        '[modules:/zactorproviderapproach.class].pc_entitytype': 'actorproviderwaypoint',
        '[modules:/zitemrepositorykeyentity.class].pc_entitytype': 'itemrepository',
        '[modules:/zinvertedcondition.class].pc_entitytype': 'invertedcondition',
        '[modules:/zaimodifieractor.class].pc_entitytype': 'aimodifieractor',
        '[modules:/zitemspawner.class].pc_entitytype': 'itemspawner',
        '[modules:/zheroitemcondition.class].pc_entitytype': 'heroitemcondition',
        '[modules:/zboxvolumeentity.class].pc_entitytype': 'boxvolumeentity',
        '[modules:/zspatialentity.class].pc_entitytype': 'spatialentity'
    };

    // TODO: Sort these on likelyhood?
    const templateMatchers = [
        { templateMatcher: /(s\d+_|^)act_/, label: ' (Action)', type: 'action' },
        { templateMatcher: /actor\/acts.*template\?\/(.*).entitytemplate/, label: ' (Action)', type: 'action' },
        { templateMatcher: /spsystem.template\?\/(.*).entitytemplate/, label: ' (Screenplay)', type: 'screenplay', isLegacy: true },
        { templateMatcher: /keywordkeys.template\?\/(.*).entitytemplate/, label: '', type: 'keyword' },
        { templateMatcher: /logic.*\.template\?\/(.*).entitytemplate/, label: ' (Logic)', type: 'logic' },
        { templateMatcher: /design\/setpieces.*\?\/(.*).entitytemplate/, label: ' (Set Piece)', type: 'setpiece' },
        { templateMatcher: /setpieces_activators.template\?\/(.*).entitytemplate/, label: ' (Set Piece Activator)', type: 'setpieceactivator' },
    ]

    let hasReplaced = false;

    function replaceTemplateName(entity) {
        if (entity.entityID === 'fffffffffffffffe' || entity.name === 'Scene') return "fakeTemplateType_Scene";

        if((templateFromHashList = hashList[`${entity.template}.TEMP`]) && templateFromHashList) {
            return templateFromHashList;
        }

        return entity.template;
    }

    let replacedTemplate = replaceTemplateName(entity)
    let isLegacy = false;
    let type;

    let match;
    if (typeMapping[replacedTemplate]) {
        isLegacy = typeMapping[replacedTemplate].legacy;
        replacedTemplate = typeMapping[replacedTemplate].displayName || typeMapping[replacedTemplate];
        type = replacedTemplate;
        hasReplaced = true;
    }
    else {
        for (let matcher of templateMatchers)
        {
            if(matcher.templateMatcher)
            {
                if ((match = replacedTemplate.match(matcher.templateMatcher)) && match) {
                    replacedTemplate = `${match[1]}${matcher.label}`;
                    isLegacy = matcher.isLegacy;
                    type = matcher.type;
                    hasReplaced = true;
                    break;
                }
            }
        }
    }

    return {
        entityTemplate: hasReplaced ? replacedTemplate : 'Unknown Template',
        isLegacy,
        type
    }

}

