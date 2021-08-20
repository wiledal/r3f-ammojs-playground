import { ExtendedMesh, ExtendedObject3D } from "@enable3d/ammo-physics";
import { Box, OrbitControls, Plane, Sphere, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  KeyboardEventHandler,
  memo,
  MutableRefObject,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { DirectionalLight, Group, Mesh, MeshStandardMaterial } from "three";
import {
  CollisionFlag,
  Enable3DExtendedObject,
  PhysicsProvider,
  useAmmo,
  useHinge,
  useRigidBody,
} from "../hooks/use-ammo";

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

      setBalls((old) => {
        let newballs = [...old, ball];
        if (newballs.length > 400) newballs.shift();
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
        <MemoBall
          key={ball.rand}
          rand={ball.rand}
          color={ball.color}
          position={[ball.x, ball.y, ball.z]}
        />
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
  ref: MutableRefObject<Enable3DExtendedObject<Mesh>>
) => {
  const keysDown = useRef({});

  useEffect(() => {
    const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
      keysDown.current[e.key] = true;
    };
    const handleKeyUp: KeyboardEventHandler<HTMLDivElement> = (e) => {
      keysDown.current[e.key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useFrame(() => {
    if (keysDown.current.ArrowUp) {
      const speed = 5;
      const rotation = ref.current.getWorldDirection(
        ref.current.rotation.toVector3()
      );
      const theta = Math.atan2(rotation.x, rotation.z);

      const x = Math.sin(theta) * speed,
        y = ref.current.body.velocity.y,
        z = Math.cos(theta) * speed;

      ref.current.body.setVelocity(x, y, z);
    }
    if (keysDown.current.ArrowLeft) {
      ref.current.body.setAngularVelocityY(5);
    } else if (keysDown.current.ArrowRight) {
      ref.current.body.setAngularVelocityY(-5);
    } else {
      ref.current.body.setAngularVelocityY(0);
    }
  });
};

const Player = () => {
  const ref = useRigidBody<Enable3DExtendedObject<Mesh>>();

  const light = useRef<DirectionalLight>();

  const { camera, scene } = useThree();

  const { loading } = useAmmo();
  useFrame(() => {
    if (light.current) {
      light.current.position.copy(camera.position);
      light.current.position.x += 40;
      light.current.position.y += 40;
      light.current.position.z += 40;
      light.current.target.position.copy(camera.position);
    }
  });

  useEffect(() => {
    if (!loading) {
      scene.add(light.current.target);
      let shadowSize = 30;
      light.current.shadow.camera.left = -shadowSize;
      light.current.shadow.camera.right = shadowSize;
      light.current.shadow.camera.top = -shadowSize;
      light.current.shadow.camera.bottom = shadowSize;
    }
  }, [loading]);

  useEffect(() => {
    // ref.current.body.setFriction(2);
    ref.current.body.setAngularFactor(0, 0, 0);
  }, []);

  useFrame(() => {
    camera.position.copy(ref.current.position);
    camera.position.z -= 5;
    camera.position.y += 5;
    camera.lookAt(ref.current.position);
  });

  usePlayerControls(ref);

  return (
    <>
      <Box ref={ref} scale={[1, 3, 1]} castShadow>
        <meshStandardMaterial color="blue" />
      </Box>
      <directionalLight
        ref={light}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
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

  const ground = gltf.scene.getObjectByName("ground");
  const spawn1 = gltf.scene.getObjectByName("spawn_1");

  ground.receiveShadow = true;
  // ground.castShadow = true;

  return (
    <>
      <primitive ref={ref} object={ground} />
      <primitive object={spawn1}>
        <Balls />
      </primitive>
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
      <Groupie />
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
