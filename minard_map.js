import * as THREE from 'three';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

import {CSS3DRenderer, CSS3DObject} from 'three/addons/renderers/CSS3DRenderer.js';
import {TrackballControls} from 'three/addons/controls/TrackballControls.js';

// initial elements of the 3D scene
var controls, camera, glScene, cssScene, glRenderer, cssRenderer;
var theMap = null;

var map_length, map_width, map_height;
map_length = 2800;
map_width = 2400;
map_height = 2000;
var map_center = {lat: 54.875, lng: 29.9};
//var map_center = {lat: 12.9748 51 , lng: 77.618414};
//var map_center = {lat: 52.3552 , lng: 4.8957};
var map_scale = 6.8;
//var map_scale = 13;

mapboxgl.accessToken = 'pk.eyJ1IjoicG9vcm5pLWJhZHJpbmF0aCIsImEiOiJjanUwbmYzc3UwdDI3NGRtZ3kzMTltbWZpIn0.SB9PEksVcEwWvZJ9A7J9uA';

// the app starts in initialize()

const tubes = [];

// process flow data
let globalFLowsData;
let globalSoldiersRange = [0, 0];
let globalTemperatureRange = [0, 0];
let globalTimeRange = [0, 0];
let timeSpan = 0;

let globalColorScale = null;
let globalThicknessScale = null;
let globalZAxisScale = null;
let globalTimeScale = null;
let corpsNameList = null;

let troopsSegments = [];
let troopTracks = [];
let timer_army = 0; // 时间从 0 到 24 小时，模拟一天


let globalDivers_ColorScale = d3.scaleOrdinal()
    .domain(d3.range(17))  // 17 个类别
    .range(d3.schemeSet3.concat([
        "#ff0000", "#ff7f00",
        "#ffff00", "#7fff00", "#3322d2"  // 额外补充 5 种颜色
    ]));

// visual variables
let formatDate = d3.timeFormat("%Y-%m-%d");
let formatYear = d3.timeFormat("%Y");

// 3D flow scene
let meshes = [];

//time
let globaleDateList = null;
let objects = [];
let isPlaying = false;
let currentDate = new Date(1812, 0, 1);
let startDate = null;
let endDate = null;
let totalDays = null;


let dataIcelandGeo = [];
let graphics3D = {

    //doc div parameters
    windowdiv_width: window.innerWidth,
    windowdiv_height: window.innerHeight,
    windowdiv_width_3DM: window.innerWidth,
    windowdiv_height_3DM: window.innerHeight,
    icelandCenter: [-18.5747641, 65.1865678],

    //graphic elements
    svg3DbaseMap: null,
    projection: null,

    //3D sence
    camera: null,
    glScene: null,
    cssScene: null,
    glRenderer: null,
    cssRenderer: null,
    controls: null,
    unitline3D: 120,
    linerValueScale: null,

    //3D for matrix
    camera_3DM: null,
    glScene_3DM: null,
    cssScene_3DM: null,
    glRenderer_3DM: null,
    controls_3DM: null,

    //2D graphic
    map_length: 2800,
    map_width: 2400,
    map_height: 2400,

    map_length_3DM: 1600,
    map_width_3DM: 1600,

    //other
    //centerMap: d3.map()
}


initialize();

