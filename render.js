const vertexShaderCode = `
    attribute vec4 pos;  
    
    void main() {
    
        gl_Position = pos;
    }
`;

const fragmentShaderCode = `

#define NUMITEMS 5
#define NOL0 4
#define NOL1 4
#define SAMPLESX 1
#define SAMPLESY 1
#define SHADOWSAMPLESX 6
#define SHADOWSAMPLESZ 6
#define LIGHTSIZE 100

precision mediump float;

uniform vec3 iResolution;
uniform vec4 iMouse;
uniform float time;  

uniform sampler2D iChannel0;     
uniform int keyPress;

const float pi = 3.1416;
const float RAYOFFSET = 0.001;

//Fake Fresnel
vec3 fc = vec3(0.1,0.00,2.50);

//set up orientations

vec3 V2 = vec3(0.0,0.0,0.1);
vec3 N2 = normalize(V2);

vec3 V1 = vec3(0.0,1.0,0.0);

vec3 V0 = cross(V1,V2); 
vec3 N0 = normalize(V0);

vec3 N1 = cross(N2, N0); 

struct Material {

    vec4 ambient;
    vec4 diffuse;
    vec4 specular;
    float ks;

    float reflectivity;
    float refractivity;

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

vec2 textureMapSphere(vec3 direction)
{
    vec2 uv;
    uv.x = 0.5 + 0.5 * atan(direction.z, direction.x) / pi;
    uv.y = 0.5 - 0.5 * asin(direction.y) / (0.5 * pi);
    return uv;
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

Hit checkSceneCollision(Item scene[NUMITEMS], Ray ray, int parent){

    Hit h;
    h.t = -1.0;
    h.position = vec3(-1.0);
    h.normal = vec3(-1.0);
    h.sceneIndex = -1;

    float tMin = 10000.0;

    for (int i = 0; i < NUMITEMS; i++){

        if (i != parent){

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
    else if (sceneIndex == 3){
        it = scene[3];
    }
    else if (sceneIndex == 4){
        it = scene[4];
    }
    /*else if (sceneIndex == 5){
        it = scene[5];
    }*/


    return it;
}

//for the sake of simplicity for now I will just use this for every refraction
float ior = 1.9;
float refractValue = 1.0 / ior;

vec3 reflectRay(vec3 incident, vec3 normal) {
    return incident - 2.0 * dot(incident, normal) * normal;
}

vec3 refractRay(vec3 incident, vec3 normal) {
    float cosVal = -dot(normal, incident);
    vec3 n = normal;
    
    float k = 1.0 - refractValue * refractValue * (1.0 - cosVal * cosVal);
    
    if(k < 0.0) {
        return reflectRay(incident, normal);
    } else {
        return (refractValue * incident + (refractValue * cosVal - sqrt(k)) * n);
    }
}         

vec4 rayTrace(Ray ray, Item scene[NUMITEMS], vec3 lightPos, vec2 uv){

    vec4 col = vec4(0.0);

    //initial ray to find hit
    Hit sceneHit = checkSceneCollision(scene, ray, -1);

    if (sceneHit.sceneIndex != -1){

        Item it = sceneItemReference(sceneHit.sceneIndex, scene);

        //initialize color to ambient
        col = it.material.ambient;

        //check if point is in shadow

        //first generate a new ray that points toward light source

        //TODO: change this up to shoot multiple shadow rays for area lights / smooth shadows

        int lightHits = 0;

        Ray shadowRay;
        shadowRay.origin = sceneHit.position + sceneHit.normal * RAYOFFSET;

        float startPos = -float(LIGHTSIZE)/2.0;
        float crawlx = float(LIGHTSIZE) / float(NOL0);
        float crawlz = float(LIGHTSIZE) / float(NOL1);

        for (int i = 0; i < SHADOWSAMPLESX; i++){
            for (int j = 0; j < SHADOWSAMPLESZ; j++){

                vec3 areaLightPosition = lightPos;

                // Random offsets within the light size
                float randomOffsetX = (random(vec2(float(i), float(j))) - 0.5) * float(LIGHTSIZE);
                float randomOffsetZ = (random2(vec2(float(i), float(j))) - 0.5) * float(LIGHTSIZE);

                areaLightPosition.x += randomOffsetX;
                areaLightPosition.z += randomOffsetZ;

                shadowRay.direction = normalize(areaLightPosition - sceneHit.position);

                Hit shadowHit = checkSceneCollision(scene, shadowRay, sceneHit.sceneIndex);

                if (!(shadowHit.sceneIndex != -1 && shadowHit.sceneIndex != sceneHit.sceneIndex)){

                    lightHits += 1;

                }
            }
        }

        float lightPercent = float(lightHits) / float(SHADOWSAMPLESX * SHADOWSAMPLESZ);

        float smoothShadowFactor = smooth_step(0.0, 1.0, lightPercent);

        //if these conditions arent true then the point is not in shadow and we should color it
        if (lightPercent > 0.0){

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
                    finalGatherRay.origin = sceneHit.position + sceneHit.normal * RAYOFFSET;

                    //compute direction

                    //lazy implementation #TODO: try to do the better way as well

                    float rand1 = random(uv + float(i * NOL0 + j));
                    float rand2 = random2(uv + float(i * NOL0 + j));
                    float rand3 = random3(uv + float(i * NOL0 + j));

                    vec3 finalDirection = normalize(sceneHit.normal + vec3(rand1, rand2, rand3));

                    finalGatherRay.direction = finalDirection; //TODO: send out in random directions around a hemisphere

                    Hit finalGatherHit = checkSceneCollision(scene, finalGatherRay, sceneHit.sceneIndex);

                    float gatherWeight = dot(sceneHit.normal, finalGatherRay.direction);

                    if (finalGatherHit.sceneIndex >= 0 && finalGatherHit.sceneIndex != sceneHit.sceneIndex){
                        Item finalIt = sceneItemReference(finalGatherHit.sceneIndex, scene);

                        //first check if its in shadow

                        Ray finalGatherColorBleedShadowRay;
                        finalGatherColorBleedShadowRay.origin = finalGatherHit.position + finalGatherHit.normal * RAYOFFSET;
                        finalGatherColorBleedShadowRay.direction = normalize(vec3(lightPos - finalGatherHit.position));

                        Hit finalGatherColorBleedShadowHit = checkSceneCollision(scene, finalGatherColorBleedShadowRay, finalGatherHit.sceneIndex);

                        if (finalGatherColorBleedShadowHit.sceneIndex >= 0 && finalGatherColorBleedShadowHit.sceneIndex != finalGatherHit.sceneIndex){
                            float illum = dot(finalGatherHit.normal, finalGatherColorBleedShadowRay.direction);
                            if (illum < 0.0) illum = 0.0;
                            vec4 otherCol = finalIt.material.ambient * (1.0 - illum) + finalIt.material.diffuse * illum;

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

                        vec2 uv_tex = textureMapSphere(finalGatherRay.direction);
                        vec4 environmentColor = texture2D(iChannel0, uv_tex);
                    

                        finalGatherColorBleed += environmentColor * gatherWeight;
                        finalGatherAmbientOcclusion += gatherWeight;
                        finalGatherEnvironment += environmentColor * gatherWeight;
                        
                    }

                    weights += gatherWeight;
                }
            }

            float directIllum = dot(sceneHit.normal, normalize(lightPos - sceneHit.position));
            if (directIllum < 0.0) directIllum = 0.0;
            vec4 directLightingColor = it.material.ambient * (1.0 - directIllum) + it.material.diffuse * directIllum;

            //check for reflection color

            vec4 reflectionColor;

            if (it.material.reflectivity > 0.0 || it.material.refractivity > 0.0){
                //shoot reflection ray and retrieve the color of whatever gets hit

                Ray reflectionRay;
                reflectionRay.origin = sceneHit.position + sceneHit.normal * RAYOFFSET;
                reflectionRay.direction = reflectRay(ray.direction, sceneHit.normal);

                Hit reflectionHit = checkSceneCollision(scene, reflectionRay, sceneHit.sceneIndex);

                //TODO: REFACTOR THIS MESS

                if (reflectionHit.sceneIndex != -1 && reflectionHit.sceneIndex != sceneHit.sceneIndex){

                    //hit an object so compute its color

                    Item reflectIt = sceneItemReference(reflectionHit.sceneIndex, scene);

                    //adding ONE more bounce if it hit a reflective surface, otherwise it looks bad with just showing diffuse

                    //a bit of a hack here, with one bounce the reflected ground was way too dark, so I'm only looking at reflections > 0.1 (the spheres)
                    if (reflectIt.material.reflectivity > 0.1 || reflectIt.material.refractivity > 0.0){

                        reflectionRay.origin = reflectionHit.position + reflectionHit.normal * RAYOFFSET;
                        reflectionRay.direction = reflectRay(reflectionRay.direction, reflectionHit.normal);

                        reflectionHit = checkSceneCollision(scene, reflectionRay, reflectionHit.sceneIndex);

                    }

                    if (reflectionHit.sceneIndex != -1 && reflectionHit.sceneIndex != sceneHit.sceneIndex){

                        reflectIt = sceneItemReference(reflectionHit.sceneIndex, scene);

                        float reflectIllum = dot(reflectionHit.normal, normalize(lightPos - reflectionHit.position));
                        if (reflectIllum < 0.0) reflectIllum = 0.0;
                        reflectionColor = reflectIt.material.ambient * (1.0 - reflectIllum) + reflectIt.material.diffuse * reflectIllum;
                    }
                    else{
                        vec2 uv_tex = textureMapSphere(reflectionRay.direction);
                        reflectionColor = texture2D(iChannel0, uv_tex);
                    }

                }
                else{

                    vec2 uv_tex = textureMapSphere(reflectionRay.direction);
                    reflectionColor = texture2D(iChannel0, uv_tex);
                }

                //mix reflecred color with the regular coloring depending on reflection ratio

                directLightingColor = ((1.0 - it.material.reflectivity) * directLightingColor) + (it.material.reflectivity * reflectionColor);

            }

            if (it.material.refractivity > 0.0){
                //shoot refraction ray and retrieve the color of whatever gets hit

                Ray refractionRay;
                refractionRay.origin = sceneHit.position + sceneHit.normal * RAYOFFSET;
                refractionRay.direction = refractRay(ray.direction, sceneHit.normal);

                Hit refractionHit = checkSceneCollision(scene, refractionRay, sceneHit.sceneIndex);

                vec4 refractionColor;

                if (refractionHit.sceneIndex != -1 && refractionHit.sceneIndex != sceneHit.sceneIndex){

                    //hit an object so compute its color

                    Item refractIt = sceneItemReference(refractionHit.sceneIndex, scene);

                    float refractIllum = dot(refractionHit.normal, normalize(lightPos - refractionHit.position));
                    if (refractIllum < 0.0) refractIllum = 0.0;
                    refractionColor = refractIt.material.ambient * (1.0 - refractIllum) + refractIt.material.diffuse * refractIllum;

                }
                else{

                    vec2 uv_tex = textureMapSphere(refractionRay.direction);
                    refractionColor = texture2D(iChannel0, uv_tex);
                }

                //mix refracted color with the reflection coloring depending on fake fresnel

                float cosVal = dot(sceneHit.normal, -ray.direction);

                float fresnel = clamp(fc.z * (1.0 - cosVal) * (1.0 - cosVal) + fc.y * 2.0 * cosVal * (1.0 - cosVal) + fc.x * cosVal * cosVal, 0.0, 1.0);

                directLightingColor = ((1.0 - fresnel) * refractionColor) + (fresnel * reflectionColor);

            }
            
            finalGatherColorBleed = finalGatherColorBleed / weights;
            finalGatherAmbientOcclusion = finalGatherAmbientOcclusion / weights;
            finalGatherEnvironment = finalGatherEnvironment / weights;

            col = finalGatherColorBleed * 0.25 + directLightingColor * 0.6 + finalGatherAmbientOcclusion * (it.material.ambient) * 0.1 + finalGatherEnvironment * 0.05;

            //col = clamp(col, 0.0, 1.0);

            col.a = 1.0;
            //col = vec4(0.0, 1.0, 0.0, 1.0)
        }

        //check shadow computation since ambient looks weird in the shadows at times
            
        col = (1.0 - smoothShadowFactor) * it.material.ambient + smoothShadowFactor * col;

    }
    else{

        vec2 uv_tex = textureMapSphere(ray.direction);
        col = texture2D(iChannel0, uv_tex);

    }

    return col;

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
    vec4 dif0 = vec4(0.0/255.0, 255.0/255.0,255.0/255.0,1.0); 
    vec4 highlight0 = vec4(225.0/255.0, 220.0/255.0,200.0/255.0,1.0); 

    sphere0.material.ambient = ambient0;
    sphere0.material.diffuse = dif0;
    sphere0.material.specular = highlight0;
    sphere0.material.ks = 0.9;
    sphere0.material.reflectivity = 0.0;
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
    sphere1.material.diffuse = vec4(255.0/255.0, 255.0/255.0,255.0/255.0,1.0);
    sphere1.material.reflectivity = 0.9;
    sphere1.position = vec3( 1500.0, 600.0 + 350.0 * sin(time / 500.0), -mint0 / 4.5);
    sphere1.property = 1;

    scene[1] = sphere1;

     //add third sphere

    Item sphere2;

    sphere2 = sphere0;
    sphere2.material.diffuse = vec4(255.0/255.0, 255.0/255.0,0.0/255.0,1.0);
    //sphere2.position = vec3(1000.0, 35.0, -mint0 / 3.0);
    sphere2.position = vec3(1000.0, 25.0 + 200.0 * abs(cos(time / 1000.0)), -mint0 / 3.0);  
    sphere2.property = 1;
    sphere2.scale = sphere0.scale * 0.5;  // make it smaller;

    scene[2] = sphere2;

    //add fourth sphere

    Item sphere3;

    sphere3 = sphere0;
    sphere3.material.diffuse = vec4(255.0/255.0, 255.0/255.0,255.0/255.0,1.0);
    sphere3.position = vec3(0.0, 200.0 + 500.0 * cos(time / 1300.0), -mint0 / 10.0);  
    sphere3.property = 1;
    sphere3.scale = sphere0.scale * 0.5;  // make it smaller;
    sphere3.material.reflectivity = 0.0;
    sphere3.material.refractivity = 1.0;

    scene[3] = sphere3;

    //add the plane

    vec3 P_PL = vec3(0.0, -200.0, 0.0); //plane position

    Item plane0;

    plane0.type = 1;

    plane0.material.ambient = ambient0;
    plane0.material.diffuse = vec4(250.0/255.0, 255.0/255.0,255.0/255.0,1.0);;
    plane0.material.specular = highlight0;
    plane0.material.ks = 0.9;
    plane0.material.reflectivity = 0.1;
    plane0.material.refractivity = 0.0;

    plane0.position = P_PL; //set plane position
    plane0.rotation = (vec3(0, 0, 0));
    plane0.scale = iResolution.y/1.50;  //set plane radius
    
    plane0.property = 0; //basic diffuse

    //add the sphere to the scene list
    scene[4] = plane0;

    /*
    Item sphere4;

    sphere4 = sphere0;
    sphere4.material.diffuse = vec4(255.0/255.0, 0.0/255.0,255.0/255.0,1.0);
    sphere4.position = vec3(1800.0, 35.0, -mint0 / 10.0);  
    sphere4.property = 1;
    sphere4.scale = sphere0.scale * 0.7;  // make it smaller;

    scene[5] = sphere4;*/

    float s0 = iResolution.x;
    float s1 = iResolution.x;

    //figure out camera position, pixel position, and light position

    vec3 cameraPos = vec3(iResolution.x / 2.0, iResolution.y / 2.0, iResolution.x); // eye position
    
    vec3 pixelPos =  vec3(gl_FragCoord.x, gl_FragCoord.y, -3.0);                                                             
    vec3 lightPos = vec3(0.0, 1000.0, 0.0);
    
    vec3 rayDirection = normalize(pixelPos - cameraPos);
    
    float mint = mint0;

    vec3 P_BG = vec3(0.0,0.0,-mint0/30.0);
    vec3 N_BG = vec3(0.0,0.0,1.0);
    float t = -dot(N_BG,(cameraPos-P_BG))/(dot(N_BG, rayDirection));
    vec3 N = N_BG; 
    vec3 P_H = cameraPos + t * rayDirection;

    uv_tex.x = dot(N0,(P_H-P_BG))/s0; 
    uv_tex.y = dot(N1,(P_H-P_BG))/s1;
    uv_tex = p2(uv_tex);

    vec4 finalCol = vec4(0.0);

    Ray ray;
    ray.origin = cameraPos;

    //antialiasing
    //shoots random at multiple random points in a pixel and averages the result to smooth edges
    for (int i = 0; i < SAMPLESX; i++) {
        for (int j = 0; j < SAMPLESY; j++) {
        
            vec2 offset;
            
            offset.x = (random(vec2(gl_FragCoord.xy + float(i * SAMPLESY + j))) - 0.5) / iResolution.x;
            offset.y = (random2(vec2(gl_FragCoord.xy + float(i * SAMPLESY + j))) - 0.5) / iResolution.y;

            uv = (gl_FragCoord.xy + vec2(float(i), float(j)) / vec2(SAMPLESX, SAMPLESY) + offset) / iResolution.xy;

            pixelPos = vec3(uv * iResolution.xy, -3.0);

            vec3 rayDirection = normalize(pixelPos - cameraPos);

            ray.direction = rayDirection;

            finalCol += rayTrace(ray, scene, lightPos, uv);
        }
    }

    finalCol = finalCol / float(SAMPLESX*SAMPLESY);

    finalCol.a = 1.0;
   
    gl_FragColor = vec4(finalCol);    // Output to screen                                                    
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
var iTimeAttribute;

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
    //glContext.pixelStorei(glContext.UNPACK_FLIP_Y_WEBGL, true);

    const texturePaths = [
        'Assets/Images/skies.jpg',                              
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
    iTimeAttribute = glContext.getUniformLocation(glProgram, 'time');

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
    glContext.uniform1f(iTimeAttribute, performance.now());

    //draw the scene
    glContext.drawArrays(glContext.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
}

main();