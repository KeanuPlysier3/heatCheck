float hash(vec2 p)  
{
    p  = 50.0*fract( p*0.3183099 + vec2(0.71,0.113));
    return -1.0+2.0*fract( p.x*p.y*(p.x+p.y) );
}

float noise( in vec2 p )
{
    vec2 i = floor( p );
    vec2 f = fract( p );
	
	vec2 u = f*f*(3.0-2.0*f);

    return mix( mix( hash( i + vec2(0.0,0.0) ), 
                     hash( i + vec2(1.0,0.0) ), u.x),
                mix( hash( i + vec2(0.0,1.0) ), 
                     hash( i + vec2(1.0,1.0) ), u.x), u.y);
}



void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = vec2 (fragCoord.x-iResolution.x*0.5,fragCoord.y*0.5);
    
    vec2 uvBot = uv/335.5;

    uvBot.x *= 0.4;
    float noise1 = smoothstep(0.,5.,noise(vec2(uv.x*1.20,uv.y-iTime*555.)/66.));
    float noise2 =  smoothstep(-1.5,2.2,noise(vec2(uv.x*0.9-300.,uv.y-iTime*222.)/33.))*2.;
    float noise3 =  smoothstep(0.,1.6,noise(vec2(uv.x*0.7+100.,uv.y-iTime*150.)/55.))*2.;    
    float noise4 = smoothstep(-0.4,1.,noise(vec2(uv.x*0.5+50.,uv.y-iTime*240.)/55.));
    float noise5 =  smoothstep(0.,0.8,noise(vec2(uv.x*1.6+50.,uv.y-iTime*222.)/99.));
    float noise6 =  smoothstep(0.,1.4,noise(vec2(uv.x+200.,uv.y-iTime*333.)/300.))*4.;
    
    
    
    float fieryNoise1 = ((noise1 + noise2 + noise3+ noise4 + noise5 + noise6 )/44.);
    
    float fieryNoise2 = ((noise1 + noise2 + noise3+ noise4 + noise5 + noise6 )/44.);
    
    vec2 uvDistort1 = uvBot + (fieryNoise1)*3.72;
    vec2 uvDistort2 = uvBot + (fieryNoise2)*6.72;
    
    float mask1 = smoothstep(0.2,0.72,1.- smoothstep(0.0,1.,uvDistort1.y));  
    float mask2 = smoothstep(0.44,0.66,1.- smoothstep(0.0,1.,uvDistort2.y));  
    
    float mask3 = mask1-mask2;
    float mask4 = 1.-(mask3+mask2);     
    
    vec3 colorBot = vec3(0.88,0.44,0.1);
    vec3 colorMid = vec3(.66,0.14,0.14);
    
	//vec3 top = (1.-clamp(mask1,0.,1.))*colorTop;   
    
    vec3 color1 = (mix(colorBot,colorMid, mask3)- mask4) +mask2*0.9;
    

    // Output to screen
    fragColor = vec4(color1,1.);
}