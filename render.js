const vertexShaderCode = `
    attribute vec4 pos;  
    
    void main() {
    
        gl_Position = pos;
    }
`;

const fragmentShaderCode = `
precision mediump float;

uniform vec3 iResolution;
uniform vec4 iMouse;  

uniform sampler2D iChannel0;     
uniform int keyPress;

const float pi = 3.1416;

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

float step2( float min, float max, float x )
{
    float t = (x - min) / (max - min);
    t = clamp(t, 0.0, 1.0); 
    return t;
}

void main() {

    vec2 uv = gl_FragCoord.xy / iResolution.xy; // Normalized pixel coordinates
    vec2 uv_tex;

    vec4 col = vec4(0.0);
    vec4 BG ;
    vec4 ambient0 = vec4(134.0/255.0 , 112.0/255.0, 108.0/255.0, 1.0); 
    vec4 dif0 = vec4(201.0/255.0, 183.0/255.0,169.0/255.0,1.0); 
    vec4 highlight0 = vec4(225.0/255.0, 220.0/255.0,200.0/255.0,1.0); 
    vec4 ambient, dif, highlight;

    vec3 N0, N1, N2; 
    vec3 V2 = vec3(iMouse.x/iResolution.x-0.5,iMouse.y/iResolution.y - 0.5,0.50);

    V2 = vec3(0.0,0.0,0.1);

    vec3 V1 = vec3(0.0,1.0,0.0);
    N2 = V2/length(V2);
    vec3 V0 = cross(V1,V2); 
    N0 = V0/length(V0);
    N1 = cross(N2,N0); 

    float s0 = iMouse.x*iResolution.x/iResolution.x;
    float s1 = iMouse.x*iResolution.y/iResolution.x;

    s0 = iResolution.x/1.0;
    s1 = iResolution.x/1.0;

    int noL0 = 5;
    int noL1 = 3;

    vec3 N; //normals
    vec3 P_E = vec3(iResolution.x/2.0, iResolution.y/2.0,iResolution.x);
    vec3 P_P =  vec3(gl_FragCoord.x,gl_FragCoord.y,0.0);                                                             
    vec3 P_L = vec3(iMouse.x,iMouse.y,1.0*iResolution.x/1.0);

    float mint0 = 10000.0;
    vec3 P_C = vec3(iMouse.x,iMouse.y,-mint0/20.0);
    //vec3 P_C = vec3(iResolution.x/2.0,iResolution.y/2.0,-iResolution.x/15.0);
    float R = iResolution.y/1.50; 
    vec3 L;

    vec3 N_PL = vec3(0.0,1.0,0.0); 
    vec3 P_PL = vec3(0.0,iResolution.y/4.0,0.0); 
    
    vec3 N_PE = P_P - P_E;
    N_PE = N_PE/length(N_PE);
    float t;

    float mint = mint0;
    vec3 P_H,P_H2; 
    float illum; 
    float spec;
    float K_s;
    float weight = 0.9;
    float ior = pow(3.0, weight); 

    vec3 P_BG = vec3(0.0,0.0,-mint0/30.0);
    vec3 N_BG = vec3(0.0,0.0,1.0);
    t = -dot(N_BG,(P_E-P_BG))/(dot(N_BG,N_PE));
    N = N_BG; 
    P_H = P_E + t * N_PE;
    mint = t;

    uv_tex.x = dot(N0,(P_H-P_BG))/s0; 
    uv_tex.y = dot(N1,(P_H-P_BG))/s1;
    uv_tex = p2(uv_tex);
    BG = texture2D(iChannel0, uv_tex);   

    //Reduce Ambient Light
    //ambient = BG/5.0;                                   
    ambient = BG / 8.0;                                                             // 8.0 or a higher value

    dif = BG;

    highlight = highlight0;
    K_s = 0.0;
     
    int object=0;

    float B = dot(N_PE,P_C-P_E);
    float C = dot(P_E-P_C,P_E-P_C) - R*R; 
    float delta = B*B-C; 
    
    if(delta > 0.0 && B> 0.0){ //We hit sphere
        t = B - sqrt(delta); 
        if(t < mint)
        {
            mint = t;
            P_H = P_E + t * N_PE; 
            N = (P_H - P_C) / R;
            float C = -dot(N_PE,N); 
            
            vec3 T_PE = (1.0 - weight) * N_PE + weight * (-N); 

            T_PE = T_PE / length(T_PE);

            if (keyPress == 1){
                T_PE = 1.0 / ior * (-N_PE + (C - sqrt(C*C - 1.0 + ior*ior)) * N);
                
            }

            t = -dot(N_BG,(P_H - P_BG)) / (dot(N_BG,T_PE));
            P_H2 = P_H + t * T_PE;   
            uv_tex.x = dot(N0,(P_H2 - P_PL)) / s0; 
            uv_tex.y = dot(N1,(P_H2 - P_PL)) / s1;
            uv_tex = p2(uv_tex);
            BG = texture2D(iChannel0, uv_tex);
            ambient = BG/3.0; 
            dif = BG;
            K_s = 0.90;
            ambient = (1.0 - K_s) * ambient0 + K_s * ambient; 
            dif = (1.0 - K_s) * dif0 + K_s * dif;    
            highlight = highlight0;
        
            object = 2;
        }
    }

    float totalillum = 0.0; 
    float totalspec = 0.0;
    float rand = random(uv) - 0.5;

    float incU = 1.0/float(noL0);
    float incV = 1.0/float(noL1);

    float ui = 0.0;
    float vi = 0.0;

    //had to hardcode the values of noL0 and noL1 here because it was giving me errors for using nonconstant values in the for loop conditions
    //more proper way would be to take in these values as input to the shader I suppose

    for (int i = 0; i < 5; i++)
    {
        for (int j = 0; j < 3; j++) 
        {
            vec3 P_Lu=P_L+s0*N0*(ui+rand/float(noL0))+s1*N1*(vi+(rand)/float(noL1)); 

            L=P_Lu-P_H; 
            float length_of_L=length(L);
            L=L/length(L);   
            
            illum=dot(N,L);

            if(illum<0.0) illum=0.0; 
            vec3 R_PE = N_PE - 2.0*dot(N_PE,N)*N; 
            spec=dot(R_PE,L);
            if(spec<0.0) spec=0.0; 
            spec=pow(spec,50.0);
            float shadow=1.0;

            float B= dot(L,P_C-P_H);
            float C= dot(P_H-P_C,P_H-P_C) - R*R; 
            float delta= B*B-C; 
            if(delta > 0.0 && B> 0.0) shadow=0.1;

            if(shadow>1.0) shadow=1.0;  

            //Lower Light Source Strength
            //otalillum=totalillum+shadow*illum/float(noL0*noL1);                             
            //totalspec=totalspec+shadow*spec/float(noL0*noL1);                                 
            totalillum=totalillum+shadow*illum * 0.6 / float(noL0*noL1);
            totalspec=totalspec+shadow*spec * 0.4 / float(noL0*noL1);

            vi += incV;
        }

        ui += incU;

    }
    
    illum = totalillum;
    spec = totalspec;
    
    //Reduce Diffuse Light Intensity
    //col= ambient*(illum)+dif*(1.0 - illum);                                                                          
    col = ambient*(illum * 0.1) + dif*(1.0 - illum * 0.1);                                    // 0< .....<1  (0.5)

    //Reduce Specular Highlights
    //col = highlight * K_s * spec + col * (1.0 - K_s * spec);                                 
    col = highlight * K_s * spec * 0.1 + col * (1.0 - K_s * spec * 0.1);                      // 0< .....<1  (0.3)
       
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

function render(){
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