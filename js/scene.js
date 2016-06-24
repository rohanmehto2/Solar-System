// Main File. All shader and effects are from stemkowski. 

//Things to do:

// Volumetric lighting from sun? Could try it.
// Calculate orbits by Keplers Law.Partially done! Things to do:
// Longitude of the Ascending Node.
// Argument of Periapsis
// Mean anamoly at epoch


//Define Geometry
const ZOOM_SCALE_FACTOR = 0.01;

const TRANSPARENT_SPHERE_SIZE = 5;
const TRANSPARENT_SPHERE_NAME = "TransparentSphere";

var scene, camera, controls, renderer; // The basics
var camera_position = new THREE.Vector3(0,0,0);
var lights = [];
var mercury_group, mercury_group_orbit,venus_group, venus_group_orbit,
earth_group, earth_group_orbit, mars_group, mars_group_orbit, jupiter_group, jupiter_group_orbit,  saturn_group, saturn_group_orbit,
neptune_group, neptune_group_orbit, uranus_group, uranus_group_orbit, pluto_group, pluto_group_orbit,sun_group,
skybox; // 3D objects and groups. Hierarchy is (in descending order of importance) orbit_group > planet_group. Sun and skybox group are special exceptions.

var orbital_period_seconds = 20;
var refresh_rate = 60;
var planet_rotation = ((2*Math.PI)/orbital_period_seconds)/refresh_rate;

var stats_fps = new Stats();


// Setup the GUI Options
var datGUI;
var options = new function(){

  this.OrbitSpeedMultiplier= 10.0;
  this.ShowOrbitOutline = true;
  this.PlanetScale = 10;
  this.OrbitScale = 0.02;
  this.Wireframes = false;
  this.CameraFocus = 'Sun';
  this.Render_Updated_Scaling = function(){UpdateScene();};
  this.SceneToConsole = function(){
    console.log("X Position: " + camera.position.x);
    console.log("Y Position: " + camera.position.y);
    console.log("Z Position: " + camera.position.z);
  };
  this.MercuryToConsole = function(){
    console.log("X Position: " + mercury_group.position.x);
    console.log("Y Position: " + mercury_group.position.y);
    console.log("Z Position: " + mercury_group.position.z);
  }
  this.MercurySize = function(){
    console.log(Mercury.semimajor_axis_scene());
  }



};



// These objects handle the physical and orbital properties and physics
var Mercury = new Planet(MERCURY_SIZE,MERCURY_MASS,MERCURY_SEMIMAJOR_AXIS,MERCURY_SEMIMINOR_AXIS,MERCURY_ECCENTRICITY,
MERCURY_HELIOCENTRIC_INCLINATION);

var Venus = new Planet(VENUS_SIZE,VENUS_MASS,VENUS_SEMIMAJOR_AXIS,VENUS_SEMIMINOR_AXIS,VENUS_ECCENTRICITY,
VENUS_HELIOCENTRIC_INCLINATION);

var Earth= new Planet(EARTH_SIZE,EARTH_MASS,EARTH_SEMIMAJOR_AXIS,EARTH_SEMIMINOR_AXIS,EARTH_ECCENTRICITY,
EARTH_HELIOCENTRIC_INCLINATION);

var Mars = new Planet(MARS_SIZE,MARS_MASS,MARS_SEMIMAJOR_AXIS,MARS_SEMIMINOR_AXIS,MARS_ECCENTRICITY,
MARS_HELIOCENTRIC_INCLINATION);

var Jupiter = new Planet(JUPITER_SIZE,JUPITER_MASS,JUPITER_SEMIMAJOR_AXIS,JUPITER_SEMIMINOR_AXIS,JUPITER_ECCENTRICITY,
JUPITER_HELIOCENTRIC_INCLINATION);

var Saturn = new Planet(SATURN_SIZE,SATURN_MASS,SATURN_SEMIMAJOR_AXIS,SATURN_SEMIMINOR_AXIS,SATURN_ECCENTRICITY,
SATURN_HELIOCENTRIC_INCLINATION);

var Uranus = new Planet(URANUS_SIZE,URANUS_MASS,URANUS_SEMIMAJOR_AXIS,URANUS_SEMIMINOR_AXIS,URANUS_ECCENTRICITY,
URANUS_HELIOCENTRIC_INCLINATION);

