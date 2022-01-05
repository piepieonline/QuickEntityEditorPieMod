function setObjectPosAndRot(obj, entity, setPosition = true, setRotation = true)
{
    if(setPosition)
    {
        obj.position.x = parseFloat(entity.properties.m_mTransform.value.position.x);
        obj.position.y = parseFloat(entity.properties.m_mTransform.value.position.z);
        obj.position.z = parseFloat(entity.properties.m_mTransform.value.position.y);
    }

    if(setRotation)
    {
        obj.rotation.x = THREE.MathUtils.degToRad(parseFloat(entity.properties.m_mTransform.value.rotation.x));
        obj.rotation.y = THREE.MathUtils.degToRad(parseFloat(entity.properties.m_mTransform.value.rotation.z));
        obj.rotation.z = THREE.MathUtils.degToRad(parseFloat(entity.properties.m_mTransform.value.rotation.y));
    }
}