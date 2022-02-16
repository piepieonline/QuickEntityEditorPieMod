// https://js.cytoscape.org

window.ignoredEntityIds = [];

let transformToUpdateOnReturnMessage;

function load(entityToProcess, MAX_NODE_COUNT = 100) {
    window.entityToProcess = entityToProcess;
    document.getElementById('entitiesToLoad').value = MAX_NODE_COUNT;

    const { nodes, edges, parentNodes, loggerRequestedNodes } = createModel(entityToProcess, MAX_NODE_COUNT, ignoredEntityIds);

    var cy = cytoscape({

        container: document.getElementById('myDiagramDiv'), // container to render in

        elements: {
            nodes: [],
            edges: []
        },

        style: graphStyle,

        layout: {
            name: 'null'
        },

        wheelSensitivity: userSettings.wheelSensitivity
    });

    cy.domNode();

    cy.expandCollapse({
        animate: false,
        fisheye: false,
        undoable: false,
    });

    cy.on('expandcollapse.aftercollapse', (event) => {
        const domElement = event.target.data('dom');
        event.target.data('prevHeight', domElement.style.height);
        domElement.style.height = '100px';
        domElement.classList.add('collapsed');
        createEdges(Object.values(cy.nodes(':selected').connectedEdges()));
    });

    cy.on('expandcollapse.afterexpand', (event) => {
        const domElement = event.target.data('dom');
        domElement.style.height = event.target.data('prevHeight');
        domElement.classList.remove('collapsed');
        createEdges(Object.values(cy.nodes(':selected').children().connectedEdges()));
    });

    cy.on('tapselect', (event) => {
        if (event.target.isEdge()) {
            event.target.source().select();
            event.target.target().select();
        }
        else {
            event.target.connectedEdges().select();
            event.target.connectedEdges().connectedNodes().select();
        }
    });

    cy.on('cxttap', (event) => {
        if (event?.target?.isNode && event.target.isNode()) {
            const ele = document.getElementById('context-menu');
            ele.classList.toggle('open');
            ele.style.left = event.originalEvent.pageX;
            ele.style.top = event.originalEvent.pageY;
            window.ctxTarget = event.target;
        }
        else {
            closeContextMenu();
        }

    });

    cy.on('tap', () => {
        closeContextMenu();
    });

    cy.on('drag', (event) => {
        // For collapsed nodes
        createEdges(Object.values(event.target.connectedEdges()));
        // For expanded nodes
        createEdges(Object.values(event.target.children().connectedEdges()));
    });

    nodes.forEach(node => {
        cy.add(node);
    });


    edges.forEach(edge => {
        cy.add(edge);
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

        // Layout the squared edges
        createEdges(cy.edges());
    })

    const socket = new WebSocket('ws://localhost:27016');

    // Connection opened
    socket.addEventListener('open', function (event) {
        socket.send(JSON.stringify({ type: 'register', requestedPins: loggerRequestedNodes }));
    });

    // Listen for messages
    socket.addEventListener('message', function (event) {
        console.log('Message from server ', event.data);

        const message = JSON.parse(event.data);

        if (message.type === 'Pin') {
            const node = cy.getElementById(`${message.qeID}_${message.pinName}`);
            const edges = node.connectedEdges();
            node.addClass('fired-event');
            edges.addClass('fired-event');
            setTimeout(() => { node.removeClass('fired-event'); edges.removeClass('fired-event'); }, 1000);
        }
        else if (message.type === 'GetHeroPosition') {
            console.log(message);

            if (transformToUpdateOnReturnMessage && window.externallyLoadedModel.entities[transformToUpdateOnReturnMessage]?.properties?.m_mTransform) {
                window.externallyLoadedModel.entities[transformToUpdateOnReturnMessage].properties.m_mTransform.value.position.x.value = message.x;
                window.externallyLoadedModel.entities[transformToUpdateOnReturnMessage].properties.m_mTransform.value.position.y.value = message.y;
                window.externallyLoadedModel.entities[transformToUpdateOnReturnMessage].properties.m_mTransform.value.position.z.value = message.z;

                displayEntityInSnippetEditor(window.externallyLoadedModel.entities[transformToUpdateOnReturnMessage]);
            }
        }
    });

    window.highlightInGame = (requestedID) => {
        const id = requestedID || window.ctxTarget.data('id').split('_')[0];
        const entity = window.externallyLoadedModel.entities[id];

        if (entity) {
            socket.send(JSON.stringify({ type: 'highlight', entityId: id }));
        }

        closeContextMenu();
    }

    window.updateInGame = (property, requestedID) => {
        const id = requestedID || window.ctxTarget.data('id').split('_')[0];
        const entity = window.externallyLoadedModel.entities[id];

        if (entity) {
            if (property.split('_')[0] === 'property') {
                const propName = property.substring(9);
                socket.send(JSON.stringify({
                    type: 'update_property',
                    entityId: id,
                    property: propName,
                    ...convertToSocketProperty(entity.properties[propName] || entity.postInitProperties[propName])
                }));
            } else if (property === 'position') {
                socket.send(JSON.stringify({
                    type: 'update_position', entityId: id, positions: [
                        entity.properties.m_mTransform.value.position.x.value,
                        entity.properties.m_mTransform.value.position.y.value,
                        entity.properties.m_mTransform.value.position.z.value
                    ], rotations: [
                        entity.properties.m_mTransform.value.rotation.x.value,
                        entity.properties.m_mTransform.value.rotation.y.value,
                        entity.properties.m_mTransform.value.rotation.z.value
                    ]
                }));
            } else if (property === 'draw_volume') {
                let size = [.1, .1, .1];

                if (entity.template === '[modules:/zcoverplane.class].pc_entitytype') {
                    size = [
                        entity.properties.m_fCoverLength.value.value,
                        entity.properties.m_fCoverDepth.value.value,
                        entity.properties.m_eCoverSize.value === 'eLowCover' ? 1 : 2
                    ];
                }
                else if (!!entity.properties.m_vGlobalSize) {
                    size = [
                        entity.properties.m_vGlobalSize.value.x.value,
                        entity.properties.m_vGlobalSize.value.y.value,
                        entity.properties.m_vGlobalSize.value.z.value
                    ];
                }

                socket.send(JSON.stringify({
                    type: 'cover_plane', entityId: id, positions: [
                        entity.properties.m_mTransform.value.position.x.value,
                        entity.properties.m_mTransform.value.position.y.value,
                        entity.properties.m_mTransform.value.position.z.value
                    ], rotations: [
                        entity.properties.m_mTransform.value.rotation.x.value,
                        entity.properties.m_mTransform.value.rotation.y.value,
                        entity.properties.m_mTransform.value.rotation.z.value
                    ], size
                }));
            } else if (property === 'set_hero_position') {
                socket.send(JSON.stringify({
                    type: 'set_hero_position', entityId: id, positions: [
                        entity.properties.m_mTransform.value.position.x.value,
                        entity.properties.m_mTransform.value.position.y.value,
                        entity.properties.m_mTransform.value.position.z.value
                    ], rotations: [
                        entity.properties.m_mTransform.value.rotation.x.value,
                        entity.properties.m_mTransform.value.rotation.y.value,
                        entity.properties.m_mTransform.value.rotation.z.value
                    ]
                }));
            }
        }

        closeContextMenu();
    }

    window.requestPosition = (idToChange) => {
        socket.send(JSON.stringify({ type: 'get_hero_position' }));
        transformToUpdateOnReturnMessage = idToChange;
        closeContextMenu();
    }

    window.cy = cy;
}