async function initialize() {

    initialize3DScene()

    function initialize3DScene(){

        //-------------create 3D scene-------------
        camera = new THREE.PerspectiveCamera(60, 0.85 * window.innerWidth / window.innerHeight, 0.1, 10000);
        camera.position.set(0, -3000, 3500)
        glRenderer = createGlRenderer();
        cssRenderer = createCssRenderer();
        //document.body.appendChild(glRenderer.domElement);

        document.getElementById("scene-container").appendChild(cssRenderer.domElement);
        //document.body.appendChild(cssRenderer.domElement);
        cssRenderer.domElement.appendChild(glRenderer.domElement);
        cssRenderer.setSize(window.innerWidth * 0.85, window.innerHeight);
        glRenderer.setSize(window.innerWidth * 0.85, window.innerHeight);

        glScene = new THREE.Scene();
        cssScene = new THREE.Scene();

        //-------------create lights
        var ambientLight = new THREE.AmbientLight(0x555555);
        glScene.add(ambientLight);
        var directionalLight = new THREE.DirectionalLight(0xffffff);
        directionalLight.position.set(1000, -2, 10).normalize();
        glScene.add(directionalLight);

        var directionalLight_2 = new THREE.DirectionalLight(0xFFFFFF, 1.0);
        directionalLight_2.position.set(0, 0, 2300);
        directionalLight_2.target.position.set(1400, 800, 0);
        directionalLight_2.castShadow = true;
        directionalLight_2.shadow.camera.near = 0.01;
        directionalLight_2.shadow.camera.far = 3000;
        directionalLight_2.shadow.camera.top = 1200;
        directionalLight_2.shadow.camera.bottom = -1200;
        directionalLight_2.shadow.camera.left = -1400;
        directionalLight_2.shadow.camera.right = 1400;
        glScene.add(directionalLight_2);

        //var helper = new THREE.CameraHelper( directionalLight_2.shadow.camera );

        //glScene.add(helper);

        creatAixs();

        controls = new TrackballControls(camera, cssRenderer.domElement);
        controls.rotateSpeed = 2;
        controls.minDistance = 30;
        controls.maxDistance = 8000;


    }



// 创建射线投射器（用于检测鼠标和物体的交互）
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let selectedObject = null; // 记录当前选中的对象

    await readFlowsData().then((data) => {
        //data.map(d=>flowData.push(d));

        /*
        data.forEach(flow => {
            for(var i=0; i<flow.length-1;i++) {

                if(flow[i].attributes.DATA > flow[i+1].attributes.DATA){
                    console.log(i, formatDate (flow[i].attributes.DATA), formatDate(flow[i+1].attributes.DATA) )
                }
            }
        })

         */

        globalFLowsData = data.map(function (flow){
            return flow.sort((a, b) => d3.ascending(new Date(a.attributes.DATA), new Date(b.attributes.DATA)))
        });

        const filteredDate = Array.from(new Set(globalFLowsData.flat().map(d=>d.attributes.DATA)))

        globaleDateList = filteredDate.sort((a, b) => d3.ascending(a, b));

        startDate = new Date(globaleDateList[0]);

        var dateCount = globaleDateList.length;
        endDate = new Date(globaleDateList[dateCount-1]);
        totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);

        //console.log(globaleDateList.map(d=> formatDate(d)));

        //console.log("globalFLowsData",globalFLowsData);
        initLayerControls();
    })

    function initLayerControls() {
        corpsNameList = globalFLowsData.map((flow) => {
            return flow[0].attributes.CORPS;
        })

        const container = d3.select("#layerControls");

        const layersData = corpsNameList.map((name, index) => {
            return {
                name: name, value: index
            }
        });
        //console.log("layersData",layersData)

        // 为每个数据项创建一个复选框和对应的标签
        layersData.forEach((d, i) => {
            // 创建一个 <label> 元素
            const label = container.append("label")
                .attr("for", `checkbox-${i}`)
                .style("display", "block"); // 每个复选框独占一行

            // 在 <label> 内添加复选框
            label.append("input")
                .attr("type", "checkbox")
                .attr("id", `checkbox-${i}`)
                .attr("name", d.name)
                .attr("value", d.value)
                .property("checked", true); // 默认选中

            // 在 <label> 内添加显示的文本
            label.append("span")
                .text(d.name);
        });

        //console.log("corpsNameList", corpsNameList);
        // 图层控制

        layersData.forEach((d, i) => {
            var checkboxID = "checkbox-" + i;

            document.getElementById(checkboxID).addEventListener('change', function (event) {
                if (event.target.checked) {
                    camera.layers.enable(i + 1);
                } else {
                    camera.layers.disable(i + 1);
                }
            });
        })

        document.getElementById("viaToggle").addEventListener("change", function() {
            console.log("viaToggle",this.checked);
            resetLayerControls(this.checked)
        });

    }

    //console.log("globalFLowsData",globalFLowsData);


    globalColorScale = d3.scaleLinear().domain(globalTemperatureRange).range(["blue", "red"]);

    globalThicknessScale = d3.scaleLinear().domain(globalSoldiersRange).range([3, 50]);

    globalZAxisScale = d3.scaleLinear().domain(globalTimeRange).range([0, 1200]);

    globalTimeScale = d3.scaleLinear().domain(globalTimeRange).range([0, 24])


    //-------------create flow map-------------
    createMap();

    //createFlows_path_animation_2D()

    createFlows_path_animation_3D()

    //createFlows_STC_animation();

    //createFlows_arc_animation();

    //createFlows_arc();

    //createFlows_STC();

    //createFlows_3DWall();

    //draw3DBaseMap()

    //createFlows_Old();

    // set controllers

    // 交互监听
    const interactionLog = document.getElementById("log-list");

    function logInteraction(message) {
        const li = document.createElement("li");
        li.textContent = message;
        interactionLog.appendChild(li);
        if (interactionLog.childElementCount > 5) {
            interactionLog.removeChild(interactionLog.firstChild);
        }
    }

    // 监听鼠标移动事件
    window.addEventListener('mousemove', (event) => {
        // 计算鼠标在归一化设备坐标 (-1 ~ 1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // 进行射线检测
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(tubes);

        if (intersects.length > 0) {
            if (selectedObject !== intersects[0].object) {

                console.log(intersects[0].object)
                if (selectedObject) selectedObject.material.emissive.set(0x000000); // 恢复原色
                selectedObject = intersects[0].object;
                selectedObject.material.emissive.set(0x333333); // 高亮

                logInteraction(`点击了立方体, 坐标: (${intersects[0].point.x.toFixed(2)}, ${intersects[0].point.y.toFixed(2)})`);
            }


        } else {
            if (selectedObject) selectedObject.material.emissive.set(0x000000);
            selectedObject = null;
        }
    });

    window.addEventListener("resize", () => {
        camera.aspect = (window.innerWidth * 0.85) / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth * 0.85, window.innerHeight);
    });

    document.getElementById('objectSelector').addEventListener('change', function (event) {
        const selectedObject = event.target.value;
        updateVisualizationMethods(selectedObject);
    });

    //  --- animation control
    document.getElementById("playPauseButton").addEventListener("click", togglePlayPause);
    document.getElementById("progress").addEventListener("input", (event) => {
        let daysElapsed = parseInt(event.target.value);
        let newDate = new Date(startDate.getTime() + daysElapsed * 1000 * 60 * 60 * 24);
        updateObjects(newDate);
    });

    update();

    animate();

    // 处理下拉框选择事件

    function createGlRenderer() {
        var glRenderer = new THREE.WebGLRenderer({alpha: true});
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

    function creatAixs() {
        //create axis
        var material = new THREE.LineBasicMaterial({color: 0x000000, opacity: 0.5});

        //create axis
        const points = [];

        var x = map_length / 2, y = map_width / 2, z = map_height;
        points.push(new THREE.Vector3(x, y, z));
        points.push(new THREE.Vector3(x, y, 0));
        points.push(new THREE.Vector3(x, y, z));

        points.push(new THREE.Vector3(x, -y, z));
        points.push(new THREE.Vector3(x, -y, 0));
        points.push(new THREE.Vector3(x, -y, z));

        points.push(new THREE.Vector3(-x, -y, z));
        points.push(new THREE.Vector3(-x, -y, 0));
        points.push(new THREE.Vector3(-x, -y, z));

        points.push(new THREE.Vector3(-x, y, z));
        points.push(new THREE.Vector3(-x, y, 0));
        points.push(new THREE.Vector3(-x, y, z));
        points.push(new THREE.Vector3(x, y, z));

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        //add all the element to sence
        glScene.add(line);

    }

}

