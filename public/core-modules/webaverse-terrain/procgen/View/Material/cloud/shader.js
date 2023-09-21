const cloudVertexShader = `\   
  attribute float textureNumber;
  attribute float distortionSpeed;
  attribute float distortionRange;
  attribute vec2 offset;
  attribute vec2 scales;
  attribute vec3 positions;
  attribute float rotationY;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec2 vOffset;
  varying float vDistortionSpeed;
  varying float vDistortionRange;
  varying float vTextureNumber;

  uniform float uTime;
  uniform vec3 playerPos;

  void main() { 
    
    // varying
    vTextureNumber = textureNumber;
    vDistortionSpeed = distortionSpeed;
    vDistortionRange = distortionRange;
    vOffset = offset;
    vUv = uv;

    mat3 rotY = mat3(
      cos(rotationY), 0.0, -sin(rotationY), 
      0.0, 1.0, 0.0, 
      sin(rotationY), 0.0, cos(rotationY)
    );
    vec3 pos = position;
    pos.x *= scales.x;
    pos.y *= scales.y;
    pos *= rotY;
    pos += positions;
    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vWorldPosition = modelPosition.xyz;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    gl_Position = projectionPosition;
  }
`;
const cloudFragmentShader = `\
  #include <common>
  uniform sampler2D cloudTexture1;
  uniform sampler2D cloudTexture2;
  uniform sampler2D cloudTexture3;
  uniform sampler2D cloudTexture4;
  uniform sampler2D noiseTexture2;
  uniform float uTime;
  uniform vec3 sunPosition;
  uniform float cloudRadius;


  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec2 vOffset;
  varying float vDistortionSpeed;
  varying float vDistortionRange;
  varying float vTextureNumber;

  float getCloudAlpha(vec4 lerpTex, vec4 cloudTex, float lerpCtrl) { // distort the cloud
    float cloudStep = 1. - lerpCtrl;
    float cloudLerp = smoothstep(0.95, 1., lerpCtrl);
    float alpha = smoothstep(clamp(cloudStep - 0.1, 0.0, 1.0), cloudStep, lerpTex.b);  
    alpha = mix(alpha, cloudTex.a, cloudLerp);
    alpha = clamp(alpha, 0., cloudTex.a);

    return alpha;
  }

  vec4 getCloudTex(float number) { // choose the cloud texture from the 4 cloud textures based on the cloud data
    vec4 noise = texture2D(
      noiseTexture2, 
      vec2(
        vUv.x + uTime * vDistortionSpeed * 0.1,
        vUv.y + uTime * vDistortionSpeed * 0.2
      )
    );
    vec2 uv = vec2(
      vUv.x / 2. + vOffset.x,
      vUv.y / 4. + vOffset.y
    ) + noise.rb * 0.01;

    vec4 tex;
    if (number < 0.5) {
      tex = texture2D(cloudTexture1, uv);
    }
    else if (number < 1.5) {
      tex = texture2D(cloudTexture2, uv);
    }
    else if (number < 2.5) {
      tex = texture2D(cloudTexture3, uv);
    }
    else if (number < 3.5) {
      tex = texture2D(cloudTexture4, uv);
    }
    return tex;
  }

  void main() {
    vec4 cloud = getCloudTex(vTextureNumber);

    float lerpCtrl = 0.1;
    
    float alphaLerp = mix((sin((uTime) * vDistortionSpeed) * 0.78 + 0.78 * vDistortionRange), 1.0, lerpCtrl);
    float cloudAlpha = getCloudAlpha(cloud, cloud, alphaLerp);
    
    float sunNightStep = smoothstep(-0.3, 0.25, sunPosition.y / cloudRadius);
    vec3 cloudBrightColor = mix(vec3(0.141, 0.607, 0.940), vec3(1.0, 1.0, 1.0), sunNightStep);
    vec3 cloudDarkColor = mix(vec3(0.0236, 0.320, 0.590), vec3(0.141, 0.807, 0.940), sunNightStep);


    float brightLerpSize = cloudRadius * 1.0;
    float sunDist = distance(vWorldPosition, sunPosition);
    float brightLerp = smoothstep(0., brightLerpSize, sunDist);
    float bright = mix(2.0, 1.0, brightLerp);
    float cloudColorLerp = cloud.r;
    vec3 cloudColor = mix(cloudDarkColor, cloudBrightColor, cloudColorLerp) * bright
                    + cloud.g * (1. - brightLerp);

    // float horizon = 400.;
    // float fadeOutY = (vWorldPosition.y + horizon)/ (cloudRadius * 0.4) * 2.;
    // fadeOutY = clamp(fadeOutY, 0.0, 1.0);
    
    gl_FragColor.rgb = cloudColor; 
    // gl_FragColor.a = cloudAlpha * fadeOutY;
    gl_FragColor.a = cloudAlpha;

    #include <tonemapping_fragment>
    #include <encodings_fragment>
    
  }
`;
export {
  cloudVertexShader, cloudFragmentShader,
};