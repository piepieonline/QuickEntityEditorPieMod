function setObjectPosAndRot(obj, entity, setPosition = true, setRotation = true)
{
    if(!entity.properties.m_mTransform) return;

    if(setPosition)
    {
        obj.position.x = parseFloat(entity.properties.m_mTransform.value.position.x);
        obj.position.y = parseFloat(entity.properties.m_mTransform.value.position.z);
        obj.position.z = -parseFloat(entity.properties.m_mTransform.value.position.y);
    }

    if(setRotation)
    {
        obj.rotation.x = THREE.MathUtils.degToRad(parseFloat(entity.properties.m_mTransform.value.rotation.x));
        obj.rotation.y = -THREE.MathUtils.degToRad(parseFloat(entity.properties.m_mTransform.value.rotation.z));
        obj.rotation.z = -THREE.MathUtils.degToRad(parseFloat(entity.properties.m_mTransform.value.rotation.y));
    }
}

function readH3Position(entityVector)
{
    return {
        x: parseFloat(entityVector.x),
        y: parseFloat(entityVector.z),
        z: -parseFloat(entityVector.y)
    }
}

function createCylinderMarker(geometryWidth, geometryHeight)
{
    const geometry = new THREE.CylinderGeometry( geometryWidth, geometryWidth, geometryHeight, 16 );
    geometry.applyMatrix4( new THREE.Matrix4().makeTranslation(0, geometryHeight / 2, 0) );

    const frontGeometry = new THREE.BoxGeometry( .1, .1, .1 );
    frontGeometry.applyMatrix4( new THREE.Matrix4().makeTranslation(0, geometryHeight / 2, geometryWidth) );

    geometry.merge(frontGeometry);

    return geometry
}