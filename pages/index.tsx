import { ExtendedMesh, ExtendedObject3D } from "@enable3d/ammo-physics";
import {
  Box,
  OrbitControls,
  Plane,
  Sphere,
  useAnimations,
  useGLTF,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  KeyboardEventHandler,
  memo,
  MutableRefObject,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from "three";
import {
  CollisionFlag,
  Enable3DExtendedObject,
  PhysicsProvider,
  useAmmo,
  useHinge,
  useRigidBody,
} from "../hooks/use-ammo";

const Aubergine = memo((obj) => {
  const glb = useGLTF("/assets/3d/aubergine.glb");
  const aub = useMemo(() => glb.scene.clone(true).children[0], [glb]);

  const ref = useRigidBody({
    shape: "hull",
  });

  useEffect(() => {
    aub.castShadow = true;
  }, [aub]);

  return (
    <primitive
      object={aub}
      scale={[0.4, 0.4, 0.4]}
      position={[obj.x, obj.y, obj.z]}
      ref={ref}
    />
  );
});

const Physbox = () => {
  const box = useRigidBody<Mesh>({
    shape: "box",
  });

  useFrame(() => {
    if (box.current.body) {
      box.current.body.setAngularVelocityY(2);
    }
  });

  return <Box position={[0, 5, 0]} ref={box} material-color="red" />;
};

const Ball = ({ position, rand, color }) => {
  const ref = useRigidBody();

  return (
    <Sphere position={position} ref={ref} castShadow>
      <meshStandardMaterial color={color} roughness={0} />
    </Sphere>
  );
};
const MemoBall = memo(Ball, (left, right) => left.rand === right.rand);

const Balls = () => {
  const [balls, setBalls] = useState([]);

  useEffect(() => {
    let intv = setInterval(() => {
      const ball = {
        rand: Math.random(),
        x: -3 + Math.random() * 6,
        z: -3 + Math.random() * 6,
        y: 0,
        color: "#" + Math.round(Math.random() * 0xffffff).toString(16),
      };

      const max = 300;

      setBalls((old) => {
        if (old.length > max - 1) return old;
        let newballs = [...old, ball];

        if (newballs.length > max) newballs.shift();
        return newballs;
      });
    }, 50);

    return () => {
      clearInterval(intv);
    };
  }, []);

  return (
    <>
      {balls.map((ball) => (
        // <MemoBall
        //   key={ball.rand}
        //   rand={ball.rand}
        //   color={ball.color}
        //   position={[ball.x, ball.y, ball.z]}
        // />
        <Aubergine key={ball.rand} {...ball} />
      ))}
    </>
  );
};

const Ground = () => {
  const ground = useRigidBody<Mesh>({
    mass: 0,
  });

  return (
    <Plane
      ref={ground}
      position={[0, -2, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[10, 10, 10]}
    />
  );
};

const Groupie = () => {
  const ref = useRigidBody<Group>();

  return (
    <group ref={ref} position={[0, 10, 0]}>
      <Box />
      <Box position={[2, 2, 2]} />
      <Box position={[2, -2, 0]} />
    </group>
  );
};

const Hinge = () => {
  const box1 = useRigidBody({
    collisionFlags: CollisionFlag.KINETIC,
  });
  const box2 = useRigidBody();

  const hinge = useHinge(box1, box2, {
    pivotA: { y: -0.65 },
    pivotB: { y: 0.65 },
    axisA: { x: 1 },
    axisB: { x: 1 },
  });

  useFrame(() => {
    if (box1.current.body) {
      // box2.current.body.applyTorque(2, 0, 0);
      const now = performance.now() / 100;
      box1.current.rotation.x += 0.2;
      box1.current.body.needUpdate = true;
      // console.log(box1.current.rotation.x);
      // box1.current.rotation.x += 0.1;
      // box1.current.body.needsUpdate = true;
    }
  });

  return (
    <>
      <Box ref={box1} />
      <Box ref={box2} />
    </>
  );
};

const usePlayerControls = (
  ref: MutableRefObject<Enable3DExtendedObject<Mesh>>,
  actions: Record<string, AnimationAction>
) => {
  const { physics } = useAmmo();
  const keysDown = useRef({});

  const state = useRef({
    walking: false,
    inAir: false,
    wantsToJump: false,
  });

  const ray = useMemo(() => {
    return physics.add.raycaster();
  }, []);

  useEffect(() => {
    const { body } = ref.current;

    const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
      keysDown.current[e.code] = true;
    };
    const handleKeyUp: KeyboardEventHandler<HTMLDivElement> = (e) => {
      keysDown.current[e.code] = false;
    };

    body.setFriction(2);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    actions.Walk.play();
    actions.Reset.play();

    actions.Reset.setEffectiveWeight(1);
    actions.Walk.setEffectiveWeight(0);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useFrame(() => {
    const { body } = ref.current;
    const cState = state.current;
    let canJump = false;

    if (ray) {
      ray.setRayFromWorld(body.position.x, body.position.y, body.position.z);
      ray.setRayToWorld(
        body.position.x,
        body.position.y - 1.5,
        body.position.z
      );
      ray.rayTest();
      const hit = ray.hasHit();

      cState.inAir = !hit;
    }

    if (keysDown.current.ArrowUp && !cState.inAir) {
      const speed = 5;
      const rotation = ref.current.getWorldDirection(
        ref.current.rotation.toVector3()
      );
      const theta = Math.atan2(rotation.x, rotation.z);

      const x = Math.sin(theta) * speed,
        y = ref.current.body.velocity.y,
        z = Math.cos(theta) * speed;

      ref.current.body.setVelocity(x, y, z);

      if (!cState.walking) {
        cState.walking = true;
        // actions.Walk.play();
        actions.Reset.fadeOut(0.2);
        actions.Walk.reset()
          .setEffectiveTimeScale(1)
          .setEffectiveWeight(1)
          .fadeIn(0.2)
          .play();
      }
    } else {
      if (cState.walking) {
        cState.walking = false;
        actions.Walk.fadeOut(0.2);
        actions.Reset.reset().fadeIn(0.2);
      }
    }

    if (keysDown.current.ArrowLeft) {
      ref.current.body.setAngularVelocityY(5);
    } else if (keysDown.current.ArrowRight) {
      ref.current.body.setAngularVelocityY(-5);
    } else {
      ref.current.body.setAngularVelocityY(0);
    }

    if (keysDown.current.Space && !cState.inAir) {
      cState.wantsToJump = true;
    }

    if (cState.wantsToJump) {
      // ref.current.body.applyForceY(10);
      console.log("jomp");
      body.setVelocityY(5);
      cState.wantsToJump = false;
    }
  });
};

const Player = () => {
  const gltf = useGLTF("/assets/3d/stickman3.glb");
  const { actions } = useAnimations(gltf.animations, gltf.scene);

  const ref = useRigidBody<Enable3DExtendedObject<Mesh>>();

  const light = useRef<DirectionalLight>();

  const { camera, scene } = useThree();

  const { loading } = useAmmo();

  useFrame(() => {
    if (light.current) {
      light.current.position.copy(camera.position);
      light.current.position.x += 40;
      light.current.position.y += 80;
      light.current.position.z += 40;
      light.current.target.position.copy(camera.position);
    }
  });

  useEffect(() => {
    if (!loading) {
      scene.add(light.current.target);
      let shadowSize = 10;
      light.current.shadow.camera.left = -shadowSize;
      light.current.shadow.camera.right = shadowSize;
      light.current.shadow.camera.top = -shadowSize;
      light.current.shadow.camera.bottom = shadowSize;
    }
  }, [loading]);

  useEffect(() => {
    // ref.current.body.setFriction(2);
    ref.current.body.setAngularFactor(0, 0, 0);
    gltf.scene.position.y = -0.8;
    gltf.scene.traverse((m) => {
      m.castShadow = true;
    });
  }, []);

  useFrame(() => {
    camera.position.copy(ref.current.position);
    camera.position.z -= 3;
    camera.position.y += 3;
    camera.lookAt(ref.current.position);
  });

  usePlayerControls(ref, actions);

  return (
    <>
      <Box ref={ref} castShadow args={[1, 1.8, 1]}>
        <meshBasicMaterial visible={false} />

        <primitive object={gltf.scene} scale={[0.5, 0.5, 0.5]} />
      </Box>
      <directionalLight
        ref={light}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
    </>
  );
};

const Dunes = () => {
  const gltf = useGLTF("/assets/3d/playground.glb");
  const ref = useRigidBody({
    mass: 0,
    shape: "concave",
  });

  const ground = useMemo(
    () => gltf.scene.getObjectByName("ground").clone(true),
    [gltf]
  );
  const spawn1 = useMemo(
    () => gltf.scene.getObjectByName("spawn_2").clone(true),
    [gltf]
  );

  ground.receiveShadow = true;

  return (
    <>
      <primitive ref={ref} object={ground} />
      <primitive object={spawn1}>{/* <Balls /> */}</primitive>
    </>
  );
};

const Floor = () => {
  const ref = useRigidBody({ mass: 0, shape: "plane" });

  return (
    <Plane
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[100, 100, 1]}
      position={[0, -2, 0]}
      ref={ref}
    />
  );
};

const Scene = () => {
  const { loading } = useAmmo();

  return loading ? (
    <></>
  ) : (
    <>
      <ambientLight intensity={0.5} />
      {/* <Groupie /> */}
      <Dunes />
      <Player />
    </>
  );
};

const Index = () => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <Canvas shadows>
        <Suspense fallback={null}>
          {/* <OrbitControls /> */}
          <PhysicsProvider>
            <Scene />
          </PhysicsProvider>
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Index;