function convert(vertex) {
    return new THREE.Vector3(vertex[0], vertex[1], vertex[2]);
}

function convert2D(vertex) {
    return new THREE.Vector2(vertex[0], vertex[1]);
}

//-------------read flow data-------------
async function readFlowsData() {

    const allData = [];
    let flowsList = null;

    const fileNames = Array.from({length: 13}, (_, i) => `data/minard_map_data/Napoleones_${i + 1}.json`);

    async function loadFiles() {

        for (let i = 0; i < fileNames.length; i++) {
            try {
                const data = await d3.json(fileNames[i]);
                //console.log(`读取 ${fileNames[i]}：`, data);
                allData.push(data);
            } catch (error) {
                console.error(`加载 ${fileNames[i]} 失败:`, error);
            }
        }
        //console.log("所有 JSON 数据：", allData);
    }

    async function reformatData() {

        const getdata = allData.map(function (d) {
            return d.features
        })


        flowsList = getdata;

        //console.log("flowsList",flowsList)
    }

    async function processFlowData() {
        try {
            await loadFiles();  // 等待异步任务完成;
            await reformatData();

            //await loadIcelandGeoData();
            //console.log("flowsList",flowsList);
            //console.log(flowsList);

            const flatData = flowsList.flat();
            //console.log(flatData);

            const maxSoldiers = Math.max(...flatData.map(item => item.attributes.SOLDIERS));
            const minSoldiers = Math.min(...flatData.map(item => item.attributes.SOLDIERS));

            const maxTemperature = Math.max(...flatData.map(item => item.attributes.TEMPERATUR));
            const minTemperature = Math.min(...flatData.map(item => item.attributes.TEMPERATUR));

            const maxDate = Math.max(...flatData.map(item => item.attributes.DATA));
            const minDate = Math.min(...flatData.map(item => item.attributes.DATA));

            //console.log("maxSoldiers",maxSoldiers,"minSoldiers",minSoldiers);
            //`ture",maxTemperature,"minTemperature",minTemperature);
            //console.log("newestDate",formatDate(new Date(maxDate)),"oldestDate",formatDate(new Date(minDate)));

            globalTimeRange = [minDate, maxDate];
            timeSpan = formatDate(new Date(maxDate)) - formatDate(new Date(minDate));

            //console.log("timeSpan",timeSpan)
            globalTemperatureRange = [minTemperature, maxTemperature];
            globalSoldiersRange = [minSoldiers, maxSoldiers];


        } catch (error) {
            console.error("发生错误：", error);
        }
    }

    await processFlowData();

    async function loadIcelandGeoData(callback) {

        const data = await d3.json("data/icelandgeo.json");
        data.features.forEach(feature => {
            dataIcelandGeo.push(feature);
        })

    }
    return Promise.resolve(flowsList);

}


//-------------create flow map-------------
function createMap() {

    d3.selectAll('.map-div')
        .data([1]).enter()
        .append("div")
        .attr("class", "map-div")
        .attr("id", "mappad")
        .each(function (d) {

            var map = new mapboxgl.Map({
                container: 'mappad', // container ID
                style: 'mapbox://styles/mapbox/streets-v12', // style URL
                center: [map_center.lng, map_center.lat], // starting position [lng, lat]
                zoom: map_scale, // starting zoom,
                dragPan: false,
                scrollZoom: false,

            });
            theMap = map;
        });

    var mapContainer = document.getElementById("mappad");
    var cssObject = new CSS3DObject(mapContainer);
    cssObject.position.x = 0;
    cssObject.position.y = 0;
    cssObject.position.z = 0;
    cssObject.receiveShadow = true;
    cssScene.add(cssObject);

}

//-------------create flow map graphics-------------
async function createFlows_3DWall() {

    objects.forEach(obj => glScene.remove(obj.mesh));

    console.log("Array.isArray(meshes) && meshes.some(Array.isArray)", Array.isArray(meshes) && meshes.some(Array.isArray));
    //判断是否二维
    if (Array.isArray(meshes) && meshes.some(Array.isArray)) {
        meshes = meshes.flat();
        meshes.forEach(mesh => glScene.remove(mesh));
    } else {
        meshes.forEach(mesh => glScene.remove(mesh));
    }


    meshes = [];
    meshes = globalFLowsData.map((flow, index) => {

        let segments = [];
        var vertex, geometry, material, mesh;

        let vertices = flow.map(function (v) {
            const point = projectGeoPointsTo3D(v)
            //console.log("point",point);
            return point;
        });

        //console.log("vertices", vertices);

        for (var i = 0; i < vertices.length - 1; i++) {

            const segmentCurve = new THREE.CatmullRomCurve3([vertices[i], vertices[i + 1]]);
            const color = globalColorScale(flow[i].attributes.TEMPERATUR);
            const radius = globalThicknessScale(flow[i].attributes.SOLDIERS);

            //material = new THREE.MeshLambertMaterial({opacity: 1,transparent: true,  color: color });


            // 5️⃣ 创建墙的剖面（矩形）
            const wallHeight = 3;
            const wallThickness = -radius * 10;
            const shape = new THREE.Shape();
            shape.moveTo(0, 0);
            shape.lineTo(0, wallHeight);
            shape.lineTo(wallThickness, wallHeight);
            shape.lineTo(wallThickness, 0);
            shape.closePath();

            // 6️⃣ 使用 `ExtrudeGeometry` 沿折线生成墙体
            const extrudeSettings = {
                steps: 4,
                bevelEnabled: false,
                extrudePath: segmentCurve // 沿着折线挤出
            };

            const wallGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const wallMaterial = new THREE.MeshLambertMaterial({
                color: color, // 让墙体醒目
                emissive: 0x440000,
                side: THREE.DoubleSide
            });

            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

            wallMesh.castShadow = true;
            wallMesh.layers.set(index + 1);

            glScene.add(wallMesh);
            segments.push(wallMesh);
        }

        return segments;
    });

    resetLayerControls(true);

    console.log(meshes);

    function projectGeoPointsTo3D(stop) {
        var pointOrigin = {x: 0, y: 0};

        var point_center = theMap.project(new mapboxgl.LngLat(map_center.lng, map_center.lat));

        var point = new THREE.Vector3(0, 0, 0);

        //project => (lng, lat)
        var temp_point = theMap.project(new mapboxgl.LngLat(stop.geometry.x, stop.geometry.y));

        point.x = temp_point.x - pointOrigin.x - map_length / 2;
        point.y = 2 * point_center.y - temp_point.y - pointOrigin.y - map_width / 2;
        //point.z = globalZAxisScale(stop.attributes.DATA);
        point.z = 2;

        return point;
    }

}

