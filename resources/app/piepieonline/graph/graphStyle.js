const graphStyle = [
    {
        selector: 'node',
        css: {
            'content': 'data(id)',
            'text-valign': 'center',
            'text-halign': 'center'
        }
    },
    {
        selector: "node.cy-expand-collapse-collapsed-node",
        style: {
            'shape': 'rectangle',
            'background-color': '#eee'
        }
    },
    {
        selector: ':parent',
        css: {
            'content': 'data(id)',
            'text-valign': 'top',
            'text-halign': 'center',
            'background-color': '#ddd'
        }
    },
    {
        selector: '[?isPrimary]',
        css: {
            'background-color': '#aaa'
        }
    },
    {
        selector: '[entityName]',
        css: {
            'content': '',
            'text-valign': 'top',
            'text-halign': 'right',
            'background-opacity': 0
        }
    },
    {
        selector: '[entityType]',
        css: {
            'content': '',
            'text-valign': 'bottom',
            'text-halign': 'right',
            'background-opacity': 0
        }
    },
    {
        selector: '[entityInput]',
        css: {
            'content': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'right'
        }
    },
    {
        selector: '[entityOutput]',
        css: {
            'content': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'left',
        }
    },
    {
        selector: 'edge',
        css: {
            'curve-style': 'segments',
            "segment-weights": '0.5',
            'segment-distances': '0',
            'edge-distances': 'node-position',
            'source-endpoint': '90deg',
            'target-endpoint': '270deg'
        }
    }
]