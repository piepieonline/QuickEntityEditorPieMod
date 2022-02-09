function createModel(entityToProcess, MAX_NODE_COUNT, ignoredEntityIds)
{
    const includedEvents = {};
    const loggerRequestedNodes = [];
    const nodesToCheckExist = {};

    const parentNodeOffsets = {};

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

        const nodesToAdd = [];
        const edges = [];

        nodes.push(
            { data: { id: `${id}_output`, parent: id, entityOutput: true, label: 'Entity ID', x: 2, y: 1 }, grabbable: false }
        )

        if(!parentNodeOffsets[id]) parentNodeOffsets[id] = { leftProp: 1, leftEvent: 1, right: 2};

        const props = [...Object.entries(entity.properties), ...Object.entries(entity.postInitProperties)];
        for (const [key, prop] of props) {
            if (propsToIgnore.includes(key)) continue;

            function createNodeForProp() {
                nodes.push(
                    { data: { id: `${id}_${key}`, parent: id, entityInput: true, label: key, x: 0, y: parentNodeOffsets[id].leftProp++ }, grabbable: false }
                )
            }

            function createEdgeForProp(otherId, label) {
                edges.push(
                    { data: { id: `${otherId}_output >> ${id}_${key} (${edgeIDCounter++})`, source: `${otherId}_output`, target: `${id}_${key}`, label } }
                );

                nodesToAdd.push(otherId);
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

        function createEdge(thisID, otherID, thisEntity, otherEntity, thisEvent, otherEvent)
        {
            if(!parentNodeOffsets[thisEntity]) parentNodeOffsets[thisEntity] = { leftProp: 1, leftEvent: 1, right: 2};

            const newNode = { data: { id: thisID, parent: thisEntity, entityOutput: true, label: thisEvent + '()', x: 2, y: parentNodeOffsets[thisEntity].right++, linkedEvents: [] }, grabbable: false };
            if (!includedEvents[thisID]) {
                // nodes.push(newNode);
                includedEvents[thisID] = newNode;

                loggerRequestedNodes.push(thisID);
            }
            
            if(!nodesToCheckExist[thisID])
            {
                nodesToCheckExist[thisID] = { node: newNode, edges: [] };
            } else if(!nodesToCheckExist[thisID].node)
            {
                nodesToCheckExist[thisID].node = newNode;
            }



            if(!parentNodeOffsets[otherEntity]) parentNodeOffsets[otherEntity] = { leftProp: 1, leftEvent: 1, right: 2};

            const newOtherNode = { data: { id: otherID, parent: otherEntity, entityInput: true, label: '' + otherEvent + '()', x: 0, y: parentNodeOffsets[otherEntity].leftEvent++, eventNode: true }, grabbable: false };
            if (!includedEvents[otherID]) {
                // nodes.push(newNode);
                includedEvents[otherID] = newOtherNode;

                loggerRequestedNodes.push(otherID);
            }

            if(!nodesToCheckExist[otherID])
            {
                nodesToCheckExist[otherID] = { node: newOtherNode, edges: [] };
            } else if(!nodesToCheckExist[otherID].node)
            {
                nodesToCheckExist[otherID].node = newOtherNode;
            }

            nodesToCheckExist[otherID].edges.push(
                { data: { id: `${thisID} >> ${otherID} (${edgeIDCounter++})`, source: thisID, target: otherID } }
            );
        }

        (entity.events || []).forEach(event => {
            createEdge(
                `${id}_${event.onEvent}`,
                `${event.onEntity}_${event.shouldTrigger}`,
                id,
                event.onEntity,
                event.onEvent,
                event.shouldTrigger
            );

            nodesToAdd.push(event.onEntity);
        });

        /*
        (entity.outputCopying || []).forEach(event => {
            createEdge(
                `${id}_${event.onEvent}`,
                `${event.onEntity}_${event.propagateEvent}`,
                id,
                event.onEntity,
                event.onEvent,
                event.propagateEvent
            );

            nodesToAdd.push(event.onEntity);
        });

        (entity.inputCopying || []).forEach(event => {
            createEdge(
                `${id}_${event.whenTriggered}`,
                `${event.onEntity}_${event.alsoTrigger}`,
                id,
                event.onEntity,
                event.whenTriggered,
                event.alsoTrigger,
            );

            nodesToAdd.push(event.onEntity);
        });
        */


        nodes.push({ data: { id: `${id}_type`, parent: id, entityType: true, x: 1, y: -1 }, grabbable: false });

        // parentNodes.push(id);

        return { nodes, edges, nodesToAdd: nodesToAdd.filter((value, index, self) => self.indexOf(value) === index) };
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
            const { nodes, edges, nodesToAdd } = createNode(entityData);

            parentNodes.push(nodes[0].data.id);

            allNodes.push(...nodes);

            /*

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

            */
            nodesToAdd.forEach(nodeToAddID => {
                checkAndAddToProcessList(nodeToAddID);
            });
            

            if (externallyLoadedReferences && externallyLoadedReferences[nodesToProcess[0]]) {
                externallyLoadedReferences[nodesToProcess[0]].forEach(referencingEntity => {
                    const referenceProperty = referencingEntity.type.split(' ')[1]; // "Property: m_eidParent"
                    // if(referencingEntity.type.includes('Event:'))
                    if(!propsToIgnore.includes(referenceProperty))
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

    allNodes.forEach(node => {
        if(node.data.id.endsWith('_type'))
        {
            node.data.y = Math.max((parentNodeOffsets[node.data.parent].leftProp + parentNodeOffsets[node.data.parent].leftEvent + 1), parentNodeOffsets[node.data.parent].right)
        }
        if(node.data.eventNode)
        {
            node.data.y = node.data.y + parentNodeOffsets[node.data.parent].leftProp
        }
    })

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
    'm_eidParent'
]