async function createFlows_STC() {
    objects.forEach(obj => glScene.remove(obj.mesh));
    console.log("Array.isArray(meshes) && meshes.some(Array.isArray)",
        Array.isArray(meshes) && meshes.some(Array.isArray));
    //判断是否二维
    if (Array.isArray(meshes) && meshes.some(Array.isArray)) {
        meshes = meshes.flat();
        meshes.forEach(mesh => glScene.remove(mesh));
    } else {
        meshes.forEach(mesh => glScene.remove(mesh));
    }


    meshes = globalFLowsData.map((flow, index) => {
        //console.log("flow", flow);

        //create flow lines with data

        let segments = [];

        var vertex, geometry, material, mesh;

        let vertices = flow.map(function (v) {
            const point = projectGeoPointsTo3D(v)
            //console.log("point",point);
            return point;
        });

        //console.log("vertices", vertices);

        for (var i = 0; i < vertices.length - 1; i++) {

            const segmentCurve = new THREE.CatmullRomCurve3([vertices[i], vertices[i + 1]]);
            const color = globalColorScale(flow[i].attributes.TEMPERATUR);
            const radius = globalThicknessScale(flow[i].attributes.SOLDIERS);

            const segmentGeometry = new THREE.TubeGeometry(segmentCurve, 50, radius, 8, false);

            const segmentMaterial = new THREE.MeshLambertMaterial({
                opacity: 1,
                transparent: true, color: color
            });

            const segmentMesh = new THREE.Mesh(segmentGeometry, segmentMaterial);

            //material = new THREE.MeshLambertMaterial({opacity: 1,transparent: true,  color: color });

            segmentMesh.castShadow = true;
            segmentMesh.layers.set(index + 1);

            glScene.add(segmentMesh);
            segments.push(segmentMesh);
        }
        return segments;
    });

    resetLayerControls(true);


    //console.log(meshes);

    function projectGeoPointsTo3D(stop) {
        var pointOrigin = {x: 0, y: 0};

        var point_center = theMap.project(new mapboxgl.LngLat(map_center.lng, map_center.lat));

        var point = new THREE.Vector3(0, 0, 0);

        //project => (lng, lat)
        var temp_point = theMap.project(new mapboxgl.LngLat(stop.geometry.x, stop.geometry.y));

        point.x = temp_point.x - pointOrigin.x - map_length / 2;
        point.y = 2 * point_center.y - temp_point.y - pointOrigin.y - map_width / 2;
        point.z = globalZAxisScale(stop.attributes.DATA);
        //console.log("point", point);

        return point;
    }

}

async function createFlows_arc() {
    objects.forEach(obj => glScene.remove(obj.mesh));
    console.log("Array.isArray(meshes) && meshes.some(Array.isArray)",
        Array.isArray(meshes) && meshes.some(Array.isArray));
    //判断是否二维
    if (Array.isArray(meshes) && meshes.some(Array.isArray)) {
        meshes = meshes.flat();
        meshes.forEach(mesh => glScene.remove(mesh));
    } else {
        meshes.forEach(mesh => glScene.remove(mesh));
    }

    meshes = globalFLowsData.map((flow, index) => {

        let segments = [];

        var vertex, geometry, material, mesh;

        let vertices = flow.map(function (v) {
            const point = projectGeoPointsTo3D(v)
            //console.log("point",point);
            return point;
        });

        //console.log("vertices", vertices);

        for (var i = 0; i < vertices.length - 1; i++) {

            const pointA = vertices[i];
            const pointB = vertices[i + 1];
            const distance = pointA.distanceTo(pointB);

            // 计算中点
            const midpoint_flat = new THREE.Vector3().addVectors(pointA, pointB).multiplyScalar(0.5);
            const zHeight_arc = (distance/2+2)*0.8;

            const midpoint = new THREE.Vector3(midpoint_flat.x, midpoint_flat.y, zHeight_arc);

            const curve = new THREE.CatmullRomCurve3( [pointA,midpoint, pointB] );

            const color = globalColorScale(flow[i].attributes.TEMPERATUR);
            const tubularSegments = 32; // 沿曲线方向的细分数
            const radius = globalThicknessScale(flow[i].attributes.SOLDIERS);           // 管道半径
            const radialSegments = 8;  // 管道横截面的细分数
            const closed = false;      // 管道两端是否闭合
            const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);

// 创建材质
            const material = new THREE.MeshLambertMaterial({
                color: color, // 让墙体醒目
                emissive: 0x440000,
                side: THREE.DoubleSide
            });

// 创建网格对象
            const tube = new THREE.Mesh(geometry, material);

            tube.castShadow = true;
            tube.layers.set(index + 1);

            glScene.add(tube);
            segments.push(tube);
        }
        return segments;
    });

    resetLayerControls(true);

    function projectGeoPointsTo3D(stop) {
        var pointOrigin = {x: 0, y: 0};

        var point_center = theMap.project(new mapboxgl.LngLat(map_center.lng, map_center.lat));

        var point = new THREE.Vector3(0, 0, 0);

        //project => (lng, lat)
        var temp_point = theMap.project(new mapboxgl.LngLat(stop.geometry.x, stop.geometry.y));

        point.x = temp_point.x - pointOrigin.x - map_length / 2;
        point.y = 2 * point_center.y - temp_point.y - pointOrigin.y - map_width / 2;
        //point.z = globalZAxisScale(stop.attributes.DATA);
        point.z = 2;

        return point;
    }


    //console.log(meshes);


}