var Neptune = new Planet(NEPTUNE_SIZE,NEPTUNE_MASS,NEPTUNE_SEMIMAJOR_AXIS,NEPTUNE_SEMIMINOR_AXIS,NEPTUNE_ECCENTRICITY,
NEPTUNE_HELIOCENTRIC_INCLINATION);
var Pluto = new Planet(PLUTO_SIZE,PLUTO_MASS,PLUTO_SEMIMAJOR_AXIS,PLUTO_SEMIMINOR_AXIS,PLUTO_ECCENTRICITY,
PLUTO_HELIOCENTRIC_INCLINATION);



init();
animate();

function init(){

 


  stats_fps.showPanel(0);

  //Setup Renderer!
  renderer = new THREE.WebGLRenderer({antialias: false, logarithmicDepthBuffer: false});
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  //Setup camera and mouse controls.
  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight,100,3e8);
  camera.position.x=3000;
  controls = new THREE.OrbitControls( camera );
  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 0.5;
  controls.panSpeed = 0.8;
  controls.noZoom = false;
  controls.noPan = true;
  controls.minDistance = 2000;
  controls.maxDistance=2e6;
  controls.keys = [ 65, 83, 68 ];
  controls.addEventListener( 'change', render );
  
  //Setup GUI
  
  datGUI = new dat.GUI();
  
  var Camera_Focus = datGUI.add(options,'CameraFocus',['Sun','Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']);
  
  var OrbitalFolder = datGUI.addFolder("Orbital Parameters");
  OrbitalFolder.add(options,'OrbitSpeedMultiplier',1.0,50.0);
  OrbitalFolder.add(options,'ShowOrbitOutline');

  var PlanetFolder = datGUI.addFolder("Planet Parameters");
  PlanetFolder.add(options,'PlanetScale',1,300);
  
  var DebugFolder = datGUI.addFolder("Debug");
  DebugFolder.add(options,'SceneToConsole');
  DebugFolder.add(options,'MercuryToConsole');
  DebugFolder.add(options,'MercurySize');
  
  
  
 //datGUI.close();


  //Add our 3D scene to the html web page!
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(stats_fps.dom);



  //Setup lights...
  scene = new THREE.Scene();
  lights[ 0 ] = new THREE.AmbientLight(0xffffff,0.1);
  lights[ 1 ] = new THREE.PointLight( 0xffffff,2,1000000,2);
  lights[ 1 ].position.set = (0,0,0); // Center of the sun.
  scene.add(lights[ 0 ]);
  scene.add(lights[ 1 ]);


  //Setup planet objects...
  skybox_group = new THREE.Group();
  sun_group = new THREE.Group();

  mercury_group_orbit = new THREE.Object3D();
  mercury_group = new THREE.Group();
