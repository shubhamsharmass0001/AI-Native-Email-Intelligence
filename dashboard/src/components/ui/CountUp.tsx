"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface Props {
  value: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export function CountUp({ value, suffix = "", decimals = 0, className }: Props) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => v.toFixed(decimals) + suffix);
  const [text, setText] = useState("0" + suffix);

  useEffect(() => {
    spring.set(value);
    const unsub = display.on("change", (v) => setText(v));
    return unsub;
  }, [value, spring, display, suffix]);

  return <motion.span className={className}>{text}</motion.span>;
}
