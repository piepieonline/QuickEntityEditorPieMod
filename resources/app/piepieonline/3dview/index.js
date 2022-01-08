function load(idWithFocus)
{
    console.log(`init with id: ${idWithFocus}`);

    THREE.Object3D.DefaultUp.set(0, 0, 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color( 'gray' );

    const camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
    
    const light = new THREE.DirectionalLight( 0xffffff, .2 );
    light.position.set( 1, 1, 1 ).normalize();
    scene.add( light );

    const aLight = new THREE.AmbientLight( 0x404040, 1 );
    aLight.position.set( 1, 1, 1 ).normalize();
    scene.add( aLight );

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );

    document.body.appendChild( renderer.domElement );
    
    const clock = new THREE.Clock();
    const controls = new FlyControls( camera, renderer.domElement );
    controls.movementSpeed = 6.0;
    controls.rollSpeed = 0.1;

    const raycaster = new THREE.Raycaster();
    const mouseLocation = new THREE.Vector2();

    const threeMeshList = {};
    createWorld(scene, threeMeshList);

    if(threeMeshList[idWithFocus])
    {
        camera.position.x = threeMeshList[idWithFocus].position.x;
        camera.position.y = threeMeshList[idWithFocus].position.y;
        camera.position.z = threeMeshList[idWithFocus].position.z;
    }
    else
    {
        camera.position.z = 5;
    }
    
    var animate = function () {
        requestAnimationFrame( animate );
    
        controls.update(clock.getDelta());

        findSelectedObject();

        renderer.render( scene, camera );
    };
    
    function ObjectSelected(meshObject)
    {
        console.log(meshObject);
        console.log(externallyLoadedModel.entities[meshObject.entityID]);
    }

    let INTERSECTED;
    let lastSelected = [];
    let doCastRay = false;
    function findSelectedObject()
    {
        if(!doCastRay) return; else doCastRay = false;

        function actuallySelectObject(objectToSelect)
        {
            if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );

            INTERSECTED = objectToSelect;

            INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
            INTERSECTED.material.emissive.setHex( 0xff0000 );

            ObjectSelected(objectToSelect);
        }

        const intersects = raycaster.intersectObjects( scene.children, false );

        if ( intersects.length > 0 ) {

            if ( INTERSECTED != intersects[ 0 ].object ) {
                actuallySelectObject(intersects[ 0 ].object);

                lastSelected = [ intersects[ 0 ].object ];
            } 
            else
            {
                let highestIndex = -1;
                for (let intersect of intersects)
                {
                    const eleIndex = lastSelected.indexOf(intersect.object);
                    if(eleIndex === -1)
                    {
                        lastSelected.splice(0, 0, intersect.object);
                        highestIndex = 0;
                        break;
                    }
                    else
                    {
                        highestIndex = Math.max(eleIndex, highestIndex);
                    }
                }
                if(highestIndex >= 0)
                {
                    // if(INTERSECTED != lastSelected[highestIndex])
                    {
                        lastSelected.splice(0, 0, lastSelected.splice(highestIndex, 1)[0]);
                        actuallySelectObject(lastSelected[0]);
                    }
                }
            }

        } else {

            if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );

            INTERSECTED = null;

        }
    }

    function onWindowResize() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    
        renderer.setSize( window.innerWidth, window.innerHeight );
    }

    function onMouseDown(event) {
        mouseLocation.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouseLocation.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

        raycaster.setFromCamera( mouseLocation, camera );

        doCastRay = true;
    }

    window.addEventListener( 'resize', onWindowResize );
    renderer.domElement.addEventListener( 'mousedown', onMouseDown );

    animate();
}