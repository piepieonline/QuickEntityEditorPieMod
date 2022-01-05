function convertTemplate(entity) {
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
    };

    function replaceTemplateName(templateIn, entityName) {
        if (templateIn.indexOf("actor/acts") > -1 || entityName.indexOf("Act_") == 0) return "fakeTemplateType_Action";

        if (templateIn.indexOf("setpieces_activators.template") > -1 || entityName.indexOf("SetPiece_Activator") == 0) return "fakeTemplateType_SetPiece";

        return templateIn;
    }

    return typeMapping[replaceTemplateName(entity.template, entity.name)] || 'Unknown Type';
}

