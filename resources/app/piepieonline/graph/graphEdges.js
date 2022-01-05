function createEdges(edges)
{
    cy.startBatch()

    const startingOffset = 15;

    for (let edge of Object.values(edges)) {
        // Ignore exceptions if the two points are on top of each other
        // TODO: Maths to avoid this
        try 
        {
            if (edge.data) {
                // get nodes positions for source and target
                let src = edge.source().position()
                let tgt = edge.target().position()
                // get endpoints positions for source and target
                let srcEp = edge.sourceEndpoint()
                let tgtEp = edge.targetEndpoint()
        
                // compute weight and distance for the point that will be added to the edge
                // the point will be added aligned horizontally with "source endpoint", and vertically 25px above target endpoint
                let points;
                
                // Normal case, go straight from us to them
                if(src.x < tgt.x)
                {
                    points = [
                        getDistWeight(src.x, src.y, tgt.x, tgt.y, srcEp.x + startingOffset, srcEp.y),
                        getDistWeight(src.x, src.y, tgt.x, tgt.y, srcEp.x + ((tgtEp.x - srcEp.x) / 2), srcEp.y),
                        getDistWeight(src.x, src.y, tgt.x, tgt.y, srcEp.x + ((tgtEp.x - srcEp.x) / 2), tgtEp.y),
                        getDistWeight(src.x, src.y, tgt.x, tgt.y, tgtEp.x - startingOffset, tgtEp.y)
                    ];
                }
                else
                // The point is behind, we need very different lines
                {
                    let vertOffset = 100;
                    const lowestOffset = Math.max(srcEp.y + vertOffset, tgtEp.y + vertOffset);


                    points = [
                        getDistWeight(src.x, src.y, tgt.x, tgt.y, srcEp.x + startingOffset, srcEp.y),
                        getDistWeight(src.x, src.y, tgt.x, tgt.y, srcEp.x + startingOffset, lowestOffset),
                        getDistWeight(src.x, src.y, tgt.x, tgt.y, tgtEp.x - startingOffset, lowestOffset),
                        getDistWeight(src.x, src.y, tgt.x, tgt.y, tgtEp.x - startingOffset, tgtEp.y)
                    ]; 
                }

                // set the values
                edge.style('segment-distances', points.reduce( (prev, curr) => prev + ' ' + curr.ResultDistance, '' ))
                edge.style('segment-weights', points.reduce( (prev, curr) => prev + ' ' + curr.ResultWeight, '' ))
            }
        }
        catch (ex) {}

    }

    cy.endBatch()
}

function getDistWeight(sX, sY, tX, tY, PointX, PointY) {
    var W, D;

    D = (PointY - sY + (sX - PointX) * (sY - tY) / (sX - tX)) / Math.sqrt(1 + Math.pow((sY - tY) / (sX - tX), 2));
    W = Math.sqrt(Math.pow(PointY - sY, 2) + Math.pow(PointX - sX, 2) - Math.pow(D, 2));

    var distAB = Math.sqrt(Math.pow(tX - sX, 2) + Math.pow(tY - sY, 2));
    W = W / distAB;

    //check whether the point (PointX, PointY) is on right or left of the line src to tgt. for instance : a point C(X, Y) and line (AB).  d=(xB-xA)(yC-yA)-(yB-yA)(xC-xA). if d>0, then C is on left of the line. if d<0, it is on right. if d=0, it is on the line.
    var delta1 = (tX - sX) * (PointY - sY) - (tY - sY) * (PointX - sX);
    switch (true) {
        case (delta1 >= 0):
            delta1 = 1;
            break;
        case (delta1 < 0):
            delta1 = -1;
            break;
    }
    //check whether the point (PointX, PointY) is "behind" the line src to tgt
    var delta2 = (tX - sX) * (PointX - sX) + (tY - sY) * (PointY - sY);
    switch (true) {
        case (delta2 >= 0):
            delta2 = 1;
            break;
        case (delta2 < 0):
            delta2 = -1;
            break;
    }

    D = Math.abs(D) * delta1;   //ensure that sign of D is same as sign of delta1. Hence we need to take absolute value of D and multiply by delta1
    W = W * delta2;

    return {
        ResultDistance: D,
        ResultWeight: W
    };
}
