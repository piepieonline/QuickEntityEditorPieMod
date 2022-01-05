var requestedId = "3b76e348074caab2";

var loadedModelJSON;

function init() {
    var $ = go.GraphObject.make;

    myDiagram =
        $(go.Diagram, "myDiagramDiv",
            {
                initialContentAlignment: go.Spot.Left,
                initialAutoScale: go.Diagram.UniformToFill,
                layout: $(go.LayeredDigraphLayout,
                    { direction: 0 }),
                "undoManager.isEnabled": true
            }
        );

    // when the document is modified, add a "*" to the title and enable the "Save" button
    myDiagram.addDiagramListener("Modified", function (e) {
        var button = document.getElementById("SaveButton");
        if (button) button.disabled = !myDiagram.isModified;
        var idx = document.title.indexOf("*");
        if (myDiagram.isModified) {
            if (idx < 0) document.title += "*";
        } else {
            if (idx >= 0) document.title = document.title.substr(0, idx);
        }
    });

    function makePort(label, name, leftside, maxLinks = 1) {
        var port = $(go.Shape, "Rectangle",
            {
                fill: "gray", stroke: null,
                desiredSize: new go.Size(8, 8),
                portId: name + (leftside ? "_In" : "_Out"),  // declare this object to be a "port"
                toMaxLinks: maxLinks,  // don't allow more than one link into a port
                cursor: "pointer"  // show a different cursor to indicate potential link point
            });

        var lab = $(go.TextBlock, label,  // the name of the port
            { font: "7pt sans-serif" });

        var panel = $(go.Panel, "Horizontal",
            { margin: new go.Margin(2, 0) });

        // set up the port/panel based on which side of the node it will be on
        if (leftside) {
            port.toSpot = go.Spot.Left;
            port.toLinkable = true;
            lab.margin = new go.Margin(1, 0, 0, 1);
            panel.alignment = go.Spot.TopLeft;
            panel.add(port);
            panel.add(lab);
        } else {
            port.fromSpot = go.Spot.Right;
            port.fromLinkable = true;
            lab.margin = new go.Margin(1, 1, 0, 0);
            panel.alignment = go.Spot.TopRight;
            panel.add(lab);
            panel.add(port);
        }
        return panel;
    }

    function makeTemplate(typename, background, inports, outports) {
        var node = $(go.Node, "Spot",
            $(go.Panel, "Auto",
                { width: 150, height: 200 },
                $(go.Shape, "Rectangle",
                    {
                        fill: background, stroke: null, strokeWidth: 0,
                        spot1: go.Spot.TopLeft, spot2: go.Spot.BottomRight
                    }),
                $(go.Panel, "Spot",
                    { width: 150, height: 200 },
                    $(go.TextBlock,
                        {
                            alignment: go.Spot.TopCenter,
                            alignmentFocus: go.Spot.TopCenter,
                            editable: true,
                            stroke: "white",
                            font: "bold 11pt sans-serif"
                        },
                        new go.Binding("text", "name").makeTwoWay())),
                $(go.TextBlock, typename,
                    {
                        alignment: go.Spot.BottomCenter,
                        alignmentFocus: go.Spot.BottomCenter,
                        stroke: "white",
                        font: "bold 11pt sans-serif"
                    }
                )
            ),
            $(go.Panel, "Vertical",
                {
                    alignment: go.Spot.Left,
                    alignmentFocus: new go.Spot(0, 0.5, 8, 0)
                },
                [makePort("Entity ID", "Event", true), inports]),
            $(go.Panel, "Vertical",
                {
                    alignment: go.Spot.Right,
                    alignmentFocus: new go.Spot(1, 0.5, -8, 0)
                },
                [makePort("Entity ID", "EntityID", false), ...outports])
        );
        myDiagram.nodeTemplateMap.set(typename, node);
    }

    createTemplates(makeTemplate, makePort);

    myDiagram.linkTemplate =
        $(go.Link,
            {
                routing: go.Link.Orthogonal, corner: 5,
                relinkableFrom: true, relinkableTo: true
            },
            $(go.Shape, { strokeWidth: 2 }, new go.Binding("stroke", "color")),
            $(go.Shape, { toArrow: "Standard" }, new go.Binding("stroke", "color"), new go.Binding("fill", "color")),
            $(go.TextBlock,
                { segmentIndex: 0, segmentOffset: new go.Point(15, 0), segmentOrientation: go.Link.OrientUpright },
                new go.Binding("text", "text"))
        );
}

// Show the diagram's model in JSON format that the user may edit
function save() {
    // console.log(myDiagram.model.toJson());

    var oldModel = JSON.parse(loadedModelJSON);

    const newNodeData = myDiagram.model.nodeDataArray.filter(graphNode =>
        !oldModel.nodeDataArray.find(oldNode => oldNode.key === graphNode.key)
    );

    const newLinkData = myDiagram.model.linkDataArray.filter(graphLink =>
        !oldModel.linkDataArray.find(oldLink => {
            var match = oldLink.from === graphLink.from && oldLink.to === graphLink.to && oldLink.fromID === graphLink.fromID && oldLink.toID === graphLink.toID
            console.log(match)
            return match;
        })
    );

    console.log(newNodeData);
    console.log(newLinkData);

    createTemplateVariant(newNodeData, newLinkData).then(newJson => {
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(newJson));
        var dlAnchorElem = document.getElementById('downloadAnchorElem');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `${window.level}_mod.entity.patch.json`);
        dlAnchorElem.click();
    })
}

function load(id) {
    myDiagram.model.clear();
    createModel(id).then(model => {
        myDiagram.model = go.Model.fromJson(model);
        loadedModelJSON = JSON.stringify(model);
    });
        
}

var nodeAddedCount = 0;
function addNode(nodeType)
{
    myDiagram.startTransaction("make new node");
    myDiagram.model.addNodeData({
        key: nodeAddedCount++,
        type: nodeType,
        name: nodeType
    });
    myDiagram.commitTransaction("make new node");  
}

window.addEventListener('DOMContentLoaded', init);