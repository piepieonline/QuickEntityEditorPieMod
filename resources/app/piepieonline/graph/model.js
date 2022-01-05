function createModel(entityToProcess, MAX_NODE_COUNT)
{
    let parentNodes = [];
    let edgeIDCounter = 0;
    const createNode = (entity) => {
        const id = entity.entityID;
        const entityTemplate = convertTemplate(entity);

        const div = document.createElement("div");
        div.innerHTML = `<div style="margin-top: 20px">${entity.name}</div><div style="margin-bottom: 20px">${convertTemplate(entity)}</div>`;
        div.classList = ['node-body'];

        const nodes = [
            { data: { id, isPrimary: entityToProcess === id, dom: div } },
            { data: { id: `${id}_name`, parent: id, entityName: true, label: entity.name, x: 1, y: 0 }, grabbable: false }
        ];

        const edges = [];

        nodes.push(
            { data: { id: `${id}_input`, parent: id, entityInput: true, label: 'Entity ID', x: 0, y: 1 }, grabbable: false },
            { data: { id: `${id}_output`, parent: id, entityOutput: true, label: 'Entity ID', x: 2, y: 1 }, grabbable: false }
        )

        let vertOffset = 2;

        const props = [...Object.entries(entity.properties), ...Object.entries(entity.postInitProperties)];
        for (const [key, prop] of props) {
            if (propsToIgnore.includes(key)) continue;

            function createNodeForProp() {
                nodes.push(
                    { data: { id: `${id}_${key}`, parent: id, entityInput: true, label: key, x: 0, y: vertOffset++ }, grabbable: false }
                )
            }

            function createEdgeForProp(otherId) {
                edges.push(
                    { data: { id: `${otherId}_output >> ${id}_${key} (${edgeIDCounter++})`, source: `${otherId}_output`, target: `${id}_${key}` } }
                )
            }

            if (prop.type === 'SEntityTemplateReference') {
                createNodeForProp();
                createEdgeForProp(prop.value);
            }
            else if (prop.type === 'TArray<SEntityTemplateReference>') {
                createNodeForProp();
                prop.value.forEach(otherId => {
                    createEdgeForProp(otherId);
                })
            }
        }

        let maxVert = vertOffset;

        vertOffset = 2;

        const includedEvents = [];
        (entity.events || []).forEach(event => {
            const eventID = `${id}_${event.onEvent}`;
            if (!includedEvents.includes(eventID)) {
                nodes.push(
                    { data: { id: `${id}_${event.onEvent}`, parent: id, entityOutput: true, label: event.onEvent, x: 2, y: vertOffset++ }, grabbable: false }
                )
                includedEvents.push(eventID);
            }

            edges.push(
                { data: { id: `${eventID} >> ${event.onEntity}_input (${edgeIDCounter++})`, source: eventID, target: `${event.onEntity}_input` } }
            );
        })

        maxVert = Math.max(maxVert, vertOffset);

        nodes.push({ data: { id: `${id}_type`, parent: id, entityType: true, label: entityTemplate, x: 1, y: maxVert }, grabbable: false });

        parentNodes.push(id);

        return { nodes, edges };
    };


    let allNodes = [];
    let allEdges = [];

    const shouldRecurse = true;

    const nodesToProcess = [entityToProcess];

    let processedCount = 0;
    while (nodesToProcess.length > 0) {
        function checkAndAddToProcessList(id)
        {
            if (
                !parentNodes.includes(id) &&
                !nodesToProcess.includes(id) &&
                !entitiesToIgnore.includes(convertTemplate(window.externallyLoadedModel.entities[id]))
            ) nodesToProcess.push(id);
        }

        if (window.externallyLoadedModel.entities[nodesToProcess[0]]) {
            const { nodes, edges } = createNode(window.externallyLoadedModel.entities[nodesToProcess[0]]);
            allNodes.push(...nodes);

            edges.forEach(edge => {
                let includedIDs = [edge.data.source.split('_')[0], edge.data.target.split('_')[0]];

                if (shouldRecurse) {
                    checkAndAddToProcessList(includedIDs[0])
                    checkAndAddToProcessList(includedIDs[1])
                }
            });

            if (externallyLoadedReferences && externallyLoadedReferences[nodesToProcess[0]]) {
                externallyLoadedReferences[nodesToProcess[0]].forEach(referencingEntity => {
                    // if(referencingEntity.type.includes('Event:'))
                    {
                        checkAndAddToProcessList(referencingEntity.id);
                    }
                })
            }

            allEdges.push(...edges);

            processedCount++;

            if(processedCount > MAX_NODE_COUNT) nodesToProcess.length = 0;
        }
        else {
            console.warn(`Unknown entity: ${nodesToProcess[0]}`);
        }

        nodesToProcess.shift();
    }

    allEdges = allEdges.filter(edge => {
        let includedIDs = [edge.data.source.split('_')[0], edge.data.target.split('_')[0]];
        return parentNodes.includes(includedIDs[0]) && parentNodes.includes(includedIDs[1]);
    })

    console.log(allNodes, allEdges);

    return { nodes: allNodes, edges: allEdges, parentNodes };
}

const entitiesToIgnore = [
    'scene'
]

const propsToIgnore = [
    'm_eidParent'
]