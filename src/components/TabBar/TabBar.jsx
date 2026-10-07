import React, {
  useMemo,
  useRef,
  useEffect,
  useCallback,
  useState,
  startTransition,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  HomeTabIcon,
  InsightsTabIcon,
  LibraryTabIcon,
  SettingsTabIcon,
} from './TabIcons';

import './TabBar.css';

const tabs = [
  {
    id: 'home',
    path: '/',
    icon: HomeTabIcon,
    label: 'Home',
  },
  {
    id: 'insights',
    path: '/insights',
    icon: InsightsTabIcon,
    label: 'Insights',
  },
  {
    id: 'library',
    path: '/library',
    icon: LibraryTabIcon,
    label: 'Library',
  },
  {
    id: 'settings',
    path: '/settings',
    icon: SettingsTabIcon,
    label: 'Settings',
  },
];

export default function TabBar({
  collapsed,
  onFabTap,
  onTabSelect,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const forceExpandTimer = useRef(null);

  const currentPath = location.pathname;

  /*
   * Optimistic selection makes the glass pill move immediately
   * instead of waiting for React Router to finish navigation.
   */
  const [optimisticIndex, setOptimisticIndex] = useState(null);

  const routeIndex = useMemo(() => {
    const index = tabs.findIndex(
      (tab) => tab.path === currentPath
    );

    return index >= 0 ? index : 0;
  }, [currentPath]);

  const activeIndex =
    optimisticIndex !== null
      ? optimisticIndex
      : routeIndex;

  /*
   * Once routing catches up, remove the optimistic state.
   */
  useEffect(() => {
    setOptimisticIndex(null);
  }, [currentPath]);

  /*
   * Cleanup.
   */
  useEffect(() => {
    return () => {
      if (forceExpandTimer.current) {
        clearTimeout(forceExpandTimer.current);
      }
    };
  }, []);

  const activeTab = tabs[activeIndex] || tabs[0];
  const ActiveIcon = activeTab.icon;

  const handleTabClick = useCallback(
    (index, path) => {
      if (path === currentPath) return;

      // Move the Liquid Glass active pill immediately.
      setOptimisticIndex(index);

      // Keep navigation responsive.
      startTransition(() => {
        navigate(path);
      });

      // Collapse navigation after selection only if it was in collapsed FAB state
      if (collapsed && onTabSelect) {
        onTabSelect();
      }
    },
    [currentPath, navigate, collapsed, onTabSelect]
  );

  const handleFabClick = useCallback(
    (event) => {
      event.stopPropagation();

      if (onFabTap) {
        onFabTap();
      }
    },
    [onFabTap]
  );

  return (
    <nav
      id="tab-bar"
      className={`tab-bar glass-surface ${collapsed ? 'nav-collapsed' : ''
        }`}
      aria-label="Primary navigation"
    >
      {/* --------------------------------------------------
          Liquid Glass highlight layer
          -------------------------------------------------- */}
      <div
        className="tab-bar-glass-highlight"
        aria-hidden="true"
      />

      {/* --------------------------------------------------
          Active Liquid Glass pill
          -------------------------------------------------- */}
      <div
        className="tab-pill-indicator"
        style={{
          transform: `translate3d(${activeIndex * 100}%, 0, 0)`,
        }}
        aria-hidden="true"
      />

      {/* --------------------------------------------------
          Navigation tabs
          -------------------------------------------------- */}
      {tabs.map((tab, index) => {
        const isActive = activeIndex === index;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            className={`tab-item ${isActive ? 'active' : ''
              }`}
            onClick={() =>
              handleTabClick(index, tab.path)
            }
            aria-label={tab.label}
            aria-current={
              isActive ? 'page' : undefined
            }
          >
            <span className="tab-icon-wrapper">
              <Icon
                size={22}
                isActive={isActive}
              />
            </span>

            <span className="tab-label">
              {tab.label}
            </span>
          </button>
        );
      })}

      {/* --------------------------------------------------
          Collapsed navigation FAB
          -------------------------------------------------- */}
      <button
        type="button"
        className="tab-fab-overlay"
        onClick={handleFabClick}
        aria-label="Expand navigation"
      >
        <span className="tab-fab-icon">
          <ActiveIcon
            size={24}
            isActive={true}
          />
        </span>
      </button>
    </nav>
  );
}