
const divingRippleVertex = `\             
  varying vec2 vUv;
  
  void main() {
    vUv = uv;

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    gl_Position = projectionPosition;
  }
`;
const divingRippleFragment = `\
  uniform float uTime;
  uniform sampler2D noiseMap2;
  
  varying vec2 vUv;

  const float rFrequency = 60.0; 
  const float rSpeed = .2;
  const float rThickness = 1.0;
  const float radiusEnd = .5;
  const float radiusStart = .2;
  const float PI = 3.1415926535897932384626433832795;
  
  float radialNoise(vec2 uv) { 
    uv.y -= rSpeed * uTime;
    float scale = 1.3;  
    float power = 1.9;
    float total = 0.1;
    total += texture2D(noiseMap2, uv * (power * scale)).r * (1.0 / power);
    return total;
  }
  void main() {
    
    vec2 uv = vUv;
    vec2 center = vec2(.5, .5);
    vec2 toCenter = uv - center;
    float dist = length(toCenter);
    float distScalar = max(0.0, 1.0 - dist / radiusEnd);
    float ripple = sin((dist - rSpeed * uTime) * rFrequency);
    ripple = max(0.0, ripple);
    ripple = pow(ripple, rThickness);
    ripple = (dist > radiusStart * uTime) ? ripple * distScalar : 0.0;
    
    float angle = atan(toCenter.x, toCenter.y);
    angle = (angle + PI) / (2.0 * PI);
    float noise = radialNoise(vec2(angle, dist));
    
    float total = ripple;
    float noiseMultiplier = clamp(uTime + 0.5, 1.0, 10.0);
    total -= noise * noiseMultiplier;
    total = total < .01 ? 0.0 : 1.0;
    
    gl_FragColor = vec4(total);
    gl_FragColor *= 0.87;
    if (gl_FragColor.a < 0.01) {
      discard;
    }
  }
`;

const idleRippleVertex = `\             
  varying vec2 vUv;
  
  void main() {
    vUv = uv;

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    gl_Position = projectionPosition;
  }
`;
const idleRippleFragment = `\
  uniform float uTime;
  uniform sampler2D noiseMap2;
  uniform float fadeIn;
  
  varying vec2 vUv;

  const float rFrequency = 60.0; 
  const float rSpeed = .2;
  const float rThickness = 0.8;
  const float radiusEnd = .45;
  const float radiusStart = .08;
  const float PI = 3.1415926535897932384626433832795;
  //Noise that moves radially outwards via polar coordinates
  float radialNoise(vec2 uv) { 
    uv.y -= rSpeed * uTime;
    const float scale = 1.3;  
    float power = 2.2;
    float total = 0.1;
    
    total += texture2D(noiseMap2, uv * (power * scale)).r * (1.0 / power);
   
    return total;
  }
  void main() {
    vec2 uv = vUv;
    vec2 center = vec2(.5, .5);
    vec2 toCenter = uv - center;
    float dist = length(toCenter);
    float distScalar = max(0.0, 1.0 - dist / radiusEnd);
    float ripple = sin((dist - rSpeed * uTime) * rFrequency);
    ripple = max(0.0, ripple);
    ripple = pow(ripple, rThickness);
    ripple = (dist > radiusStart) ? ripple * distScalar : 0.0;
    
    float angle = atan(toCenter.x, toCenter.y);
    angle = (angle + PI) / (2.0 * PI);
    float noise = radialNoise(vec2(angle, dist));
    
    float total = ripple;
    total -= noise;
    total = total < .01 ? 0.0 : 1.0;
    
    gl_FragColor = vec4(total);
    gl_FragColor *= 0.9;
    gl_FragColor.a *= pow(distance(center, uv), 3.) * 100.;
    gl_FragColor.a *= fadeIn;
    
    if (gl_FragColor.a < 0.01) {
      discard;
    }
  }
`;

