// constructor
// options : object containing layout options
function PieOuterLayout(options) {
    // default layout options
    let defaults = {
        ready: function () { }, // on layoutready
        stop: function () { } // on layoutstop
    };

    this.options = Object.assign({}, defaults, options);
}

// runs the layout
PieOuterLayout.prototype.run = function () {
    let options = this.options;
    let eles = options.eles; // elements to consider in the layout
    let layout = this;

    // cy is automatically populated for us in the constructor
    // (disable eslint for next line as this serves as example layout code to external developers)
    // eslint-disable-next-line no-unused-vars
    let cy = options.cy;

    layout.emit('layoutstart');

    let basePositions = {};
    let xOffset = 0;
    let yOffset = 0;

    const xPadding = 20, yPadding = 20;

    const idOrdering = {};

    options.parentNodes.forEach((nodeId, i) => {
        let leftChildrenCount = eles.nodes(`#${nodeId}`).children('[entityInput]').length;
        let rightChildrenCount = eles.nodes(`#${nodeId}`).children('[entityOutput]').length;
        idOrdering[nodeId] = -leftChildrenCount + rightChildrenCount;
    });

    options.parentNodes.sort((n1, n2) => {
        return idOrdering[n2] - idOrdering[n1];
    })

    // Current col is idOrdering value
    // Find max of previous col before moving on
    let currentCol = idOrdering[options.parentNodes[0]];
    let maxNextOffset = 0;

    options.parentNodes.forEach((nodeId, i) => {
        let requestedCol = idOrdering[nodeId];

        if(requestedCol === currentCol)
        {
            maxNextOffset = Math.max(maxNextOffset, eles.nodes(`#${nodeId}`).outerWidth())

            basePositions[nodeId] = { x: xOffset, y: yOffset };

            yOffset += eles.nodes(`#${nodeId}`).outerHeight() + yPadding;
        }
        else
        {
            currentCol = requestedCol;

            xOffset += maxNextOffset + xPadding;
            
            basePositions[nodeId] = { x: xOffset, y: 0 };

            maxNextOffset = eles.nodes(`#${nodeId}`).outerWidth();
            yOffset = eles.nodes(`#${nodeId}`).outerHeight() + yPadding;
        }

        const domNode = cy.nodes(`#${nodeId}`).data('dom');

        domNode.style.width = cy.nodes(`#${nodeId}`).boundingBox().w + 'px';
        domNode.style.height = cy.nodes(`#${nodeId}`).boundingBox().h + 'px';
    })

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

    return this; // chaining
};

PieOuterLayout.prototype.stop = function () {
    return this;
};

cytoscape('layout', 'pieOuterLayout', PieOuterLayout);