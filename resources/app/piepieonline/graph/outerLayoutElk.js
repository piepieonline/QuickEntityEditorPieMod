// constructor
// options : object containing layout options
function PieOuterLayoutElk(options) {
    // default layout options
    let defaults = {
        ready: function () { }, // on layoutready
        stop: function () { } // on layoutstop
    };

    this.options = Object.assign({}, defaults, options);
}

// runs the layout
PieOuterLayoutElk.prototype.run = function () {
    let options = this.options;
    let eles = options.eles; // elements to consider in the layout
    let layout = this;

    // cy is automatically populated for us in the constructor
    // (disable eslint for next line as this serves as example layout code to external developers)
    // eslint-disable-next-line no-unused-vars
    let cy = options.cy;

    layout.emit('layoutstart');

    let basePositions = {};

    options.parentNodes.forEach((nodeId, i) => {
        const domNode = cy.nodes(`#${nodeId}`).data('dom');

        domNode.style.width = cy.nodes(`#${nodeId}`).boundingBox().w + 'px';
        domNode.style.height = cy.nodes(`#${nodeId}`).boundingBox().h + 'px';
    })


    const children = options.parentNodes.map(id => ({ id, width: cy.nodes(`#${id}`).boundingBox().w, height: cy.nodes(`#${id}`).boundingBox().h }));
    const edges = cy.edges().map(edge => {
        const sources = [edge.source().data('id').split('_')[0]];
        const targets = [edge.target().data('id').split('_')[0]];

        return { id: `${sources.join('')} >> ${targets.join('')}`, sources, targets }
    })

    const graph = {
        id: "root",
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.edgeRouting': 'POLYLINE'
        },
        children: children,
        edges: edges
    }

    new ELK().layout(graph).then(graph => {
        console.log(graph);
        graph.children.forEach(node => {
            basePositions[node.id] = { x: node.x, y: node.y }
        });

        
        eles.nodes().layoutPositions(this, options, function (ele) {
            const pos = ele.position();
            const baseId = ele.data('id').split('_')[0];

            return {
                x: pos.x + basePositions[baseId].x,
                y: pos.y + basePositions[baseId].y
            };
        });

        layout.one('layoutready', options.ready);
        layout.emit('layoutready');
    
        layout.one('layoutstop', options.stop);
        layout.emit('layoutstop');
    });

    return this; // chaining
};

PieOuterLayoutElk.prototype.stop = function () {
    return this;
};

cytoscape('layout', 'pieOuterLayoutElk', PieOuterLayoutElk);