async function createFlows_arc_animation() {

    objects.forEach(obj => glScene.remove(obj.mesh));
    console.log("Array.isArray(meshes) && meshes.some(Array.isArray)",
        Array.isArray(meshes) && meshes.some(Array.isArray));
    //判断是否二维
    if (Array.isArray(meshes) && meshes.some(Array.isArray)) {
        meshes = meshes.flat();
        meshes.forEach(mesh => glScene.remove(mesh));
    } else {
        meshes.forEach(mesh => glScene.remove(mesh));
    }


    objects.forEach(mesh => glScene.remove(mesh))
    //console.log(globalFLowsData);


    meshes = globalFLowsData.map((flow, index) => {

        let segments = [];

        var vertex, geometry, material, mesh;

        let vertices = flow.map(function (v) {
            const point = projectGeoPointsTo3D(v)
            //console.log("point",point);
            return point;
        });

        //console.log("vertices", vertices);

        for (var i = 0; i < vertices.length - 1; i++) {

            const thisDay = formatDate (flow[i].attributes.DATA);

            //console.log("thisDay",thisDay);
            const pointA = vertices[i];
            const pointB = vertices[i + 1];
            const distance = pointA.distanceTo(pointB);

            // 计算中点
            const midpoint_flat = new THREE.Vector3().addVectors(pointA, pointB).multiplyScalar(0.5);
            const zHeight_arc = (distance/2+2)*0.8;

            const midpoint = new THREE.Vector3(midpoint_flat.x, midpoint_flat.y, zHeight_arc);

            const curve = new THREE.CatmullRomCurve3( [pointA,midpoint, pointB] );

            //const color = globalColorScale(flow[i].attributes.TEMPERATUR);

            const color = globalDivers_ColorScale(index);

            const tubularSegments = 32; // 沿曲线方向的细分数
            const radius = globalThicknessScale(flow[i].attributes.SOLDIERS);           // 管道半径
            const radialSegments = 8;  // 管道横截面的细分数
            const closed = false;      // 管道两端是否闭合
            const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);

// 创建材质
            const material = new THREE.MeshLambertMaterial({
                color: color, // 让墙体醒目
                emissive: 0x440000,
                side: THREE.DoubleSide
            });

// 创建网格对象
            const tube = new THREE.Mesh(geometry, material);

            tube.castShadow = true;
            //tube.layers.set(index + 1);
            tube.visible = false;

            glScene.add(tube);
            //segments.push(tube);
            objects.push({ mesh: tube, date:  new Date(thisDay) });

        }
        return segments;
    });

    resetLayerControls(true);

    function projectGeoPointsTo3D(stop) {
        var pointOrigin = {x: 0, y: 0};

        var point_center = theMap.project(new mapboxgl.LngLat(map_center.lng, map_center.lat));

        var point = new THREE.Vector3(0, 0, 0);

        //project => (lng, lat)
        var temp_point = theMap.project(new mapboxgl.LngLat(stop.geometry.x, stop.geometry.y));

        point.x = temp_point.x - pointOrigin.x - map_length / 2;
        point.y = 2 * point_center.y - temp_point.y - pointOrigin.y - map_width / 2;
        //point.z = globalZAxisScale(stop.attributes.DATA);
        point.z = 2;

        return point;
    }


    //console.log(meshes);

}

async function createFlows_STC_animation() {

    //console.log(startDate,endDate,totalDays)

    console.log("Array.isArray(meshes) && meshes.some(Array.isArray)",
        Array.isArray(meshes) && meshes.some(Array.isArray));
    //判断是否二维
    if (Array.isArray(meshes) && meshes.some(Array.isArray)) {
        meshes = meshes.flat();
        meshes.forEach(mesh => glScene.remove(mesh));
    } else {
        meshes.forEach(mesh => glScene.remove(mesh));
    }


    objects.forEach(obj => glScene.remove(obj.mesh));
    //console.log(globalFLowsData);


    meshes = globalFLowsData.map((flow, index) => {

        let segments = [];

        let vertices = flow.map(function (v) {
            const point = projectGeoPointsTo3D(v)
            //console.log("point",point);
            return point;
        });

        //console.log("vertices", vertices);

        for (var i = 0; i < vertices.length - 1; i++) {

            const thisDay = formatDate (flow[i].attributes.DATA);

            //console.log("thisDay",thisDay);
            const segmentCurve = new THREE.CatmullRomCurve3([vertices[i], vertices[i + 1]]);
            const color = globalColorScale(flow[i].attributes.TEMPERATUR);
            const radius = globalThicknessScale(flow[i].attributes.SOLDIERS);

            const segmentGeometry = new THREE.TubeGeometry(segmentCurve, 50, radius, 8, false);

            const segmentMaterial = new THREE.MeshLambertMaterial({
                opacity: 1,
                transparent: true, color: color
            });

            const segmentMesh = new THREE.Mesh(segmentGeometry, segmentMaterial);

            //material = new THREE.MeshLambertMaterial({opacity: 1,transparent: true,  color: color });

            segmentMesh.castShadow = true;
            segmentMesh.layers.set(index + 1);

            //tube.layers.set(index + 1);
            segmentMesh.visible = false;

            glScene.add(segmentMesh);
            //segments.push(segmentMesh);
            objects.push({ mesh: segmentMesh, date:  new Date(thisDay) });

        }
        return segments;
    });

    resetLayerControls(true);

    function projectGeoPointsTo3D(stop) {
        var pointOrigin = {x: 0, y: 0};

        var point_center = theMap.project(new mapboxgl.LngLat(map_center.lng, map_center.lat));

        var point = new THREE.Vector3(0, 0, 0);

        //project => (lng, lat)
        var temp_point = theMap.project(new mapboxgl.LngLat(stop.geometry.x, stop.geometry.y));

        point.x = temp_point.x - pointOrigin.x - map_length / 2;
        point.y = 2 * point_center.y - temp_point.y - pointOrigin.y - map_width / 2;
        point.z = globalZAxisScale(stop.attributes.DATA);
        //console.log("point", point);

        return point;
    }


    //console.log(meshes);

}

