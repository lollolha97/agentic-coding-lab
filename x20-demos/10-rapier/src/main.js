import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
await RAPIER.init();
const world=new RAPIER.World({x:0,y:-9.81,z:0});
const r=new THREE.WebGLRenderer({antialias:true,alpha:true});r.setSize(innerWidth,innerHeight);r.shadowMap.enabled=true;document.body.appendChild(r.domElement);
const s=new THREE.Scene();const cam=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,100);cam.position.set(0,9,16);cam.lookAt(0,1,0);
s.add(new THREE.HemisphereLight(0xffd9b8,0x22140c,1));const L=new THREE.DirectionalLight(0xffffff,2.2);L.position.set(5,12,6);L.castShadow=true;L.shadow.camera.left=-10;L.shadow.camera.right=10;L.shadow.camera.top=10;L.shadow.camera.bottom=-10;s.add(L);
// ground
world.createCollider(RAPIER.ColliderDesc.cuboid(8,.2,8).setTranslation(0,-.2,0));
const g=new THREE.Mesh(new THREE.BoxGeometry(16,.4,16),new THREE.MeshStandardMaterial({color:0x2a1a12}));g.position.y=-.2;g.receiveShadow=true;s.add(g);
// tilted ramp
const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,-.35));
world.createCollider(RAPIER.ColliderDesc.cuboid(4,.15,2.5).setTranslation(-2,3,0).setRotation(q));
const ramp=new THREE.Mesh(new THREE.BoxGeometry(8,.3,5),new THREE.MeshStandardMaterial({color:0x5a3a26}));ramp.position.set(-2,3,0);ramp.quaternion.copy(q);ramp.receiveShadow=true;s.add(ramp);
const cols=[0xff7a3d,0xe8455f,0xffc15e];const items=[];let n=0;
function spawn(){const ball=n%2==0;const bd=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(-4+Math.random()*2,9+Math.random()*2,-1.5+Math.random()*3).setAngvel({x:Math.random(),y:Math.random(),z:Math.random()}));
 world.createCollider((ball?RAPIER.ColliderDesc.ball(.4):RAPIER.ColliderDesc.cuboid(.35,.35,.35)).setRestitution(.4).setFriction(.6),bd);
 const m=new THREE.Mesh(ball?new THREE.SphereGeometry(.4,24,16):new THREE.BoxGeometry(.7,.7,.7),new THREE.MeshStandardMaterial({color:cols[n%3],roughness:.35,metalness:.2}));m.castShadow=true;s.add(m);items.push({bd,m});n++}
const sp=setInterval(()=>{spawn();if(n>=90)clearInterval(sp)},90);
window.__steps=0;
r.setAnimationLoop(()=>{world.step();window.__steps++;for(const {bd,m} of items){const t=bd.translation(),ro=bd.rotation();m.position.set(t.x,t.y,t.z);m.quaternion.set(ro.x,ro.y,ro.z,ro.w)}r.render(s,cam)});
addEventListener('resize',()=>{r.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()});
