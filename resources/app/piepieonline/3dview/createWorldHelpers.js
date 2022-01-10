function setObjectPosAndRot(obj, entity, setPosition = true, setRotation = true)
{
    if(!entity.properties.m_mTransform) return;

    const { pX, pY, pZ, rX, rY, rZ } = readEntityPosition(entity);
    
    if(setPosition)
    {
        
        obj.position.x = pX;
        obj.position.y = pY;
        obj.position.z = pZ;
    }

    if(setRotation)
    {
        obj.rotation.x = rX;
        obj.rotation.y = rY;
        obj.rotation.z = rZ;
    }
}

function readEntityPosition(entity)
{
    const createOutputObject = (pX, pY, pZ, rX, rY, rZ) => ({ pX, pY, pZ, rX, rY, rZ });

    const transform = entity?.properties?.m_mTransform?.value;

    if(!transform)
    {
        return createOutputObject(0, 0, 0, 0, 0, 0);
    }

    const position = readH3Vector(transform.position);
    const rotation = readH3Rotation(transform.rotation);

    const parentRef = entity.properties.m_eidParent?.value || entity.postInitProperties.m_eidParent?.value || null;

    if(parentRef)
    {
        const parentEntity = parentRef.externalScene ? window.externalScenes[h3Hash(parentRef.externalScene)]?.entities[parentRef.ref] : window.externallyLoadedModel.entities[parentRef.ref || parentRef];
        const parentTransform = readEntityPosition(parentEntity);

        return createOutputObject(
            position.x + parentTransform.pX,
            position.y + parentTransform.pY,
            position.z + parentTransform.pZ,
            rotation.x + parentTransform.rX,
            rotation.y + parentTransform.rY,
            rotation.z + parentTransform.rZ
        );
    }
    else
    {
        return createOutputObject(
            position.x,
            position.y,
            position.z,
            rotation.x,
            rotation.y,
            rotation.z
        );
    }
}

function readH3Vector(entityVector)
{
    return {
        x: parseFloat(entityVector.x),
        y: parseFloat(entityVector.z),
        z: -parseFloat(entityVector.y)
    }
}

function readH3Rotation(entityRotation)
{
    return {
        x: THREE.MathUtils.degToRad(parseFloat(entityRotation.x)),
        y: -THREE.MathUtils.degToRad(parseFloat(entityRotation.z)),
        z: -THREE.MathUtils.degToRad(parseFloat(entityRotation.y))
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