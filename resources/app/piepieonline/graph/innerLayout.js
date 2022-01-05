// constructor
// options : object containing layout options
function PieInnerLayout(options) {
    // default layout options
    let defaults = {
        ready: function () { }, // on layoutready
        stop: function () { } // on layoutstop
    };

    this.options = Object.assign({}, defaults, options);
}

// runs the layout
PieInnerLayout.prototype.run = function () {
    let options = this.options;
    let eles = options.eles; // elements to consider in the layout
    let layout = this;

    // cy is automatically populated for us in the constructor
    // (disable eslint for next line as this serves as example layout code to external developers)
    // eslint-disable-next-line no-unused-vars
    let cy = options.cy;

    layout.emit('layoutstart');

    let colWidths = {}, rowHeights = {};

    eles.nodes().forEach(ele => {
        if(ele.data('id').includes('_'))
        {
            const parentID = ele.data('id').split('_')[0];

            const x = parseInt(ele.data('x')), y = parseInt(ele.data('y'));

            const boundingBox = ele.boundingBox({ includeLabels: true }) 

            if(!colWidths[parentID]) colWidths[parentID] = { 1: 100 };
            if(!colWidths[parentID][x])
            {
                colWidths[parentID][x] = boundingBox.w;
            }
            else
            {
                colWidths[parentID][x] = Math.max(colWidths[parentID][x], boundingBox.w);
            }

            if(!rowHeights[parentID]) rowHeights[parentID] = {};
            if(!rowHeights[parentID][y])
            {
                rowHeights[parentID][y] = boundingBox.h;
            }
            else
            {
                rowHeights[parentID][y] = Math.max(rowHeights[parentID][y], boundingBox.h);
            }
        }
    })

    eles.nodes().layoutPositions(this, options, function (ele) {
        const parentID = ele.data('id').split('_')[0];
        const col = parseInt(ele.data('x')), row = parseInt(ele.data('y'));

        let x, xOffset = 0;
        for(x = 0; x < col; x++)
        {
            xOffset += colWidths[parentID][x] || 0;
        }
        // if(col == 1) xOffset += (colWidths[parentID][1] / 2);

        let y, yOffset = 0;
        for(y = 0; y < row; y++)
        {
            yOffset += rowHeights[parentID][y] || 0;
        }

        return {
            x: xOffset,
            y: yOffset
        };
    });

    layout.one('layoutready', options.ready);
    layout.emit('layoutready');

    layout.one('layoutstop', options.stop);
    layout.emit('layoutstop');

    return this; // chaining
};

PieInnerLayout.prototype.stop = function () {
    return this;
};

cytoscape('layout', 'pieInnerLayout', PieInnerLayout);