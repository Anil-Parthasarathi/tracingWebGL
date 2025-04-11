/*
This code creates basis raytracing image with reflection and area light shadow
scene consists of two planes and one reflective sphere:
iChannel0: Texture Image mapped one of the planes
*/

//const float pi=3.141592653589793238462643383279502884197;
const float pi=3.1416;

const int KEY_LEFT  = 37;
const int KEY_UP    = 38;
const int KEY_RIGHT = 39;
const int KEY_DOWN  = 40;




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
    vec2 uv_tex;
    vec4 col = vec4(0.0);
    vec4 BG ;
    vec4 ambient0 = vec4(134.0/255.0 , 112.0/255.0, 108.0/255.0, 1.0); 
    vec4 dif0 = vec4(201.0/255.0, 183.0/255.0,169.0/255.0,1.0); 
    vec4 highlight0 = vec4(225.0/255.0, 220.0/255.0,169.0/255.0,1.0); 
    vec4 ambient,dif,highlight;
    vec3 N0,N1,N2; 
    vec3 V2=vec3(iMouse.x/iResolution.x-0.5,iMouse.y/iResolution.y-0.5,0.50);
    V2=vec3(0.0,1.0,0.0);
    //vec3 V1=vec3(cos(iTime/1.),sin(iTime/1.0),0.0);
    vec3 V1=vec3(0.0,0.0,1.0);
    N2=V2/length(V2);
    vec3 V0=cross(V1,V2); 
    N0=V0/length(V0);
    N1=cross(N2,N0); 
    /*
    N0=vec3(1.0,0.0,0.0);
    N1=vec3(0.0,1.0,0.0);
    N2=vec3(0.0,0.0,1.0);
    */
    float s0=iMouse.x*iResolution.x/iResolution.x;
    float s1=iMouse.x*iResolution.y/iResolution.x;
    s0=500.0;
    s1=500.0;
    int noL0=8;
    int noL1=8;
    
    vec3 N; //normals
    vec3 P_E = vec3(iResolution.x/2.0, iResolution.y/2.0,iResolution.x);
    vec3 P_P =  vec3(fragCoord.x,fragCoord.y,0.0);
    vec3 P_L = vec3(iMouse.x,iMouse.y,1.0*iResolution.x/1.0);
    //vec3 P_L = vec3(20.0,10.0,-10.0);
    //vec3 L=-P_L/length(P_L);     
    vec3 P_C= vec3(iMouse.x,iMouse.y,-iResolution.x/15.0);
    //vec3 P_C= vec3(iResolution.x/2.0,iResolution.y/2.0,-iResolution.x/15.0);
    float R=iResolution.x/4.0; 
    vec3 L;
    
    vec3 N_PL=vec3(0.0,1.0,0.0); 
    vec3 P_PL=vec3(0.0,iResolution.y/4.0,0.0); 
    
    vec3 N_PE= P_P -P_E;
    vec3 R_PE;
    N_PE= N_PE/length(N_PE);
    float t;
    float mint0=10000.0;
    float mint=mint0;
    vec3 P_H, P_H2; 
    float illum; 
    float spec;
    float K_s;
       
    
    vec3 P_BG= vec3(iMouse.x,iMouse.y,-mint0/30.0);
    N=vec3(0.0,0.0,1.0);
    t= -dot(N,(P_E-P_BG))/(dot(N,N_PE));
    P_H= P_E + t * N_PE;
    mint=t;
    //col= BG/5.0*(1.0-illum)+BG*illum;
    uv_tex.x=dot(N0,(P_H-P_BG))/s0; 
    uv_tex.y=dot(N1,(P_H-P_BG))/s1;
    BG=dif0;
    if(uv_tex.x>0.0 && uv_tex.x<1.0)
    {
    if(uv_tex.y>0.0 && uv_tex.y<1.0)
    {
    BG = texture(iChannel0, uv_tex);
    }}
    //ambient = BG/5.0; 
    //dif = BG;
    ambient = ambient0 ; 
    dif = dif0;
    highlight=highlight0;
    K_s=0.0;    
    int object=0;

    
    if(dot(N_PL,N_PE)<0.0){ //We hit plane
    t= -dot(N_PL,(P_E-P_PL))/(dot(N_PL,N_PE));
    if(t<mint)
    {
    mint=t;
    P_H= P_E + t * N_PE;
    N=N_PL;
    uv_tex.x=dot(N0,(P_H-P_PL))/s0; 
    uv_tex.y=dot(N1,(P_H-P_PL))/s1; 
    BG = texture(iChannel0, uv_tex);
    ambient = BG/2.0; 
    dif = BG;
    //ambient = ambient0 ; 
    //dif = dif0;
    highlight=highlight0;
    K_s=0.0;
    object=1;
    }
    }
    
   
    
    float B= dot(N_PE,P_C-P_E);
    float C= dot(P_E-P_C,P_E-P_C) - R*R; 
    float delta= B*B-C; 
    
    if(delta > 0.0 && B> 0.0){ //We hit sphere
    t=B-sqrt(delta); 
    if(t<mint)
    {
    mint=t;
    P_H= P_E + t * N_PE; 
    N=(P_H-P_C)/R;
    R_PE=N_PE+2.0*dot(N,-N_PE)*N;
    ambient = ambient0 ; 
    dif = dif0;
    if(dot(N_PL,R_PE)<0.0){ //We hit plane
    t= -dot(N_PL,(P_H-P_PL))/(dot(N_PL,R_PE));
    P_H2= P_H + t * R_PE;
    uv_tex.x=dot(N0,(P_H2-P_PL))/s0; 
    uv_tex.y=dot(N1,(P_H2-P_PL))/s1; 
    BG = texture(iChannel0, uv_tex);
    ambient = BG/4.0; 
    dif = BG; 
    K_s=0.95;
    ambient =(1.0-K_s)*ambient0+K_s*ambient; 
    dif = (1.0-K_s)*dif0+K_s*dif;
    }

    //highlight=highlight0;
   
    object=2;
    }
    }
    
      
    
    float totalillum=0.0; 
    float totalspec=0.0;
    float rand=random(uv)-0.5;
    for (float ui=0.0; ui<1.0; ui=ui+1.0/float(noL0))
    {
    for (float vi=0.0; vi<1.0; vi=vi+1.0/float(noL1)) 
    {
    vec3 P_Lu=P_L+s0*N0*(ui+rand/float(noL0))+s1*N1*(vi+(rand)/float(noL1)); 
    //vec3 P_Lu=P_L+s0*N0*(ui)+s1*N1*(vi); 
    //if(mint<mint0)
    //{
    L=P_Lu-P_H; 
    float length_of_L=length(L);
    L=L/length(L);   
    //illum=(dot(N,L)+1.0)/2.0;
    illum=dot(N,L);
    if(illum<0.0) illum=0.0; 
    vec3 R_PE = N_PE - 2.0*dot(N_PE,N)*N; 
    spec=dot(R_PE,L);
    if(spec<0.0) spec=0.0; 
    spec=pow(spec,50.0);
    float shadow=1.0;
    //if(object != 2)
    //{
    float B= dot(L,P_C-P_H);
    float C= dot(P_H-P_C,P_H-P_C) - R*R; 
    float delta= B*B-C; 
    if(delta > 0.0 && B> 0.0)
    //shadow=pow(2.0,-0.005*sqrt(delta));
    //t=B-sqrt(delta);
    //shadow=t/length_of_L;
    shadow=0.3;
    //shadow=2.0*sqrt(delta)/length_of_L;
    //shadow = pow(shadow,0.20);
    if(shadow>1.0) shadow=1.0;     
    //} 
    //shadow=1.0; 
    totalillum=totalillum+shadow*illum/float(noL0*noL1);
    totalspec=totalspec+shadow*spec/float(noL0*noL1);
    }
    }
    
    illum=totalillum;
    spec=totalspec;
    col= ambient*(1.0-illum)+dif*illum;
    col =highlight*K_s*spec+col*(1.0-K_s*spec);
       
    //if(object==0) col=dif0;
    fragColor = vec4(col);    // Output to screen
}