function createModel(entityToProcess, MAX_NODE_COUNT, ignoredEntityIds)
{
    const includedEvents = {};
    const loggerRequestedNodes = [];
    const nodesToCheckExist = {};
    let parentNodes = [];
    let edgeIDCounter = 0;
    const createNode = (entity) => {
        const id = entity.entityID;

        const { entityTemplate, isLegacy } = convertTemplate(entity);

        const div = document.createElement("div");
        div.innerHTML = `<div style="margin-top: 20px">${entity.name}</div><div style="margin-bottom: 20px">${entityTemplate}</div>`;
        div.classList = ['node-body'];

        const nodes = [
            { data: { id, isPrimary: entityToProcess === id, isLegacy, dom: div } },
            { data: { id: `${id}_name`, parent: id, entityName: true, x: 1, y: 0 }, grabbable: false }
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

            function createEdgeForProp(otherId, label) {
                edges.push(
                    { data: { id: `${otherId}_output >> ${id}_${key} (${edgeIDCounter++})`, source: `${otherId}_output`, target: `${id}_${key}`, label } }
                )
            }

            if (prop.type === 'SEntityTemplateReference') {
                createNodeForProp();
                if(prop.value !== null)
                    createEdgeForProp(prop.value.ref || prop.value, prop.value.exposedEntity || undefined);
            }
            else if (prop.type === 'TArray<SEntityTemplateReference>') {
                createNodeForProp();
                prop.value.forEach(other => {
                    // Other could be an ID, or an external reference
                    createEdgeForProp(other.ref || other, other.exposedEntity || undefined);
                })
            }
        }

        let maxVert = vertOffset;

        vertOffset = 2;

        (entity.events || []).forEach(event => {
            const eventID = `${id}_${event.onEvent}`;
            if (!includedEvents[eventID]) {
                const newNode = { data: { id: eventID, parent: id, entityOutput: true, label: event.onEvent, x: 2, y: vertOffset++, linkedEvents: [] }, grabbable: false };
                nodes.push(newNode);
                includedEvents[eventID] = newNode;

                loggerRequestedNodes.push(eventID);
            }

            edges.push(
                { data: { id: `${eventID} >> ${event.onEntity}_input (${edgeIDCounter++})`, source: eventID, target: `${event.onEntity}_input`, label: event.shouldTrigger } }
            );
        });

        /*
        (entity.inputCopying || []).forEach(event => {
            const eventID = `${id}_${event.onEvent}`;
            if (!includedEvents[eventID]) {
                const newNode = { data: { id: eventID, parent: id, entityOutput: true, label: event.onEvent, x: 2, y: vertOffset++, linkedEvents: [] }, grabbable: false };
                nodes.push(newNode);
                includedEvents[eventID] = newNode;

                loggerRequestedNodes.push(eventID);
            }

            includedEvents[eventID].data.linkedEvents.push({ entity: event.onEntity, event: event.propagateEvent });
        });
        */

        (entity.outputCopying || []).forEach(event => {
            const eventID = `${id}_${event.onEvent}`;
            const otherEventID = `${event.onEntity}_${event.propagateEvent}`;
            if (!includedEvents[eventID]) {
                const newNode = { data: { id: eventID, parent: id, entityOutput: true, label: event.onEvent, x: 2, y: vertOffset++, linkedEvents: [] }, grabbable: false };
                nodes.push(newNode);
                includedEvents[eventID] = newNode;

                loggerRequestedNodes.push(eventID);
            }
            
            const newOtherNode = { data: { id: otherEventID, parent: event.onEntity, entityOutput: true, label: event.onEvent, x: 2, y: vertOffset++, linkedEvents: [] }, grabbable: false };
            if (!includedEvents[otherEventID]) {
                // nodes.push(newNode);
                includedEvents[otherEventID] = newOtherNode;

                loggerRequestedNodes.push(otherEventID);
            }

            if(!nodesToCheckExist[otherEventID])
            {
                nodesToCheckExist[otherEventID] = { node: newOtherNode, edges: [] };
            } else if(!nodesToCheckExist[otherEventID].node)
            {
                nodesToCheckExist[otherEventID].node = newOtherNode;
            }

            nodesToCheckExist[otherEventID].edges.push(
                { data: { id: `${eventID} >> ${otherEventID} (${edgeIDCounter++})`, source: eventID, target: otherEventID, label: event.propagateEvent } }
            );
        });

        maxVert = Math.max(maxVert, vertOffset);

        nodes.push({ data: { id: `${id}_type`, parent: id, entityType: true, x: 1, y: maxVert }, grabbable: false });

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
            if(!window.externallyLoadedModel.entities[id])
            {
                console.warn(`${id} is an unknown entity`);
                return;
            }

            if (
                !parentNodes.includes(id) &&
                !nodesToProcess.includes(id) &&
                !entitiesToIgnore.includes(convertTemplate(window.externallyLoadedModel.entities[id]).entityTemplate) &&
                !ignoredEntityIds.includes(id)
            ) nodesToProcess.push(id);
        }

        if (window.externallyLoadedModel.entities[nodesToProcess[0]]) {
            const entityData = window.externallyLoadedModel.entities[nodesToProcess[0]];
            const { nodes, edges } = createNode(entityData);
            allNodes.push(...nodes);

            entityData.inputCopying?.forEach(event => {
                if (shouldRecurse) {
                    checkAndAddToProcessList(event.onEntity)
                }
            });

            entityData.outputCopying?.forEach(event => {
                if (shouldRecurse) {
                    checkAndAddToProcessList(event.onEntity)
                }
            });

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

    for(let nodeID in nodesToCheckExist)
    {
        if(parentNodes.includes(nodesToCheckExist[nodeID].node.data.parent))
        {
            allNodes.push(nodesToCheckExist[nodeID].node);
            allEdges.push(...nodesToCheckExist[nodeID].edges)
        }
    }

    allEdges = allEdges.filter(edge => {
        let includedIDs = [edge.data.source.split('_')[0], edge.data.target.split('_')[0]];
        return parentNodes.includes(includedIDs[0]) && parentNodes.includes(includedIDs[1]);
    })

    console.log(allNodes, allEdges);

    return { nodes: allNodes, edges: allEdges, parentNodes, loggerRequestedNodes };
}

const entitiesToIgnore = [
    'scene'
]

const propsToIgnore = [
]