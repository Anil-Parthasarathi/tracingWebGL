const vertexShaderCode = `
    attribute vec4 pos;  
    
    void main() {
    
        gl_Position = pos;
    }
`;

const fragmentShaderCode = `

#define NUMITEMS 2

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

};

struct Item {

    int type; //sphere or plane in our case, we can do 0 for sphere and 1 for plane
    Material material;
    vec3 position;
    vec3 rotation;
    float scale; //for the sake of simplicity lets just say that this would be the radius for spheres and planes can be assumed to always have the same length and width (given by this value)

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

        //if t is not less than tMin that means there is a closer ray collision that has already been so theres no need to keep going here
        if (t < tMin){

            vec3 hitPosition = ray.origin + t * ray.direction; 

            vec3 hitNormal = (hitPosition - item.position) / item.scale;

            h.t = t;
            h.position = hitPosition;
            h.normal = hitNormal;
            h.sceneIndex = -1;

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

    //TODO: write this function!
    
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
            //TODO: still need to implement this function
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

void main() {

    vec4 ambient, diffuse, specular;
    vec4 col = vec4(0.0);

    vec2 uv = gl_FragCoord.xy / iResolution.xy; // Normalized pixel coordinates
    vec2 uv_tex;

    //an array to hold all the items in the scene
    Item scene[NUMITEMS];

    //construct the first item, sphere0
    Item sphere0;

    sphere0.type = 0;

    //set up material attributes for sphere0
    vec4 ambient0 = vec4(134.0/255.0 , 112.0/255.0, 108.0/255.0, 1.0); 
    vec4 dif0 = vec4(201.0/255.0, 183.0/255.0,169.0/255.0,1.0); 
    vec4 highlight0 = vec4(225.0/255.0, 220.0/255.0,200.0/255.0,1.0); 

    sphere0.material.ambient = ambient0;
    sphere0.material.diffuse = dif0;
    sphere0.material.specular = highlight0;

    float mint0 = 10000.0;

    sphere0.position = vec3(iMouse.x, iMouse.y, -mint0 / 20.0); //set sphere position
    sphere0.rotation = (vec3(0, 0, 0));
    sphere0.scale = iResolution.y/1.50;  //set sphere radius

    //add the sphere to the scene list
    scene[0] = sphere0;

    //add second sphere

    Item sphere1;

    sphere1 = sphere0;
    sphere1.position = vec3(iMouse.x + 900.0, iMouse.y, -mint0 / 20.0);

    scene[1] = sphere1;

    //set up orientations

    vec3 V2 = vec3(0.0,0.0,0.1);
    vec3 N2 = normalize(V2);
    
    vec3 V1 = vec3(0.0,1.0,0.0);

    vec3 V0 = cross(V1,V2); 
    vec3 N0 = normalize(V0);
    
    vec3 N1 = cross(N2, N0); 

    float s0 = iResolution.x;
    float s1 = iResolution.x;

    int noL0 = 5;
    int noL1 = 3;

    vec3 N; //normals

    //figure out camera position, pixel position, and light position

    vec3 cameraPos = vec3(iResolution.x / 2.0, iResolution.y / 2.0, iResolution.x); // eye position
    vec3 pixelPos =  vec3(gl_FragCoord.x, gl_FragCoord.y, 0.0);                                                             
    vec3 lightPos = vec3(iMouse.x, iMouse.y, 1.0 * iResolution.x / 1.0);

    vec3 P_PL = vec3(0.0, iResolution.y / 4.0, 0.0); 
    
    vec3 rayDirection = normalize(pixelPos - cameraPos);
    
    float t;

    float mint = mint0;
    vec3 P_H, P_H2; 
    float illum; 
    float spec;
    float K_s;
    float weight = 0.9;
    float ior = pow(3.0, weight); 

    vec3 P_BG = vec3(0.0,0.0,-mint0/30.0);
    vec3 N_BG = vec3(0.0,0.0,1.0);
    t = -dot(N_BG,(cameraPos-P_BG))/(dot(N_BG, rayDirection));
    N = N_BG; 
    P_H = cameraPos + t * rayDirection;
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

    Hit sceneHit = checkSceneCollision(scene, ray);

    if (sceneHit.sceneIndex != -1){

        float C = -dot(ray.direction, sceneHit.normal); 
        
        vec3 T_PE = (1.0 - weight) * ray.direction + weight * (-1.0 * sceneHit.normal); 

        T_PE = T_PE / length(T_PE);

        if (keyPress == 1){
            T_PE = 1.0 / ior * (-1.0 * ray.direction + (C - sqrt(C*C - 1.0 + ior*ior)) * sceneHit.normal);
            
        }

        t = -dot(N_BG, (sceneHit.position - P_BG)) / (dot(N_BG, T_PE));
        P_H2 = sceneHit.position + t * T_PE;   
        uv_tex.x = dot(N0,(P_H2 - P_PL)) / s0; 
        uv_tex.y = dot(N1,(P_H2 - P_PL)) / s1;
        uv_tex = p2(uv_tex);
        BG = texture2D(iChannel0, uv_tex);
        ambient = BG / 3.0; 
        diffuse = BG;
        K_s = 0.90;
        ambient = (1.0 - K_s) * scene[0].material.ambient + K_s * ambient; //webgl wont let me index with scene index here so we'll need to do a if else branch most likely
        diffuse = (1.0 - K_s) * scene[0].material.diffuse + K_s * diffuse;    
        specular = highlight0;
    
    }
    else{
        sceneHit.normal = N;
        sceneHit.position = P_H;
    }

    float totalillum = 0.0; 
    float totalspec = 0.0;
    float rand = random(uv) - 0.5;

    float incU = 1.0 / float(noL0);
    float incV = 1.0 / float(noL1);

    float ui = 0.0;
    float vi = 0.0;

    vec3 L;

    //had to hardcode the values of noL0 and noL1 here because it was giving me errors for using nonconstant values in the for loop conditions
    //more proper way would be to take in these values as input to the shader I suppose

    for (int i = 0; i < 5; i++)
    {
        for (int j = 0; j < 3; j++) 
        {
            vec3 P_Lu = cameraPos + s0 * N0 * (ui + rand / float(noL0)) + s1 * N1 * (vi + (rand) / float(noL1)); 

            L = P_Lu - sceneHit.position; 
            float length_of_L = length(L);
            L = normalize(L);   
            
            illum = dot(sceneHit.normal, L);

            if(illum<0.0) illum = 0.0; 
            vec3 R_PE = rayDirection - 2.0 * dot(rayDirection, sceneHit.normal) * sceneHit.normal; 
            spec = dot(R_PE, L);
            if(spec<0.0) spec = 0.0; 
            spec = pow(spec, 50.0);
            float shadow = 1.0;

            float B = dot(L, sphere0.position - sceneHit.position);
            float C = dot(sceneHit.position - sphere0.position, sceneHit.position - sphere0.position) - sphere0.scale*sphere0.scale; 
            float delta = B*B-C; 
            if(delta > 0.0 && B> 0.0) shadow=0.1;

            if(shadow>1.0) shadow=1.0;  

            totalillum=totalillum+shadow*illum * 0.6 / float(noL0*noL1);
            totalspec=totalspec+shadow*spec * 0.4 / float(noL0*noL1);

            vi += incV;
        }

        ui += incU;

    }
    
    illum = totalillum;
    spec = totalspec;
    
    //Reduce Diffuse Light Intensity
    col = ambient*(illum * 0.1) + diffuse*(1.0 - illum * 0.1);                                    // 0< .....<1  (0.5)

    //Reduce Specular Highlights
    col = specular * K_s * spec * 0.1 + col * (1.0 - K_s * spec * 0.1);                      // 0< .....<1  (0.3)
       
    gl_FragColor = vec4(col);    // Output to screen                                                    
}
`;

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
        'Assets/Images/highbuilding.jpg',                              
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