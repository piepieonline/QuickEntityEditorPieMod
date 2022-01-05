function createTemplates(makeTemplate, makePort)
{
    makeTemplate("npc", "darkcyan",
        [makePort("m_InventoryItemKeys", "m_InventoryItemKeys", true)],
        []
    );

    makeTemplate("role", "darkcyan",
        [makePort("m_rActorProvider", "m_rActorProvider", true), makePort("m_aProviders", "m_aProviders", true, 100)],
        []
    );

    makeTemplate("role_old", "lightsalmon",
        [makePort("m_rActorProvider", "m_rActorProvider", true), makePort("m_aProviders", "m_aProviders", true, 100)],
        []
    );

    makeTemplate("dramasituation", "darkcyan",
        [makePort("m_aRoles", "m_aRoles", true, 100), makePort("m_EnableConditions", "m_EnableConditions", true), makePort("m_aHigherPriority", "m_aHigherPriority", true)],
        []
    );

    makeTemplate("dramasituation_old", "lightsalmon",
        [makePort("m_aRoles", "m_aRoles", true, 100), makePort("m_EnableConditions", "m_EnableConditions", true), makePort("m_aHigherPriority", "m_aHigherPriority", true)],
        []
    );

    makeTemplate("dramasituationproxy", "darkcyan",
        [makePort("m_rOriginalDrama", "m_rOriginalDrama", true)],
        [makePort("OnStart", "OnStart", false)]
    );

    makeTemplate("screenplay", "darkcyan",
        [makePort("Roles", "Roles", true)],
        [makePort("OnStart", "OnStart", false)]
    );

    makeTemplate("action", "darkcyan",
        [makePort("m_pActor", "m_pActor", true)],
        [makePort("OnActTimeout", "OnActTimeout", false), makePort("OnInterrupted", "OnInterrupted", false)]
    );

    makeTemplate("setpiece", "darkcyan",
        [makePort("m_pActor", "m_pActor", true), makePort("ItemFromInventory", "ItemFromInventory", true)],
        [makePort("ItemTaken", "ItemTaken", false), makePort("IHaveNoItem", "IHaveNoItem", false)]
    );

    makeTemplate("actorproviderwaypoint", "darkcyan",
        [makePort("m_aWaypoints", "m_aWaypoints", true)],
        [makePort("OnActorReleased", "OnActorReleased", false)]
    );

    makeTemplate("speech_oneliner", "darkcyan",
        [makePort("m_pAudioEvent", "m_pAudioEvent", true), makePort("m_rActor", "m_rActor", true)],
        [makePort("Completed", "Completed", false)]
    );

    makeTemplate("itemrepository", "darkcyan",
        [],
        []
    );
}