//  mercury_transparent_group = new THREE.Group();
  mercury_group_orbit.add(mercury_group);

  earth_group_orbit = new THREE.Object3D();
  earth_group = new THREE.Group();
  earth_group_orbit.add(earth_group)

  venus_group_orbit=new THREE.Object3D();
  venus_group = new THREE.Group();
  venus_group_orbit.add(venus_group);

  mars_group_orbit = new THREE.Object3D();
  mars_group = new THREE.Group();
  mars_group_orbit.add(mars_group);
  
  jupiter_group_orbit = new THREE.Object3D();
  jupiter_group = new THREE.Group();
  jupiter_group_orbit.add(jupiter_group);
  
  saturn_group_orbit = new THREE.Object3D();
  saturn_group = new THREE.Group();
  saturn_group_orbit.add(saturn_group);
  
  uranus_group_orbit = new THREE.Object3D();
  uranus_group = new THREE.Group();
  uranus_group_orbit.add(uranus_group);
  
  neptune_group_orbit = new THREE.Object3D();
  neptune_group = new THREE.Group();
  neptune_group_orbit.add(neptune_group);
  
  pluto_group_orbit = new THREE.Object3D();
  pluto_group = new THREE.Group();
  pluto_group_orbit.add(pluto_group);

  scene.add(skybox_group);
  scene.add(mercury_group_orbit);
  scene.add(venus_group_orbit);
  scene.add(earth_group_orbit);
  scene.add(mars_group_orbit);
  scene.add(jupiter_group_orbit);
  scene.add(saturn_group_orbit);
  scene.add(uranus_group_orbit);
  scene.add(neptune_group_orbit);
  scene.add(pluto_group_orbit);
  scene.add(sun_group);

  // Using a skydome instead of a skybox 
  
  var SkyboxMesh = CreateSphere('./textures/milkyway.jpg',1e8,50,"Skybox",true);
  SkyboxMesh.material.side= THREE.BackSide;
  skybox_group.add(SkyboxMesh);
  

  // Add some geometry
  //sun_group.add(CreateSphere('./textures/sun_atmos.jpg',SUN_SIZE,50,"Sun",true));
  var sun_text_loader = new THREE.TextureLoader();
  var sun_texture = sun_text_loader.load('./textures/sun_atmos.jpg');
  sun_texture.wrapS = sun_texture.wrapT = THREE.RepeatWrapping;
  var sun_noise_text = sun_text_loader.load('./textures/sun_cloud_map.jpg');
  sun_noise_text.wrapS = sun_noise_text.wrapT = THREE.RepeatWrapping;
  
  
  var customAniMaterial = new THREE.ShaderMaterial( 
	{
	    uniforms: {
		baseTexture: 	{ type: "t", value: sun_texture },
		baseSpeed: 		{ type: "f", value: 0.01 },
		noiseTexture: 	{ type: "t", value: sun_noise_text },
		noiseScale:		{ type: "f", value: 0.5337 },
		alpha: 			{ type: "f", value: 0.5 },
		time: 			{ type: "f", value: 1.0 }
	},
		vertexShader:   document.getElementById( 'vertexShaderAni'   ).textContent,
		fragmentShader: document.getElementById( 'fragmentShaderAni' ).textContent
	}   );
  
  
  var sun_geometry=new THREE.SphereGeometry(SUN_SIZE,50,50);
 // var sphere_material=new THREE.MeshBasicMaterial({map: sphere_texture});  
  this.sun_mesh = new THREE.Mesh(sun_geometry,customAniMaterial);
  
  sun_group.add(sun_mesh);
    
    var customMaterialGlow = new THREE.ShaderMaterial( 
	{
	    uniforms: 
		{ 
			"c":   { type: "f", value: 0.44 },
			"p":   { type: "f", value: 2.0 },
			glowColor: { type: "c", value: new THREE.Color(0xffff00) },
			viewVector: { type: "v3", value: camera.position }
		},
		vertexShader:   document.getElementById( 'vertexShaderGlow'   ).textContent,
		fragmentShader: document.getElementById( 'fragmentShaderGlow' ).textContent,
		side: THREE.FrontSide,
		blending: THREE.AdditiveBlending,
		transparent: true
	}   );
		
    var sunGlowGeo = new THREE.SphereGeometry(SUN_SIZE*1.8,50,50);  
    this.sunGlow = new THREE.Mesh( sunGlowGeo, customMaterialGlow.clone() );
    this.sunGlow.name = "sunGlow";
	  sun_group.add( sunGlow );
	
    //sunGlow.position = moon.position;
	//moonGlow.scale.multiplyScalar(1.2);


  mercury_group.add(CreateSphere('./textures/mercury.jpg',(Mercury.size),50,"Mercury"));
  mercury_group.add(CreateTransparentSphere(TRANSPARENT_SPHERE_SIZE,50,TRANSPARENT_SPHERE_NAME));

  venus_group.add(CreateSphere('./textures/venus.jpg',(Venus.size),50,"Venus"));
  venus_group.add(CreateTransparentSphere(TRANSPARENT_SPHERE_SIZE,50,TRANSPARENT_SPHERE_NAME));

  earth_group.add(CreateSphere('./textures/earth_atmos_4096.jpg',(Earth.size),50,"Earth"));
  earth_group.add(CreateTransparentSphere(TRANSPARENT_SPHERE_SIZE,50,TRANSPARENT_SPHERE_NAME));

  mars_group.add(CreateSphere('./textures/mars.jpg',(Mars.size),50,"Mars"));
  mars_group.add(CreateTransparentSphere(TRANSPARENT_SPHERE_SIZE,50,TRANSPARENT_SPHERE_NAME));
  
  jupiter_group.add(CreateSphere('./textures/jupiter.jpg',(Jupiter.size),50,"Jupiter"));
  jupiter_group.add(CreateTransparentSphere(TRANSPARENT_SPHERE_SIZE,50,TRANSPARENT_SPHERE_NAME));
  
  saturn_group.add(CreateSphere('./textures/saturnmap.jpg',(Saturn.size),50,"Saturn"));
  saturn_group.add(CreateTransparentSphere(TRANSPARENT_SPHERE_SIZE,50,TRANSPARENT_SPHERE_NAME));
  
  uranus_group.add(CreateSphere('./textures/uranusmap.jpg',(Uranus.size),50,"Uranus"));
  uranus_group.add(CreateTransparentSphere(TRANSPARENT_SPHERE_SIZE,50,TRANSPARENT_SPHERE_NAME));

  neptune_group.add(CreateSphere('./textures/neptunemap.jpg',(Neptune.size),50,"Neptune"));
  neptune_group.add(CreateTransparentSphere(TRANSPARENT_SPHERE_SIZE,50,TRANSPARENT_SPHERE_NAME));
  
  pluto_group.add(CreateSphere('./textures/mercury.jpg',(Pluto.size),50,"Pluto"));
  pluto_group.add(CreateTransparentSphere(TRANSPARENT_SPHERE_SIZE,50,TRANSPARENT_SPHERE_NAME));
  //Trace Orbits 
  
  
  
  scene.add(CreateOrbitalLine(0xae2300,Mercury.semimajor_axis_scene(),Mercury.semiminor_axis_scene(),Mercury.periapsis_scene(),Mercury.orbital_inclination));
  scene.add(CreateOrbitalLine(0xff0000,Venus.semimajor_axis_scene(),Venus.semiminor_axis_scene(),Venus.periapsis_scene(),Venus.orbital_inclination));
  scene.add(CreateOrbitalLine(0xff00ff,Earth.semimajor_axis_scene(),Earth.semiminor_axis_scene(),Earth.periapsis_scene(),Earth.orbital_inclination));
  scene.add(CreateOrbitalLine(0xffff00,Mars.semimajor_axis_scene(),Mars.semiminor_axis_scene(),Mars.periapsis_scene(),Mars.orbital_inclination));
  scene.add(CreateOrbitalLine(0x00ff00,Jupiter.semimajor_axis_scene(),Jupiter.semiminor_axis_scene(),Jupiter.periapsis_scene(),Jupiter.orbital_inclination));
  scene.add(CreateOrbitalLine(0x0000ff,Saturn.semimajor_axis_scene(),Saturn.semiminor_axis_scene(),Saturn.periapsis_scene(),Saturn.orbital_inclination));
  scene.add(CreateOrbitalLine(0x00ffff,Uranus.semimajor_axis_scene(),Uranus.semiminor_axis_scene(),Uranus.periapsis_scene(),Uranus.orbital_inclination));
  scene.add(CreateOrbitalLine(0xffffff,Neptune.semimajor_axis_scene(),Neptune.semiminor_axis_scene(),Neptune.periapsis_scene(),Neptune.orbital_inclination));
  scene.add(CreateOrbitalLine(0xffc7ff,Pluto.semimajor_axis_scene(),Pluto.semiminor_axis_scene(),Pluto.periapsis_scene(),Pluto.orbital_inclination));

  window.addEventListener('resize',onWindowResize,false);

  render();
};

