const vertexShaderCode = `
    attribute vec4 pos;  
    
    void main() {
    
        gl_Position = pos;
    }
`;

const fragmentShaderCode = `

#define NUMITEMS 3
#define NOL0 7
#define NOL1 7

precision mediump float;

uniform vec3 iResolution;
uniform vec4 iMouse;  

uniform sampler2D iChannel0;     
uniform int keyPress;

const float pi = 3.1416;

struct Material {

    vec4 ambient;
    vec4 diffuse;
    vec4 specular;
    float ks;
    
    float reflectivity;  // Add reflectivity for the reflective effect                                                 //add here
    vec3 color;                                                                                                        //add here
};

struct Item {

    int type; //sphere or plane in our case, we can do 0 for sphere and 1 for plane
    Material material;
    vec3 position;
    vec3 rotation;
    float scale; //for the sake of simplicity lets just say that this would be the radius for spheres and planes can be assumed to always have the same length and width (given by this value)
    int property; //we can use this to determine whether the item is reflective, refractive, diffuse, etc.

    /*

    property 0: basic diffuse
    property 1: reflective
    
    

    (^keep adding to here so we can keep track)

    */
};

struct Ray {

    vec3 origin;
    vec3 direction;

};

struct Hit {

    float t;
    vec3 position;
    vec3 normal;

    int sceneIndex;

};

vec3 reflectRay(vec3 incident, vec3 normal) {
    return incident - 2.0 * dot(incident, normal) * normal;
}

vec2  p2(vec2 st)   
{
    st.x = abs(st.x - float(int(st.x)));
    st.y = abs(st.y - float(int(st.y)));   
    st.x = abs(2.0*(st.x - 0.5));
    st.y = abs(2.0*(st.y - 0.5));
    return st;
}

float random (vec2 st) {
    return fract(sin(dot(st.xy,vec2(12.9898,78.233))) * 43758.5453123);
}

float random2 (vec2 st) {
    return fract(sin(dot(st.xy,vec2(9790.2248,79.864))) * 635357.4893123);
}

float random3 (vec2 st) {
    return fract(sin(dot(st.xy,vec2(57.0932,757.298))) * 756489.9039201);
}

float smooth_step( float min, float max, float x )
{
    float t = (x - min) / (max - min);
    t = clamp(t, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t); // smoothstep formula   
    return t;
}

float step2(float min, float max, float x )
{
    float t = (x - min) / (max - min);
    t = clamp(t, 0.0, 1.0); 
    return t;
}

Hit checkSphereCollision(Item item, Ray ray, float tMin){
    Hit h;
    h.t = -1.0;
    h.position = vec3(-1.0);
    h.normal = vec3(-1.0);
    h.sceneIndex = -1;

    float B = dot(ray.direction, item.position - ray.origin);
    float C = dot(ray.origin - item.position, ray.origin - item.position) - item.scale*item.scale; 
    
    float delta = B*B-C; 
    
    //if theres no hit we just return the default defined above
    if(delta > 0.0 && B> 0.0){ //We hit sphere

        float t = B - sqrt(delta);

        //if t is not less than tMin that means there is a closer ray collision that has already been found so there is no need to keep going here
        
        if (t < tMin){
            
            vec3 hitPosition = ray.origin + t * ray.direction; 

            vec3 hitNormal = normalize((hitPosition - item.position) / item.scale);

            h.t = t;
            h.position = hitPosition;
            h.normal = hitNormal;
            h.sceneIndex = -1; //to be defined later

        }
    }
    
    return h;
}

Hit checkPlaneCollision(Item item, Ray ray, float tMin){
    Hit h;
    h.t = -1.0;
    h.position = vec3(-1.0);
    h.normal = vec3(-1.0);
    h.sceneIndex = -1;

    vec3 N_PL = vec3(0.0,1.0,0.0); //assuming upward facing plane for now

    if(dot(N_PL, ray.direction) < 0.0){ //We hit plane
        float t = -dot(N_PL, (ray.origin - item.position)) / (dot(N_PL, ray.direction));

        if(t < tMin)
        {
            h.t = t;
            h.position = ray.origin + t * ray.direction;
            h.normal = N_PL; 
            h.sceneIndex = -1; //to be defined later

        }
    }
    
    return h;
}

Hit checkSceneCollision(Item scene[NUMITEMS], Ray ray){

    Hit h;
    h.t = -1.0;
    h.position = vec3(-1.0);
    h.normal = vec3(-1.0);
    h.sceneIndex = -1;  //-1 means nothing was hit

    float tMin = 10000.0;

    for (int i = 0; i < NUMITEMS; i++){

        Hit itemHit;

        //type of 0 means sphere
        if (scene[i].type == 0){
            itemHit = checkSphereCollision(scene[i], ray, tMin);
        }
        else if (scene[i].type == 1){
            itemHit = checkPlaneCollision(scene[i], ray, tMin);
        }

        if (itemHit.t != -1.0 && itemHit.t < tMin){

            tMin = itemHit.t;

            h = itemHit;
            h.sceneIndex = i;

        }

    }

    return h;
}

Item sceneItemReference(int sceneIndex, Item scene[NUMITEMS]){

    Item it;

    if (sceneIndex == 0){
        it = scene[0];
    }
    else if (sceneIndex == 1){
        it = scene[1];
    }
    else if (sceneIndex == 2){
        it = scene[2];
    }

    return it;
}

void main() {

    vec4 ambient, diffuse, specular;
    vec4 col = vec4(0.0);

    vec2 uv = gl_FragCoord.xy / iResolution.xy; // Normalized pixel coordinates
    vec2 uv_tex;

    //an array to hold all the items in the scene
    Item scene[NUMITEMS];

    float mint0 = 10000.0;

    //construct the first item, sphere0
    Item sphere0;

    sphere0.type = 0;

    //set up material attributes for sphere0
    vec4 ambient0 = vec4(134.0/255.0 , 112.0/255.0, 108.0/255.0, 1.0); 
    vec4 dif0 = vec4(0.0/255.0, 0.0/255.0,255.0/255.0,1.0); 
    vec4 highlight0 = vec4(225.0/255.0, 220.0/255.0,200.0/255.0,1.0); 

    sphere0.material.ambient = ambient0;
    sphere0.material.diffuse = dif0;
    sphere0.material.specular = highlight0;
    sphere0.material.ks = 0.9;
    sphere0.material.reflectivity = 0.0;

    sphere0.position = vec3(iMouse.x, iMouse.y, -mint0 / 6.0); //set sphere position
    sphere0.rotation = (vec3(0, 0, 0));
    sphere0.scale = iResolution.y/1.50;  //set sphere radius
    
    sphere0.property = 0; //basic diffuse

    //add the sphere to the scene list
    scene[0] = sphere0;

    //add second sphere

    Item sphere1;

    sphere1 = sphere0;
    sphere1.material.diffuse = vec4(0.0/255.0, 255.0/255.0,0.0/255.0,1.0);
    sphere1.position = vec3( 1000.0, 0.0, -mint0 / 4.5);
    sphere1.property = 1;
    sphere1.material.reflectivity = 0.0;

    scene[1] = sphere1;

    //add the plane

    vec3 P_PL = vec3(0.0, -200.0, 0.0); //plane position

    Item plane0;

    plane0.type = 1;

    plane0.material.ambient = ambient0;
    plane0.material.diffuse = vec4(250.0/255.0, 255.0/255.0,255.0/255.0,1.0);;
    plane0.material.specular = highlight0;
    plane0.material.ks = 0.9;
    plane0.material.reflectivity = 0.5;

    plane0.position = P_PL; //set plane position
    plane0.rotation = (vec3(0, 0, 0));
    plane0.scale = iResolution.y/1.50;  //set plane radius
    
    plane0.property = 0; //basic diffuse

    //add the sphere to the scene list
    scene[2] = plane0;

    //set up orientations

    vec3 V2 = vec3(0.0,0.0,0.1);
    vec3 N2 = normalize(V2);
    
    vec3 V1 = vec3(0.0,1.0,0.0);

    vec3 V0 = cross(V1,V2); 
    vec3 N0 = normalize(V0);
    
    vec3 N1 = cross(N2, N0); 

    float s0 = iResolution.x;
    float s1 = iResolution.x;

    //figure out camera position, pixel position, and light position

    vec3 cameraPos = vec3(iResolution.x / 2.0, iResolution.y / 2.0, iResolution.x); // eye position
    vec3 pixelPos =  vec3(gl_FragCoord.x, gl_FragCoord.y, -3.0);                                                             
    vec3 lightPos = vec3(0.0, 1000.0, 0.0);
    
    vec3 rayDirection = normalize(pixelPos - cameraPos);
    
    float mint = mint0;
    float spec;
    float K_s;
    float weight = 0.9;
    float ior = pow(3.0, weight); 

    vec3 P_BG = vec3(0.0,0.0,-mint0/30.0);
    vec3 N_BG = vec3(0.0,0.0,1.0);
    float t = -dot(N_BG,(cameraPos-P_BG))/(dot(N_BG, rayDirection));
    vec3 N = N_BG; 
    vec3 P_H = cameraPos + t * rayDirection;
    mint = t;

    uv_tex.x = dot(N0,(P_H-P_BG))/s0; 
    uv_tex.y = dot(N1,(P_H-P_BG))/s1;
    uv_tex = p2(uv_tex);

    vec4 BG = texture2D(iChannel0, uv_tex);   

    ambient = BG / 8.0;                                                             // 8.0 or a higher value

    diffuse = BG;

    specular = highlight0;
    K_s = 0.0;
     
    Ray ray;
    ray.origin = cameraPos;
    ray.direction = rayDirection;

    //initial ray to find hit
    Hit sceneHit = checkSceneCollision(scene, ray);

    if (sceneHit.sceneIndex != -1){

        Item it = sceneItemReference(sceneHit.sceneIndex, scene);

        //initialize color to ambient
        col = it.material.ambient;

        //check if point is in shadow

        //first generate a new ray that points toward light source

        Ray shadowRay;
        shadowRay.origin = sceneHit.position + sceneHit.normal * 50.00;
        shadowRay.direction = normalize(lightPos - sceneHit.position);

        Hit shadowHit = checkSceneCollision(scene, shadowRay);

        //if these conditions arent true then the point is not in shadow and we should color it
        if (!(shadowHit.sceneIndex != -1 && shadowHit.sceneIndex != sceneHit.sceneIndex)){

            vec4 spec = it.material.specular;
            vec4 dif = it.material.diffuse;
            float exp = it.material.ks;

            //shoot out final gathering rays

            vec4 finalGatherColorBleed = vec4(0.0, 0.0, 0.0, 0.0);
            float finalGatherAmbientOcclusion = 0.0;
            vec4 finalGatherEnvironment = vec4(0.0, 0.0, 0.0, 0.0);

            float weights = 0.0;

            for (int i = 0; i < NOL0; i++){
                for (int j = 0; j < NOL1; j++){
                    Ray finalGatherRay;
                    finalGatherRay.origin = sceneHit.position + sceneHit.normal * 50.000;

                    //compute direction

                    //lazy implementation #TODO: try to do the better way as well

                    float rand1 = random(uv + float(i * NOL0 + j));
                    float rand2 = random2(uv + float(i * NOL0 + j));
                    float rand3 = random3(uv + float(i * NOL0 + j));

                    vec3 finalDirection = normalize(sceneHit.normal + vec3(rand1, rand2, rand3));

                    finalGatherRay.direction = finalDirection; //TODO: send out in random directions around a hemisphere

                    Hit finalGatherHit = checkSceneCollision(scene, finalGatherRay);

                    float gatherWeight = dot(sceneHit.normal, finalGatherRay.direction);

                    if (finalGatherHit.sceneIndex >= 0 && finalGatherHit.sceneIndex != sceneHit.sceneIndex){
                        Item finalIt = sceneItemReference(finalGatherHit.sceneIndex, scene);

                        //first check if its in shadow

                        Ray finalGatherColorBleedShadowRay;
                        finalGatherColorBleedShadowRay.origin = finalGatherHit.position + finalGatherHit.normal * 50.0;
                        finalGatherColorBleedShadowRay.direction = normalize(vec3(lightPos - finalGatherHit.position));

                        Hit finalGatherColorBleedShadowHit = checkSceneCollision(scene, finalGatherColorBleedShadowRay);

                        if (finalGatherColorBleedShadowHit.sceneIndex >= 0 && finalGatherColorBleedShadowHit.sceneIndex != finalGatherHit.sceneIndex){
                            float illum = dot(finalGatherHit.normal, finalGatherColorBleedShadowRay.direction);
                            if (illum < 0.0) illum = 0.0;
                            vec4 otherCol = finalIt.material.ambient * (1.0 - illum) + finalIt.material.diffuse * illum;

                            //TODO: if object is reflective shoot reflection and refraction rays and determine colors of the hits
                            //add here
                            vec3 baseColor = material.color;
                            vec3 reflectedColor = vec3(0.0);
                            if (material.reflectivity > 0.0) {
                                Ray reflectedRay;
                                reflectedRay.origin = hitPoint + normal * 0.001;
                                reflectedRay.direction = reflect(ray.direction, normal);
                                reflectedColor = traceRay(reflectedRay, depth + 1);
                            }
                            color = mix(baseColor, reflectedColor, material.reflectivity);
                            //end here

                            finalGatherColorBleed += otherCol * gatherWeight;
                        }
                        else{
                            finalGatherColorBleed += finalIt.material.ambient * gatherWeight;
                        }                        

                        //choose black for ambient occlusion so dont add any color (set black)
                        //choose black for environment as well
                    }
                    else{

                        vec2 environmentUV;

                        environmentUV.x = atan(finalDirection.z, finalDirection.x) / (2.0 * pi) + 0.5; 

                        environmentUV.y = acos(finalDirection.y) / pi; 

                        vec4 environmentColor = texture2D(iChannel0, environmentUV);
                    

                        finalGatherColorBleed += environmentColor * gatherWeight;
                        finalGatherAmbientOcclusion += gatherWeight;
                        finalGatherEnvironment += environmentColor * gatherWeight;
                        
                    }

                    weights += gatherWeight;
                }
            }

            float directIllum = dot(sceneHit.normal, shadowRay.direction);
            if (directIllum < 0.0) directIllum = 0.0;
            vec4 directLightingColor = it.material.ambient * (1.0 - directIllum) + it.material.diffuse * directIllum;

            //TODO: if object is reflective shoot reflection and refraction rays and determine colors of the hits

            finalGatherColorBleed = finalGatherColorBleed / weights;
            finalGatherAmbientOcclusion = finalGatherAmbientOcclusion / weights;
            finalGatherEnvironment = finalGatherEnvironment / weights;

            //add here
            vec3 baseColor = finalGatherColorBleed * 0.1 + directLightingColor * 0.75 
               + finalGatherAmbientOcclusion * it.material.ambient * 0.1 
               + finalGatherEnvironment * 0.05;

            vec3 colWithReflection = mix(baseColor, reflectionColor, it.material.reflectivity);

            col = clamp(colWithReflection, 0.0, 1.0);
            //end here

            col = finalGatherColorBleed * 0.1 + directLightingColor * 0.75 + finalGatherAmbientOcclusion * (it.material.ambient) * 0.1 + finalGatherEnvironment * 0.05;

            col = clamp(col, 0.0, 1.0);

            col.a = 1.0;
            //col = vec4(0.0, 1.0, 0.0, 1.0)
        }  

    }
    else{

        vec2 environmentUV;

        environmentUV.x = atan(ray.direction.z, ray.direction.x) / (2.0 * pi) + 0.5; 

        environmentUV.y = acos(ray.direction.y) / pi; 

        col = texture2D(iChannel0, environmentUV);
    }
    
    gl_FragColor = vec4(color, 1.0);                   
    //gl_FragColor = vec4(col);    // Output to screen                                                    
}
`