const divingLowerSplashVertex = `\      
  uniform vec4 cameraBillboardQuaternion;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying float vDissolve;
  varying float vTextureRotation;
  varying float vTextureType;

  attribute float textureType;
  attribute float textureRotation;
  attribute float dissolve;
  attribute vec3 positions;
  attribute float scales;
  
  vec3 rotateVecQuat(vec3 position, vec4 q) {
    vec3 v = position.xyz;
    return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
  }
  void main() {
    vUv = uv;
    vDissolve = dissolve;
    vTextureRotation = textureRotation;  
    vTextureType = textureType;
    
    vec3 pos = position;
    pos = rotateVecQuat(pos, cameraBillboardQuaternion);
    pos *= scales;
    pos += positions;
    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    vWorldPosition = modelPosition.xyz;
    gl_Position = projectionPosition;
  }
`
const divingLowerSplashFragment = `\
  uniform sampler2D splashTexture1;
  uniform sampler2D splashTexture2;
  uniform sampler2D dropletTexture;
  uniform float waterSurfacePos;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  
  varying float vTextureRotation;
  varying float vTextureType;
  varying float vDissolve;
  #define PI 3.1415926

  void main() {
    float mid = 0.5;
    vec2 rotated = vec2(
      cos(vTextureRotation * PI) * (vUv.x - mid) - sin(vTextureRotation * PI) * (vUv.y - mid) + mid,
      cos(vTextureRotation * PI) * (vUv.y - mid) + sin(vTextureRotation * PI) * (vUv.x - mid) + mid
    );
    bool isSplash = vTextureType < 1.5;
    if (isSplash) {
      vec4 splash;
      if (vTextureType < 0.5) {
        splash = texture2D(
          splashTexture1,
          rotated
        );
      }
      else {
        splash = texture2D(
          splashTexture2,
          rotated
        );
      }
      gl_FragColor = vec4(vec3(splash.r), splash.a);
  
      if (splash.r < vDissolve) {
        discard;
      }
      else {
        gl_FragColor = mix(vec4(splash.r), vec4(0.9), 0.8);
      }
    }
    else {
      vec4 droplet = texture2D(
        dropletTexture,
        vUv
      );
      gl_FragColor = vec4(droplet.r);
      if (gl_FragColor.r < 0.5) {
        discard;
      }
      // rim
      gl_FragColor.rgb += vec3(pow(droplet.g, 3.0));
    }
    

    if (vWorldPosition.y < waterSurfacePos) {
      discard;
    }
    
  }
`

const divingHigherSplashVertex = `\         
  varying vec2 vUv;
  varying vec3 vPos;
  varying float vDissolve;
  
  attribute float dissolve;
  attribute vec3 positions;
  attribute float scales;
  attribute float rotation;

  vec4 vec3ToQuat(vec3 rotation) {
    vec3 halfAngles = rotation * 0.5;
    vec3 sinAngles = sin(halfAngles);
    vec3 cosAngles = cos(halfAngles);

    vec4 quat;
    quat.x = sinAngles.x * cosAngles.y * cosAngles.z - cosAngles.x * sinAngles.y * sinAngles.z;
    quat.y = cosAngles.x * sinAngles.y * cosAngles.z + sinAngles.x * cosAngles.y * sinAngles.z;
    quat.z = cosAngles.x * cosAngles.y * sinAngles.z - sinAngles.x * sinAngles.y * cosAngles.z;
    quat.w = cosAngles.x * cosAngles.y * cosAngles.z + sinAngles.x * sinAngles.y * sinAngles.z;

    return quat;
  }
  
  vec3 rotateVertexPosition(vec3 position, vec4 q) { 
    return position + 2.0 * cross(q.xyz, cross(q.xyz, position) + q.w * position);
  }
  
  void main() {
    vUv = uv;
    vDissolve = dissolve;

    vec3 pos = position;
    vec4 q = vec3ToQuat(vec3(0.0, rotation, 0.0));
    pos = rotateVertexPosition(pos, q);
    
    pos *= scales;
    pos += positions;
    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    vPos = modelPosition.xyz;
    gl_Position = projectionPosition;
  }
`
const divingHigherSplashFragment = `\
  uniform sampler2D splashTexture;
  uniform sampler2D noiseMap;
  uniform float waterSurfacePos;
  varying vec2 vUv;
  varying vec3 vPos;
  varying float vDissolve;
  
  void main() { 
    vec4 splash = texture2D(
      splashTexture,
      vUv
    );
    gl_FragColor = splash;
    float colorFilter = 0.3;
    if (splash.r < colorFilter) {
      discard;
    }
    else {
      gl_FragColor = vec4(0.9);
    }
    if (vPos.y < waterSurfacePos) {
      gl_FragColor.a = 0.;
    }
    float dissolve = abs(sin(1.0 - vDissolve)) - texture2D(noiseMap, vUv).g;
    float dissolveThreshold = 0.0001;
    if (dissolve < dissolveThreshold) discard;
  }
`

