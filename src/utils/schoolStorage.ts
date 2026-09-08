import { SchoolConfig } from '../types';

const SCHOOL_STORAGE_KEY = 'emis_school_config_v1';

// Elegant SVG Crests encoded as data URIs so they render crisply in any <img> or background
export const PRESET_SCHOOL_LOGOS = [
  {
    id: 'crest-gold',
    name: 'Academy Shield (Navy & Gold)',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="%231e1b4b"/><path d="M50 14 C68 14 82 22 82 46 C82 70 50 86 50 86 C50 86 18 70 18 46 C18 22 32 14 50 14 Z" fill="%234338ca" stroke="%23fbbf24" stroke-width="4"/><path d="M36 40 L50 34 L64 40 L64 60 L50 66 L36 60 Z" fill="%23ffffff" fill-opacity="0.95"/><path d="M50 34 L50 66" stroke="%234338ca" stroke-width="2"/><circle cx="50" cy="24" r="4" fill="%23fbbf24"/></svg>`
  },
  {
    id: 'crest-emerald',
    name: 'Charter School (Emerald)',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="%23064e3b"/><circle cx="50" cy="50" r="38" fill="%23047857" stroke="%236ee7b7" stroke-width="4"/><path d="M50 24 L72 38 L50 52 L28 38 Z" fill="%23ffffff"/><path d="M40 50 L40 68 C40 73 60 73 60 68 L60 50" fill="%23ffffff" fill-opacity="0.9"/><path d="M72 38 L72 62" stroke="%23fbbf24" stroke-width="3"/></svg>`
  },
  {
    id: 'crest-crimson',
    name: 'Collegiate Emblem (Crimson & Amber)',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="%23881337"/><path d="M50 16 L80 32 L80 64 L50 84 L20 64 L20 32 Z" fill="%23be123c" stroke="%23f59e0b" stroke-width="3.5"/><path d="M35 44 C42 40 48 42 50 46 C52 42 58 40 65 44 L65 64 C58 60 52 62 50 66 C48 62 42 60 35 64 Z" fill="%23ffffff"/><circle cx="50" cy="30" r="3.5" fill="%23fde68a"/></svg>`
  },
  {
    id: 'crest-cyan',
    name: 'Modern STEM Academy (Cyan & Indigo)',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="%230f172a"/><path d="M50 18 L82 50 L50 82 L18 50 Z" fill="%231e293b" stroke="%2338bdf8" stroke-width="4"/><circle cx="50" cy="50" r="16" fill="%230284c7"/><path d="M50 26 L50 74 M26 50 L74 50" stroke="%23bae6fd" stroke-width="2.5"/><circle cx="50" cy="50" r="6" fill="%23ffffff"/></svg>`
  }
];

export const DEFAULT_SCHOOL_CONFIG: SchoolConfig = {
  name: 'Student Attendance App',
  nameLine1: 'Student Attendance App',
  nameLine2: '',
  logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seal_of_Tamil_Nadu.svg/1280px-Seal_of_Tamil_Nadu.svg.png',
  tagline: 'Student Attendance & Management System'
};

export function getStoredSchoolConfig(): SchoolConfig {
  try {
    const raw = localStorage.getItem(SCHOOL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(DEFAULT_SCHOOL_CONFIG));
      return DEFAULT_SCHOOL_CONFIG;
    }
    const parsed = JSON.parse(raw);
    
    // Migration: If the logo is the old default or starts with data:image/svg+xml, force upgrade it to the uploaded seal
    let currentLogo = parsed.logo || DEFAULT_SCHOOL_CONFIG.logo;
    if (
      !currentLogo || 
      currentLogo.startsWith('data:image/svg+xml') || 
      currentLogo.includes('<svg') || 
      currentLogo.includes('Oakridge')
    ) {
      currentLogo = DEFAULT_SCHOOL_CONFIG.logo;
    }

    const rawName = parsed.name || DEFAULT_SCHOOL_CONFIG.name;
    const nameParts = rawName.split('\n');
    let nameLine1 = parsed.nameLine1?.trim() || nameParts[0]?.trim() || DEFAULT_SCHOOL_CONFIG.nameLine1;
    if (nameLine1.includes('Oakridge')) {
      nameLine1 = 'Student Attendance App';
    }
    const nameLine2 = parsed.nameLine2 !== undefined ? parsed.nameLine2?.trim() : (nameParts[1]?.trim() || '');

    const updatedConfig = {
      name: nameLine2 ? `${nameLine1}\n${nameLine2}` : nameLine1,
      nameLine1,
      nameLine2,
      logo: currentLogo,
      tagline: parsed.tagline || DEFAULT_SCHOOL_CONFIG.tagline
    };

    // Keep localStorage synchronized with the updated schema/migration
    localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(updatedConfig));
    return updatedConfig;
  } catch (err) {
    return DEFAULT_SCHOOL_CONFIG;
  }
}

export function saveSchoolConfig(config: SchoolConfig): void {
  try {
    localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to persist school configuration to localStorage', err);
  }
}

export function resetSchoolConfig(): SchoolConfig {
  try {
    localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(DEFAULT_SCHOOL_CONFIG));
    return DEFAULT_SCHOOL_CONFIG;
  } catch (err) {
    return DEFAULT_SCHOOL_CONFIG;
  }
}