function CreateSphere(texture_u,radius,polygon_count,name,basic){

  var sphere_loader = new THREE.TextureLoader();
  var sphere_texture = sphere_loader.load(texture_u);
  var sphere_geometry=new THREE.SphereGeometry(radius,polygon_count,polygon_count);
//  var sphere_material=new THREE.MeshPhongMaterial({map: sphere_texture});
  if (basic==true) {
    var sphere_material=new THREE.MeshBasicMaterial({map: sphere_texture});
  } else {
    var sphere_material=new THREE.MeshLambertMaterial({map: sphere_texture});
  }
  var sphere_mesh = new THREE.Mesh(sphere_geometry,sphere_material);
  sphere_mesh.name = name;
  return(sphere_mesh);

};

function CreateOrbitalLine(color,semimajor_axis,semiminor_axis,periapsis,orbital_inclination){
  
  var linematerial = new THREE.LineBasicMaterial({color: color});
  var linegeometry = new THREE.Geometry();
  
  
  for (var i = 0; i < ((2*Math.PI)+0.02); (i = i + 0.01)) {

    
    
    var y= semimajor_axis*Math.sin(i)*Math.sin(orbital_inclination*(Math.PI/180));
    var x = (semimajor_axis*Math.cos(i) - (semimajor_axis - periapsis));
    var z = semiminor_axis*Math.sin(i)*Math.cos(orbital_inclination*(Math.PI/180));
    linegeometry.vertices.push(new THREE.Vector3(x,y,z));
      
  }
  
  var orbitline = new THREE.Line(linegeometry,linematerial);
  return(orbitline);
  
  
  
};