async function createFlows_path_animation_2D() {

    objects.forEach(obj => glScene.remove(obj.mesh));

    console.log("Array.isArray(meshes) && meshes.some(Array.isArray)", Array.isArray(meshes) && meshes.some(Array.isArray));
    //判断是否二维
    if (Array.isArray(meshes) && meshes.some(Array.isArray)) {
        meshes = meshes.flat();
        meshes.forEach(mesh => glScene.remove(mesh));
    } else {
        meshes.forEach(mesh => glScene.remove(mesh));
    }

    meshes = [];


    meshes = globalFLowsData.map((flow, index) => {

        let segments = [];
        var vertex, geometry, material, mesh;

        let vertices = flow.map(function (v) {
            const point = projectGeoPointsTo3D(v)
            //console.log("point",point);
            return point;
        });

        //console.log("vertices", vertices);

        for (var i = 0; i < vertices.length - 1; i++) {

            const path = new THREE.CatmullRomCurve3([vertices[i], vertices[i + 1]]);
            const color = globalDivers_ColorScale(index);
            const colorTempreture = globalColorScale(flow[i].attributes.TEMPERATUR);

            const radius = globalThicknessScale(flow[i].attributes.SOLDIERS);

            //material = new THREE.MeshLambertMaterial({opacity: 1,transparent: true,  color: color });

            const pathMaterial = new THREE.LineBasicMaterial({ color: colorTempreture }); // 蓝色路径
            const pathGeometry = new THREE.BufferGeometry().setFromPoints(path.getPoints(10));
            const pathLine = new THREE.Line(pathGeometry, pathMaterial);
            pathLine.visible = false;
            glScene.add(pathLine);
            segments.push(pathLine);

            const geometry = new THREE.SphereGeometry(20);
            const material= new THREE.MeshLambertMaterial({ color: color });
            const troopDot = new THREE.Mesh(geometry, material);
            troopDot.visible = false;
            glScene.add(troopDot);
            segments.push(troopDot);

            const timeStart = globalTimeScale(flow[i].attributes.DATA);
            const timeEnd =  globalTimeScale(flow[i+1].attributes.DATA);

            troopsSegments.push({
                troopMesh : troopDot,
                path: path,
                time: [timeStart , timeEnd]
            });
            troopTracks.push({
                mesh: pathLine,
                time: [timeStart , timeEnd]
            })


        }

        return segments;
    });

    resetLayerControls(true);

    //console.log(meshes);

    function projectGeoPointsTo3D(stop) {
        var pointOrigin = {x: 0, y: 0};

        var point_center = theMap.project(new mapboxgl.LngLat(map_center.lng, map_center.lat));

        var point = new THREE.Vector3(0, 0, 0);

        //project => (lng, lat)
        var temp_point = theMap.project(new mapboxgl.LngLat(stop.geometry.x, stop.geometry.y));

        point.x = temp_point.x - pointOrigin.x - map_length / 2;
        point.y = 2 * point_center.y - temp_point.y - pointOrigin.y - map_width / 2;
        //point.z = globalZAxisScale(stop.attributes.DATA);
        point.z = 2;

        return point;
    }

}

async function createFlows_path_animation_3D() {

    objects.forEach(obj => glScene.remove(obj.mesh));

    console.log("Array.isArray(meshes) && meshes.some(Array.isArray)", Array.isArray(meshes) && meshes.some(Array.isArray));
    //判断是否二维
    if (Array.isArray(meshes) && meshes.some(Array.isArray)) {
        meshes = meshes.flat();
        meshes.forEach(mesh => glScene.remove(mesh));
    } else {
        meshes.forEach(mesh => glScene.remove(mesh));
    }

    meshes = [];


    meshes = globalFLowsData.map((flow, index) => {

        let segments = [];
        var vertex, geometry, material, mesh;

        let vertices = flow.map(function (v) {
            const point = projectGeoPointsTo3D(v)
            //console.log("point",point);
            return point;
        });

        //console.log("vertices", vertices);

        for (var i = 0; i < vertices.length - 1; i++) {

            const path = new THREE.CatmullRomCurve3([vertices[i], vertices[i + 1]]);
            const color = globalDivers_ColorScale(index);
            const colorTempreture = globalColorScale(flow[i].attributes.TEMPERATUR);

            const radius = globalThicknessScale(flow[i].attributes.SOLDIERS);

            //material = new THREE.MeshLambertMaterial({opacity: 1,transparent: true,  color: color });

            const pathMaterial = new THREE.LineBasicMaterial({ color: colorTempreture }); // 蓝色路径
            const pathGeometry = new THREE.BufferGeometry().setFromPoints(path.getPoints(10));
            const pathLine = new THREE.Line(pathGeometry, pathMaterial);

            glScene.add(pathLine);
            segments.push(pathLine);

            const geometry = new THREE.SphereGeometry(20);
            const material= new THREE.MeshLambertMaterial({ color: color });
            const troopDot = new THREE.Mesh(geometry, material);
            troopDot.visible = false;
            glScene.add(troopDot);
            segments.push(troopDot);

            const timeStart = globalTimeScale(flow[i].attributes.DATA);
            const timeEnd =  globalTimeScale(flow[i+1].attributes.DATA);

            troopsSegments.push({
                troopMesh : troopDot,
                path: path,
                time: [timeStart , timeEnd]
            })

        }

        return segments;
    });

    resetLayerControls(true);

    function projectGeoPointsTo3D(stop) {
        var pointOrigin = {x: 0, y: 0};

        var point_center = theMap.project(new mapboxgl.LngLat(map_center.lng, map_center.lat));

        var point = new THREE.Vector3(0, 0, 0);

        //project => (lng, lat)
        var temp_point = theMap.project(new mapboxgl.LngLat(stop.geometry.x, stop.geometry.y));

        point.x = temp_point.x - pointOrigin.x - map_length / 2;
        point.y = 2 * point_center.y - temp_point.y - pointOrigin.y - map_width / 2;
        point.z = globalZAxisScale(stop.attributes.DATA);
        //point.z = 2;

        return point;
    }

}

