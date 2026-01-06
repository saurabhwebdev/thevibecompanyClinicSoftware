"use client";

import { motion, AnimatePresence, Variants } from "framer-motion";
import { ReactNode } from "react";

// Animation variants for page transitions
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
    },
  },
};

// Animation variants for fade in
export const fadeInVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

// Animation variants for scale in
export const scaleInVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

// Animation variants for slide in from left
export const slideInLeftVariants: Variants = {
  initial: {
    opacity: 0,
    x: -30,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    x: -30,
    transition: {
      duration: 0.3,
    },
  },
};

// Animation variants for slide in from right
export const slideInRightVariants: Variants = {
  initial: {
    opacity: 0,
    x: 30,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    x: 30,
    transition: {
      duration: 0.3,
    },
  },
};

// Animation variants for staggered children
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

// Card hover animation variants
export const cardHoverVariants: Variants = {
  initial: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
    },
  },
};

// Table row animation variants
export const tableRowVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.2,
    },
  },
};

// Page wrapper component with animations
interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Fade in wrapper
interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Slide up wrapper
interface SlideUpProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function SlideUp({ children, className, delay = 0 }: SlideUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale in wrapper
interface ScaleInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function ScaleIn({ children, className, delay = 0 }: ScaleInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered list container
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
}

export function StaggerContainer({ children, className }: StaggerContainerProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered list item
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// Animated card with hover effects
interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function AnimatedCard({ children, className, onClick }: AnimatedCardProps) {
  return (
    <motion.div
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      variants={cardHoverVariants}
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {children}
    </motion.div>
  );
}

// Animated table row
interface AnimatedRowProps {
  children: ReactNode;
  className?: string;
  index?: number;
}

export function AnimatedRow({ children, className, index = 0 }: AnimatedRowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.tr>
  );
}

// Animate presence wrapper for conditional rendering
interface AnimatePresenceWrapperProps {
  children: ReactNode;
  mode?: "wait" | "sync" | "popLayout";
}

export function AnimatePresenceWrapper({
  children,
  mode = "wait",
}: AnimatePresenceWrapperProps) {
  return <AnimatePresence mode={mode}>{children}</AnimatePresence>;
}

// Number counter animation
interface CounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function Counter({
  value,
  duration = 1,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
}: CounterProps) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {prefix}
        <motion.span
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {value.toFixed(decimals)}
        </motion.span>
        {suffix}
      </motion.span>
    </motion.span>
  );
}

// Pulse animation for loading states
interface PulseProps {
  children: ReactNode;
  className?: string;
}

export function Pulse({ children, className }: PulseProps) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.02, 1],
        opacity: [1, 0.8, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Shimmer effect for skeletons
interface ShimmerProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Shimmer({ className, width, height }: ShimmerProps) {
  return (
    <motion.div
      className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded ${className}`}
      style={{ width, height }}
      animate={{
        backgroundPosition: ["200% 0", "-200% 0"],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}

// Button press animation wrapper
interface ButtonPressProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function ButtonPress({
  children,
  className,
  onClick,
  disabled,
}: ButtonPressProps) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.1 }}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}

// Notification badge bounce animation
interface BounceBadgeProps {
  children: ReactNode;
  className?: string;
}

export function BounceBadge({ children, className }: BounceBadgeProps) {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 15,
      }}
      className={className}
    >
      {children}
    </motion.span>
  );
}

// Export motion for custom usage
export { motion, AnimatePresence };
