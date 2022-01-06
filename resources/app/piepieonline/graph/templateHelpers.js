function convertTemplate(entity) {
    const typeMapping = {
        'fakeTemplateType_Scene': 'scene',
        'fakeTemplateType_Action': 'action',
        '[assembly:/templates/gameplay/ai2/actors.template?/npcactor.entitytemplate].pc_entitytype': 'npc',
        '[modules:/zactorproviderapproach.class].pc_entitytype': 'actorproviderwaypoint',
        '[modules:/zitemrepositorykeyentity.class].pc_entitytype': 'itemrepository',
        '[modules:/zinvertedcondition.class].pc_entitytype': 'invertedcondition'
    };

    // TODO: Sort these on likelyhood?
    const matchers = [
        { matcher: /spsystem.template\?\/(.*).entitytemplate/, label: ' (Screenplay)', isLegacy: true },
        { matcher: /keywordkeys.template\?\/(.*).entitytemplate/, label: '' },
        { matcher: /logic.*\.template\?\/(.*).entitytemplate/, label: ' (Logic)' },
        { matcher: /setpieces_activators.template\?\/(.*).entitytemplate/, label: ' (Set Piece)' },
        { matcher: /actor\/acts.*template\?\/(.*).entitytemplate/, label: ' (Action)' },
    ]

    let hasReplaced = false;

    function replaceTemplateName(entity) {
        if (entity.entityID === 'fffffffffffffffe' || entity.name === 'Scene') return "fakeTemplateType_Scene";

        if((templateFromHashList = hashList[`${entity.template}.TEMP`]) && templateFromHashList) {
            if(templateFromHashList.indexOf('[') === -1) {
                hasReplaced = true;
            }

            return templateFromHashList;
        }

        return entity.template;
    }

    let replacedTemplate = replaceTemplateName(entity)
    let isLegacy = false;

    let match;
    if (typeMapping[replacedTemplate]) {
        isLegacy = typeMapping[replacedTemplate].legacy;
        replacedTemplate = typeMapping[replacedTemplate].displayName || typeMapping[replacedTemplate];
        hasReplaced = true;
    }
    else {
        for (let matcher of matchers)
        {
            if ((match = entity.template.match(matcher.matcher)) && match) {
                replacedTemplate = `${match[1]}${matcher.label}`;
                isLegacy = matcher.isLegacy;
                hasReplaced = true;
                break;
            }
        }
    }

    return {
        entityTemplate: hasReplaced ? replacedTemplate : 'Unknown Template',
        isLegacy
    }

}

