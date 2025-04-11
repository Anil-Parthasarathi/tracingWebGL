/*
This code creates basis raytracing image with diffuse illumination
scene consists of a background, a plane and a sphere:
iChannel0: Background Image
*/

const float pi=3.1416;


float random (vec2 st) {
    return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);
}

float smooth_step( float min, float max, float x )
{
    float t =(x - min) / (max - min);
    t = clamp(t, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t); // smoothstep formula   
    return t;
}

float step2( float min, float max, float x )
{
    float t =(x - min) / (max - min);
    t = clamp(t, 0.0, 1.0); 
    return t;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    
    vec2 uv = fragCoord/iResolution.xy; //Normalized pixel coordinates
    
    vec4 col = vec4(0.0);
    vec4 BG = texture(iChannel0, uv);
    vec4 ambient0 = vec4(134.0/255.0 , 112.0/255.0, 108.0/255.0, 1.0); 
    vec4 dif0 = vec4(201.0/255.0, 183.0/255.0,169.0/255.0,1.0); 
    vec4 ambient;
    vec4 dif;
    
    vec3 N; //normals
    vec3 P_E = vec3(iResolution.x/2.0, iResolution.y/2.0,iResolution.x);
    vec3 P_P =  vec3(fragCoord.x,fragCoord.y,0.0);
    vec3 P_L = vec3(iMouse.x,iMouse.y,iResolution.x/10.0);
    //vec3 P_L = vec3(20.0,10.0,-10.0);
    //vec3 L=-P_L/length(P_L); 
    
    //vec3 P_C= vec3(iMouse.x,iMouse.y,-500.0);
    vec3 P_C= vec3(iResolution.x/2.0,iResolution.y/2.0,-iResolution.x/5.0);
    float R=iResolution.x/4.0; 
    vec3 L;
    
    vec3 N_PL=vec3(0.0,1.0,0.0); 
    vec3 P_PL=vec3(0.0,iResolution.y/4.0,0.0); 
    
    vec3 N_PE= P_P -P_E;
    N_PE= N_PE/length(N_PE);
    float t;
    float mint0=10000.0;
    float mint=mint0;
    vec3 P_H; 
    float illum; 
    
    float B= dot(N_PE,P_C-P_E);
    float C= dot(P_E-P_C,P_E-P_C) - R*R; 
    float delta= B*B-C; 
    
    
    P_H= vec3(fragCoord.x,fragCoord.y,-mint0/1000.0);
    N=vec3(0.0,0.0,1.0);
    col= BG/5.0*(1.0-illum)+BG*illum;
    ambient = BG/5.0; 
    dif = BG;

    
    if(dot(N_PL,N_PE)<0.0){ 
    t= -dot(N_PL,(P_E-P_PL))/(dot(N_PL,N_PE));
    mint=t;
    P_H= P_E + t * N_PE;
    N=N_PL; 
    ambient = (ambient0 + vec4(0.3,0.4,0.3,1.0))/2.0; 
    dif = (dif0+ vec4(0.9,0.1,0.2,1.0))/2.0; 
    }
        
    if(delta > 0.0 && B> 0.0){ //We hit sphere
    t=B-sqrt(delta); 
    if(t<mint)
    {
    mint=t;
    P_H= P_E + t * N_PE; 
    N=(P_H-P_C)/R;
    ambient =(ambient0 +  vec4(0.5,0.7,0.4,1.0))/2.0; 
    dif = (dif0+vec4(0.6,0.9,0.5,1.0))/2.0;
    }
    }
      
    
    //if(mint<mint0)
    //{
    L=P_L-P_H; 
    L=L/length(L);   
    //illum=(dot(N,L)+1.0)/2.0;
    illum=dot(N,L);
    if(illum<0.0) illum=0.0; 
    col= ambient*(1.0-illum)+dif*illum;
    //col = vec4(illum);
    //}
    
 
    fragColor = vec4(col);    // Output to screen
}