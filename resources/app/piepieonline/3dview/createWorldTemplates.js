function createNPC(entity)
{
    const geometry = new THREE.CylinderGeometry( .35, .35, .1, 16 );
    const material = new THREE.MeshLambertMaterial( {color: 0x8dff45} );

    const meshObj = new THREE.Mesh( geometry, material );

    setObjectPosAndRot(meshObj, entity);

    return meshObj;
}

function createPlayerSpawn(entity)
{
    const geometry = new THREE.CylinderGeometry( .35, .35, .1, 16 );
    const material = new THREE.MeshLambertMaterial( {color: 0xfcff45} );

    const meshObj = new THREE.Mesh( geometry, material );

    setObjectPosAndRot(meshObj, entity);

    return meshObj;
}

function createCoverPlane(entity)
{
    let coverSize = parseFloat(entity?.properties?.m_fCoverLength?.value);

    if(Number.isNaN(coverSize))
        return false;

    const geometry = new THREE.PlaneGeometry( coverSize, 1 );
    const material = new THREE.MeshLambertMaterial( {color: 0xfffdbe, side: THREE.DoubleSide} );

    const meshObj = new THREE.Mesh( geometry, material );

    setObjectPosAndRot(meshObj, entity);

    return meshObj;
}

function createLevelKitItem(entity)
{
    const match = entity.template.match(/(\d+)x(\d+)/);

    if(!match) return false;

    let width = parseFloat(match[1]);
    let depth = parseFloat(match[2]);

    let color = 0xeeeeee;

    if(entity.template.indexOf('grass') >= 0) {
        color = 0x54ad4b;
    } else if(entity.template.indexOf('water') >= 0) {
        color = 0x2b71d9;
    } 

    if(entity.template.indexOf('sidewalk') === -1) return;

    const geometry = new THREE.PlaneGeometry( width, depth );
    const material = new THREE.MeshLambertMaterial( { color } );

    const meshObj = new THREE.Mesh( geometry, material );

    setObjectPosAndRot(meshObj, entity, true, false);

    meshObj.rotation.set(-Math.PI/2, Math.PI/2000, THREE.MathUtils.degToRad(parseFloat(entity.properties.m_mTransform.value.rotation.y)));

    return meshObj;
}