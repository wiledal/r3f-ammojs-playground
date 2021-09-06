import {
  createContext,
  MutableRefObject,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AmmoPhysics,
  ExtendedGroup,
  ExtendedMesh,
  ExtendedObject3D,
} from "@enable3d/ammo-physics";
import { AddExistingConfig, XYZ } from "@enable3d/common/dist/types";
import { Object3D } from "three";

interface IAmmoContext {
  loading: boolean;
  physics: AmmoPhysics;
}

export const AmmoContext = createContext<IAmmoContext>(null);

export enum CollisionFlag {
  DYNAMIC = 0,
  STATIC = 1,
  KINETIC = 2,
  GHOST = 3,
}

export const useAmmo = () => {
  return useContext<IAmmoContext>(AmmoContext);
};

export type Enable3DExtendedObject<T> = T &
  (ExtendedObject3D | ExtendedMesh | ExtendedGroup);

export const useRigidBody = <T,>(
  config?: AddExistingConfig
): MutableRefObject<Enable3DExtendedObject<T>> => {
  const ref = useRef<Enable3DExtendedObject<T>>();

  const { loading, physics } = useAmmo();

  useLayoutEffect(() => {
    if (!loading && ref.current) {
      physics.add.existing(ref.current, config);
    }

    return () => {
      if (!loading) {
        physics.destroy(ref.current);
      }
    };
  }, [loading]);

  return ref;
};

interface HingeConfig {
  pivotA?: XYZ;
  pivotB?: XYZ;
  axisA?: XYZ;
  axisB?: XYZ;
}
export const useHinge = <A, B>(
  a: MutableRefObject<Enable3DExtendedObject<A>>,
  b: MutableRefObject<Enable3DExtendedObject<B>>,
  config: HingeConfig
) => {
  const { physics, loading } = useAmmo();
  const ref = useRef<Ammo.btHingeConstraint>();

  useEffect(() => {
    if (!loading && a.current && b.current) {
      ref.current = physics.add.constraints.hinge(
        a.current.body,
        b.current.body,
        config
      );
    }

    return () => {
      if (!loading) {
        // remove hinge
      }
    };
  }, [loading, a.current, b.current]);

  return ref;
};

export const PhysicsProvider = ({ children, debug = false }) => {
  const [obj, setObject] = useState<IAmmoContext>({
    loading: true,
    physics: null,
  });

  const { scene } = useThree();

  useEffect(() => {
    const loadScripts = async () => {
      const { PhysicsLoader, AmmoPhysics } = await import(
        "@enable3d/ammo-physics"
      );
      PhysicsLoader("/assets/ammo", () => {
        let physics = new AmmoPhysics(scene);

        setObject({
          loading: false,
          physics,
        });
      });
    };
    loadScripts();
  }, [scene]);

  useEffect(() => {
    if (debug && !obj.loading) {
      if (debug) obj.physics.debug.enable();
    }
  }, [debug, obj.loading]);

  useFrame((ctx, delta) => {
    if (obj.physics) {
      obj.physics.update((delta * 60 * 1000) / 60);
      obj.physics.updateDebugger();
    }
  });

  return <AmmoContext.Provider value={obj}>{children}</AmmoContext.Provider>;
};