function CreateTransparentSphere(radius,polygon_count,name){

  var sphere_geometry = new THREE.SphereGeometry(radius,polygon_count,polygon_count);
  var sphere_material = new THREE.MeshBasicMaterial({transparent: true, opacity: 0.05, color: 0xffffff})
  var sphere_mesh = new THREE.Mesh(sphere_geometry,sphere_material);
  sphere_mesh.name = name;
  return(sphere_mesh);

};

function CalculateDistanceFromObject(camera_x,camera_y,camera_z,object_x,object_y,object_z){

  var delta_x = Math.abs((camera_x - object_x));
  var delta_y = Math.abs((camera_y - object_y));
  var delta_z = Math.abs((camera_z - object_z));
  var distance = Math.sqrt(Math.pow(delta_x,2)+Math.pow(delta_y,2)+Math.pow(delta_z,2));
  return(distance);

};

function ScaleOverlaySpheres(sphere_name,object_group,distance_from_group,scale_constant){

  var distance_from_planet = 0.0;
  var distance_from_planet = CalculateDistanceFromObject(camera.position.x,camera.position.y,
      camera.position.z,distance_from_group.position.x,distance_from_group.position.y,
      distance_from_group.position.z);
  object_group.getObjectByName(sphere_name,true).scale.x = (distance_from_planet)/250;
  object_group.getObjectByName(sphere_name,true).scale.y = (distance_from_planet)/250;
  object_group.getObjectByName(sphere_name,true).scale.z = (distance_from_planet)/250;


}


function ScalePlanet(sphere_name,object_group,scale_constant){


  object_group.getObjectByName(sphere_name,true).scale.x = scale_constant;
  object_group.getObjectByName(sphere_name,true).scale.y = scale_constant;
  object_group.getObjectByName(sphere_name,true).scale.z = scale_constant;


}

// Sets camera target point.
//This needs a lot of work...
function UpdateCameraLocation(){
  switch(options.CameraFocus){
      case 'Sun':
        controls.minDistance=2000;
        camera_position.x=0;
        camera_position.y=0;
        camera_position.z=0;
        break;
      case 'Mercury':
        controls.minDistance=100;
        
        camera_position.x=mercury_group.position.x;
        camera_position.y=mercury_group.position.y;
        camera_position.z=mercury_group.position.z;
        break;
     case 'Venus':
        controls.minDistance=100;
        camera_position.x=venus_group.position.x;
        camera_position.y=venus_group.position.y;
        camera_position.z=venus_group.position.z;
        break;
    case 'Earth':
        controls.minDistance=100;
        camera_position.x=earth_group.position.x;
        camera_position.y=earth_group.position.y;
        camera_position.z=earth_group.position.z;
        break;
    case 'Mars':
        controls.minDistance=100;
        camera_position.x=mars_group.position.x;
        camera_position.y=mars_group.position.y;
        camera_position.z=mars_group.position.z;
        break;
    case 'Jupiter':
        controls.minDistance=100;
        camera_position.x=jupiter_group.position.x;
        camera_position.y=jupiter_group.position.y;
        camera_position.z=jupiter_group.position.z;
        break;
    case 'Saturn':
      controls.minDistance=100;
        camera_position.x=saturn_group.position.x;
        camera_position.y=saturn_group.position.y;
        camera_position.z=saturn_group.position.z;
        break;
    case 'Uranus':
      controls.minDistance=100;
        camera_position.x=uranus_group.position.x;
        camera_position.y=uranus_group.position.y;
        camera_position.z=uranus_group.position.z;
        break;
    case 'Neptune':
      controls.minDistance=100;
        camera_position.x=neptune_group.position.x;
        camera_position.y=neptune_group.position.y;
        camera_position.z=neptune_group.position.z;
        break;
    case 'Pluto':
    
        controls.minDistance=100;
        camera_position.x=pluto_group.position.x;
        camera_position.y=pluto_group.position.y;
        camera_position.z=pluto_group.position.z;
        break;
   
     default:
        camera_position.x=0;
        camera_position.y=0;
        camera_position.z=0; 
     
    }

}



