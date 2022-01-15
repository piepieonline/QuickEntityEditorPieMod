// https://js.cytoscape.org

window.ignoredEntityIds = [];

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

        const currentPin = JSON.parse(event.data);
        const node = cy.getElementById(`${currentPin.qeID}_${currentPin.pinName}`);
        const edges = node.connectedEdges();
        node.addClass('fired-event');
        edges.addClass('fired-event');
        setTimeout(() => { node.removeClass('fired-event'); edges.removeClass('fired-event'); }, 1000);
    });

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