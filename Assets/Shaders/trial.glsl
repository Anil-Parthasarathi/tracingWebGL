#define NUMITEMS 3
#define NOL0 4
#define NOL1 4
#define SAMPLESX 2
#define SAMPLESY 2
#define SHADOWSAMPLESX 10
#define SHADOWSAMPLESZ 10
#define LIGHTSIZE 100

precision mediump float;

uniform vec3 iResolution;
uniform vec4 iMouse;  

uniform sampler2D iChannel0;     
uniform int keyPress;

const float pi = 3.1416;

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

Hit checkSceneCollision(Item scene[NUMITEMS], Ray ray){

    Hit h;
    h.t = -1.0;
    h.position = vec3(-1.0);
    h.normal = vec3(-1.0);
    h.sceneIndex = -1;

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

vec3 reflectRay(vec3 incident, vec3 normal) {
    return incident - 2.0 * dot(incident, normal) * normal;
}       

vec4 rayTrace(Ray ray, Item scene[NUMITEMS], vec3 lightPos, vec2 uv){

    vec4 col = vec4(0.0);

    //initial ray to find hit
    Hit sceneHit = checkSceneCollision(scene, ray);

    if (sceneHit.sceneIndex != -1){

        Item it = sceneItemReference(sceneHit.sceneIndex, scene);

        //initialize color to ambient
        col = it.material.ambient;

        //check if point is in shadow

        //first generate a new ray that points toward light source

        //TODO: change this up to shoot multiple shadow rays for area lights / smooth shadows

        int lightHits = 0;

        Ray shadowRay;
        shadowRay.origin = sceneHit.position + sceneHit.normal * 25.00;

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

                Hit shadowHit = checkSceneCollision(scene, shadowRay);

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
                    finalGatherRay.origin = sceneHit.position + sceneHit.normal * 25.000;

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
                        finalGatherColorBleedShadowRay.origin = finalGatherHit.position + finalGatherHit.normal * 25.0;
                        finalGatherColorBleedShadowRay.direction = normalize(vec3(lightPos - finalGatherHit.position));

                        Hit finalGatherColorBleedShadowHit = checkSceneCollision(scene, finalGatherColorBleedShadowRay);

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

            if (it.material.reflectivity > 0.0){
                //shoot reflection ray and retrieve the color of whatever gets hit

                Ray reflectionRay;
                reflectionRay.origin = sceneHit.position + sceneHit.normal * 25.00;
                reflectionRay.direction = reflectRay(ray.direction, sceneHit.normal);

                Hit reflectionHit = checkSceneCollision(scene, reflectionRay);

                vec4 reflectionColor;

                if (reflectionHit.sceneIndex != -1 && reflectionHit.sceneIndex != sceneHit.sceneIndex){

                    //hit an object so compute its color

                    Item reflectIt = sceneItemReference(reflectionHit.sceneIndex, scene);

                    float reflectIllum = dot(reflectionHit.normal, normalize(lightPos - reflectionHit.position));
                    if (reflectIllum < 0.0) reflectIllum = 0.0;
                    reflectionColor = reflectIt.material.ambient * (1.0 - reflectIllum) + reflectIt.material.diffuse * reflectIllum;

                }
                else{

                    vec2 uv_tex = textureMapSphere(reflectionRay.direction);
                    reflectionColor = texture2D(iChannel0, uv_tex);
                }

                //mix reflecred color with the regular coloring depending on reflection ratio

                directLightingColor = ((1.0 - it.material.reflectivity) * directLightingColor) + (it.material.reflectivity * reflectionColor);

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
    sphere1.material.diffuse = vec4(255.0/255.0, 0.0/255.0,0.0/255.0,1.0);
    sphere1.material.reflectivity = 1.0;
    sphere1.position = vec3( 1500.0, 500.0, -mint0 / 4.5);
    sphere1.property = 1;

    scene[1] = sphere1;

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
    scene[2] = plane0;

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

    vec4 finalCol = vec4(0.0);

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

            Ray ray;
            ray.origin = cameraPos;
            ray.direction = rayDirection;

            finalCol += rayTrace(ray, scene, lightPos, uv);
        }
    }

    finalCol = finalCol / float(SAMPLESX*SAMPLESY);

    finalCol.a = 1.0;

    //add in anti aliasing by shooting out rays randomly inside the pixel
     
    //finalCol = rayTrace(ray, scene, lightPos, uv);
   
    gl_FragColor = vec4(finalCol);    // Output to screen      