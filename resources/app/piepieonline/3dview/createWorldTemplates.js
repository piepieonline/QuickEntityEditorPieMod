function createNPC(entity)
{
    const geometry = createCylinderMarker(.35, 1.8);

    const material = new THREE.MeshLambertMaterial( {color: 0x8dff45 } );

    const meshObj = new THREE.Mesh( geometry, material );

    setObjectPosAndRot(meshObj, entity);

    return meshObj;
}

function createAction(entity)
{
    const geometry = createCylinderMarker(.4, .1);

    const material = new THREE.MeshLambertMaterial( {color: 0xacf2e9 } );

    const meshObj = new THREE.Mesh( geometry, material );

    setObjectPosAndRot(meshObj, entity);

    return meshObj;
}

function createPlayerSpawn(entity)
{
    const geometry = createCylinderMarker(.35, .1);

    const material = new THREE.MeshLambertMaterial( {color: 0xfcff45 } );

    const meshObj = new THREE.Mesh( geometry, material );

    setObjectPosAndRot(meshObj, entity);

    return meshObj;
}

function createProp(entity)
{
    const geometry = createCylinderMarker(.15, .15);

    const material = new THREE.MeshLambertMaterial( {color: 0xaaaaaa } );

    const meshObj = new THREE.Mesh( geometry, material );

    setObjectPosAndRot(meshObj, entity);

    meshObj.visible = false;

    return meshObj;
}

function createCoverPlane(entity)
{
    let coverSize = parseFloat(entity?.properties?.m_fCoverLength?.value);

    if(Number.isNaN(coverSize))
        return false;

    const geometry = new THREE.PlaneGeometry( coverSize, 1 );
    geometry.applyMatrix4( new THREE.Matrix4().makeTranslation(0, .5, 0) );

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

function createVolumeBox(entity)
{
    if(!(entity?.properties?.m_vGlobalSize?.value)) return false;
    
    const boxSize = readH3Vector(entity.properties.m_vGlobalSize.value, null);

    const geometry = new THREE.BoxGeometry( boxSize.x, boxSize.y, boxSize.z );
    geometry.applyMatrix4( new THREE.Matrix4().makeTranslation(0, boxSize.y / 2, 0) );

    const material = new THREE.MeshLambertMaterial( { color: 0xfffdbe, wireframe: true } );

    const meshObj = new THREE.Mesh( geometry, material );

    setObjectPosAndRot(meshObj, entity);

    meshObj.visible = false;

    return meshObj;
}

function createSmallGizmo(entity, color, addForwardMarker)
{
    const geometry = new THREE.SphereGeometry( .1 );
    geometry.applyMatrix4( new THREE.Matrix4().makeTranslation(0, .05, 0) );

    if(addForwardMarker)
    {
        const frontGeometry = new THREE.BoxGeometry( .05, .05, .05 );
        frontGeometry.applyMatrix4( new THREE.Matrix4().makeTranslation(0, .05, .1) );
    
        geometry.merge(frontGeometry);
    }

    const material = new THREE.MeshLambertMaterial( { color, wireframe: true } );

    const meshObj = new THREE.Mesh( geometry, material );

    setObjectPosAndRot(meshObj, entity);

    return meshObj;
}