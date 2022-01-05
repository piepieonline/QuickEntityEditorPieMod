// https://js.cytoscape.org

function load(entityToProcess, MAX_NODE_COUNT = 100) {
    window.entityToProcess = entityToProcess;

    const { nodes, edges, parentNodes } = createModel(entityToProcess, MAX_NODE_COUNT);

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
        }
    })

    cy.on('drag', (event) => {
        // For collapsed nodes
        createEdges(Object.values(event.target.connectedEdges()));
        // For expanded nodes
        createEdges(Object.values(event.target.children().connectedEdges()));
    });

    nodes.forEach(node => {
        cy.add(node)
    });

    edges.forEach(edge => {
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

        // Layout the squared edges
        createEdges(cy.edges());
    })

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