// Takes a planet_group in and planet physical object, and adjusts the position in the scene.
function AdjustPlanetLocation(group,planet){
  
  var y = planet.semimajor_axis_scene()*Math.sin(planet.orbital_inclination*(Math.PI/180)) * Math.sin(planet.true_anamoly());
  group.position.y = y;
  group.position.x = planet.semimajor_axis_scene()*Math.cos(planet.true_anamoly()) - (planet.semimajor_axis_scene() - planet.periapsis_scene());
  group.position.z = planet.semiminor_axis_scene()*Math.sin(planet.true_anamoly())*Math.cos(planet.orbital_inclination*(Math.PI/180));

  
};


function onWindowResize() {

  var windowHalfX = window.innerWidth/2;
  var windowHalfY = window.innerHeight/2;
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  //controls.handleResize();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
};

function animate() {
  
  render();
   
  //Keep camera pointed at target.
  controls.target= camera_position;

  // Sun glow effect is calculated from view matrix so ensure as view matrix changes effect updates.
  sunGlow.material.uniforms.viewVector.value = 
	  new THREE.Vector3().subVectors( camera.position, sunGlow.position );
  sun_mesh.material.uniforms.time.value += Clock.getDelta();
  stats_fps.update();
  update();
  requestAnimationFrame(animate);


};

function render() {


  renderer.render(scene,camera);
  
  //mercury_group_orbit.rotation.y += planet_rotation;
  //venus_group_orbit.rotation.y += planet_rotation/1.5;
  //earth_group_orbit.rotation.y += planet_rotation/2;
  //mars_group_orbit.rotation.y += planet_rotation/3;
  //earth_group.rotation.y += -planet_rotation*10;
  //mercury_group.rotation.y += planet_rotation;


};


// This encapsulates the majority of the physics and animations.
function update(){
  
  
   controls.update();
   controls.target= camera_position;
   UpdateCameraLocation();
  
   //Set Scaling Time from GUI
  SCALING_TIME = options.OrbitSpeedMultiplier;
  
  
 //Calculate orbits!
 
  AdjustPlanetLocation(mercury_group,Mercury);
  AdjustPlanetLocation(venus_group,Venus);
  AdjustPlanetLocation(earth_group,Earth);
  AdjustPlanetLocation(mars_group,Mars);
  AdjustPlanetLocation(jupiter_group,Jupiter);
  AdjustPlanetLocation(saturn_group,Saturn);
  AdjustPlanetLocation(uranus_group,Uranus);
  AdjustPlanetLocation(neptune_group,Neptune);
  AdjustPlanetLocation(pluto_group,Pluto);  
  
  
  //Scale Planets. This can definitely be optimised.
 
  ScalePlanet("Mercury",mercury_group,options.PlanetScale);
  ScalePlanet("Venus",venus_group,options.PlanetScale);
  ScalePlanet("Earth",earth_group,options.PlanetScale);
  ScalePlanet("Mars",mars_group,options.PlanetScale);
  ScalePlanet("Jupiter",jupiter_group,options.PlanetScale);
  ScalePlanet("Saturn",saturn_group,options.PlanetScale);
  ScalePlanet("Uranus",uranus_group,options.PlanetScale);
  ScalePlanet("Neptune",neptune_group,options.PlanetScale);
  
  // Also can be optimised.
  
  ScaleOverlaySpheres(TRANSPARENT_SPHERE_NAME,mercury_group,sun_group,2500);
  ScaleOverlaySpheres(TRANSPARENT_SPHERE_NAME,venus_group,sun_group,2500);
  ScaleOverlaySpheres(TRANSPARENT_SPHERE_NAME,earth_group,sun_group,2500);
  ScaleOverlaySpheres(TRANSPARENT_SPHERE_NAME,mars_group,sun_group,2500);
  ScaleOverlaySpheres(TRANSPARENT_SPHERE_NAME,jupiter_group,sun_group,2500);
  ScaleOverlaySpheres(TRANSPARENT_SPHERE_NAME,saturn_group,sun_group,2500);
  ScaleOverlaySpheres(TRANSPARENT_SPHERE_NAME,uranus_group,sun_group,2500);
  ScaleOverlaySpheres(TRANSPARENT_SPHERE_NAME,neptune_group,sun_group,2500);
  
  // Give sun a bit of rotation per frame.
  sun_mesh.rotation.y += 0.0005;
  
  
  
};