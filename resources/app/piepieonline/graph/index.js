// https://js.cytoscape.org

function load(entityToProcess, MAX_NODE_COUNT = 300) {
    window.entityToProcess = entityToProcess;

    let parentNodes = [];
    let edgeIDCounter = 0;
    let nodeCounter = 0;
    const createNode = (entity) => {
        let id = entity.entityID;

        let div = document.createElement("div");
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
            if(propsToIgnore.includes(key)) continue;

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
            if(!includedEvents.includes(eventID))
            {
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

        nodes.push({ data: { id: `${id}_type`, parent: id, entityType: true, label: convertTemplate(entity), x: 1, y: maxVert}, grabbable: false } );

        
        nodeCounter++;
        
        // Prevent too many nodes from existing
        if(nodeCounter > MAX_NODE_COUNT) return { nodes: [], edges: [] };

        parentNodes.push(id);

        return { nodes, edges };
    };


    let allNodes = [];
    let allEdges = [];

    const shouldRecurse = true;

    const nodesToProcess = [entityToProcess];

    while (nodesToProcess.length > 0) {
        if (window.externallyLoadedModel.entities[nodesToProcess[0]]) {
            const { nodes, edges } = createNode(window.externallyLoadedModel.entities[nodesToProcess[0]]);
            allNodes.push(...nodes);

            edges.forEach(edge => {
                let includedIDs = [edge.data.source.split('_')[0], edge.data.target.split('_')[0]];

                if(shouldRecurse)
                {
                    if (!parentNodes.includes(includedIDs[0]) && !nodesToProcess.includes(includedIDs[0])) nodesToProcess.push(includedIDs[0]);
                    if (!parentNodes.includes(includedIDs[1]) && !nodesToProcess.includes(includedIDs[1])) nodesToProcess.push(includedIDs[1]);
                }
            })

            allEdges.push(...edges);
        }
        else {
            console.warn(`Unknown entity: ${nodesToProcess[0]}`);
        }

        nodesToProcess.shift();
    }

    allEdges = allEdges.filter(edge => {
        let includedIDs = [ edge.data.source.split('_')[0], edge.data.target.split('_')[0] ];
        return parentNodes.includes(includedIDs[0]) && parentNodes.includes(includedIDs[1]);
    })

    console.log(allNodes, allEdges);

    var cy = cytoscape({

        container: document.getElementById('myDiagramDiv'), // container to render in

        elements: {
            nodes: [],
            edges: []
        },
        
        style: graphStyle,
        
        layout: {
            name: 'null'
        }
        
    });
    
    cy.domNode();
    
    cy.expandCollapse({
        animate: false,
        fisheye: false,
        undoable: false,
    });

    cy.on('expandcollapse.aftercollapse', (event) => {
        const domElement = event.target.data('dom');
        event.target.data('prevHeight',domElement.style.height);
        domElement.style.height = '100px';
        domElement.classList.add('collapsed');
    });

    cy.on('expandcollapse.beforeexpand', (event) => {
        const domElement = event.target.data('dom');
        domElement.style.height = event.target.data('prevHeight');
        domElement.classList.remove('collapsed');
    });

    cy.on('tapselect', (event) => {
        if(event.target.isEdge())
        {
            event.target.source().select();
            event.target.target().select();
        }
        else
        {
            event.target.connectedEdges().select();
        }
    })

    allNodes.forEach(node => {
        cy.add(node)
    });

    allEdges.forEach(edge => {
        cy.add(edge)
    });

    
    cy.nodes((val) => {
        return !parentNodes.includes(val.data('id'));
    }).layout({
        name: 'pieInnerLayout'
    }).run();

    cy.nodes().layout({
        name: 'pieOuterLayoutElk',
        parentNodes
    }).run().on('layoutstop', () => {
        // Force DOM nodes to update
        cy.nodes(':parent').emit('bounds');
        cy.center('[?isPrimary]');
    })

    window.cy = cy;
}

const propsToIgnore = [
    'm_eidParent'
]

function collapse()
{
    cy.expandCollapse('get').collapse(cy.nodes(':selected'));
}

function expand()
{
    cy.expandCollapse('get').expand(cy.nodes(':selected'));
}

function selectInTree()
{
    externalEditorTree.deselect_all();
    externalEditorTree.select_node(cy.nodes(':selected')[0].data('id'))
}