function collapse() {
    cy.expandCollapse('get').collapse(cy.nodes(':selected'));
}

function expand() {
    cy.expandCollapse('get').expand(cy.nodes(':selected'));
}

function selectInTree() {
    externalEditorTree.deselect_all();
    externalEditorTree.select_node(cy.nodes(':selected')[0].data('id'))
}

function closeContextMenu() {
    document.getElementById('context-menu').classList.remove('open');
}

function ctxCopy(copyTarget) {
    const id = window.ctxTarget.data('id').split('_')[0];
    const entity = window.externallyLoadedModel.entities[id];

    switch (copyTarget) {
        case 'id':
            navigator.clipboard.writeText(id)
            break;
        case 'name':
            navigator.clipboard.writeText(entity.name)
            break;
        case 'template':
            navigator.clipboard.writeText(entity.template)
            break;
        case 'entityJSON':
            const newEntity = Object.assign({}, entity);
            newEntity.parent = undefined;
            newEntity.entityID = undefined;
            if (newEntity.properties.m_mTransform) {
                newEntity.properties.m_mTransform.value.position = { x: newEntity.properties.m_mTransform.value.position.x.value, y: newEntity.properties.m_mTransform.value.position.y.value, z: newEntity.properties.m_mTransform.value.position.z.value }
                newEntity.properties.m_mTransform.value.rotation = { x: newEntity.properties.m_mTransform.value.rotation.x.value, y: newEntity.properties.m_mTransform.value.rotation.y.value, z: newEntity.properties.m_mTransform.value.rotation.z.value }
            }
            let newEntityString = JSON.stringify(newEntity, null, 4);
            navigator.clipboard.writeText(newEntityString.substring(2, newEntityString.length - 2) + ',')
            break;
    }

    closeContextMenu();
}

function ctxAddToIgnore(target) {
    if (target) {
        const id = window.ctxTarget.data('id');
        window.ignoredEntityIds.push(id);
    }
    else {
        cy.nodes(':selected').forEach(node => {
            const id = node.data('id').split('_')[0];
            if (!window.ignoredEntityIds.includes(id)) {
                window.ignoredEntityIds.push(id);
            }
        })
    }


    closeContextMenu();
}

function convertToSocketProperty(property)
{
    if(window.allEnums[property.type])
    {
        return {
            propertyType: 'enum',
            value: window.allEnums[property.type].indexOf(property.value)
        };
    }

    const socketProperty = {
        propertyType: property.type
    };

    switch(property.type)
    {
        case 'SMatrix43':
            const positions = [
                property.value.position.x.value,
                property.value.position.y.value,
                property.value.position.z.value
            ];
            const rotations = [
                property.value.rotation.x.value,
                property.value.rotation.y.value,
                property.value.rotation.z.value
            ];
            socketProperty.value = `${positions.join('|')}|${rotations.join('|')}`;
            break;
        case 'Guid':
            socketProperty.value = (property.value.value || property.value).toUpperCase();
            break;
        case 'SEntityTemplateReference':
            socketProperty.value = new window.Decimal("0x" + property.value).toFixed();
            break;
        case 'TArray<SEntityTemplateReference>':
            socketProperty.value = `${property.value.length}|${property.value.map(ref => new window.Decimal("0x" + ref).toFixed()).join('|')}`;
            break;
        default:
            socketProperty.value = property.value.value || property.value;
    }

    return socketProperty;
}