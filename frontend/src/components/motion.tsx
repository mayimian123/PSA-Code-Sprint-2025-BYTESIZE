"use client";

import React from "react";
import {
  MotionValue,
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

type MotionElement = keyof typeof motion;

type MotionDivProps = React.HTMLAttributes<HTMLElement> & {
  as?: MotionElement;
  children?: React.ReactNode;
};

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function MotionDiv({ as = "div", children, ...rest }: MotionDivProps) {
  const Component = (motion[as] ?? motion.div) as React.ComponentType<React.HTMLAttributes<HTMLElement>>;
  return <Component {...rest}>{children}</Component>;
}

type ScrollValues = {
  headerScale: MotionValue<number>;
  headerY: MotionValue<number>;
  moodOpacity: MotionValue<number>;
  moodY: MotionValue<number>;
};

export function useScrollValues(containerRef: React.RefObject<HTMLElement>): ScrollValues {
  const { scrollYProgress } = useScroll({ container: containerRef });

  const headerScale = useSpring(useTransform(scrollYProgress, [0, 1], [1, 0.95]), {
    stiffness: 180,
    damping: 24,
  });

  const headerY = useSpring(useTransform(scrollYProgress, [0, 1], [0, -10]), {
    stiffness: 180,
    damping: 24,
  });

  const moodOpacity = useSpring(useTransform(scrollYProgress, [0, 1], [1, 0]), {
    stiffness: 180,
    damping: 24,
  });

  const moodY = useSpring(useTransform(scrollYProgress, [0, 1], [0, -12]), {
    stiffness: 180,
    damping: 24,
  });

  return { headerScale, headerY, moodOpacity, moodY };
}
