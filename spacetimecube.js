import * as THREE from 'three';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

import { CSS3DRenderer , CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';



// initial elements of the 3D scene
var controls, camera, glScene, cssScene, glRenderer, cssRenderer;
var theMap = null;

var map_length, map_width, map_height;
map_length = 2800;
map_width = 2400;
map_height = 2000;
//var map_center = {lat: 54.875 , lng: 30.9};
//var map_center = {lat: 12.974851 , lng: 77.618414};
var map_center = {lat: 52.3552 , lng: 4.8957};
//var map_scale = 7;
var map_scale = 13;


mapboxgl.accessToken = 'pk.eyJ1IjoicG9vcm5pLWJhZHJpbmF0aCIsImEiOiJjanUwbmYzc3UwdDI3NGRtZ3kzMTltbWZpIn0.SB9PEksVcEwWvZJ9A7J9uA';

// the app starts in initialize()

initialize();

function initialize() {

    camera = new THREE.PerspectiveCamera( 50,  window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, -3000, 3500)
    glRenderer = createGlRenderer();
    cssRenderer = createCssRenderer();
    //document.body.appendChild(glRenderer.domElement);
    document.body.appendChild(cssRenderer.domElement);
    cssRenderer.domElement.appendChild(glRenderer.domElement);


    glScene = new THREE.Scene();
    cssScene = new THREE.Scene();
    var ambientLight = new THREE.AmbientLight(0x555555);
    glScene.add(ambientLight);
    var directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set( 1000, -2, 10 ).normalize();
    glScene.add(directionalLight);

    var directionalLight_3 = new THREE.DirectionalLight(0xFFFFFF, 1.0);
    directionalLight_3.position.set(0, 0, 2300);
    directionalLight_3.target.position.set( 1400, 800, 0 );
    directionalLight_3.castShadow = true;
    directionalLight_3.shadow.camera.near	= 0.01;
    directionalLight_3.shadow.camera.far	= 3000;
    directionalLight_3.shadow.camera.top = 1200;
    directionalLight_3.shadow.camera.bottom = -1200;
    directionalLight_3.shadow.camera.left  = -1400;
    directionalLight_3.shadow.camera.right = 1400;

    //var helper = new THREE.CameraHelper( directionalLight_3.shadow.camera );
    glScene.add(directionalLight_3);
    //glScene.add(helper);


    creatAixs();

    createMap();

    createFlows();

    //_____

    /*
    var raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    glRenderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
    //glRenderer.domElement.addEventListener( 'touchstart', onDocumentTouchStart, false );
    //window.addEventListener( 'resize', onWindowResize, false );
    */

    controls = new TrackballControls(camera,cssRenderer.domElement);
    controls.rotateSpeed = 2;
    controls.minDistance = 30;
    controls.maxDistance = 8000;


    update();
}

function createGlRenderer() {
    var glRenderer = new THREE.WebGLRenderer({alpha:true});
    glRenderer.setClearColor(0x000000, 0);
    glRenderer.setPixelRatio(window.devicePixelRatio);
    glRenderer.setSize(window.innerWidth, window.innerHeight);
    glRenderer.domElement.style.position = 'absolute';
    //glRenderer.domElement.style.zIndex = 0;
    glRenderer.domElement.style.top = 0;

    //glRenderer.domElement.appendChild(cssRenderer.domElement);
    //glRenderer.domElement.appendChild(cssRenderer.domElement);
    glRenderer.shadowMap.enabled = true;
    //glRenderer.shadowMap.type = THREE.PCFShadowMap;
    //glRenderer.shadowMapAutoUpdate = true;

    return glRenderer;
}

function createCssRenderer() {
    var cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.zIndex = 1;
    cssRenderer.domElement.style.top = 1;
    //cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.shadowMapAutoUpdate = true;
    return cssRenderer;
}

function createMap() {

    d3.selectAll('.map-div')
        .data([1]).enter()
        .append("div")
        .attr("class", "map-div")
        .attr("id","mappad")
        .each(function (d) {

            var map = new mapboxgl.Map({
                container: 'mappad', // container ID
                style: 'mapbox://styles/mapbox/streets-v12', // style URL
                center: [ map_center.lng,map_center.lat], // starting position [lng, lat]
                zoom: map_scale, // starting zoom,
                dragPan:false,
                scrollZoom:false,

            });
            theMap = map;
        });

    var mapContainer = document.getElementById("mappad");
    var cssObject = new CSS3DObject(mapContainer);
    cssObject.position.x = 0;
    cssObject.position.y = 0;
    cssObject.position.z = 0;
    cssObject.receiveShadow	= true;
    cssScene.add(cssObject);

}

function creatAixs(){
    //create axis
    var material = new THREE.LineBasicMaterial({color: 0x000000, opacity: 0.5});

    //create axis
    const points = [];

    var x= map_length/2, y=map_width/2, z=map_height;
    points.push( new THREE.Vector3(  x, y, z ) );
    points.push( new THREE.Vector3(  x, y, 0 ) );
    points.push( new THREE.Vector3(  x, y, z ) );

    points.push( new THREE.Vector3(  x, -y, z ) );
    points.push( new THREE.Vector3(  x, -y, 0 ) );
    points.push( new THREE.Vector3(  x, -y, z ) );

    points.push( new THREE.Vector3( -x, -y, z ) );
    points.push( new THREE.Vector3( -x, -y, 0 ) );
    points.push( new THREE.Vector3( -x, -y, z ) );

    points.push( new THREE.Vector3(  -x, y, z ) );
    points.push( new THREE.Vector3(  -x, y, 0 ) );
    points.push( new THREE.Vector3(  -x, y, z ) );
    points.push( new THREE.Vector3(  x, y, z ) );

    const geometry = new THREE.BufferGeometry().setFromPoints( points );
    const line = new THREE.Line( geometry, material );
    //add all the element to sence
    glScene.add( line);

}

function convert(vertex) {
    return new THREE.Vector3(vertex[0], vertex[1], vertex[2]);
}

function convert2D(vertex) {
    return new THREE.Vector2(vertex[0], vertex[1]);
}

function drawCylinderLines(vertices,durations,coor) {//,troops,temperatures

    var vertex, geometry, material, mesh;
    var max = d3.max(durations);
    var min = d3.min(durations);
    console.log(max, min)

    //set the range of troops
    var trooplinear = d3.scaleLinear([min, max],[2, 20] );
    var temperaturelinear = d3.scaleLinear([d3.min(durations), d3.max(durations)], [ "blue","red"]);

    var segments = new THREE.Object3D();
    vertices = vertices.map(convert);
    //console.log(vertices)

    for (var i = 1, len = vertices.length - 1; i < len; i++) {

        var path = new THREE.QuadraticBezierCurve3(vertices[i-1],vertices[i], vertices[i+1]);
        var color = temperaturelinear(durations[i]);
        vertex = vertices[i];

        geometry = new THREE.TubeGeometry(path, 4 ,trooplinear(durations[i]) ,16);
        material = new THREE.MeshLambertMaterial({
            opacity: 1,
            transparent: true,
            color: color
        });

        mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = true;

        segments.add(mesh);

    }

    return segments;
}

function drawLinesOnPlane(vertices,troops,temperatures,coor) { var vertex, geometry, material, mesh;
    var max = d3.max(troops);
    var min = d3.min(troops);

    //set the range of troops
    var trooplinear = d3.scaleLinear([min, max], [2, 20]);
    var temperaturelinear = d3.scaleLinear([d3.min(temperatures), d3.max(temperatures)], [ "blue","red"]);

    var segments = new THREE.Object3D();
    vertices = vertices.map(convert2D);

    var pointlast1 = new THREE.Vector2(vertices[0].x,vertices[0].y);
    var pointlast2 = new THREE.Vector2(vertices[0].x,vertices[0].y);

    for (var i = 0, len = vertices.length; i < len - 2; i++) {
        var color = temperaturelinear(temperatures[i]);
        vertex = vertices[i];

        var vector1 = new THREE.Vector2 ( vertices[i+1].x - vertices[i].x , vertices[i+1].y - vertices[i].y );
        var angle1 = vector1.angle();

        var vector2 = new THREE.Vector2 ( vertices[i+2].x - vertices[i+1].x , vertices[i+2].y - vertices[i+1].y );
        var angle2 = vector2.angle();


        var angle = 0.5*(angle1 + angle2);


        var angleX = Math.sin(angle);
        var angleY = Math.cos(angle);

        var pointtemp1 = new THREE.Vector2( vertices[i+1].x - trooplinear(troops[i+1])/2 * angleX,
            vertices[i+1].y + trooplinear(troops[i+1])/2 * angleY );
        var pointtemp2 = new THREE.Vector2( vertices[i+1].x + trooplinear(troops[i+1])/2 * angleX,
            vertices[i+1].y - trooplinear(troops[i+1])/2 * angleY );



        if(pointtemp1.y < pointtemp2.y)
        {
            var point = pointtemp1;
            pointtemp1 = pointtemp2;
            pointtemp2 = point;

        }
        if(pointlast1.y < pointlast2.y)
        {
            var point = pointtemp1;
            pointlast1 = pointlast2;
            pointlast2 = point;

        }

        var point1 = pointlast1,
            point2 = pointtemp1,
            point3 = pointtemp2,
            point4 = pointlast2;

        if(point1.x < point2.x && point3.x < point4.x)
        {
            //console.log("point3.x < point4.x happend");
            var pointtt = point3;
            point3 = point4;
            point4 = pointtt;
        }
        else if(point1.x > point2.x && point3.x > point4.x)
        {
            //console.log("point3.x < point4.x happend");
            var pointtt = point3;
            point3 = point4;
            point4 = pointtt;
        }




        var californiaPts = [];
        californiaPts.push( point1 );
        californiaPts.push(point2 );
        californiaPts.push(point3 );
        californiaPts.push( point4 );

        var flowShape = new THREE.Shape(californiaPts);
        var geometry = new THREE.ShapeGeometry( flowShape );


        var mesh = new THREE.Mesh( geometry, new THREE.MeshPhongMaterial( { color: color, side: THREE.DoubleSide, transparent: true,
            opacity: 0.6} ) );
        mesh.position.z = 5;
        segments.add(mesh);

        pointlast1 = pointtemp1;
        pointlast2 = pointtemp2;




    }

    /*
    for (var i = 0, len = vertices.length; i < len - 2; i++) {
        var color = temperaturelinear(temperatures[i]);
        vertex = vertices[i];

        var vectorthis = new THREE.Vector2 ( vertices[i+1].x - vertices[i].x , vertices[i+1].y - vertices[i].y );
        var angle = vectorthis.angle();
        var angleX = Math.sin(angle);
        var angleY = Math.cos(angle);

        var californiaPts = [];
        californiaPts.push( new THREE.Vector2 ( vertices[i].x - trooplinear(troops[i])/2 * angleX ,
                                                vertices[i].y + trooplinear(troops[i])/2 * angleY));
        californiaPts.push( new THREE.Vector2 ( vertices[i+1].x - trooplinear(troops[i+1])/2 * angleX,
                                                vertices[i+1].y + trooplinear(troops[i+1])/2 * angleY ) );
        //californiaPts.push( new THREE.Vector2 ( vertices[i+2].x - trooplinear(troops[i+2])/2 * angleX,
        //                                        vertices[i+2].y + trooplinear(troops[i+2])/2 * angleY ) );
        //californiaPts.push( new THREE.Vector2 ( vertices[i+2].x + trooplinear(troops[i+2])/2 * angleX,
        //                                        vertices[i+2].y - trooplinear(troops[i+2])/2 * angleY ) );
        californiaPts.push( new THREE.Vector2 ( vertices[i+1].x + trooplinear(troops[i+1])/2 * angleX,
                                                vertices[i+1].y - trooplinear(troops[i+1])/2 * angleY ) );
        californiaPts.push( new THREE.Vector2 ( vertices[i].x + trooplinear(troops[i])/2 * angleX ,
                                                vertices[i].y - trooplinear(troops[i])/2 * angleY ) );

        var flowShape = new THREE.Shape(californiaPts);
        var geometry = new THREE.ShapeGeometry( flowShape );
        var mesh = new THREE.Mesh( geometry, new THREE.MeshPhongMaterial( { color: color, side: THREE.DoubleSide, transparent: true,
                                    opacity: 0.6} ) );
        mesh.position.z = 5;
        segments.add(mesh);

    }
    */


    return segments;
}

async function createFlows() {

    //const data = await d3.json("data/minardData.json");
    const data_raw = await d3.json("grouped_data.json");

    const data = d3.group(data_raw, d=>d.route);
    //console.log(data);

    var pointOrigin = {
        x: 0,y:0
    };

    var point_center = theMap.project(new mapboxgl.LngLat(map_center.lng, map_center.lat));

    var point = new THREE.Vector3(0,0,0);

    data.forEach(function(trip){

        console.log(trip)

        var coor = [];

        var points = [], durations = [], count = trip.length;

        for(var i = 0; i < count; i++)
        {
            //every stop of the troops
            var stop = trip[i];

            //project => (lng, lat)
            var temp_point =  theMap.project( new mapboxgl.LngLat(stop.longitude , stop.latitude));

            point.x = temp_point.x - pointOrigin.x - map_length/2;
            point.y = 2* point_center.y - temp_point.y - pointOrigin.y - map_width/2 ;
            //point.z = stop.durationsec*10;
            point.z = i*10;

            coor.push({lat:stop.latitude, lng:stop.longitude });
            points.push([point.x, point.y, point.z]);
            durations.push(stop.duration);
            //temperatures.push(10);
        }

        console.log(coor)


        var flow_3D = drawCylinderLines(points,durations,coor);
        flow_3D.castShadow = true;
        flow_3D.receiveShadow = true;
        glScene.add(flow_3D);

        //var flow_2D = drawLinesOnPlane(points,durations,coor);
        //glScene.add(flow_2D);

    });





}

function update() {
    controls.update();
    cssRenderer.render(cssScene, camera);
    glRenderer.render(glScene, camera);
    requestAnimationFrame(update);
}
