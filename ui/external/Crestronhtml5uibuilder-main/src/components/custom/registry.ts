// CUSTOM COMPONENTS REGISTRY
// Auto-registration system for any JSX/TSX component

import { ComponentType } from 'react';
import { MediaPlayerUI } from './MediaPlayerUI';
import { ThermostatUI } from './ThermostatUI';
import { LightZoneCard } from './LightZoneCard';
import { PopupContainer } from './PopupContainer';

export interface CustomComponentJoinDefinition {
  name: string;
  defaultJoin: number;
  description?: string;
}

export interface CustomComponentDefinition {
  type: string; // Must start with 'custom-'
  name: string; // Display name in library
  icon: string; // Lucide icon name
  component: ComponentType<any>; // The actual React component
  defaultProps: {
    width: number;
    height: number;
    [key: string]: any;
  };
  joins: {
    digital?: CustomComponentJoinDefinition[];
    analog?: CustomComponentJoinDefinition[];
    serial?: CustomComponentJoinDefinition[];
  };
  category?: string; // Optional category for grouping
}

// 🔥 ADD YOUR CUSTOM COMPONENTS HERE!
export const customComponents: CustomComponentDefinition[] = [
  // Media Player
  {
    type: 'custom-media-player',
    name: 'Media Player Pro',
    icon: 'Music',
    component: MediaPlayerUI,
    defaultProps: {
      width: 500,
      height: 400,
    },
    joins: {
      digital: [
        { name: 'Play', defaultJoin: 20, description: 'Play button press' },
        { name: 'Pause', defaultJoin: 21, description: 'Pause button press' },
        { name: 'Next', defaultJoin: 22, description: 'Next track' },
        { name: 'Previous', defaultJoin: 23, description: 'Previous track' },
      ],
      analog: [
        { name: 'Volume', defaultJoin: 10, description: 'Volume level 0-100' },
        { name: 'Progress', defaultJoin: 11, description: 'Playback progress 0-100' },
      ],
      serial: [
        { name: 'Title', defaultJoin: 5, description: 'Track title' },
        { name: 'Artist', defaultJoin: 6, description: 'Artist name' },
        { name: 'Album', defaultJoin: 7, description: 'Album name' },
      ],
    },
    category: 'Audio',
  },

  // Thermostat
  {
    type: 'custom-thermostat',
    name: 'Thermostat Pro',
    icon: 'Thermometer',
    component: ThermostatUI,
    defaultProps: {
      width: 350,
      height: 450,
    },
    joins: {
      digital: [
        { name: 'Temp Up', defaultJoin: 50, description: 'Increase temperature' },
        { name: 'Temp Down', defaultJoin: 51, description: 'Decrease temperature' },
        { name: 'Mode Toggle', defaultJoin: 52, description: 'Toggle cooling/heating' },
      ],
      analog: [
        { name: 'Target Temp', defaultJoin: 50, description: 'Target temperature (65-85°F)' },
        { name: 'Current Temp', defaultJoin: 51, description: 'Current temperature' },
        { name: 'Humidity', defaultJoin: 52, description: 'Humidity percentage' },
      ],
      serial: [
        { name: 'Mode', defaultJoin: 20, description: 'COOLING/HEATING/AUTO/OFF' },
        { name: 'Status', defaultJoin: 21, description: 'System status' },
      ],
    },
    category: 'Climate',
  },

  // Light Zone Card
  {
    type: 'custom-light-zone',
    name: 'Light Zone Card',
    icon: 'Lightbulb',
    component: LightZoneCard,
    defaultProps: {
      width: 280,
      height: 320,
    },
    joins: {
      digital: [
        { name: 'Toggle', defaultJoin: 30, description: 'On/Off toggle' },
      ],
      analog: [
        { name: 'Brightness', defaultJoin: 30, description: 'Light intensity 0-100' },
      ],
      serial: [
        { name: 'Zone Name', defaultJoin: 10, description: 'Light zone name' },
      ],
    },
    category: 'Lighting',
  },

  // Popup Container
  {
    type: 'custom-popup-container',
    name: 'Popup Container',
    icon: 'AlertTriangle',
    component: PopupContainer,
    defaultProps: {
      width: 300,
      height: 200,
    },
    joins: {
      digital: [
        { name: 'Show', defaultJoin: 40, description: 'Show popup' },
        { name: 'Hide', defaultJoin: 41, description: 'Hide popup' },
      ],
      analog: [
        { name: 'Opacity', defaultJoin: 40, description: 'Popup opacity 0-100' },
      ],
      serial: [
        { name: 'Message', defaultJoin: 10, description: 'Popup message' },
      ],
    },
    category: 'UI',
  },
];

// Helper to get component by type
export function getCustomComponent(type: string): CustomComponentDefinition | undefined {
  return customComponents.find(c => c.type === type);
}

// Helper to check if a type is custom
export function isCustomComponent(type: string): boolean {
  return type.startsWith('custom-') && customComponents.some(c => c.type === type);
}

// Get all custom component types (for TypeScript union)
export type CustomComponentType = typeof customComponents[number]['type'];