const trailRippleVertex = `\       
  varying vec2 vUv;
  varying float vDissolve;
  
  attribute vec3 positions;
  attribute float scales;
  attribute vec4 quaternions;
  attribute float dissolve;
  attribute float playerRotation;
  
  vec3 qtransform(vec3 v, vec4 q) { 
    return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
  }
  void main() {
    mat3 rotY =
        mat3(cos(playerRotation), 0.0, -sin(playerRotation), 0.0, 1.0, 0.0, sin(playerRotation), 0.0, cos(playerRotation)); 
    vDissolve = dissolve;
    vUv = uv;
    
    vec3 pos = position;
    pos = qtransform(pos, quaternions);
    pos *= rotY;
    pos *= scales;
    pos += positions;
    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    gl_Position = projectionPosition;
  }
`
const trailRippleFragment = `\
  varying vec2 vUv;
  varying float vDissolve;
  
  uniform sampler2D rippleTexture;
  void main() {
    
    vec4 ripple = texture2D(
      rippleTexture,
      vUv
    );
    if (ripple.g < max(0.1, vDissolve)) {
      discard;
    }
    else {
      gl_FragColor = vec4(0.9);
    }
  }
`

const trailSplashVertex = `\       
  varying vec2 vUv;
  varying float vDissolve;
  varying float vTextureRotation;
  
  attribute vec3 positions;
  attribute float scales;
  attribute vec4 quaternions;
  attribute float dissolve;
  attribute float textureRotation;
  
  vec3 qtransform(vec3 v, vec4 q) { 
    return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
  }
  void main() {
    vDissolve = dissolve;
    vUv = uv;
    vTextureRotation = textureRotation;

    vec3 pos = position;
    pos = qtransform(pos, quaternions);
    pos *= scales;
    pos += positions;
    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    gl_Position = projectionPosition;
  }
`
const trailSplashFragment = `\
  varying vec2 vUv;
  varying float vDissolve;
  varying float vTextureRotation;
  
  uniform sampler2D splashTexture;
  #define PI 3.1415926
  void main() {

    float mid = 0.5;
    vec2 rotated = vec2(
      cos(vTextureRotation * PI) * (vUv.x - mid) - sin(vTextureRotation * PI) * (vUv.y - mid) + mid,
      cos(vTextureRotation * PI) * (vUv.y - mid) + sin(vTextureRotation * PI) * (vUv.x - mid) + mid
    );
    
    vec4 splash = texture2D(
      splashTexture,
      rotated
    );
    if (splash.r < vDissolve) {
      discard;
    }
    else {
      gl_FragColor = mix(vec4(splash.r), vec4(0.85, 0.85, 0.85, 0.5), 0.9);
    }
  }
`

const bubbleVertex = `\       
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  
  attribute vec3 positions;
  attribute float scales;
  
  uniform vec4 cameraBillboardQuaternion;
  
  vec3 rotateVecQuat(vec3 position, vec4 q) {
    vec3 v = position.xyz;
    return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
  }
 
  void main() {
    vUv = uv;
    
    vec3 pos = position;
    pos = rotateVecQuat(pos, cameraBillboardQuaternion);
    pos *= scales;
    pos += positions;
    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = modelPosition.xyz;
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    gl_Position = projectionPosition;
  }
`
const bubbleFragment = `\
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  
  uniform sampler2D bubbleTexture;
  uniform float waterSurfacePos;
  
  void main() {
    vec4 bubble = texture2D(
      bubbleTexture,
      vUv
    );
    
    gl_FragColor = vec4(bubble.r);
    if (gl_FragColor.r < 0.5) {
      discard;
    }

    // rim
    gl_FragColor.rgb += vec3(1.0 - gl_FragColor.r);
    gl_FragColor.rgb += vec3(pow(bubble.g, 3.0));
    // gl_FragColor.a *= 0.8;
    if (vWorldPosition.y < waterSurfacePos) {
      gl_FragColor *= 0.7;
    }
  }
`
export {
  divingRippleVertex, divingRippleFragment,
  idleRippleVertex, idleRippleFragment,
  divingLowerSplashVertex, divingLowerSplashFragment,
  divingHigherSplashVertex, divingHigherSplashFragment,
  trailRippleVertex, trailRippleFragment,
  trailSplashVertex, trailSplashFragment,
  bubbleVertex, bubbleFragment,
};