var canv;
var glContext;  //Loads WebGL context 
var glProgram;

var mousePos;
var iResolutionAttribute;
var keyPressed = 0;
//Light Interaction: Calculates light direction from iMouse, derives surface normals from texture, and determines light intensity for reflection and refraction.
var iMouseAttribute;
var iKeyAttribute;

async function main() {
    //set up the renderings

    canv = document.querySelector("#renderCanvas");

    glContext = canv.getContext("webgl");

    //check if context was sucessfully retrieved

    if (glContext == null){
        print("ERROR RETRIEVING CONTEXT");
        return;
    }

    //setup webgl program

    glProgram = glContext.createProgram();

    //set shaders

    //"./Assets/Shaders/refraction.glsl"

    var vertexShader = glContext.createShader(glContext.VERTEX_SHADER);
    var fragmentShader = glContext.createShader(glContext.FRAGMENT_SHADER);
    
    console.log("Fragment Shader Source:", fragmentShaderCode);  

    glContext.shaderSource(vertexShader, vertexShaderCode);
    glContext.shaderSource(fragmentShader, fragmentShaderCode);

    glContext.compileShader(vertexShader);
    glContext.compileShader(fragmentShader);

    var success = glContext.getShaderParameter(fragmentShader, glContext.COMPILE_STATUS);

    console.log("Compilation status: ", success);

    if (!success){
        throw ("Issue compiling:" + glContext.getShaderInfoLog(fragmentShader));
    }

    //attach shaders

    glContext.attachShader(glProgram, vertexShader);
    glContext.attachShader(glProgram, fragmentShader);

    //finally the program can be linked

    glContext.linkProgram(glProgram);

    success = glContext.getProgramParameter(glProgram, glContext.LINK_STATUS);

    //check if linking was successful

    console.log("Linking status: ", success);

    if (!success){
        throw ("program failed to link:" + glContext.getProgramInfoLog(glProgram));
    }

    glContext.useProgram(glProgram);

    //prevent textures from being upside down!
    //Loads four images as textures and binds them to the WebGL context.
    glContext.pixelStorei(glContext.UNPACK_FLIP_Y_WEBGL, true);

    const texturePaths = [
        'Assets/Images/ocean.jpg',                              
    ];

    const textures = await Promise.all(texturePaths.map(textureLoader));

    for (var i = 0; i < textures.length; i++) {
        glContext.activeTexture(glContext.TEXTURE0 + i);
        glContext.bindTexture(glContext.TEXTURE_2D, textures[i]);
    }

    //set texture attributes

    const iChannel0Loc = glContext.getUniformLocation(glProgram, "iChannel0");
    glContext.uniform1i(iChannel0Loc, 0);

    //const iChannel1Loc = glContext.getUniformLocation(glProgram, "iChannel1");
    //glContext.uniform1i(iChannel1Loc, 1);

    //set up rectangle to render with

    const verts = new Float32Array([
        -1, -1,   
        1, -1,   
        -1,  1,

        -1,  1,   
        1, -1,    
        1,  1
    ]);

    //create and bind vertex buffer using the above points

    const vertexBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, verts, glContext.STATIC_DRAW);

    //assign attribute for position in the shader

    const posAttributeLoc = glContext.getAttribLocation(glProgram, "pos");
    glContext.enableVertexAttribArray(posAttributeLoc);
    glContext.vertexAttribPointer(posAttributeLoc, 2, glContext.FLOAT, false, 0, 0);

    //add mouse and iresolution attributes for shader

    iMouseAttribute = glContext.getUniformLocation(glProgram, 'iMouse');
    iResolutionAttribute = glContext.getUniformLocation(glProgram, 'iResolution');
    iKeyAttribute = glContext.getUniformLocation(glProgram, 'keyPress');

    //set up mouse and its event listener

    mousePos = { x: 0, y: 0 };

    canv.addEventListener('mousemove', (event) => {

        //on mouse movement event move the mouse position

        const rect = canv.getBoundingClientRect();

        const xCanvScale = canv.width / rect.width;
        const yCanvScale = canv.height / rect.height;

        mousePos.x = (event.clientX - rect.left) * xCanvScale;
        mousePos.y = canv.height - (event.clientY - rect.top) * yCanvScale;

    });

    document.addEventListener('keydown', (event) => {

        const key = event.key;

        //up key
        //set keypressed to 1 in order to change render mode
        if (key == "ArrowUp"){
            keyPressed = 1;
        }

    });

    document.addEventListener('keyup', (event) => {

        const key = event.key;

        //up key
        //set keypressed to 0 in order to go back to normal
        if (key == "ArrowUp"){
            keyPressed = 0;
        }

    });
    
    render();
}