//animation

function updateObjects(date) {
    document.getElementById("currentDate").textContent = `Date: ${date.toISOString().split('T')[0]}`;
    let daysElapsed = (date - startDate) / (1000 * 60 * 60 * 24);
    document.getElementById("progress").value = daysElapsed;

    objects.forEach(obj => {
        obj.mesh.visible = date >= obj.date;
    });

}

function startAnimation() {
    isPlaying = true;
    document.getElementById("playPauseButton").textContent = "Pause";

    d3.select({ t: 0 })
        .transition()
        .duration(20000)
        .ease(d3.easeLinear)
        .tween("date", function() {
            let interpolator = d3.interpolateNumber(0, totalDays);
            return function(t) {
                if (!isPlaying) return;
                let newDate = new Date(startDate.getTime() + interpolator(t) * 1000 * 60 * 60 * 24);
                updateObjects(newDate);
            };
        });
}

function togglePlayPause() {
    isPlaying = !isPlaying;
    document.getElementById("playPauseButton").textContent = isPlaying ? "Pause" : "Play";
    if (isPlaying) startAnimation();
}


function draw3DBaseMap() {

    graphics3D.projection = d3.geoStereographic()
        .scale(35000)
        .center(graphics3D.icelandCenter)
        .translate([graphics3D.map_length / 2, graphics3D.map_width / 2])
        .rotate([0, 0])
        .clipAngle(180 - 1e-4)
        .clipExtent([[0, 0], [graphics3D.map_width, graphics3D.map_height]])
        .precision(.1);

    var material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        opacity: 0.0,
        side: THREE.DoubleSide,
        //blending : THREE.NoBlending
    });

    var geometry = new THREE.PlaneGeometry(graphics3D.map_length, graphics3D.map_width);
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = 0;
    mesh.position.y = 0;
    mesh.position.z = 1000;
    mesh.receiveShadow = true;

    //glScene.add(mesh);

    var path = d3.geoPath().projection(graphics3D.projection);

    d3.selectAll('.migration_map_div')
        .data([1]).enter()
        .append("div")
        .attr("class", "migration_map_div")
        .attr("id", "map_container_1");

    graphics3D.svg3DbaseMap = d3.select("#map_container_1").append("svg")
        .attr("id", "svg_flow_3D_1")
        .attr("width", graphics3D.map_length)
        .attr("height", graphics3D.map_width)
        .attr("transform", "rotate(0,180,180)")
        .attr("transform", "translate(" + graphics3D.map_width / 2 + "," + graphics3D.map_height / 2 + ")");

    var g_basemap = graphics3D.svg3DbaseMap.append("g")
        .attr("class", "basemap3D");

    //console.log("dataIcelandGeo",dataIcelandGeo)

    g_basemap.selectAll("path")
        .data(dataIcelandGeo)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "#ea1f1f")
        .attr("opacity", 0.4)
        .attr("class", "basemap3Dpath")
        .attr("name", function (d) {
            var name = d.properties.VARNAME_1;
            var index = name.indexOf("|");
            if (index != -1) {
                name = name.substr(0, index);
            }
            return name;
        });

    d3.selectAll(".basemap3Dpath").each(function (d) {
        var center = path.centroid(d);
        var named = d3.select(this).attr("name");
        g_basemap.append("text")
            .attr("class", "basemaplabel3D")
            .text(named)
            .attr("x", center[0])
            .attr("y", center[1]);
        //graphics3D.centerMap[named] = center;
    });

    var map_container = document.getElementById("map_container_1");
    var cssObject = new CSS3DObject(map_container);
    cssObject.position.x = 0, cssObject.position.y = 0, cssObject.position.z = 1000;
    cssObject.receiveShadow = true;
    cssScene.add(cssObject);
}

