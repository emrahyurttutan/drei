import * as THREE from 'three'
import * as React from 'react'
import { OrthographicCamera as OrthographicCameraImpl } from 'three'
import { useThree, useFrame } from '@react-three/fiber'
import mergeRefs from 'react-merge-refs'
import { useFBO } from './useFBO'

const isFunction = (node: any): node is Function => typeof node === 'function'

type Props = Omit<JSX.IntrinsicElements['orthographicCamera'], 'children'> & {
  /** Registers the camera as the system default, fiber will start rendering with it */
  makeDefault?: boolean
  /** Making it manual will stop responsiveness and you have to calculate aspect ratio yourself. */
  manual?: boolean
  /** The contents will either follow the camera, or be hidden when filming if you pass a function */
  children?: React.ReactNode | ((texture: THREE.Texture) => React.ReactNode)
  /** Number of frames to render, Infinity */
  frames?: number
  /** Resolution of the FBO, 256 */
  resolution?: number
}

export const OrthographicCamera = React.forwardRef(
  ({ resolution = 256, frames = Infinity, children, makeDefault, ...props }: Props, ref) => {
    const set = useThree(({ set }) => set)
    const camera = useThree(({ camera }) => camera)
    const size = useThree(({ size }) => size)
    const cameraRef = React.useRef<OrthographicCameraImpl>(null!)
    const groupRef = React.useRef<THREE.Group>(null!)
    const fbo = useFBO(resolution)

    React.useLayoutEffect(() => {
      if (!props.manual) {
        cameraRef.current.updateProjectionMatrix()
      }
    }, [size, props])

    React.useLayoutEffect(() => {
      cameraRef.current.updateProjectionMatrix()
    })

    React.useLayoutEffect(() => {
      if (makeDefault) {
        const oldCam = camera
        set(() => ({ camera: cameraRef.current! }))
        return () => set(() => ({ camera: oldCam }))
      }
      // The camera should not be part of the dependency list because this components camera is a stable reference
      // that must exchange the default, and clean up after itself on unmount.
    }, [cameraRef, makeDefault, set])

    let count = 0
    const functional = isFunction(children)
    useFrame((state) => {
      if (functional && (frames === Infinity || count < frames)) {
        groupRef.current.visible = false
        state.gl.setRenderTarget(fbo)
        state.gl.render(state.scene, cameraRef.current)
        state.gl.setRenderTarget(null)
        groupRef.current.visible = true
      }
    })

    return (
      <>
        <orthographicCamera
          left={size.width / -2}
          right={size.width / 2}
          top={size.height / 2}
          bottom={size.height / -2}
          ref={mergeRefs([cameraRef, ref])}
          {...props}
        >
          {!functional && children}
        </orthographicCamera>
        <group ref={groupRef}>{functional && children(fbo.texture)}</group>
      </>
    )
  }
)