async function textureLoader(url) {

    return new Promise((resolve) => {

        const texture = glContext.createTexture();
        const image = new Image();

        image.onload = () => {

            glContext.bindTexture(glContext.TEXTURE_2D, texture);

            glContext.texImage2D(glContext.TEXTURE_2D, 0, glContext.RGBA, glContext.RGBA, glContext.UNSIGNED_BYTE, image);

            glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_T, glContext.CLAMP_TO_EDGE);
            glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_S, glContext.CLAMP_TO_EDGE);
            glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MIN_FILTER, glContext.LINEAR);
            
            resolve(texture);
        };

        image.src = url;
    });
}

let start = 0.0;

let oldTime = 0.0;

const fpsLabel = document.querySelector("#fps");

function render(curTime){

    //compute the current fps and display it on the page in order to be able to understand how the program is currently performing

    curTime *= 0.001;
    const timeChange = curTime - oldTime;

    oldTime = curTime;

    //the fps was changing so quickly that it was hard to read so I made it so that it only updates after certain periods of time
    if (curTime - start > 0.1){

        start = curTime;

        const fps = 1.0 / timeChange;

        fpsLabel.textContent = Math.round(fps);
    }

    glContext.clearColor(0.0, 0.0, 0.0, 1.0); //set background color to black as the default

    glContext.clear(glContext.COLOR_BUFFER_BIT);

    //before drawing the new frame update mouse and resolution values in the shader

    glContext.uniform4f(iMouseAttribute, mousePos.x, mousePos.y, 0.0, 0.0);
    glContext.uniform3f(iResolutionAttribute, canv.width, canv.height, 1.0);
    glContext.uniform1i(iKeyAttribute, keyPressed);

    //draw the scene
    glContext.drawArrays(glContext.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
}

main();