function drawLinesOnPlane(vertices, troops, temperatures, coor) {
    var vertex, geometry, material, mesh;
    var max = d3.max(troops);
    var min = d3.min(troops);

    //set the range of troops
    var trooplinear = d3.scaleLinear([min, max], [2, 20]);
    var temperaturelinear = d3.scaleLinear([d3.min(temperatures), d3.max(temperatures)], ["blue", "red"]);

    var segments = new THREE.Object3D();
    vertices = vertices.map(convert2D);

    var pointlast1 = new THREE.Vector2(vertices[0].x, vertices[0].y);
    var pointlast2 = new THREE.Vector2(vertices[0].x, vertices[0].y);

    for (var i = 0, len = vertices.length; i < len - 2; i++) {
        var color = temperaturelinear(temperatures[i]);
        vertex = vertices[i];

        var vector1 = new THREE.Vector2(vertices[i + 1].x - vertices[i].x, vertices[i + 1].y - vertices[i].y);
        var angle1 = vector1.angle();

        var vector2 = new THREE.Vector2(vertices[i + 2].x - vertices[i + 1].x, vertices[i + 2].y - vertices[i + 1].y);
        var angle2 = vector2.angle();


        var angle = 0.5 * (angle1 + angle2);


        var angleX = Math.sin(angle);
        var angleY = Math.cos(angle);

        var pointtemp1 = new THREE.Vector2(vertices[i + 1].x - trooplinear(troops[i + 1]) / 2 * angleX,
            vertices[i + 1].y + trooplinear(troops[i + 1]) / 2 * angleY);
        var pointtemp2 = new THREE.Vector2(vertices[i + 1].x + trooplinear(troops[i + 1]) / 2 * angleX,
            vertices[i + 1].y - trooplinear(troops[i + 1]) / 2 * angleY);


        if (pointtemp1.y < pointtemp2.y) {
            var point = pointtemp1;
            pointtemp1 = pointtemp2;
            pointtemp2 = point;

        }
        if (pointlast1.y < pointlast2.y) {
            var point = pointtemp1;
            pointlast1 = pointlast2;
            pointlast2 = point;

        }

        var point1 = pointlast1,
            point2 = pointtemp1,
            point3 = pointtemp2,
            point4 = pointlast2;

        if (point1.x < point2.x && point3.x < point4.x) {
            //console.log("point3.x < point4.x happend");
            var pointtt = point3;
            point3 = point4;
            point4 = pointtt;
        } else if (point1.x > point2.x && point3.x > point4.x) {
            //console.log("point3.x < point4.x happend");
            var pointtt = point3;
            point3 = point4;
            point4 = pointtt;
        }


        var californiaPts = [];
        californiaPts.push(point1);
        californiaPts.push(point2);
        californiaPts.push(point3);
        californiaPts.push(point4);

        var flowShape = new THREE.Shape(californiaPts);
        var geometry = new THREE.ShapeGeometry(flowShape);


        var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
            color: color, side: THREE.DoubleSide, transparent: true,
            opacity: 0.6
        }));
        mesh.position.z = 5;
        segments.add(mesh);

        pointlast1 = pointtemp1;
        pointlast2 = pointtemp2;

    }


    for (var i = 0, len = vertices.length; i < len - 2; i++) {
        var color = temperaturelinear(temperatures[i]);
        vertex = vertices[i];

        var vectorthis = new THREE.Vector2(vertices[i + 1].x - vertices[i].x, vertices[i + 1].y - vertices[i].y);
        var angle = vectorthis.angle();
        var angleX = Math.sin(angle);
        var angleY = Math.cos(angle);

        var californiaPts = [];
        californiaPts.push(new THREE.Vector2(vertices[i].x - trooplinear(troops[i]) / 2 * angleX,
            vertices[i].y + trooplinear(troops[i]) / 2 * angleY));
        californiaPts.push(new THREE.Vector2(vertices[i + 1].x - trooplinear(troops[i + 1]) / 2 * angleX,
            vertices[i + 1].y + trooplinear(troops[i + 1]) / 2 * angleY));
        //californiaPts.push( new THREE.Vector2 ( vertices[i+2].x - trooplinear(troops[i+2])/2 * angleX,
        //                                        vertices[i+2].y + trooplinear(troops[i+2])/2 * angleY ) );
        //californiaPts.push( new THREE.Vector2 ( vertices[i+2].x + trooplinear(troops[i+2])/2 * angleX,
        //                                        vertices[i+2].y - trooplinear(troops[i+2])/2 * angleY ) );
        californiaPts.push(new THREE.Vector2(vertices[i + 1].x + trooplinear(troops[i + 1]) / 2 * angleX,
            vertices[i + 1].y - trooplinear(troops[i + 1]) / 2 * angleY));
        californiaPts.push(new THREE.Vector2(vertices[i].x + trooplinear(troops[i]) / 2 * angleX,
            vertices[i].y - trooplinear(troops[i]) / 2 * angleY));

        var flowShape = new THREE.Shape(californiaPts);
        var geometry = new THREE.ShapeGeometry(flowShape);
        var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
            color: color, side: THREE.DoubleSide, transparent: true,
            opacity: 0.6
        }));
        mesh.position.z = 5;
        segments.add(mesh);

    }

    return segments;
}

//-------------create interaction components-------------

function resetLayerControls(switchCheckbox) {
    if (switchCheckbox) {
        globalFLowsData.forEach((d, i) => {
            var checkboxID = "#checkbox-" + i;
            //console.log("checkboxID",checkboxID);
            d3.select(checkboxID).property('checked', true);
            camera.layers.enable(i + 1);
        })

    } else {
        console.log("resetLayerControls switchCheckbox",switchCheckbox)
        globalFLowsData.forEach((d, i) => {
            var checkboxID = "#checkbox-" + i;
            d3.select(checkboxID).property('checked', false);
            camera.layers.disable(i + 1);
        })
    }
}

function updateVisualizationMethods(selectedMethod) {
    //console.log(selectedMethod);
    if (selectedMethod == "stc") {
        createFlows_STC();
    } else if (selectedMethod == "wall") {
        createFlows_3DWall();
    } else if (selectedMethod == "arcs") {
        createFlows_arc();
    }
    else if (selectedMethod == "arcs_animation") {
        createFlows_arc_animation();
    }
    else if (selectedMethod == "stc_animation") {
        createFlows_STC_animation();
    }
    else if (selectedMethod == "path_animation_2D") {
        createFlows_path_animation_2D();
    }
    else if (selectedMethod == "path_animation_3D") {
        createFlows_path_animation_3D();
    }
}

function update() {
    controls.update();
    cssRenderer.render(cssScene, camera);
    glRenderer.render(glScene, camera);
    requestAnimationFrame(update);
}

function animate() {
    requestAnimationFrame(animate);

    troopsSegments.forEach(function (segment, i) {

        let timeStamp = (timer_army - segment.time[0]) / (segment.time[1] - segment.time[0]);
        timeStamp = Math.max(0, Math.min(1, timeStamp));

        segment.troopMesh.position.copy(segment.path.getPointAt(timeStamp));
        segment.troopMesh.visible = (timer_army >= segment.time[0] && timer_army <= segment.time[1]);

    });
    troopTracks.forEach(function (track, i) {

        const span = (track.time[1] - track.time[0])/2 +  track.time[0];
        track.mesh.visible = ( timer_army >= span);

    })

    //console.log(timeSpan) 16502400000

    timer_army += 0.02;  // 增加时间，模拟进程
    //console.log(timer_army)
    if (timer_army > 24) timer_army = 0;  // 重置时间

    cssRenderer.render(cssScene, camera);
    glRenderer.render(glScene, camera);
}


