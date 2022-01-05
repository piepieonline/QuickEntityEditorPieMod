function load(idWithFocus)
{
    console.log(`init with id: ${idWithFocus}`);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color( 'gray' );
    const camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
    
    const light = new THREE.DirectionalLight( 0xffffff, 1 );
    light.position.set( 1, 1, 1 ).normalize();
    scene.add( light );

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
    
    let INTERSECTED;
    function findSelectedObject()
    {
        const intersects = raycaster.intersectObjects( scene.children, false );

        if ( intersects.length > 0 ) {

            if ( INTERSECTED != intersects[ 0 ].object ) {

                if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );

                INTERSECTED = intersects[ 0 ].object;
                INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
                INTERSECTED.material.emissive.setHex( 0xff0000 );

                console.log(intersects[0].object)
                console.log(externallyLoadedModel.entities[intersects[0].object.entityID])
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
    }

    window.addEventListener( 'resize', onWindowResize );
    renderer.domElement.addEventListener( 'mousedown', onMouseDown );

    animate();
}