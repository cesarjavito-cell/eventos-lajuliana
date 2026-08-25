import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children, className = '' }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullDistanceRef = useRef(0);
  const scrollContainerRef = useRef(null);

  const findScrollContainer = (el) => {
    let parent = el.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        return parent;
      }
      parent = parent.parentElement;
    }
    return null;
  };

  const getScrollTop = () => {
    const sc = scrollContainerRef.current;
    return sc ? sc.scrollTop : window.scrollY;
  };

  const handleTouchStart = (e) => {
    if (!scrollContainerRef.current) {
      scrollContainerRef.current = findScrollContainer(e.currentTarget);
    }
    if (getScrollTop() <= 0 && !isRefreshing) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  };

  const handleTouchMove = (e) => {
    if (!pulling.current || isRefreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 10 && getScrollTop() <= 0) {
      const newDistance = Math.min(diff * 0.5, THRESHOLD * 1.5);
      pullDistanceRef.current = newDistance;
      setPullDistance(newDistance);
    }
  };

  const handleTouchEnd = async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistanceRef.current >= THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD);
      pullDistanceRef.current = THRESHOLD;
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }
    } else {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
  };

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={className}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance, opacity: pullDistance > 0 || isRefreshing ? 1 : 0 }}
      >
        <RefreshCw
          className={`w-5 h-5 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`}
          style={{ transform: `rotate(${progress * 270}deg)`, transition: 'transform 0.1s' }}
        />
      </div>
      {children}
    </div>
  );
}
