function createWorld(scene, threeMeshList)
{
    function createWorldObject(entityID, mesh)
    {
        if(mesh)
        {
            threeMeshList[entityID] = mesh;
            mesh.entityID = entityID;
            scene.add(mesh);
        }

        return mesh;
    }

    for (const [entityID, entity] of Object.entries(externallyLoadedModel.entities)) {
        
        switch(entity.template)
        {
            case '[assembly:/templates/gameplay/ai2/actors.template?/npcactor.entitytemplate].pc_entitytype':
                createWorldObject(entityID, createNPC(entity));
                break;
            case '[modules:/zcoverplane.class].pc_entitytype':
                createWorldObject(entityID, createCoverPlane(entity));
                break;
        }

    }
}

function createNPC(entity)
{
    const geometry = new THREE.CylinderGeometry( .35, .35, .1, 16 );
    const material = new THREE.MeshLambertMaterial( {color: 0x8dff45} );

    const npcObj = new THREE.Mesh( geometry, material );

    setObjectPosAndRot(npcObj, entity);

    return npcObj;
}

function createCoverPlane(entity)
{
    let coverSize = parseFloat(entity?.properties?.m_fCoverLength?.value);

    if(Number.isNaN(coverSize))
        return false;

    const geometry = new THREE.PlaneGeometry( coverSize, 1 );
    const material = new THREE.MeshLambertMaterial( {color: 0xfffdbe, side: THREE.DoubleSide} );

    const npcObj = new THREE.Mesh( geometry, material );

    setObjectPosAndRot(npcObj, entity);

    return npcObj;
}